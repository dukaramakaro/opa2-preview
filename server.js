require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();

// Clip.mx API configuration
const CLIP_API_KEY = process.env.CLIP_API_KEY;
const CLIP_SECRET_KEY = process.env.CLIP_SECRET_KEY;
const CLIP_API_URL = 'https://api-gw.payclip.com/checkout';

function getClipAuthToken() {
    return Buffer.from(`${CLIP_API_KEY}:${CLIP_SECRET_KEY}`).toString('base64');
}

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

// Crear pago con Clip.mx
app.post('/crear-pago', async (req, res) => {
    try {
        const { precio, descripcion, codigo, email, nombre } = req.body;

        const origin = req.headers.origin || req.headers.referer || '';

        const clipResponse = await fetch(CLIP_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${getClipAuthToken()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                amount: precio, // Clip usa pesos enteros, no centavos
                currency: 'MXN',
                purchase_description: descripcion,
                override_settings: {
                    payment_method: ['CARD', 'CASH'] // Tarjeta y OXXO
                },
                redirect_url: {
                    success: `${origin}/confirmacion.html?codigo=${codigo}`,
                    error: `${origin}`,
                    default: `${origin}`
                },
                webhook_url: `${origin}/webhook/clip`,
                metadata: {
                    me_reference_id: codigo,
                    customer_info: {
                        name: nombre || '',
                        email: email || ''
                    }
                }
            })
        });

        const clipData = await clipResponse.json();

        if (!clipResponse.ok) {
            console.error('Error de Clip:', clipData);
            throw new Error(clipData.message || 'Error al crear pago en Clip');
        }

        res.json({ url: clipData.payment_request_url });
    } catch (error) {
        console.error('Error creando pago:', error);
        res.status(500).json({ error: error.message });
    }
});

// Webhook de Clip.mx para notificaciones de pago
app.post('/webhook/clip', (req, res) => {
    try {
        const { payment_request_id, receipt_no, resource_status, payment_type } = req.body;

        console.log(`Webhook Clip: ${resource_status} | ID: ${payment_request_id} | Recibo: ${receipt_no} | Tipo: ${payment_type}`);

        if (resource_status === 'COMPLETED') {
            // Actualizar estado de la reserva en CSV
            const codigo = req.body.metadata?.me_reference_id;
            if (codigo) {
                actualizarEstadoReserva(codigo, 'Pagado');
                console.log(`Reserva ${codigo} marcada como Pagado`);
            }
        }

        res.json({ received: true });
    } catch (error) {
        console.error('Error en webhook:', error);
        res.status(500).json({ error: error.message });
    }
});

// Función para actualizar estado de reserva en CSV
function actualizarEstadoReserva(codigo, nuevoEstado) {
    try {
        const csvData = fs.readFileSync(CSV_FILE, 'utf8');
        const lines = csvData.split('\n');
        const updatedLines = lines.map(line => {
            if (line.includes(`"${codigo}"`)) {
                // Reemplazar estado "Pago en proceso" o "Pendiente" por nuevo estado
                return line.replace(/"Pago en proceso"|"Pendiente"/, `"${nuevoEstado}"`);
            }
            return line;
        });
        fs.writeFileSync(CSV_FILE, updatedLines.join('\n'), 'utf8');
    } catch (error) {
        console.error('Error actualizando estado:', error);
    }
}

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
