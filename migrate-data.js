require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

const reservas = [
  {
    created_at: '2026-02-05 03:45:29.556685+00',
    codigo: 'OPA2-2026-905976',
    nombre: 'Alvaro Mizar De la Vega Diaz',
    email: 'alvaro.hanzo@gmail.com',
    telefono: '+524613128429',
    vuelo: 'aa67676',
    servicio: 'Airport Shuttle (Ida)',
    origen: 'Aeropuerto de Cancún (CUN)',
    destino: '⚠️ PRUEBA CLIP (Eliminar)',
    fecha_viaje: '27 Feb 2026',
    pasajeros: '2',
    vehiculo: 'Van (1-10 pax) - Estándar',
    total: '$10 MXN',
    estado: 'Pago en proceso',
    notas: 'Sin notas',
    idioma: 'es'
  },
  {
    created_at: '2026-02-05 15:13:15.982962+00',
    codigo: 'OPA2-2026-472429',
    nombre: 'OSCAR DARIO PEREZ REINA',
    email: 'oscar_perez_reina@hotmail.com',
    telefono: '9842160298',
    vuelo: 'Aa2353',
    servicio: 'Airport Shuttle (Round trip)',
    origen: 'Aeropuerto de Cancún (CUN)',
    destino: 'Airbnb pepito (Puerto Morelos)',
    fecha_viaje: '12 Feb 2026, 06:15 → 21 Feb 2026, 05:12',
    pasajeros: '2',
    vehiculo: 'Van (1-10 pax) - Estándar',
    total: '$150 USD',
    estado: 'Pago en proceso',
    notas: 'Sin notas',
    idioma: 'en'
  },
  {
    created_at: '2026-02-05 15:19:02.050772+00',
    codigo: 'OPA2-2026-202063',
    nombre: 'Alvaro De La Vega',
    email: 'alvaro.hanzo@gmail.com',
    telefono: '52984123456',
    vuelo: 'No especificado',
    servicio: 'Airport Shuttle (One way)',
    origen: 'Aeropuerto de Cancún (CUN)',
    destino: '⚠️ PRUEBA CLIP (Eliminar)',
    fecha_viaje: '19 Feb 2026',
    pasajeros: '2',
    vehiculo: 'Van (1-10 pax) - Estándar',
    total: '$1 USD',
    estado: 'Pago en proceso',
    notas: 'Sin notas',
    idioma: 'en'
  },
  {
    created_at: '2026-02-05 15:19:13.148338+00',
    codigo: 'OPA2-2026-944764',
    nombre: 'OSCAR DARIO PEREZ REINA',
    email: 'oscar_perez_reina@hotmail.com',
    telefono: '9842160298',
    vuelo: 'Am 1346',
    servicio: 'Airport Shuttle (One way)',
    origen: 'Aeropuerto de Cancún (CUN)',
    destino: 'Iberostar Paraíso Maya (Maroma)',
    fecha_viaje: '11 Feb 2026, 04:09',
    pasajeros: '2',
    vehiculo: 'Van (1-10 pax) - Estándar',
    total: '$1 USD',
    estado: 'Pago en proceso',
    notas: 'Con silla de bebe',
    idioma: 'en'
  },
  {
    created_at: '2026-02-05 15:20:24.995122+00',
    codigo: 'OPA2-2026-212245',
    nombre: 'Alvaro De La Vega',
    email: 'alvaro.hanzo@gmail.com',
    telefono: '555555555',
    vuelo: 'Hhhh',
    servicio: 'Airport Shuttle (Ida)',
    origen: 'Aeropuerto de Cancún (CUN)',
    destino: '⚠️ PRUEBA CLIP (Eliminar)',
    fecha_viaje: '19 Feb 2026',
    pasajeros: '2',
    vehiculo: 'Van (1-10 pax) - Estándar',
    total: '$10 MXN',
    estado: 'Pago en proceso',
    notas: 'Sin notas',
    idioma: 'es'
  },
  {
    created_at: '2026-02-06 19:48:45.167383+00',
    codigo: 'OPA2-2026-791425',
    nombre: 'rafael zambrano',
    email: 'rafaelzt@gmail.com',
    telefono: '+52 984 215 8704',
    vuelo: 'AA1315',
    servicio: 'Airport Shuttle (One way)',
    origen: 'Aeropuerto de Cancún (CUN)',
    destino: 'Iberostar Selection Cancun (Zona Hotelera Cancún)',
    fecha_viaje: '7 Feb 2026, 14:47',
    pasajeros: '4',
    vehiculo: 'Van (1-10 pax) - Estándar',
    total: '$1 USD',
    estado: 'Pago en proceso',
    notas: 'Sin notas',
    idioma: 'en'
  },
  {
    created_at: '2026-02-06 20:10:53.124799+00',
    codigo: 'OPA2-2026-443588',
    nombre: 'rafael zambrano',
    email: 'rafaelzt@gmail.com',
    telefono: '+52 984 215 8704',
    vuelo: 'AA1315',
    servicio: 'Airport Shuttle (Redondo)',
    origen: 'Aeropuerto de Cancún (CUN)',
    destino: 'Hilton Cancun Mar Caribe (Zona Hotelera Cancún)',
    fecha_viaje: '7 Feb 2026, 15:10 → 7 Feb 2026, 20:10',
    pasajeros: '4',
    vehiculo: 'Van (1-10 pax) - Estándar',
    total: '$20 MXN',
    estado: 'Pagado',
    notas: 'Sin notas',
    idioma: 'es'
  },
  {
    created_at: '2026-02-06 20:14:29.195783+00',
    codigo: 'OPA2-2026-357957',
    nombre: 'rafael zambrano',
    email: 'rafaelzt@gmail.com',
    telefono: '+52 984 215 8704',
    vuelo: 'AA1315',
    servicio: 'Airport Shuttle (Round trip)',
    origen: 'Aeropuerto de Cancún (CUN)',
    destino: 'Iberostar Selection Cancun (Zona Hotelera Cancún)',
    fecha_viaje: '7 Feb 2026, 15:14 → 8 Feb 2026, 15:14',
    pasajeros: '4',
    vehiculo: 'Van (1-10 pax) - Estándar',
    total: '$1 USD',
    estado: 'Pago en proceso',
    notas: 'Sin notas',
    idioma: 'en'
  },
  {
    created_at: '2026-02-06 20:21:48.565486+00',
    codigo: 'OPA2-2026-835367',
    nombre: 'OSCAR DARIO PEREZ REINA',
    email: 'oscar_perez_reina@hotmail.com',
    telefono: '+19841150979',
    vuelo: 'Aa6567',
    servicio: 'Airport Shuttle (One way)',
    origen: 'Aeropuerto de Cancún (CUN)',
    destino: 'Hilton Playa del Carmen (Playa del Carmen)',
    fecha_viaje: '13 Feb 2026, 20:21',
    pasajeros: '2',
    vehiculo: 'Van (1-10 pax) - Estándar',
    total: '$1 USD',
    estado: 'Pago en proceso',
    notas: 'Sin notas',
    idioma: 'en'
  },
  {
    created_at: '2026-02-06 20:24:35.784437+00',
    codigo: 'OPA2-2026-789569',
    nombre: 'OSCAR DARIO PEREZ REINA',
    email: 'reserva@vosamx.com',
    telefono: '9841150979',
    vuelo: 'No especificado',
    servicio: 'Airport Shuttle (Ida)',
    origen: 'Aeropuerto de Cancún (CUN)',
    destino: '⚠️ PRUEBA CLIP (Eliminar)',
    fecha_viaje: '19 Feb 2026, 17:24',
    pasajeros: '2',
    vehiculo: 'Van (1-10 pax) - Estándar',
    total: '$10 MXN',
    estado: 'Completado',
    notas: 'Sin notas',
    idioma: 'es'
  },
  {
    created_at: '2026-02-24 15:33:24.077917+00',
    codigo: 'OPA2-2026-413737',
    nombre: 'oscar daruo perez reina',
    email: 'oscar_perez_reina@hotmail.com',
    telefono: '9842541705',
    vuelo: 'aa1234',
    servicio: 'Airport Shuttle (Ida)',
    origen: 'Aeropuerto de Cancún (CUN)',
    destino: 'Dreams Cancun Resort & Spa (Zona Hotelera Cancún)',
    fecha_viaje: '2 Mar 2026',
    pasajeros: '2',
    vehiculo: 'Van (1-10 pax) - Estándar',
    total: '$10 MXN',
    estado: 'Pagado',
    notas: '1 silla',
    idioma: 'es'
  },
  {
    created_at: '2026-03-10 17:23:05.043964+00',
    codigo: 'OPA2-2026-620408',
    nombre: 'ERIKA DE LA VEGA',
    email: 'soporteopa2@gmail.com',
    telefono: '+529842160298',
    vuelo: null,
    servicio: null,
    origen: 'Aeropuerto cancun',
    destino: 'playacar',
    fecha_viaje: '20/03/2026',
    pasajeros: '1',
    vehiculo: 'propio',
    total: '1800',
    estado: 'Pendiente',
    notas: 'paga FBGS',
    idioma: null
  }
];

async function migrate() {
  console.log(`Migrando ${reservas.length} reservas al nuevo Supabase...`);
  console.log(`URL: ${process.env.SUPABASE_URL}`);

  const { data, error } = await supabase
    .from('reservas')
    .insert(reservas)
    .select();

  if (error) {
    console.error('Error al migrar:', error);
    process.exit(1);
  }

  console.log(`✅ ${data.length} reservas migradas exitosamente!`);
  data.forEach(r => console.log(`  - ${r.codigo}: ${r.nombre}`));
}

migrate();
