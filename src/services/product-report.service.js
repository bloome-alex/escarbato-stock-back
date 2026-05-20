import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { Producto, Proveedor, Tipo } from '../models/index.js';

export class ProductReportService {
  constructor(config) {
    this.config = config;
  }

  async writePdf(res) {
    const [productos, proveedores, tipos] = await this.getReportData();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="reporte-productos-${this.reportTimestamp()}.pdf"`);
    const doc = new PDFDocument({ size: [612, 936], margin: 36, bufferPages: false });
    doc.pipe(res);
    this.drawProductsPdf(doc, productos, proveedores, tipos);
    doc.end();
  }

  async writeXlsx(res) {
    const [productos, proveedores, tipos] = await this.getReportData();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="reporte-productos-${this.reportTimestamp()}.xlsx"`);
    const workbook = this.buildProductsXlsx(productos, proveedores, tipos);
    await workbook.xlsx.write(res);
    res.end();
  }

  getReportData() {
    return Promise.all([
      Producto.find().lean(),
      Proveedor.find().lean(),
      Tipo.find().lean()
    ]);
  }

  formatMoney(value) {
    return value || value === 0 ? '$' + Number(value).toLocaleString('es-AR') : '-';
  }

  formatPercent(value) {
    return value || value === 0 ? Number(value).toLocaleString('es-AR') + '%' : '-';
  }

  reportTimestamp(date = new Date()) {
    const pad = value => String(value).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}-${pad(date.getHours())}-${pad(date.getMinutes())}`;
  }

  drawProductsTableHeader(doc, columns, y) {
    const cellPaddingX = 5;
    doc.rect(doc.page.margins.left, y, doc.page.width - doc.page.margins.left - doc.page.margins.right, 22).fill('#F0F6EF');
    doc.fillColor('#222').font('Helvetica-Bold').fontSize(8);
    columns.forEach(column => doc.text(column.label, column.x + cellPaddingX, y + 7, { width: column.width - (cellPaddingX * 2), align: column.align || 'left' }));
    return y + 22;
  }

  ensureReportSpace(doc, neededHeight, columns, includeHeader = true) {
    if (doc.y + neededHeight <= doc.page.height - doc.page.margins.bottom) return;
    doc.addPage();
    if (includeHeader) doc.y = this.drawProductsTableHeader(doc, columns, doc.y);
  }

  drawProductsPdf(doc, productos, proveedores, tipos) {
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
        doc.y = this.drawProductsTableHeader(doc, columns, doc.y);
      }

      const row = [
        producto.nombre || '-',
        typeName(producto),
        this.formatMoney(producto.costo ?? producto.precio),
        this.formatPercent(producto.porcentaje),
        this.formatMoney(producto.precio),
        this.formatMoney(producto.precioFinal ?? producto.precio)
      ];
      const cellPaddingX = 5;
      const cellPaddingY = 9;
      const rowHeight = Math.max(28, doc.heightOfString(row[0], { width: columns[0].width - (cellPaddingX * 2) }) + (cellPaddingY * 2), doc.heightOfString(row[1], { width: columns[1].width - (cellPaddingX * 2) }) + (cellPaddingY * 2));
      this.ensureReportSpace(doc, rowHeight, columns);
      const y = doc.y;
      doc.rect(doc.page.margins.left, y, doc.page.width - doc.page.margins.left - doc.page.margins.right, rowHeight).strokeColor('#DDD').lineWidth(0.5).stroke();
      doc.font('Helvetica').fontSize(8).fillColor('#222');
      row.forEach((value, index) => doc.text(value, columns[index].x + cellPaddingX, y + cellPaddingY, { width: columns[index].width - (cellPaddingX * 2), align: columns[index].align || 'left' }));
      doc.y = y + rowHeight;
    });
  }

  getUniqueSheetName(name, usedNames) {
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

  getProductsByProvider(productos, proveedores, tipos) {
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

  buildProductsXlsx(productos, proveedores, tipos) {
    const workbook = new ExcelJS.Workbook();
    const tipoById = new Map(tipos.map(tipo => [tipo.id, tipo.nombre]));
    const usedSheetNames = new Set();
    const productGroups = this.getProductsByProvider(productos, proveedores, tipos);

    workbook.creator = `${this.config.appName} ${this.config.businessType}`;
    workbook.created = new Date();

    if (!productGroups.length) {
      const sheet = workbook.addWorksheet('Productos');
      sheet.addRow(['No hay productos registrados.']);
      return workbook;
    }

    productGroups.forEach(({ providerName, products }) => {
      const sheet = workbook.addWorksheet(this.getUniqueSheetName(providerName, usedSheetNames));
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
}
