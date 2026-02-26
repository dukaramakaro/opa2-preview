require('dotenv').config();
const express = require('express');
const path = require('path');
const https = require('https');
const { createClient } = require('@supabase/supabase-js');

const app = express();

const CLIP_API_KEY = process.env.CLIP_API_KEY || '';
const CLIP_SECRET_KEY = process.env.CLIP_SECRET_KEY || '';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'playa2026*';

// WhatsApp Cloud API (Meta Business)
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN || '';
const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_ID || '';
const ADMIN_WHATSAPP = process.env.ADMIN_WHATSAPP || '529842160298';

// Supabase
const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_ANON_KEY || ''
);

app.use(express.json());
app.use(express.static('.'));

// Función para enviar WhatsApp via Meta Cloud API
function enviarWhatsApp(telefono, mensaje) {
    if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_ID) {
        console.log('WhatsApp API no configurado - mensaje no enviado a:', telefono);
        return;
    }

    // Limpiar número de teléfono (solo dígitos)
    const phone = telefono.replace(/[^0-9]/g, '');
    if (!phone || phone.length < 10) {
        console.log('Número de teléfono inválido para WhatsApp:', telefono);
        return;
    }

    const data = JSON.stringify({
        messaging_product: 'whatsapp',
        to: phone,
        type: 'text',
        text: { body: mensaje }
    });

    const req = https.request({
        hostname: 'graph.facebook.com',
        path: `/v21.0/${WHATSAPP_PHONE_ID}/messages`,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
            'Content-Length': Buffer.byteLength(data)
        }
    }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                console.log('WhatsApp enviado a:', phone);
            } else {
                console.error('Error WhatsApp:', res.statusCode, body);
            }
        });
    });

    req.on('error', (err) => {
        console.error('Error de red WhatsApp:', err.message);
    });

    req.write(data);
    req.end();
}

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

        const origin = req.headers.origin || req.headers.referer || 'https://opa2.com.mx';

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

        // Obtener datos de la reserva para notificar al cliente
        const { data: reserva } = await supabase
            .from('reservas')
            .select('*')
            .eq('codigo', codigo)
            .single();

        if (reserva) {
            // WhatsApp al admin: notificación de reserva pagada
            const adminMsg = `🚐 *RESERVACIÓN PAGADA - OPA2*\n\n` +
                `📋 *Código:* ${codigo}\n` +
                `━━━━━━━━━━━━━━━━\n\n` +
                `👤 *CLIENTE*\n` +
                `Nombre: ${reserva.nombre}\n` +
                `Email: ${reserva.email}\n` +
                `Teléfono: ${reserva.telefono}\n` +
                `Vuelo: ${reserva.vuelo || 'No especificado'}\n` +
                `Notas: ${reserva.notas || 'Sin notas'}\n\n` +
                `🚗 *SERVICIO*\n` +
                `Tipo: ${reserva.servicio}\n` +
                `Origen: ${reserva.origen}\n` +
                `Destino: ${reserva.destino}\n` +
                `Fecha: ${reserva.fecha_viaje}\n` +
                `Pasajeros: ${reserva.pasajeros}\n` +
                `Vehículo: ${reserva.vehiculo}\n\n` +
                `💰 *Total:* ${reserva.total}\n` +
                `✅ *Estado:* Pagado`;
            enviarWhatsApp(ADMIN_WHATSAPP, adminMsg);

            // WhatsApp al cliente: confirmación de pago
            if (reserva.telefono) {
                const lang = reserva.idioma || 'es';
                const clientMsg = lang === 'es'
                    ? `¡Hola ${reserva.nombre}! ✅\n\n` +
                      `Tu pago ha sido *confirmado* exitosamente.\n\n` +
                      `📋 *Código:* ${codigo}\n` +
                      `🚗 ${reserva.origen} → ${reserva.destino}\n` +
                      `📅 ${reserva.fecha_viaje}\n` +
                      `💰 Total: ${reserva.total}\n\n` +
                      `Te contactaremos pronto con los detalles de tu conductor.\n\n` +
                      `¡Gracias por elegir OPA2 Transfers! 🌴`
                    : `Hello ${reserva.nombre}! ✅\n\n` +
                      `Your payment has been *confirmed* successfully.\n\n` +
                      `📋 *Code:* ${codigo}\n` +
                      `🚗 ${reserva.origen} → ${reserva.destino}\n` +
                      `📅 ${reserva.fecha_viaje}\n` +
                      `💰 Total: ${reserva.total}\n\n` +
                      `We will contact you soon with your driver details.\n\n` +
                      `Thank you for choosing OPA2 Transfers! 🌴`;
                enviarWhatsApp(reserva.telefono, clientMsg);
            }
        }

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

// Admin - eliminar reserva
app.delete('/admin/eliminar-reserva/:codigo', async (req, res) => {
    if (!validarAdmin(req)) return res.status(401).json({ error: 'No autorizado' });

    const codigo = req.params.codigo;
    if (!codigo) return res.status(400).json({ error: 'Código requerido' });

    try {
        const { error } = await supabase
            .from('reservas')
            .delete()
            .eq('codigo', codigo);

        if (error) return res.status(500).json({ error: error.message });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Consultar reserva pública (tracking)
app.get('/consultar-reserva/:codigo', async (req, res) => {
    const codigo = req.params.codigo;
    if (!codigo) return res.status(400).json({ error: 'Código requerido' });

    try {
        const { data, error } = await supabase
            .from('reservas')
            .select('codigo, nombre, servicio, origen, destino, fecha_viaje, pasajeros, vehiculo, total, estado, created_at')
            .eq('codigo', codigo)
            .single();

        if (error || !data) return res.status(404).json({ error: 'Reserva no encontrada' });

        res.json({
            codigo: data.codigo,
            nombre: data.nombre,
            servicio: data.servicio,
            origen: data.origen,
            destino: data.destino,
            fecha_viaje: data.fecha_viaje,
            pasajeros: data.pasajeros,
            vehiculo: data.vehiculo,
            total: data.total,
            estado: data.estado,
            created_at: data.created_at
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor OPA2 corriendo en puerto ${PORT}`);
});
