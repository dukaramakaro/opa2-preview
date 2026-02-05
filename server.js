require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const https = require('https');

const app = express();

const CLIP_API_KEY = process.env.CLIP_API_KEY || '';
const CLIP_SECRET_KEY = process.env.CLIP_SECRET_KEY || '';

app.use(express.json());
app.use(express.static('.'));

// Archivo CSV para reservas
const CSV_FILE = 'reservas.csv';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'playa2026*';

// Inicializar CSV si no existe
if (!fs.existsSync(CSV_FILE)) {
    const headers = 'Fecha,Codigo,Nombre,Email,Telefono,Vuelo,Servicio,Origen,Destino,FechaViaje,Pasajeros,Vehiculo,Total,Estado,Notas\n';
    fs.writeFileSync(CSV_FILE, headers, 'utf8');
}

// Guardar reserva en CSV
function guardarReserva(data) {
    const row = [
        new Date().toISOString(),
        data.codigo || '',
        data.nombre || '',
        data.email || '',
        data.telefono || '',
        data.vuelo || '',
        data.servicio || '',
        data.origen || '',
        data.destino || '',
        data.fecha || '',
        data.pasajeros || '',
        data.vehiculo || '',
        data.total || '',
        data.estado || 'Pendiente',
        (data.notas || '').replace(/,/g, ';')
    ].map(field => `"${field}"`).join(',') + '\n';

    fs.appendFileSync(CSV_FILE, row, 'utf8');
}

// Endpoint para guardar reserva
app.post('/guardar-reserva', (req, res) => {
    try {
        guardarReserva(req.body);
        res.json({ success: true });
    } catch (error) {
        console.error('Error guardando reserva:', error);
        res.status(500).json({ error: error.message });
    }
});

// Crear sesión de pago con Clip
app.post('/crear-pago', async (req, res) => {
    try {
        const { precio, moneda, descripcion, codigo, email } = req.body;
        const currency = moneda === 'USD' ? 'USD' : 'MXN';

        if (!CLIP_API_KEY) {
            return res.status(500).json({ error: 'CLIP_API_KEY no configurada' });
        }

        const origin = req.headers.origin || req.headers.referer || 'https://opa2.mx';

        const clipPayload = {
            amount: precio,
            currency: currency,
            purchase_description: descripcion,
            redirection_url: {
                success: `${origin}/confirmacion.html?codigo=${codigo}`,
                error: `${origin}`,
                default: `${origin}`
            },
            metadata: {
                me_code: codigo,
                customer_info: {
                    email: email
                }
            }
        };

        // Si es USD, habilitar pagos internacionales (solo Visa/Mastercard)
        if (currency === 'USD') {
            clipPayload.custom_payment_options = {
                international_enabled: true,
                payment_method_brands: ['visa', 'mastercard'],
                payment_method_types: ['debit', 'credit']
            };
        }

        const clipData = JSON.stringify(clipPayload);

        // Autenticación Basic con base64(api_key:secret_key) según docs Clip
        const authToken = Buffer.from(`${CLIP_API_KEY}:${CLIP_SECRET_KEY}`).toString('base64');

        const options = {
            hostname: 'api.payclip.com',
            path: '/v2/checkout',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${authToken}`,
                'Content-Length': Buffer.byteLength(clipData)
            }
        };

        const clipResponse = await new Promise((resolve, reject) => {
            const clipReq = https.request(options, (clipRes) => {
                let data = '';
                clipRes.on('data', (chunk) => { data += chunk; });
                clipRes.on('end', () => {
                    try {
                        resolve({ status: clipRes.statusCode, body: JSON.parse(data) });
                    } catch (e) {
                        resolve({ status: clipRes.statusCode, body: { message: data } });
                    }
                });
            });
            clipReq.on('error', reject);
            clipReq.write(clipData);
            clipReq.end();
        });

        console.log(`Clip API -> status: ${clipResponse.status}`);

        if (clipResponse.status >= 200 && clipResponse.status < 300 && clipResponse.body.payment_request_url) {
            return res.json({ url: clipResponse.body.payment_request_url });
        }

        console.error('Error de Clip:', JSON.stringify(clipResponse.body));
        res.status(500).json({ error: clipResponse.body?.message || 'Error al crear pago en Clip' });
    } catch (error) {
        console.error('Error creando sesión de Clip:', error);
        res.status(500).json({ error: error.message });
    }
});

// Panel admin - login
app.post('/admin/login', (req, res) => {
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) {
        res.json({ success: true, token: Buffer.from(password).toString('base64') });
    } else {
        res.status(401).json({ error: 'Contraseña incorrecta' });
    }
});

// Panel admin - validar token
app.post('/admin/validate', (req, res) => {
    const auth = req.headers.authorization;
    if (!auth) {
        return res.json({ valid: false });
    }
    try {
        const token = auth.split(' ')[1];
        const password = Buffer.from(token, 'base64').toString();
        res.json({ valid: password === ADMIN_PASSWORD });
    } catch (error) {
        res.json({ valid: false });
    }
});

// Panel admin - ver reservas
app.get('/admin/reservas', (req, res) => {
    const auth = req.headers.authorization;
    if (!auth || Buffer.from(auth.split(' ')[1], 'base64').toString() !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'No autorizado' });
    }

    try {
        const csvData = fs.readFileSync(CSV_FILE, 'utf8');
        const lines = csvData.split('\n').filter(line => line.trim());
        const headers = lines[0].split(',');
        const reservas = lines.slice(1).map(line => {
            const values = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
            const obj = {};
            headers.forEach((header, i) => {
                obj[header.replace(/"/g, '')] = (values[i] || '').replace(/"/g, '');
            });
            return obj;
        });

        res.json({ reservas: reservas.reverse() }); // Más recientes primero
    } catch (error) {
        console.error('Error leyendo reservas:', error);
        res.status(500).json({ error: error.message });
    }
});

// Descargar CSV (acepta auth por header o query param)
app.get('/admin/descargar', (req, res) => {
    const auth = req.headers.authorization || req.query.authorization;
    if (!auth) return res.status(401).json({ error: 'No autorizado' });
    try {
        const token = auth.replace('Bearer ', '');
        if (Buffer.from(token, 'base64').toString() !== ADMIN_PASSWORD) {
            return res.status(401).json({ error: 'No autorizado' });
        }
    } catch (e) {
        return res.status(401).json({ error: 'No autorizado' });
    }
    res.download(CSV_FILE, `reservas_opa2_${new Date().toISOString().split('T')[0]}.csv`);
});

// Helper: actualizar estado de una reserva en el CSV
function actualizarEstadoCSV(codigo, nuevoEstado) {
    const csvData = fs.readFileSync(CSV_FILE, 'utf8');
    const lines = csvData.split('\n');
    let found = false;

    const updated = lines.map((line, i) => {
        if (i === 0 || !line.trim()) return line; // header o vacía
        if (line.includes(`"${codigo}"`)) {
            found = true;
            // Reemplazar el campo Estado (penúltimo campo antes de Notas)
            const values = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
            if (values.length >= 14) {
                values[13] = `"${nuevoEstado}"`;
            }
            return values.join(',');
        }
        return line;
    });

    if (found) {
        fs.writeFileSync(CSV_FILE, updated.join('\n'), 'utf8');
    }
    return found;
}

// Confirmar pago desde página de confirmación (Clip redirige aquí)
app.post('/confirmar-pago', (req, res) => {
    const { codigo } = req.body;
    if (!codigo) return res.status(400).json({ error: 'Código requerido' });

    try {
        const found = actualizarEstadoCSV(codigo, 'Pagado');
        res.json({ success: true, updated: found });
    } catch (error) {
        console.error('Error confirmando pago:', error);
        res.status(500).json({ error: error.message });
    }
});

// Admin - actualizar estado manualmente
app.post('/admin/actualizar-estado', (req, res) => {
    const auth = req.headers.authorization;
    if (!auth || Buffer.from(auth.split(' ')[1], 'base64').toString() !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'No autorizado' });
    }

    const { codigo, estado } = req.body;
    if (!codigo || !estado) return res.status(400).json({ error: 'Código y estado requeridos' });

    try {
        const found = actualizarEstadoCSV(codigo, estado);
        res.json({ success: true, updated: found });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor OPA2 corriendo en puerto ${PORT}`);
});
