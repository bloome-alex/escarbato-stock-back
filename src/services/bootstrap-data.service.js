import { Auditoria, Caja, MetodoPago, Producto, Proveedor, Stock, Tipo, Venta } from '../models/index.js';
import { Sanitizer } from '../utils/sanitize.js';

export class BootstrapDataService {
  async getData() {
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

    return {
      proveedores: Sanitizer.list(proveedores),
      tipos: Sanitizer.list(tipos),
      productos: Sanitizer.list(productos),
      metodosPago: Sanitizer.list(metodosPago),
      stock,
      ventas: Sanitizer.list(ventas),
      cajas: Sanitizer.list(cajas),
      auditoria: Sanitizer.list(auditoria)
    };
  }
}
