import { Sanitizer } from '../utils/sanitize.js';

export class DashboardService {
  constructor(modelRegistry) {
    this.modelRegistry = modelRegistry;
  }

  async getDashboard() {
    const [Proveedor, Tipo, Producto, Stock, Auditoria] = await Promise.all([
      this.modelRegistry.getActive('proveedores'),
      this.modelRegistry.getActive('tipos'),
      this.modelRegistry.getActive('productos'),
      this.modelRegistry.getActive('stock'),
      this.modelRegistry.getActive('auditoria')
    ]);
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
        const qty = stockByProduct.get(product.id) || 0;
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

    return {
      totals: {
        proveedores: proveedoresCount,
        tipos: tipos.length,
        productos: productos.length,
        lowStock: lowStockProducts.length
      },
      stockAlerts: lowStockProducts.slice(0, 5),
      recentProducts: Sanitizer.list(recentProducts).map(product => ({
        id: product.id,
        nombre: product.nombre,
        tipoId: product.tipoId,
        tipoNombre: tipoById.get(product.tipoId) || null,
        precio: product.precio,
        precioFinal: product.precioFinal
      })),
      auditActivity: Sanitizer.list(auditActivity)
    };
  }
}
