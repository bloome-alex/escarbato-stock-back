import { Auditoria, Caja, MetodoPago, Producto, Proveedor, Stock, Tipo, Venta } from '../models/index.js';

export class ModelRegistry {
  constructor() {
    this.models = {
      proveedores: Proveedor,
      tipos: Tipo,
      productos: Producto,
      metodosPago: MetodoPago,
      stock: Stock,
      ventas: Venta,
      cajas: Caja,
      auditoria: Auditoria
    };
  }

  get(store) {
    return this.models[store] || null;
  }
}
