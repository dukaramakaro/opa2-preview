const express = require('express');
const Stripe = require('stripe');
const path = require('path');
const fs = require('fs');

const app = express();
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

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

// Crear sesión de pago
app.post('/crear-pago', async (req, res) => {
    try {
        const { precio, descripcion, codigo, email } = req.body;
        
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card', 'oxxo'],
            line_items: [{
                price_data: {
                    currency: 'mxn',
                    product_data: {
                        name: 'Traslado OPA2',
                        description: descripcion
                    },
                    unit_amount: precio * 100 // Stripe usa centavos
                },
                quantity: 1
            }],
            mode: 'payment',
            success_url: `${req.headers.origin}/confirmacion.html?codigo=${codigo}`,
            cancel_url: `${req.headers.origin}`,
            customer_email: email,
            metadata: {
                codigo: codigo
            }
        });
        
        res.json({ url: session.url });
    } catch (error) {
        console.error('Error creando sesión:', error);
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
