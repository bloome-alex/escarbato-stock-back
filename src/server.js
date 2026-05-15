import 'dotenv/config';
import cors from 'cors';
import crypto from 'node:crypto';
import express from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { Auditoria, Producto, Proveedor, Stock, Tipo, Venta } from './models/index.js';

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
  stock: Stock,
  ventas: Venta,
  auditoria: Auditoria
};

const searchableFields = {
  proveedores: ['nombre', 'contacto', 'email', 'telefono'],
  tipos: ['nombre', 'desc'],
  productos: ['nombre', 'desc'],
  stock: ['id'],
  ventas: ['cliente', 'items.productName']
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
  if (store === 'ventas' || store === 'auditoria') return { createdAt: -1 };
  if (store === 'stock') return { id: 1 };
  return { nombre: 1 };
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

app.get('/api/data', async (req, res, next) => {
  try {
    const [proveedores, tipos, productos, stockRecords, ventas, auditoria] = await Promise.all([
      Proveedor.find().lean(),
      Tipo.find().lean(),
      Producto.find().lean(),
      Stock.find().lean(),
      Venta.find().lean(),
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
      stock,
      ventas: sanitizeList(ventas),
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
    const [records, total] = await Promise.all([
      Model.find(query).sort(getSort(req.params.store)).skip(skip).limit(limit).lean(),
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
    const record = await Model.findOneAndUpdate(
      { id: req.params.id },
      payload,
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
  if (error.name === 'ValidationError') return res.status(400).json({ error: error.message });
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
