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
        const { precio, descripcion, codigo, email } = req.body;

        if (!CLIP_API_KEY || !CLIP_SECRET_KEY) {
            return res.status(500).json({ error: 'Credenciales de Clip no configuradas' });
        }

        // Generar token de autenticación: base64(api_key:secret_key)
        const authToken = Buffer.from(CLIP_API_KEY + ':' + CLIP_SECRET_KEY).toString('base64');

        const origin = req.headers.origin || req.headers.referer || 'https://opa2.mx';

        const clipData = JSON.stringify({
            amount: precio,
            currency: 'MXN',
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
        });

        const options = {
            hostname: 'api-gw.payclip.com',
            path: '/checkout',
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
                        reject(new Error('Respuesta inválida de Clip: ' + data));
                    }
                });
            });
            clipReq.on('error', reject);
            clipReq.write(clipData);
            clipReq.end();
        });

        if (clipResponse.status >= 200 && clipResponse.status < 300 && clipResponse.body.payment_request_url) {
            res.json({ url: clipResponse.body.payment_request_url });
        } else {
            console.error('Error de Clip:', clipResponse.body);
            res.status(500).json({ error: clipResponse.body.message || 'Error al crear pago en Clip' });
        }
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

// Descargar CSV
app.get('/admin/descargar', (req, res) => {
    const auth = req.headers.authorization;
    if (!auth || Buffer.from(auth.split(' ')[1], 'base64').toString() !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'No autorizado' });
    }

    res.download(CSV_FILE, `reservas_opa2_${new Date().toISOString().split('T')[0]}.csv`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor OPA2 corriendo en puerto ${PORT}`);
});
