require('dotenv').config();
const express = require('express');
const path = require('path');
const https = require('https');
const { createClient } = require('@supabase/supabase-js');

const app = express();

const CLIP_API_KEY = process.env.CLIP_API_KEY || '';
const CLIP_SECRET_KEY = process.env.CLIP_SECRET_KEY || '';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'playa2026*';

// Supabase
const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_ANON_KEY || ''
);

app.use(express.json());
app.use(express.static('.'));

// Helper: validar auth del admin
function validarAdmin(req) {
    const auth = req.headers.authorization;
    if (!auth) return false;
    try {
        const token = auth.split(' ')[1];
        return Buffer.from(token, 'base64').toString() === ADMIN_PASSWORD;
    } catch (e) {
        return false;
    }
}

// Endpoint para guardar reserva
app.post('/guardar-reserva', async (req, res) => {
    try {
        const data = req.body;
        const { error } = await supabase.from('reservas').insert({
            codigo: data.codigo || null,
            nombre: data.nombre || '',
            email: data.email || '',
            telefono: data.telefono || '',
            vuelo: data.vuelo || '',
            servicio: data.servicio || '',
            origen: data.origen || '',
            destino: data.destino || '',
            fecha_viaje: data.fecha || '',
            pasajeros: data.pasajeros || '',
            vehiculo: data.vehiculo || '',
            total: data.total || '',
            estado: data.estado || 'Pendiente',
            notas: data.notas || '',
            idioma: data.idioma || 'es'
        });

        if (error) {
            console.error('Error Supabase insert:', error);
            return res.status(500).json({ error: error.message });
        }
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
    if (!auth) return res.json({ valid: false });
    try {
        const token = auth.split(' ')[1];
        const password = Buffer.from(token, 'base64').toString();
        res.json({ valid: password === ADMIN_PASSWORD });
    } catch (error) {
        res.json({ valid: false });
    }
});

// Panel admin - ver reservas
app.get('/admin/reservas', async (req, res) => {
    if (!validarAdmin(req)) return res.status(401).json({ error: 'No autorizado' });

    try {
        const { data, error } = await supabase
            .from('reservas')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) return res.status(500).json({ error: error.message });

        const reservas = (data || []).map(r => ({
            Fecha: r.created_at,
            Codigo: r.codigo,
            Nombre: r.nombre,
            Email: r.email,
            Telefono: r.telefono,
            Vuelo: r.vuelo,
            Servicio: r.servicio,
            Origen: r.origen,
            Destino: r.destino,
            FechaViaje: r.fecha_viaje,
            Pasajeros: r.pasajeros,
            Vehiculo: r.vehiculo,
            Total: r.total,
            Estado: r.estado,
            Notas: r.notas
        }));

        res.json({ reservas });
    } catch (error) {
        console.error('Error leyendo reservas:', error);
        res.status(500).json({ error: error.message });
    }
});

// Descargar CSV (genera CSV desde Supabase)
app.get('/admin/descargar', async (req, res) => {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ error: 'No autorizado' });
    try {
        const token = auth.replace('Bearer ', '');
        if (Buffer.from(token, 'base64').toString() !== ADMIN_PASSWORD) {
            return res.status(401).json({ error: 'No autorizado' });
        }
    } catch (e) {
        return res.status(401).json({ error: 'No autorizado' });
    }

    const { data, error } = await supabase
        .from('reservas')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });

    const headers = 'Fecha,Codigo,Nombre,Email,Telefono,Vuelo,Servicio,Origen,Destino,FechaViaje,Pasajeros,Vehiculo,Total,Estado,Notas';
    const rows = (data || []).map(r => [
        r.created_at, r.codigo, r.nombre, r.email, r.telefono, r.vuelo,
        r.servicio, r.origen, r.destino, r.fecha_viaje, r.pasajeros,
        r.vehiculo, r.total, r.estado, r.notas
    ].map(f => `"${(f || '').toString().replace(/"/g, '""')}"`).join(','));

    const csv = [headers, ...rows].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=reservas_opa2_${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csv);
});

// Confirmar pago desde página de confirmación (Clip redirige aquí)
app.post('/confirmar-pago', async (req, res) => {
    const { codigo } = req.body;
    if (!codigo) return res.status(400).json({ error: 'Código requerido' });

    try {
        const { error } = await supabase
            .from('reservas')
            .update({ estado: 'Pagado' })
            .eq('codigo', codigo);

        if (error) return res.status(500).json({ error: error.message });
        res.json({ success: true });
    } catch (error) {
        console.error('Error confirmando pago:', error);
        res.status(500).json({ error: error.message });
    }
});

// Admin - actualizar estado manualmente
app.post('/admin/actualizar-estado', async (req, res) => {
    if (!validarAdmin(req)) return res.status(401).json({ error: 'No autorizado' });

    const { codigo, estado } = req.body;
    if (!codigo || !estado) return res.status(400).json({ error: 'Código y estado requeridos' });

    try {
        const { error } = await supabase
            .from('reservas')
            .update({ estado })
            .eq('codigo', codigo);

        if (error) return res.status(500).json({ error: error.message });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Admin - crear reserva manual
app.post('/admin/nueva-reserva', async (req, res) => {
    if (!validarAdmin(req)) return res.status(401).json({ error: 'No autorizado' });

    const data = req.body;
    const codigo = 'OPA2-' + new Date().getFullYear() + '-' + Math.floor(100000 + Math.random() * 900000);

    try {
        const { error } = await supabase.from('reservas').insert({
            codigo: codigo,
            nombre: data.nombre || '',
            email: data.email || '',
            telefono: data.telefono || '',
            vuelo: data.vuelo || '',
            servicio: data.servicio || '',
            origen: data.origen || '',
            destino: data.destino || '',
            fecha_viaje: data.fecha_viaje || '',
            pasajeros: data.pasajeros || '',
            vehiculo: data.vehiculo || '',
            total: data.total || '',
            estado: data.estado || 'Pendiente',
            notas: data.notas || ''
        });

        if (error) return res.status(500).json({ error: error.message });
        res.json({ success: true, codigo: codigo });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor OPA2 corriendo en puerto ${PORT}`);
});
