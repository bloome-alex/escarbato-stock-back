import 'dotenv/config';
import cors from 'cors';
import crypto from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import ExcelJS from 'exceljs';
import express from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import PDFDocument from 'pdfkit';
import { Auditoria, Caja, MetodoPago, Producto, Proveedor, Stock, Tipo, Venta } from './models/index.js';

const app = express();
const port = process.env.PORT || 3000;
const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/escarbato_petshop';
const mongoDbName = process.env.MONGODB_DB_NAME;
const jwtSecret = process.env.JWT_SECRET || 'change-me';
const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '8h';
const authUsername = process.env.AUTH_USERNAME || 'admin';
const authPassword = process.env.AUTH_PASSWORD || 'admin';
const corsOrigin = process.env.CORS_ORIGIN || '*';
const appName = process.env.APP_NAME || 'Escarbato';
const appAssetsPath = normalizeAssetsPath(process.env.APP_ASSETS_PATH || 'assets/escarbato');
const publicDir = path.join(process.cwd(), 'src/public');

app.use(cors({ origin: corsOrigin === '*' ? true : corsOrigin }));
app.use(express.json({ limit: '1mb' }));
app.get(['/', '/index.html'], serveConfiguredPublicFile('index.html', 'text/html; charset=utf-8'));
app.get('/manifest.webmanifest', serveConfiguredPublicFile('manifest.webmanifest', 'application/manifest+json; charset=utf-8'));
app.get('/sw.js', serveConfiguredPublicFile('sw.js', 'application/javascript; charset=utf-8'));
app.use(express.static(publicDir, { index: false }));

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

function normalizeAssetsPath(value) {
  const pathValue = String(value || '').trim().replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
  return `/${pathValue || 'assets/escarbato'}`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function configuredPublicContent(content, fileName) {
  const configuredName = fileName.endsWith('.html')
    ? escapeHtml(appName)
    : JSON.stringify(appName).slice(1, -1);
  return content
    .replaceAll('Escarbato', configuredName)
    .replaceAll('/assets', appAssetsPath)
    .replace(/(["'])assets\//g, `$1${appAssetsPath}/`);
}

function serveConfiguredPublicFile(fileName, contentType) {
  return async (req, res, next) => {
    try {
      const content = await readFile(path.join(publicDir, fileName), 'utf8');
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'no-cache');
      res.send(configuredPublicContent(content, fileName));
    } catch (error) {
      next(error);
    }
  };
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

function formatMoney(value) {
  return value || value === 0 ? '$' + Number(value).toLocaleString('es-AR') : '-';
}

function formatPercent(value) {
  return value || value === 0 ? Number(value).toLocaleString('es-AR') + '%' : '-';
}

function reportTimestamp(date = new Date()) {
  const pad = value => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}-${pad(date.getHours())}-${pad(date.getMinutes())}`;
}

function drawProductsTableHeader(doc, columns, y) {
  const cellPaddingX = 5;
  doc.rect(doc.page.margins.left, y, doc.page.width - doc.page.margins.left - doc.page.margins.right, 22).fill('#F0F6EF');
  doc.fillColor('#222').font('Helvetica-Bold').fontSize(8);
  columns.forEach(column => doc.text(column.label, column.x + cellPaddingX, y + 7, { width: column.width - (cellPaddingX * 2), align: column.align || 'left' }));
  return y + 22;
}

function ensureReportSpace(doc, neededHeight, columns, includeHeader = true) {
  if (doc.y + neededHeight <= doc.page.height - doc.page.margins.bottom) return;
  doc.addPage();
  if (includeHeader) doc.y = drawProductsTableHeader(doc, columns, doc.y);
}

function drawProductsPdf(doc, productos, proveedores, tipos) {
  const proveedorById = new Map(proveedores.map(proveedor => [proveedor.id, proveedor.nombre]));
  const tipoById = new Map(tipos.map(tipo => [tipo.id, tipo.nombre]));
  const providerName = producto => proveedorById.get(producto.proveedorId) || 'Sin proveedor';
  const typeName = producto => tipoById.get(producto.tipoId) || '-';
  const sortedProducts = productos.sort((a, b) => {
    const providerCompare = providerName(a).localeCompare(providerName(b), 'es', { sensitivity: 'base' });
    const typeCompare = typeName(a).localeCompare(typeName(b), 'es', { sensitivity: 'base' });
    return providerCompare || typeCompare || (a.nombre || '').localeCompare(b.nombre || '', 'es', { sensitivity: 'base' });
  });
  const columns = [
    { label: 'Producto', x: 36, width: 160 },
    { label: 'Tipo de producto', x: 204, width: 105 },
    { label: 'Costo', x: 317, width: 60, align: 'right' },
    { label: 'Porcentaje', x: 385, width: 58, align: 'right' },
    { label: 'Precio', x: 451, width: 57, align: 'right' },
    { label: 'Precio final', x: 516, width: 60, align: 'right' }
  ];

  if (!sortedProducts.length) {
    doc.font('Helvetica').fontSize(11).fillColor('#666').text('No hay productos registrados.');
    return;
  }

  let currentProvider = '';
  sortedProducts.forEach(producto => {
    const nextProvider = providerName(producto);
    if (nextProvider !== currentProvider) {
      if (currentProvider) doc.addPage();
      currentProvider = nextProvider;
      doc.font('Helvetica-Bold').fontSize(12).fillColor('#4E8055').text(currentProvider, doc.page.margins.left, doc.y);
      doc.moveTo(doc.page.margins.left, doc.y + 2).lineTo(doc.page.width - doc.page.margins.right, doc.y + 2).strokeColor('#4E8055').lineWidth(1).stroke();
      doc.y += 8;
      doc.y = drawProductsTableHeader(doc, columns, doc.y);
    }

    const row = [
      producto.nombre || '-',
      typeName(producto),
      formatMoney(producto.costo ?? producto.precio),
      formatPercent(producto.porcentaje),
      formatMoney(producto.precio),
      formatMoney(producto.precioFinal ?? producto.precio)
    ];
    const cellPaddingX = 5;
    const cellPaddingY = 9;
    const rowHeight = Math.max(28, doc.heightOfString(row[0], { width: columns[0].width - (cellPaddingX * 2) }) + (cellPaddingY * 2), doc.heightOfString(row[1], { width: columns[1].width - (cellPaddingX * 2) }) + (cellPaddingY * 2));
    ensureReportSpace(doc, rowHeight, columns);
    const y = doc.y;
    doc.rect(doc.page.margins.left, y, doc.page.width - doc.page.margins.left - doc.page.margins.right, rowHeight).strokeColor('#DDD').lineWidth(0.5).stroke();
    doc.font('Helvetica').fontSize(8).fillColor('#222');
    row.forEach((value, index) => doc.text(value, columns[index].x + cellPaddingX, y + cellPaddingY, { width: columns[index].width - (cellPaddingX * 2), align: columns[index].align || 'left' }));
    doc.y = y + rowHeight;
  });
}

function getUniqueSheetName(name, usedNames) {
  const cleanName = String(name || 'Sin proveedor')
    .replace(/[\\/*?:[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() || 'Sin proveedor';
  let sheetName = cleanName.slice(0, 31);
  let counter = 2;
  while (usedNames.has(sheetName.toLocaleLowerCase('es'))) {
    const suffix = ` ${counter}`;
    sheetName = cleanName.slice(0, 31 - suffix.length) + suffix;
    counter += 1;
  }
  usedNames.add(sheetName.toLocaleLowerCase('es'));
  return sheetName;
}

function getProductsByProvider(productos, proveedores, tipos) {
  const proveedorById = new Map(proveedores.map(proveedor => [proveedor.id, proveedor.nombre]));
  const tipoById = new Map(tipos.map(tipo => [tipo.id, tipo.nombre]));
  const groups = new Map();

  productos.forEach(producto => {
    const providerName = proveedorById.get(producto.proveedorId) || 'Sin proveedor';
    if (!groups.has(providerName)) groups.set(providerName, []);
    groups.get(providerName).push(producto);
  });

  return [...groups.entries()]
    .sort(([nameA], [nameB]) => nameA.localeCompare(nameB, 'es', { sensitivity: 'base' }))
    .map(([providerName, providerProducts]) => ({
      providerName,
      products: providerProducts.sort((a, b) => {
        const typeCompare = (tipoById.get(a.tipoId) || '-').localeCompare(tipoById.get(b.tipoId) || '-', 'es', { sensitivity: 'base' });
        return typeCompare || (a.nombre || '').localeCompare(b.nombre || '', 'es', { sensitivity: 'base' });
      })
    }));
}

function buildProductsXlsx(productos, proveedores, tipos) {
  const workbook = new ExcelJS.Workbook();
  const tipoById = new Map(tipos.map(tipo => [tipo.id, tipo.nombre]));
  const usedSheetNames = new Set();
  const productGroups = getProductsByProvider(productos, proveedores, tipos);

  workbook.creator = `${appName} Petshop`;
  workbook.created = new Date();

  if (!productGroups.length) {
    const sheet = workbook.addWorksheet('Productos');
    sheet.addRow(['No hay productos registrados.']);
    return workbook;
  }

  productGroups.forEach(({ providerName, products }) => {
    const sheet = workbook.addWorksheet(getUniqueSheetName(providerName, usedSheetNames));
    sheet.columns = [
      { header: 'Producto', key: 'producto', width: 38 },
      { header: 'Tipo de producto', key: 'tipo', width: 24 },
      { header: 'Costo', key: 'costo', width: 14 },
      { header: 'Porcentaje', key: 'porcentaje', width: 14 },
      { header: 'Precio', key: 'precio', width: 14 },
      { header: 'Precio final', key: 'precioFinal', width: 14 }
    ];
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4E8055' } };
    sheet.getRow(1).alignment = { vertical: 'middle' };

    products.forEach(producto => {
      sheet.addRow({
        producto: producto.nombre || '-',
        tipo: tipoById.get(producto.tipoId) || '-',
        costo: producto.costo ?? producto.precio ?? null,
        porcentaje: producto.porcentaje ?? null,
        precio: producto.precio ?? null,
        precioFinal: producto.precioFinal ?? producto.precio ?? null
      });
    });

    sheet.getColumn('costo').numFmt = '$ #,##0.00';
    sheet.getColumn('porcentaje').numFmt = '0.00%';
    sheet.getColumn('precio').numFmt = '$ #,##0.00';
    sheet.getColumn('precioFinal').numFmt = '$ #,##0.00';
    sheet.getColumn('porcentaje').eachCell((cell, rowNumber) => {
      if (rowNumber > 1 && typeof cell.value === 'number') cell.value = cell.value / 100;
    });
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    sheet.autoFilter = { from: 'A1', to: 'F1' };
  });

  return workbook;
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
        const minStock = product.minStock ?? 0;
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

app.get('/api/reportes/productos.pdf', async (req, res, next) => {
  try {
    const [productos, proveedores, tipos] = await Promise.all([
      Producto.find().lean(),
      Proveedor.find().lean(),
      Tipo.find().lean()
    ]);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="reporte-productos-${reportTimestamp()}.pdf"`);
    const doc = new PDFDocument({ size: [612, 936], margin: 36, bufferPages: false });
    doc.pipe(res);
    drawProductsPdf(doc, productos, proveedores, tipos);
    doc.end();
  } catch (error) {
    next(error);
  }
});

app.get('/api/reportes/productos.xlsx', async (req, res, next) => {
  try {
    const [productos, proveedores, tipos] = await Promise.all([
      Producto.find().lean(),
      Proveedor.find().lean(),
      Tipo.find().lean()
    ]);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="reporte-productos-${reportTimestamp()}.xlsx"`);
    const workbook = buildProductsXlsx(productos, proveedores, tipos);
    await workbook.xlsx.write(res);
    res.end();
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
  await mongoose.connect(mongoUri, mongoDbName ? { dbName: mongoDbName } : undefined);
} catch (error) {
  console.error('Error conectando a MongoDB:', error);
  process.exit(1);
}
app.listen(port, () => {
  console.log(`Backend escuchando en http://localhost:${port}`);
});
