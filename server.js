const express = require('express');
const Stripe = require('stripe');
const path = require('path');

const app = express();
const stripe = Stripe('sk_test_51SgXdJRwgHVCrnG8WdJlhS3yiSuVgjmMfJpgkZ7p0ziOF53tsRutlMoXIeUJJkKxTKTnNl2DnIXVjt5s7zfRJBVR00JRxRhkAC');

app.use(express.json());
app.use(express.static('.'));

// Crear sesión de pago
app.post('/crear-pago', async (req, res) => {
    try {
        const { precio, descripcion, codigo, email } = req.body;
        
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor OPA2 corriendo en puerto ${PORT}`);
});
