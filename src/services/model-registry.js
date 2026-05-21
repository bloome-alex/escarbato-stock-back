import { Auditoria, Caja, MetodoPago, PeluqueriaHorario, PeluqueriaServicio, PeluqueriaTipoPerro, PeluqueriaTurno, Producto, Proveedor, Stock, Tipo, Venta } from '../models/index.js';

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
      peluqueriaTiposPerro: PeluqueriaTipoPerro,
      peluqueriaServicios: PeluqueriaServicio,
      peluqueriaTurnos: PeluqueriaTurno,
      peluqueriaHorarios: PeluqueriaHorario,
      auditoria: Auditoria
    };
  }

  get(store) {
    return this.models[store] || null;
  }
}
