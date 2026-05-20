import { Caja } from '../models/index.js';
import { HttpError } from '../utils/http-error.js';
import { Sanitizer } from '../utils/sanitize.js';

export class DataStoreService {
  constructor(modelRegistry) {
    this.modelRegistry = modelRegistry;
    this.searchableFields = {
      proveedores: ['nombre', 'contacto', 'email', 'telefono'],
      tipos: ['nombre', 'desc'],
      productos: ['nombre', 'desc'],
      metodosPago: ['nombre'],
      stock: ['id'],
      ventas: ['cliente', 'items.productName', 'metodoPago.nombre'],
      cajas: ['status', 'initialAmounts.metodoPagoNombre']
    };
  }

  async list(store, queryParams) {
    const Model = this.getModelOrFail(store);
    const { page, limit, skip } = this.getPagination(queryParams);
    const query = this.buildListQuery(store, queryParams);
    const collation = this.getSortCollation(store);
    const recordsQuery = Model.find(query).sort(this.getSort(store)).skip(skip).limit(limit);
    if (collation) recordsQuery.collation(collation);

    const [records, total] = await Promise.all([
      recordsQuery.lean(),
      Model.countDocuments(query)
    ]);

    return {
      data: Sanitizer.list(records),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit))
      }
    };
  }

  async getById(store, id) {
    const Model = this.getModelOrFail(store);
    const record = await Model.findOne({ id });
    if (!record) throw new HttpError('Registro no encontrado', 404);
    return Sanitizer.record(record);
  }

  async upsert(store, id, body) {
    const Model = this.getModelOrFail(store);
    const payload = { ...body, id };

    if (store === 'productos') this.validateProductoPayload(payload);
    if (store === 'cajas') await this.validateCajaPayload(payload);
    if (store === 'ventas') await this.validateVentaPayload(payload);
    await this.validateUniqueName(store, payload);

    const record = await Model.findOneAndUpdate(
      { id },
      this.buildUpdatePayload(store, payload),
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
    return Sanitizer.record(record);
  }

  async delete(store, id) {
    const Model = this.getModelOrFail(store);
    await Model.deleteOne({ id });
  }

  getModelOrFail(store) {
    const Model = this.modelRegistry.get(store);
    if (!Model) throw new HttpError('Store no encontrado', 404);
    return Model;
  }

  escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  buildListQuery(store, queryParams) {
    const query = {};
    const q = String(queryParams.q || '').trim();
    if (q && this.searchableFields[store]) {
      const regex = new RegExp(this.escapeRegExp(q), 'i');
      query.$or = this.searchableFields[store].map(field => ({ [field]: regex }));
    }

    ['tipoId', 'proveedorId', 'id'].forEach(field => {
      if (queryParams[field]) query[field] = queryParams[field];
    });

    return query;
  }

  getPagination(query) {
    const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || 10));
    return { page, limit, skip: (page - 1) * limit };
  }

  getSort(store) {
    if (store === 'ventas' || store === 'auditoria' || store === 'cajas') return { createdAt: -1 };
    if (store === 'stock') return { id: 1 };
    return { nombre: 1 };
  }

  getSortCollation(store) {
    if (store === 'ventas' || store === 'auditoria' || store === 'cajas') return null;
    return { locale: 'es', numericOrdering: true, strength: 2 };
  }

  getDuplicateKeyMessage(store, error) {
    const keyPattern = error.keyPattern || {};
    if (keyPattern.id) return 'Ya existe un registro con ese identificador';

    if (store === 'proveedores') return 'Ya existe un proveedor con ese nombre';
    if (store === 'tipos') return 'Ya existe un tipo de producto con ese nombre';
    if (store === 'metodosPago') return 'Ya existe un método de pago con ese nombre';
    if (store === 'productos') return 'Ya existe un producto con ese nombre para el proveedor seleccionado';
    return 'Ya existe un registro con esos datos';
  }

  async validateUniqueName(store, payload) {
    if (!['proveedores', 'tipos', 'productos', 'metodosPago'].includes(store)) return;

    const nombre = String(payload.nombre || '').trim();
    if (!nombre) return;

    const Model = this.modelRegistry.get(store);
    const query = store === 'productos'
      ? { nombre, proveedorId: payload.proveedorId || null, id: { $ne: payload.id } }
      : { nombre, id: { $ne: payload.id } };

    const exists = await Model.findOne(query).collation({ locale: 'es', strength: 2 }).lean();
    if (exists) throw new HttpError(this.getDuplicateKeyMessage(store, { keyPattern: { nombre: 1 } }));
  }

  validateProductoPayload(payload) {
    const proveedorId = String(payload.proveedorId || '').trim();
    if (proveedorId) {
      payload.proveedorId = proveedorId;
      return;
    }

    throw new HttpError('Seleccioná un proveedor');
  }

  buildUpdatePayload(store, payload) {
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

  async validateCajaPayload(payload) {
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
      if (openCaja) throw new HttpError('Ya hay una caja abierta. Cerrala antes de abrir otra.');
      payload.openedAt = payload.openedAt || new Date().toISOString();
      payload.closedAt = '';
      return;
    }

    const existing = await Caja.findOne({ id: payload.id }).lean();
    if (!existing) throw new HttpError('No se encontró la caja a cerrar', 404);
    payload.openedAt = existing.openedAt;
    payload.initialAmounts = existing.initialAmounts || [];
    payload.closedAt = payload.closedAt || new Date().toISOString();
  }

  async validateVentaPayload(payload) {
    const openCaja = await Caja.findOne({ status: 'abierta' }).lean();
    if (!openCaja) throw new HttpError('No hay una caja abierta. Abrí una caja antes de realizar ventas.');
    payload.cajaId = openCaja.id;
  }
}
