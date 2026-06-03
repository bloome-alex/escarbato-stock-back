import { AsyncLocalStorage } from 'node:async_hooks';
import mongoose from 'mongoose';
import { Auditoria, Caja, GrupoProducto, MetodoPago, PeluqueriaHorario, PeluqueriaServicio, PeluqueriaTipoPerro, PeluqueriaTurno, Producto, Proveedor, Stock, TicketConfig, Tipo, Usuario, Venta } from '../models/index.js';

const TENANT_MODEL_BY_STORE = {
  proveedores: Proveedor,
  tipos: Tipo,
  gruposProductos: GrupoProducto,
  productos: Producto,
  metodosPago: MetodoPago,
  stock: Stock,
  ventas: Venta,
  cajas: Caja,
  peluqueriaTiposPerro: PeluqueriaTipoPerro,
  peluqueriaServicios: PeluqueriaServicio,
  peluqueriaTurnos: PeluqueriaTurno,
  peluqueriaHorarios: PeluqueriaHorario,
  ticketConfig: TicketConfig,
  auditoria: Auditoria,
  usuarios: Usuario
};

export class ConnectionManager {
  constructor(config) {
    this.config = config;
    this.connections = new Map();
    this.context = new AsyncLocalStorage();
  }

  runWithTenant(tenant, callback) {
    return this.context.run(tenant || {}, callback);
  }

  setActiveTenant(tenant) {
    const store = this.context.getStore();
    if (store) Object.assign(store, tenant || {});
  }

  getActiveTenant() {
    return this.context.getStore() || null;
  }

  getActiveDbName() {
    return this.getActiveTenant()?.dbName || null;
  }

  async getConnection(dbName = this.getActiveDbName()) {
    if (!dbName) throw new Error('No hay base de datos de empresa activa');
    const key = dbName || '__default__';
    if (this.connections.has(key)) return this.connections.get(key);

    const options = dbName ? { dbName } : undefined;
    const connection = mongoose.createConnection(this.config.mongoUri, options);
    await connection.asPromise();
    this.connections.set(key, connection);
    return connection;
  }

  async getModel(store, dbName = this.getActiveDbName()) {
    const baseModel = TENANT_MODEL_BY_STORE[store];
    if (!baseModel) return null;
    const connection = await this.getConnection(dbName);
    return connection.models[baseModel.modelName] || connection.model(baseModel.modelName, baseModel.schema);
  }

  async clearConnection(dbName) {
    const key = dbName || '__default__';
    const connection = this.connections.get(key);
    if (!connection) return;
    await connection.close();
    this.connections.delete(key);
  }

  async closeAll() {
    await Promise.all([...this.connections.values()].map(connection => connection.close()));
    this.connections.clear();
  }
}
