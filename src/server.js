import 'dotenv/config';
import cors from 'cors';
import crypto from 'node:crypto';
import express from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

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

const baseFields = {
  id: { type: String, required: true, unique: true, index: true }
};

const Proveedor = mongoose.model('Proveedor', new mongoose.Schema({
  ...baseFields,
  nombre: { type: String, required: true, trim: true },
  contacto: { type: String, default: '' },
  telefono: { type: String, default: '' },
  email: { type: String, default: '' },
  notas: { type: String, default: '' }
}, { versionKey: false }));

const Tipo = mongoose.model('Tipo', new mongoose.Schema({
  ...baseFields,
  nombre: { type: String, required: true, trim: true },
  desc: { type: String, default: '' }
}, { versionKey: false }));

const Producto = mongoose.model('Producto', new mongoose.Schema({
  ...baseFields,
  nombre: { type: String, required: true, trim: true },
  tipoId: { type: String, required: true },
  proveedorId: { type: String, default: null },
  costo: { type: Number, required: true, min: 0 },
  porcentaje: { type: Number, required: true, min: 0 },
  precio: { type: Number, required: true, min: 0 },
  precioFinal: { type: Number, required: true, min: 0 },
  minStock: { type: Number, default: 5, min: 0 },
  desc: { type: String, default: '' }
}, { versionKey: false }));

const Stock = mongoose.model('Stock', new mongoose.Schema({
  ...baseFields,
  qty: { type: Number, required: true, min: 0 }
}, { versionKey: false }));

const Venta = mongoose.model('Venta', new mongoose.Schema({
  ...baseFields,
  cliente: { type: String, default: '' },
  items: [{
    _id: false,
    productId: { type: String, required: true },
    productName: { type: String, required: true },
    qty: { type: Number, required: true, min: 0 },
    price: { type: Number, required: true, min: 0 },
    subtotal: { type: Number, required: true, min: 0 }
  }],
  calculatedTotal: { type: Number, required: true, min: 0 },
  finalTotal: { type: Number, required: true, min: 0 },
  createdAt: { type: String, required: true }
}, { versionKey: false }));

const Auditoria = mongoose.model('Auditoria', new mongoose.Schema({
  ...baseFields,
  action: { type: String, required: true },
  entity: { type: String, required: true },
  detail: { type: String, required: true },
  createdAt: { type: String, required: true }
}, { versionKey: false }));

const models = {
  proveedores: Proveedor,
  tipos: Tipo,
  productos: Producto,
  stock: Stock,
  ventas: Venta,
  auditoria: Auditoria
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

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

app.get('/api/:store', async (req, res, next) => {
  try {
    const Model = models[req.params.store];
    if (!Model) return res.status(404).json({ error: 'Store no encontrado' });
    const records = await Model.find().lean();
    res.json(sanitizeList(records));
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
