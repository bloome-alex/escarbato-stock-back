import 'dotenv/config';
import cors from 'cors';
import crypto from 'node:crypto';
import express from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { Auditoria, Caja, MetodoPago, Producto, Proveedor, Stock, Tipo, Venta } from './models/index.js';

const app = express();
const port = process.env.PORT || 3000;
const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/escarbato_petshop';
const jwtSecret = process.env.JWT_SECRET || 'change-me';
const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '8h';
const authUsername = process.env.AUTH_USERNAME || 'admin';
const authPassword = process.env.AUTH_PASSWORD || 'admin';
const corsOrigin = process.env.CORS_ORIGIN || '*';

app.use(cors({ origin: corsOrigin === '*' ? true : corsOrigin }));
app.use(express.json({ limit: '1mb' }));
app.use(express.static('src/public'));

const models = {
  proveedores: Proveedor,
  tipos: Tipo,
  productos: Producto,
  metodosPago: MetodoPago,
  stock: Stock,
  ventas: Venta,
  cajas: Caja,
  auditoria: Auditoria
};

const searchableFields = {
  proveedores: ['nombre', 'contacto', 'email', 'telefono'],
  tipos: ['nombre', 'desc'],
  productos: ['nombre', 'desc'],
  metodosPago: ['nombre'],
  stock: ['id'],
  ventas: ['cliente', 'items.productName', 'metodoPago.nombre'],
  cajas: ['status', 'initialAmounts.metodoPagoNombre']
};

function credentialHash() {
  return crypto.createHash('sha256').update(`${authUsername}:${authPassword}`).digest('hex');
}

function sanitize(doc) {
  const plain = doc.toObject ? doc.toObject() : doc;
  delete plain._id;
  return plain;
}

function sanitizeList(records) {
  return records.map(record => {
    delete record._id;
    return record;
  });
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildListQuery(store, queryParams) {
  const query = {};
  const q = String(queryParams.q || '').trim();
  if (q && searchableFields[store]) {
    const regex = new RegExp(escapeRegExp(q), 'i');
    query.$or = searchableFields[store].map(field => ({ [field]: regex }));
  }

  ['tipoId', 'proveedorId', 'id'].forEach(field => {
    if (queryParams[field]) query[field] = queryParams[field];
  });

  return query;
}

function getPagination(query) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || 10));
  return { page, limit, skip: (page - 1) * limit };
}

function getSort(store) {
  if (store === 'ventas' || store === 'auditoria' || store === 'cajas') return { createdAt: -1 };
  if (store === 'stock') return { id: 1 };
  return { nombre: 1 };
}

function getSortCollation(store) {
  if (store === 'ventas' || store === 'auditoria' || store === 'cajas') return null;
  return { locale: 'es', numericOrdering: true, strength: 2 };
}

function getStockQty(stockByProduct, productId) {
  return stockByProduct.get(productId) || 0;
}

function getDuplicateKeyMessage(store, error) {
  const keyPattern = error.keyPattern || {};
  if (keyPattern.id) return 'Ya existe un registro con ese identificador';

  if (store === 'proveedores') return 'Ya existe un proveedor con ese nombre';
  if (store === 'tipos') return 'Ya existe un tipo de producto con ese nombre';
  if (store === 'metodosPago') return 'Ya existe un método de pago con ese nombre';
  if (store === 'productos') return 'Ya existe un producto con ese nombre para el proveedor seleccionado';
  return 'Ya existe un registro con esos datos';
}

async function validateUniqueName(store, payload) {
  if (!['proveedores', 'tipos', 'productos', 'metodosPago'].includes(store)) return;

  const nombre = String(payload.nombre || '').trim();
  if (!nombre) return;

  const Model = models[store];
  const query = store === 'productos'
    ? { nombre, proveedorId: payload.proveedorId || null, id: { $ne: payload.id } }
    : { nombre, id: { $ne: payload.id } };

  const exists = await Model.findOne(query).collation({ locale: 'es', strength: 2 }).lean();
  if (!exists) return;

  const error = new Error(getDuplicateKeyMessage(store, { keyPattern: { nombre: 1 } }));
  error.statusCode = 400;
  throw error;
}

function validateProductoPayload(payload) {
  const proveedorId = String(payload.proveedorId || '').trim();
  if (proveedorId) {
    payload.proveedorId = proveedorId;
    return;
  }

  const error = new Error('Seleccioná un proveedor');
  error.statusCode = 400;
  throw error;
}

function buildUpdatePayload(store, payload) {
  const serverPayload = { ...payload };
  if (store === 'productos') {
    serverPayload.updatedAt = new Date();
    return serverPayload;
  }

  if (store === 'ventas' || store === 'auditoria' || store === 'cajas') {
    delete serverPayload.createdAt;
    return {
      $set: serverPayload,
      $setOnInsert: { createdAt: new Date().toISOString() }
    };
  }

  return serverPayload;
}

async function validateCajaPayload(payload) {
  const status = payload.status === 'cerrada' ? 'cerrada' : 'abierta';
  payload.status = status;
  payload.initialAmounts = Array.isArray(payload.initialAmounts) ? payload.initialAmounts : [];
  payload.initialAmounts = payload.initialAmounts.map(amount => ({
    metodoPagoId: String(amount.metodoPagoId || '').trim(),
    metodoPagoNombre: String(amount.metodoPagoNombre || '').trim(),
    monto: Math.max(0, Number(amount.monto || 0))
  })).filter(amount => amount.metodoPagoId && amount.metodoPagoNombre);

  if (status === 'abierta') {
    const openCaja = await Caja.findOne({ status: 'abierta', id: { $ne: payload.id } }).lean();
    if (openCaja) {
      const error = new Error('Ya hay una caja abierta. Cerrala antes de abrir otra.');
      error.statusCode = 400;
      throw error;
    }
    payload.openedAt = payload.openedAt || new Date().toISOString();
    payload.closedAt = '';
    return;
  }

  const existing = await Caja.findOne({ id: payload.id }).lean();
  if (!existing) {
    const error = new Error('No se encontró la caja a cerrar');
    error.statusCode = 404;
    throw error;
  }
  payload.openedAt = existing.openedAt;
  payload.initialAmounts = existing.initialAmounts || [];
  payload.closedAt = payload.closedAt || new Date().toISOString();
}

async function validateVentaPayload(payload) {
  const openCaja = await Caja.findOne({ status: 'abierta' }).lean();
  if (!openCaja) {
    const error = new Error('No hay una caja abierta. Abrí una caja antes de realizar ventas.');
    error.statusCode = 400;
    throw error;
  }
  payload.cajaId = openCaja.id;
}

function requireAuth(req, res, next) {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) return res.status(401).json({ error: 'Token requerido' });

  try {
    const payload = jwt.verify(token, jwtSecret);
    if (payload.username !== authUsername || payload.credentials !== credentialHash()) {
      return res.status(401).json({ error: 'Token inválido' });
    }
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido o vencido' });
  }
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  if (username !== authUsername || password !== authPassword) {
    return res.status(401).json({ error: 'Usuario o contraseña inválidos' });
  }

  const token = jwt.sign({ username, credentials: credentialHash() }, jwtSecret, { expiresIn: jwtExpiresIn });
  res.json({ token, tokenType: 'Bearer', expiresIn: jwtExpiresIn });
});

app.use('/api', requireAuth);

app.get('/api/dashboard', async (req, res, next) => {
  try {
    const [proveedoresCount, tipos, productos, stockRecords, recentProducts, auditActivity] = await Promise.all([
      Proveedor.countDocuments(),
      Tipo.find().lean(),
      Producto.find().lean(),
      Stock.find().lean(),
      Producto.find().sort({ _id: -1 }).limit(5).lean(),
      Auditoria.find().sort({ createdAt: -1 }).limit(8).lean()
    ]);

    const stockByProduct = stockRecords.reduce((acc, record) => {
      acc.set(record.id, record.qty);
      return acc;
    }, new Map());
    const tipoById = tipos.reduce((acc, tipo) => {
      acc.set(tipo.id, tipo.nombre);
      return acc;
    }, new Map());

    const lowStockProducts = productos
      .map(product => {
        const qty = getStockQty(stockByProduct, product.id);
        const minStock = product.minStock || 5;
        return {
          id: product.id,
          nombre: product.nombre,
          qty,
          minStock,
          status: qty <= 0 ? 'Sin stock' : 'Stock bajo'
        };
      })
      .filter(product => product.qty <= product.minStock);

    res.json({
      totals: {
        proveedores: proveedoresCount,
        tipos: tipos.length,
        productos: productos.length,
        lowStock: lowStockProducts.length
      },
      stockAlerts: lowStockProducts.slice(0, 5),
      recentProducts: sanitizeList(recentProducts).map(product => ({
        id: product.id,
        nombre: product.nombre,
        tipoId: product.tipoId,
        tipoNombre: tipoById.get(product.tipoId) || null,
        precio: product.precio,
        precioFinal: product.precioFinal
      })),
      auditActivity: sanitizeList(auditActivity)
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/data', async (req, res, next) => {
  try {
    const [proveedores, tipos, productos, metodosPago, stockRecords, ventas, cajas, auditoria] = await Promise.all([
      Proveedor.find().lean(),
      Tipo.find().lean(),
      Producto.find().lean(),
      MetodoPago.find().lean(),
      Stock.find().lean(),
      Venta.find().lean(),
      Caja.find().lean(),
      Auditoria.find().lean()
    ]);

    const stock = stockRecords.reduce((acc, record) => {
      acc[record.id] = record.qty;
      return acc;
    }, {});

    res.json({
      proveedores: sanitizeList(proveedores),
      tipos: sanitizeList(tipos),
      productos: sanitizeList(productos),
      metodosPago: sanitizeList(metodosPago),
      stock,
      ventas: sanitizeList(ventas),
      cajas: sanitizeList(cajas),
      auditoria: sanitizeList(auditoria)
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/:store', async (req, res, next) => {
  try {
    const Model = models[req.params.store];
    if (!Model) return res.status(404).json({ error: 'Store no encontrado' });
    const { page, limit, skip } = getPagination(req.query);
    const query = buildListQuery(req.params.store, req.query);
    const collation = getSortCollation(req.params.store);
    const recordsQuery = Model.find(query).sort(getSort(req.params.store)).skip(skip).limit(limit);
    if (collation) recordsQuery.collation(collation);
    const [records, total] = await Promise.all([
      recordsQuery.lean(),
      Model.countDocuments(query)
    ]);

    res.json({
      data: sanitizeList(records),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit))
      }
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/:store/:id', async (req, res, next) => {
  try {
    const Model = models[req.params.store];
    if (!Model) return res.status(404).json({ error: 'Store no encontrado' });
    const record = await Model.findOne({ id: req.params.id });
    if (!record) return res.status(404).json({ error: 'Registro no encontrado' });
    res.json(sanitize(record));
  } catch (error) {
    next(error);
  }
});

app.put('/api/:store/:id', async (req, res, next) => {
  try {
    const Model = models[req.params.store];
    if (!Model) return res.status(404).json({ error: 'Store no encontrado' });

    const payload = { ...req.body, id: req.params.id };
    if (req.params.store === 'productos') {
      validateProductoPayload(payload);
    }
    if (req.params.store === 'cajas') {
      await validateCajaPayload(payload);
    }
    if (req.params.store === 'ventas') {
      await validateVentaPayload(payload);
    }
    await validateUniqueName(req.params.store, payload);
    const updatePayload = buildUpdatePayload(req.params.store, payload);

    const record = await Model.findOneAndUpdate(
      { id: req.params.id },
      updatePayload,
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
    res.json(sanitize(record));
  } catch (error) {
    next(error);
  }
});

app.delete('/api/:store/:id', async (req, res, next) => {
  try {
    const Model = models[req.params.store];
    if (!Model) return res.status(404).json({ error: 'Store no encontrado' });
    await Model.deleteOne({ id: req.params.id });
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.use((error, req, res, next) => {
  console.error(error);
  if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
  if (error.name === 'ValidationError') return res.status(400).json({ error: error.message });
  if (error.code === 11000) return res.status(400).json({ error: getDuplicateKeyMessage(req.params.store, error) });
  res.status(500).json({ error: 'Error interno del servidor' });
});

try {
  await mongoose.connect(mongoUri);
} catch (error) {
  console.error('Error conectando a MongoDB:', error);
  process.exit(1);
}
app.listen(port, () => {
  console.log(`Backend escuchando en http://localhost:${port}`);
});
