import { Auditoria, Caja, GrupoProducto, MetodoPago, PeluqueriaHorario, PeluqueriaServicio, PeluqueriaTipoPerro, PeluqueriaTurno, Producto, Proveedor, Stock, TicketConfig, Tipo, Venta } from '../models/index.js';

export class ModelRegistry {
  constructor(connectionManager = null) {
    this.connectionManager = connectionManager;
    this.models = {
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
      auditoria: Auditoria
    };
  }

  get(store) {
    return this.models[store] || null;
  }

  async getActive(store) {
    if (!this.connectionManager) return this.get(store);
    return this.connectionManager.getModel(store);
  }
}
