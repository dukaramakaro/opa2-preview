# Tutorial: Panel de Administración OPA2
## Guía completa para gestionar reservas

---

## 1. Acceder al Panel de Administración

### Desde la página principal:
1. Abre tu sitio web OPA2 (ej: `https://tu-dominio.com`)
2. Baja hasta el **footer** (pie de página)
3. En la sección de copyright, haz clic en el texto **"OPA2 Soluciones Integrales"**
4. Esto te llevará a `/admin.html`

### Acceso directo:
- Navega directamente a: `https://tu-dominio.com/admin.html`

### Iniciar sesión:
1. Ingresa la contraseña de administrador
2. Presiona **Enter** o haz clic en **"Entrar"**
3. Si la contraseña es correcta, verás el dashboard principal

> **Nota:** La sesión se mantiene activa hasta que cierres sesión. Si cierras el navegador, al regresar seguirás autenticado.

---

## 2. Dashboard Principal

Al entrar verás:

### Tarjetas de estadísticas (parte superior):
| Tarjeta | Descripción |
|---------|-------------|
| **Total Reservas** | Número total de reservaciones en el sistema |
| **Pagadas** (verde) | Reservaciones con pago confirmado |
| **En Proceso** (ámbar) | Reservaciones pendientes de pago |
| **Hoy** | Reservaciones creadas en el día actual |

### Barra de herramientas:
- **Buscador** — Busca por nombre, código o destino
- **Filtro de estado** — Filtra por estado (Pendiente, Pagado, etc.)
- **Ordenar por** — Ordena la tabla (recientes, nombre, fecha de viaje)
- **Ocultar finalizadas** — Toggle para esconder reservas completadas/canceladas

### Tabla de reservaciones:
Cada fila muestra: Fecha, Código, Cliente, Contacto, Servicio, Ruta, Fecha de Viaje, Total, Estado y Acciones.

> **Auto-refresh:** El dashboard se actualiza automáticamente cada 30 segundos.

---

## 3. Actualizar el Estado de una Reserva

### Pasos:
1. Encuentra la reserva en la tabla (usa el buscador si necesitas)
2. Haz clic en la **etiqueta de estado** (el badge de color junto a cada reserva)
3. Se abrirá un menú desplegable con las opciones:

| Estado | Color | Significado |
|--------|-------|-------------|
| **Pendiente** | Gris | Reserva recién creada, sin acción |
| **Pago en proceso** | Amarillo | Cliente inició el pago pero no se ha confirmado |
| **Pagado** | Verde | Pago confirmado exitosamente |
| **Conductor asignado** | Azul | Ya se asignó un conductor al servicio |
| **En camino** | Morado | El conductor va en camino al punto de recogida |
| **Completado** | Verde oscuro | Servicio finalizado |
| **Cancelado** | Rojo | Reserva cancelada |

4. Selecciona el nuevo estado
5. El cambio se guarda **inmediatamente** en la base de datos

### Flujo recomendado de estados:
```
Pendiente → Pago en proceso → Pagado → Conductor asignado → En camino → Completado
```

---

## 4. Crear una Reserva Manual

Útil cuando un cliente reserva por teléfono o WhatsApp.

### Pasos:
1. Haz clic en el botón rojo **"+ Nueva Reserva"** (esquina superior derecha)
2. Se abrirá un formulario con los campos:
   - **Nombre** del cliente
   - **Email** (opcional)
   - **Teléfono**
   - **Número de vuelo** (opcional)
   - **Tipo de servicio** (Airport Shuttle, Privado, etc.)
   - **Pasajeros**
   - **Origen** (punto de recogida)
   - **Destino**
   - **Fecha del viaje**
   - **Total** (precio acordado)
   - **Estado** inicial
   - **Vehículo** asignado
   - **Notas** adicionales
3. Haz clic en **"Guardar Reserva"**
4. El sistema generará automáticamente un código único (ej: `OPA2-2026-483921`)
5. La reserva aparecerá inmediatamente en la tabla

---

## 5. Eliminar una Reserva

### Pasos:
1. Encuentra la reserva en la tabla
2. Haz clic en el ícono de **basura** (🗑️) en la columna de Acciones
3. Confirma la eliminación en el diálogo que aparece
4. La reserva se eliminará permanentemente de la base de datos

> **Precaución:** Esta acción NO se puede deshacer. Asegúrate antes de eliminar.

---

## 6. Descargar Archivo CSV (Excel)

### Para descargar todas las reservaciones:
1. Haz clic en el botón verde/teal **"Descargar CSV"** (parte superior del dashboard)
2. Se descargará automáticamente un archivo llamado:
   ```
   reservas_opa2_2026-03-11.csv
   ```
   (la fecha corresponde al día de la descarga)

### ¿Qué contiene el CSV?
El archivo incluye todas las reservaciones con estas columnas:
- Fecha de creación
- Código de reserva
- Nombre del cliente
- Email
- Teléfono
- Número de vuelo
- Tipo de servicio
- Origen y Destino
- Fecha del viaje
- Número de pasajeros
- Vehículo asignado
- Total (precio)
- Estado actual
- Notas

### Abrir el archivo CSV:
1. **En Excel:** Doble clic en el archivo → se abre automáticamente
2. **En Google Sheets:** Google Drive → Nuevo → Subir archivo → Seleccionar el CSV
3. **En Numbers (Mac):** Doble clic en el archivo

> **Tip:** Usa el CSV para llevar un respaldo de tus reservaciones o para análisis en hojas de cálculo.

---

## 7. Buscar y Filtrar Reservas

### Búsqueda por texto:
- Escribe en el campo **"Buscar por nombre, código o destino..."**
- La tabla se filtra en tiempo real mientras escribes
- Ejemplo: escribe "García" para encontrar todas las reservas de ese cliente

### Filtrar por estado:
- Usa el menú desplegable **"Todos los estados"**
- Selecciona un estado específico (ej: "Pagado") para ver solo esas reservas

### Ordenar resultados:
- Usa el menú **"Ordenar por"** con opciones:
  - Recientes primero (por defecto)
  - Antiguos primero
  - Fecha viaje (próximo)
  - Fecha viaje (lejano)
  - Nombre A-Z
  - Nombre Z-A

### Ocultar finalizadas:
- Activa el toggle **"Ocultar finalizadas"** para esconder reservas con estado Completado o Cancelado
- Esta preferencia se guarda automáticamente en tu navegador

---

## 8. Consultar una Reserva (para clientes)

Los clientes pueden rastrear su reserva sin acceder al admin:

### URL de consulta:
```
https://tu-dominio.com/consultar-reserva/OPA2-2026-XXXXXX
```

Esto devuelve la información pública de la reserva: nombre, servicio, origen, destino, fecha, pasajeros, vehículo, total y estado actual.

---

## 9. Cerrar Sesión

1. Haz clic en el botón gris **"Salir"** (esquina superior derecha)
2. Se eliminará tu token de autenticación
3. Serás redirigido a la pantalla de login

---

## Resumen Rápido de Acciones

| Acción | Cómo |
|--------|------|
| Acceder al admin | Footer → "OPA2 Soluciones Integrales" o `/admin.html` |
| Ver reservas | Se cargan automáticamente al entrar |
| Cambiar estado | Clic en el badge de estado → seleccionar nuevo |
| Nueva reserva | Botón "+ Nueva Reserva" → llenar formulario |
| Eliminar reserva | Ícono de basura → confirmar |
| Descargar CSV | Botón "Descargar CSV" |
| Buscar | Escribir en el campo de búsqueda |
| Filtrar | Menú desplegable de estados |
| Cerrar sesión | Botón "Salir" |
