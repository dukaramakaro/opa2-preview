# Configuración de dominio opa2.com.mx (GoDaddy → Render)

## Paso 1: Agregar dominio custom en Render

1. Ir a https://dashboard.render.com
2. Seleccionar el servicio **opa2-test**
3. Ir a **Settings** → **Custom Domains**
4. Click en **Add Custom Domain**
5. Agregar: `opa2.com.mx`
6. (Opcional) Agregar también: `www.opa2.com.mx`
7. Render te mostrará los registros DNS que necesitas configurar. Tomar nota de ellos.

> Render proporciona SSL gratis automáticamente una vez que el DNS esté apuntando correctamente.

## Paso 2: Configurar DNS en GoDaddy

1. Ir a https://dcc.godaddy.com/manage-dns (o Mi Cuenta → Dominios → opa2.com.mx → DNS)
2. En la sección **Registros DNS**, configurar:

### Opción A: Usando CNAME (Recomendado)

| Tipo  | Nombre | Valor                          | TTL  |
|-------|--------|--------------------------------|------|
| CNAME | @      | opa2-test.onrender.com         | 1hr  |
| CNAME | www    | opa2-test.onrender.com         | 1hr  |

> **Nota:** GoDaddy puede no permitir CNAME en el root (@). Si es así, usar Opción B.

### Opción B: Si GoDaddy no permite CNAME en root

| Tipo  | Nombre | Valor                             | TTL  |
|-------|--------|-----------------------------------|------|
| A     | @      | (IP que Render te proporcione)    | 1hr  |
| CNAME | www    | opa2-test.onrender.com            | 1hr  |

Para obtener la IP de Render:
- En el dashboard de Render, al agregar el custom domain, Render te indica si necesitas un registro A y te da la IP.

### Registros a ELIMINAR en GoDaddy

- Eliminar cualquier registro A existente que apunte a una IP de parking de GoDaddy
- Eliminar cualquier registro CNAME en @ o www que apunte a otro lugar

## Paso 3: Verificar la configuración

1. Esperar entre 5 minutos y 48 horas para la propagación DNS (normalmente menos de 30 min)
2. Verificar propagación en: https://dnschecker.org/#CNAME/opa2.com.mx
3. En Render, el estatus del custom domain debe cambiar a **Verified** con candado verde (SSL activo)

## Paso 4: Verificar que todo funciona

- [ ] `https://opa2.com.mx` carga el sitio correctamente
- [ ] `https://www.opa2.com.mx` redirige o carga correctamente
- [ ] El formulario de reservación funciona
- [ ] Los pagos con Clip redirigen correctamente a `https://opa2.com.mx/confirmacion.html`
- [ ] El panel admin funciona en `https://opa2.com.mx/admin.html`
- [ ] El certificado SSL está activo (candado verde en el navegador)

## Variables de entorno en Render

No se necesitan cambios en las variables de entorno de Render. El servidor usa `req.headers.origin` dinámicamente, con `https://opa2.com.mx` como fallback.

## Troubleshooting

- **SSL no activa:** Esperar a que el DNS propague completamente. Render emite el certificado automáticamente.
- **ERR_TOO_MANY_REDIRECTS:** Verificar que no haya redirección de GoDaddy activada en el dominio.
- **Pagos Clip no redirigen bien:** Verificar que el origin header llegue correctamente al server.
