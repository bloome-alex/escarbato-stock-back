import 'dotenv/config';
import mongoose from 'mongoose';
import { Auditoria, Caja, MetodoPago, Producto, Proveedor, Stock, Tipo, Venta } from '../models/index.js';

const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/escarbato_petshop';
const mongoDbName = process.env.MONGODB_DB_NAME;
const resetAll = process.argv.includes('--reset-all');
const demoIdPattern = /^demo-/;

const models = [Proveedor, Tipo, Producto, Stock, MetodoPago, Caja, Venta, Auditoria];

const money = value => Number(value.toFixed(2));
const daysAgo = days => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
const demoId = value => `demo-${value}`;

const proveedores = [
  { id: demoId('proveedor-patagon-pets'), nombre: 'Patagon Pets', contacto: 'Lucia Navarro', telefono: '11 4020-1100', email: 'ventas@patagonpets.test', notas: 'Alimentos balanceados y snacks naturales.' },
  { id: demoId('proveedor-mundo-felino'), nombre: 'Mundo Felino', contacto: 'Martin Silva', telefono: '11 4020-2200', email: 'pedidos@mundofelino.test', notas: 'Accesorios para gatos y sanitarios.' },
  { id: demoId('proveedor-huellas'), nombre: 'Huellas Distribuidora', contacto: 'Carla Gomez', telefono: '11 4020-3300', email: 'contacto@huellasdist.test', notas: 'Juguetes, correas y productos de higiene.' },
  { id: demoId('proveedor-aqua'), nombre: 'Aqua & Plumas', contacto: 'Diego Torres', telefono: '11 4020-4400', email: 'aqua@plumas.test', notas: 'Productos para aves, peces y pequenos animales.' }
];

const tipos = [
  { id: demoId('tipo-alimentos'), nombre: 'Alimentos', desc: 'Balanceados, humedos y dietas especiales.' },
  { id: demoId('tipo-snacks'), nombre: 'Snacks', desc: 'Premios y golosinas para entrenamiento.' },
  { id: demoId('tipo-higiene'), nombre: 'Higiene', desc: 'Shampoo, sanitarios y limpieza.' },
  { id: demoId('tipo-accesorios'), nombre: 'Accesorios', desc: 'Correas, platos, camas y transporte.' },
  { id: demoId('tipo-juguetes'), nombre: 'Juguetes', desc: 'Pelotas, mordillos y entretenimiento.' },
  { id: demoId('tipo-farmacia'), nombre: 'Farmacia', desc: 'Antiparasitarios y suplementos.' }
];

const productosBase = [
  ['Alimento perro adulto 15kg', 'tipo-alimentos', 'proveedor-patagon-pets', 18500, 42, 6, 'Bolsa premium para perros adultos.'],
  ['Alimento cachorro 10kg', 'tipo-alimentos', 'proveedor-patagon-pets', 15200, 45, 5, 'Formula con proteina reforzada para crecimiento.'],
  ['Alimento gato indoor 7.5kg', 'tipo-alimentos', 'proveedor-mundo-felino', 14100, 48, 4, 'Control de peso y bolas de pelo.'],
  ['Lata pate salmon 340g', 'tipo-alimentos', 'proveedor-mundo-felino', 1200, 55, 12, 'Alimento humedo para gatos adultos.'],
  ['Snack dental perro mediano', 'tipo-snacks', 'proveedor-patagon-pets', 2300, 50, 10, 'Premio dental de uso diario.'],
  ['Bocaditos de pollo 100g', 'tipo-snacks', 'proveedor-huellas', 950, 60, 15, 'Snack blando para perros y gatos.'],
  ['Arena aglomerante 10kg', 'tipo-higiene', 'proveedor-mundo-felino', 6200, 38, 8, 'Arena perfumada de alto rendimiento.'],
  ['Shampoo piel sensible 250ml', 'tipo-higiene', 'proveedor-huellas', 1800, 52, 6, 'Higiene suave para perros y gatos.'],
  ['Correa reflectiva regulable', 'tipo-accesorios', 'proveedor-huellas', 3500, 47, 5, 'Correa resistente con detalles reflectivos.'],
  ['Cama oval mediana', 'tipo-accesorios', 'proveedor-huellas', 9800, 40, 3, 'Cama lavable con base antideslizante.'],
  ['Transportadora chica', 'tipo-accesorios', 'proveedor-mundo-felino', 11200, 42, 3, 'Transportadora plastica para mascotas pequenas.'],
  ['Pelota mordillo caucho', 'tipo-juguetes', 'proveedor-huellas', 1600, 65, 8, 'Juguete resistente para perros activos.'],
  ['Varita con plumas', 'tipo-juguetes', 'proveedor-mundo-felino', 900, 70, 10, 'Juguete interactivo para gatos.'],
  ['Rueda hamster silenciosa', 'tipo-juguetes', 'proveedor-aqua', 4100, 45, 4, 'Accesorio para pequenos roedores.'],
  ['Antiparasitario spot-on 10-20kg', 'tipo-farmacia', 'proveedor-huellas', 5200, 35, 7, 'Tratamiento mensual para perros medianos.'],
  ['Suplemento omega 3 60 capsulas', 'tipo-farmacia', 'proveedor-patagon-pets', 7300, 36, 4, 'Suplemento para piel y pelaje.'],
  ['Alimento peces tropicales 100g', 'tipo-alimentos', 'proveedor-aqua', 1700, 48, 6, 'Escamas para peces tropicales.'],
  ['Mix semillas aves 1kg', 'tipo-alimentos', 'proveedor-aqua', 2100, 46, 5, 'Mezcla seleccionada para aves domesticas.']
];

const metodosPago = [
  { id: demoId('metodo-efectivo'), nombre: 'Efectivo', descuento: 5, recargo: 0 },
  { id: demoId('metodo-debito'), nombre: 'Debito', descuento: 0, recargo: 0 },
  { id: demoId('metodo-credito'), nombre: 'Credito', descuento: 0, recargo: 10 },
  { id: demoId('metodo-transferencia'), nombre: 'Transferencia', descuento: 3, recargo: 0 },
  { id: demoId('metodo-qr'), nombre: 'QR billetera virtual', descuento: 0, recargo: 2 }
];

const productos = productosBase.map(([nombre, tipoKey, proveedorKey, costo, porcentaje, minStock, desc], index) => {
  const precio = money(costo * (1 + porcentaje / 100));
  return {
    id: demoId(`producto-${String(index + 1).padStart(2, '0')}`),
    nombre,
    tipoId: demoId(tipoKey),
    proveedorId: demoId(proveedorKey),
    costo,
    porcentaje,
    precio,
    precioFinal: precio,
    minStock,
    updatedAt: new Date(Date.now() - index * 60 * 60 * 1000),
    desc
  };
});

const stock = productos.map((producto, index) => ({
  id: producto.id,
  qty: [18, 9, 7, 25, 4, 19, 6, 11, 3, 2, 5, 16, 22, 4, 1, 3, 12, 8][index]
}));

const cajas = [
  {
    id: demoId('caja-cerrada-ayer'),
    status: 'cerrada',
    openedAt: daysAgo(1.35),
    closedAt: daysAgo(1.05),
    initialAmounts: [{ metodoPagoId: demoId('metodo-efectivo'), metodoPagoNombre: 'Efectivo', monto: 25000 }],
    createdAt: daysAgo(1.35)
  },
  {
    id: demoId('caja-abierta-hoy'),
    status: 'abierta',
    openedAt: daysAgo(0.25),
    closedAt: '',
    initialAmounts: [
      { metodoPagoId: demoId('metodo-efectivo'), metodoPagoNombre: 'Efectivo', monto: 30000 },
      { metodoPagoId: demoId('metodo-transferencia'), metodoPagoNombre: 'Transferencia', monto: 0 }
    ],
    createdAt: daysAgo(0.25)
  }
];

const ventaSpecs = [
  { id: 'venta-001', days: 1.22, cliente: 'Sofia Martinez', method: 0, caja: 0, items: [[0, 1], [4, 2]] },
  { id: 'venta-002', days: 1.12, cliente: 'Nicolas Perez', method: 1, caja: 0, items: [[6, 1], [12, 1]] },
  { id: 'venta-003', days: 0.21, cliente: 'Laura Fernandez', method: 3, caja: 1, items: [[2, 1], [3, 4]] },
  { id: 'venta-004', days: 0.16, cliente: 'Mostrador', method: 0, caja: 1, items: [[5, 3], [11, 1]] },
  { id: 'venta-005', days: 0.09, cliente: 'Mariano Ruiz', method: 2, caja: 1, items: [[9, 1], [14, 1]] },
  { id: 'venta-006', days: 0.03, cliente: 'Camila Lopez', method: 4, caja: 1, items: [[16, 2], [17, 1]] }
];

const ventas = ventaSpecs.map(spec => {
  const metodoPago = metodosPago[spec.method];
  const items = spec.items.map(([productIndex, qty]) => {
    const producto = productos[productIndex];
    const subtotal = money(producto.precioFinal * qty);
    return { productId: producto.id, productName: producto.nombre, qty, price: producto.precioFinal, subtotal };
  });
  const calculatedTotal = money(items.reduce((total, item) => total + item.subtotal, 0));
  const multiplier = 1 - metodoPago.descuento / 100 + metodoPago.recargo / 100;

  return {
    id: demoId(spec.id),
    cliente: spec.cliente,
    items,
    metodoPago: {
      id: metodoPago.id,
      nombre: metodoPago.nombre,
      descuento: metodoPago.descuento,
      recargo: metodoPago.recargo
    },
    cajaId: cajas[spec.caja].id,
    calculatedTotal,
    finalTotal: money(calculatedTotal * multiplier),
    createdAt: daysAgo(spec.days)
  };
});

const auditoria = [
  { id: demoId('audit-001'), action: 'crear', entity: 'proveedores', detail: 'Se cargaron proveedores de demostracion.', createdAt: daysAgo(2) },
  { id: demoId('audit-002'), action: 'crear', entity: 'productos', detail: 'Se importo catalogo inicial de productos demo.', createdAt: daysAgo(1.9) },
  { id: demoId('audit-003'), action: 'crear', entity: 'cajas', detail: 'Se abrio la caja de demostracion.', createdAt: daysAgo(0.25) },
  { id: demoId('audit-004'), action: 'crear', entity: 'ventas', detail: 'Se registraron ventas ficticias para el tablero.', createdAt: daysAgo(0.03) }
];

async function clearData() {
  if (resetAll) {
    await Promise.all(models.map(Model => Model.deleteMany({})));
    return;
  }

  await Promise.all(models.map(Model => Model.deleteMany({ id: demoIdPattern })));
}

async function seed() {
  await clearData();
  await Proveedor.insertMany(proveedores);
  await Tipo.insertMany(tipos);
  await MetodoPago.insertMany(metodosPago);
  await Producto.insertMany(productos);
  await Stock.insertMany(stock);
  await Caja.insertMany(cajas);
  await Venta.insertMany(ventas);
  await Auditoria.insertMany(auditoria);
}

try {
  await mongoose.connect(mongoUri, mongoDbName ? { dbName: mongoDbName } : undefined);
  await seed();
  console.log('Datos demo cargados correctamente.');
  console.log(`Proveedores: ${proveedores.length}`);
  console.log(`Tipos: ${tipos.length}`);
  console.log(`Productos: ${productos.length}`);
  console.log(`Metodos de pago: ${metodosPago.length}`);
  console.log(`Stock: ${stock.length}`);
  console.log(`Cajas: ${cajas.length}`);
  console.log(`Ventas: ${ventas.length}`);
  console.log(`Auditoria: ${auditoria.length}`);
} catch (error) {
  console.error('Error cargando datos demo:', error);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
