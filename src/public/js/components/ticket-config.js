import { escapeHtml, form } from '../ui.js';
import { appConfig } from '../config.js?v=20260523-1';
import { defaultTicketConfig, normalizeTicketConfig, renderTicketHtml } from '../ticket.js';

const checkIds = [
  'ticket-show-brand-name',
  'ticket-show-legal-name',
  'ticket-show-date',
  'ticket-show-customer',
  'ticket-show-payment-method',
  'ticket-show-calculated-total',
  'ticket-show-final-total',
  'ticket-show-totals-breakdown',
  'ticket-show-discounts',
  'ticket-show-surcharges',
  'ticket-show-quantity',
  'ticket-show-unit-price',
  'ticket-show-subtotal',
  'ticket-show-item-description',
  'ticket-show-item-index',
  'ticket-show-footer'
];

export class TicketConfigComponent {
  constructor(app) {
    this.app = app;
  }

  template() {
    return `<section class="section" id="sec-ticketConfig"><div id="wrap-ticket-config" class="ticket-config-shell"></div></section>`;
  }

  bind() {
    const section = document.getElementById('sec-ticketConfig');
    if (!section || section.dataset.bound === 'true') return;
    section.dataset.bound = 'true';
    section.addEventListener('input', event => {
      if (event.target.matches('input, textarea, select')) this.updatePreview();
    });
    section.addEventListener('change', event => {
      if (event.target.matches('input, textarea, select')) this.updatePreview();
    });
  }

  render() {
    const config = this.getCurrentConfig();
    document.getElementById('wrap-ticket-config').innerHTML = this.formTemplate(config);
    this.updatePreview();
  }

  formTemplate(config) {
    return `<div class="ticket-config-grid">
      <div class="ticket-config-panel">
        <div class="ticket-config-head">
          <div><h2>Ticket de compra</h2><p>Personaliza tu ticket de compra.</p></div>
          <div class="ticket-config-actions"><button class="btn btn-primary" data-action="save-ticket-config">Guardar ticket</button><button class="btn btn-ghost" data-action="reset-ticket-config">Restaurar</button></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Tamaño de ticket</label><select id="ticket-paper-size"><option value="58mm" ${config.paperSize === '58mm' ? 'selected' : ''}>58 mm</option><option value="80mm" ${config.paperSize === '80mm' ? 'selected' : ''}>80 mm</option><option value="a4" ${config.paperSize === 'a4' ? 'selected' : ''}>A4</option><option value="custom" ${config.paperSize === 'custom' ? 'selected' : ''}>Personalizado</option></select></div>
          <div class="form-group"><label>Ancho personalizado (mm)</label><input type="number" min="40" step="1" id="ticket-custom-width" value="${Number(config.customWidthMm || 80)}"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Formato</label><select id="ticket-template"><option value="compact" ${config.template === 'compact' ? 'selected' : ''}>Compacto</option><option value="detailed" ${config.template === 'detailed' ? 'selected' : ''}>Detallado</option></select></div>
          <div class="form-group"><label>Diseño de ítems</label><select id="ticket-item-layout"><option value="compact" ${config.itemLayout === 'compact' ? 'selected' : ''}>Compacto</option><option value="detailed" ${config.itemLayout === 'detailed' ? 'selected' : ''}>Detalle completo</option></select></div>
        </div>
        <div class="ticket-config-section-title">Encabezado</div>
        <div class="form-row">
          <div class="form-group"><label>Nombre visible</label><input type="text" id="ticket-brand-name" value="${escapeHtml(config.brandName || '')}" placeholder="Empresa / marca"></div>
          <div class="form-group"><label>Nombre legal</label><input type="text" id="ticket-legal-name" value="${escapeHtml(config.legalName || '')}" placeholder="Razón social / adicional"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Línea 1</label><input type="text" id="ticket-header-line1" value="${escapeHtml(config.headerLine1 || '')}" placeholder="Dirección, teléfono o sucursal"></div>
          <div class="form-group"><label>Línea 2</label><input type="text" id="ticket-header-line2" value="${escapeHtml(config.headerLine2 || '')}" placeholder="Horario, CUIT, etc."></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Línea 3</label><input type="text" id="ticket-header-line3" value="${escapeHtml(config.headerLine3 || '')}" placeholder="Texto adicional"></div>
        </div>
        <div class="ticket-config-section-title">Detalles del ticket</div>
        <div class="ticket-toggle-grid">
          ${this.toggle('Mostrar nombre visible', 'ticket-show-brand-name', config.showBrandName)}
          ${this.toggle('Mostrar nombre legal', 'ticket-show-legal-name', config.showLegalName)}
          ${this.toggle('Mostrar fecha', 'ticket-show-date', config.showDate)}
          ${this.toggle('Mostrar cliente', 'ticket-show-customer', config.showCustomer)}
          ${this.toggle('Mostrar método de pago', 'ticket-show-payment-method', config.showPaymentMethod)}
          ${this.toggle('Mostrar total calculado', 'ticket-show-calculated-total', config.showCalculatedTotal)}
          ${this.toggle('Mostrar total final', 'ticket-show-final-total', config.showFinalTotal)}
          ${this.toggle('Mostrar detalle de descuentos', 'ticket-show-discounts', config.showDiscounts)}
          ${this.toggle('Mostrar detalle de recargos', 'ticket-show-surcharges', config.showSurcharges)}
          ${this.toggle('Mostrar cantidad', 'ticket-show-quantity', config.showQuantity)}
          ${this.toggle('Mostrar precio unitario', 'ticket-show-unit-price', config.showUnitPrice)}
          ${this.toggle('Mostrar subtotal', 'ticket-show-subtotal', config.showSubtotal)}
          ${this.toggle('Mostrar descripción de productos', 'ticket-show-item-description', config.showItemDescription)}
          ${this.toggle('Mostrar numeración de ítems', 'ticket-show-item-index', config.showItemIndex)}
          ${this.toggle('Mostrar pie de ticket', 'ticket-show-footer', config.showFooter)}
        </div>
        <div class="ticket-config-section-title">Pie</div>
        <div class="form-row">
          <div class="form-group"><label>Línea 1</label><input type="text" id="ticket-footer-line1" value="${escapeHtml(config.footerLine1 || '')}" placeholder="Mensaje de cierre"></div>
          <div class="form-group"><label>Línea 2</label><input type="text" id="ticket-footer-line2" value="${escapeHtml(config.footerLine2 || '')}" placeholder="Agradecimiento u observación"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Línea 3</label><input type="text" id="ticket-footer-line3" value="${escapeHtml(config.footerLine3 || '')}" placeholder="Texto adicional"></div>
        </div>
      </div>
      <div class="ticket-config-preview">
        <div class="ticket-config-preview-head"><h3>Vista previa</h3><p>Se actualiza al instante con tus cambios.</p></div>
        <div id="ticket-preview-box"></div>
      </div>
    </div>`;
  }

  toggle(label, id, checked) {
    return `<label class="ticket-toggle"><input type="checkbox" id="${id}" ${checked ? 'checked' : ''}><span>${escapeHtml(label)}</span></label>`;
  }

  getCurrentConfig() {
    const config = normalizeTicketConfig(this.app.store.data.ticketConfig?.[0] || defaultTicketConfig);
    if (!config.brandName) config.brandName = appConfig.appName || window.PETSHOP_CONFIG?.appName || '';
    return config;
  }

  readForm() {
    return normalizeTicketConfig({
      id: 'ticket-config',
      paperSize: form.value('ticket-paper-size'),
      customWidthMm: form.value('ticket-custom-width'),
      template: form.value('ticket-template'),
      itemLayout: form.value('ticket-item-layout'),
      brandName: form.value('ticket-brand-name'),
      legalName: form.value('ticket-legal-name'),
      headerLine1: form.value('ticket-header-line1'),
      headerLine2: form.value('ticket-header-line2'),
      headerLine3: form.value('ticket-header-line3'),
      footerLine1: form.value('ticket-footer-line1'),
      footerLine2: form.value('ticket-footer-line2'),
      footerLine3: form.value('ticket-footer-line3'),
      ...Object.fromEntries(checkIds.map(id => [this.camelKey(id), document.getElementById(id)?.checked]))
    });
  }

  camelKey(id) {
    return id
      .replace(/^ticket-/, '')
      .replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())
      .replace(/^([a-z])/, (_, letter) => letter.toLowerCase());
  }

  previewSale() {
    const latestSale = [...(this.app.store.data.ventas || [])].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))[0] || null;
    const sale = latestSale || {
      id: 'preview',
      createdAt: new Date().toISOString(),
      cliente: 'Cliente mostrador',
      items: (this.app.store.data.productos || []).slice(0, 3).map((product, index) => ({
        productId: product.id,
        productName: product.nombre,
        qty: index + 1,
        price: Number(product.precioFinal || 0),
        subtotal: Number(((index + 1) * Number(product.precioFinal || 0)).toFixed(2))
      })),
      metodoPago: this.app.store.data.metodosPago?.[0] || { nombre: 'Efectivo', descuento: 0, recargo: 0 },
      calculatedTotal: 0,
      finalTotal: 0
    };

    if (!sale.items.length) {
      sale.items = [{ productId: '1', productName: 'Producto de ejemplo', qty: 1, price: 1200, subtotal: 1200 }];
    }
    sale.calculatedTotal = sale.items.reduce((sum, item) => sum + Number(item.subtotal ?? ((item.qty || 0) * (item.price || 0))), 0);
    const discountAmount = Number((sale.calculatedTotal * Number(sale.metodoPago?.descuento || 0) / 100).toFixed(2));
    const surchargeRate = Number(sale.metodoPago?.recargo ?? sale.metodoPago?.bonificacion ?? 0);
    const surchargeAmount = Number((sale.calculatedTotal * surchargeRate / 100).toFixed(2));
    sale.finalTotal = Number((sale.calculatedTotal - discountAmount + surchargeAmount).toFixed(2));
    return sale;
  }

  updatePreview() {
    const preview = document.getElementById('ticket-preview-box');
    if (!preview) return;
    preview.innerHTML = renderTicketHtml(this.previewSale(), this.readForm(), {
      escapeHtml,
      formatMoney: value => value || value === 0 ? '$' + Number(value).toLocaleString('es-AR') : '—',
      formatDate: value => new Date(value).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' }),
      formatPercent: value => `${Number(value || 0).toLocaleString('es-AR', { maximumFractionDigits: 2 })}%`,
      fallbackBrandName: appConfig.appName || window.PETSHOP_CONFIG?.appName || ''
    });
  }

  async save() {
    const ticketConfig = this.readForm();
    await this.app.store.put('ticketConfig', ticketConfig);
    this.app.store.data.ticketConfig = [ticketConfig];
    await this.app.audit('Edición', 'Configuración', 'Ticket de compra');
    this.updatePreview();
    this.app.toasts.show('Configuración de ticket guardada ✅');
  }

  async reset() {
    if (!confirm('¿Restaurar la configuración de ticket por defecto?')) return;
    const ticketConfig = { ...defaultTicketConfig };
    await this.app.store.put('ticketConfig', ticketConfig);
    this.app.store.data.ticketConfig = [ticketConfig];
    this.render();
    await this.app.audit('Edición', 'Configuración', 'Ticket restaurado a valores por defecto');
    this.app.toasts.show('Configuración restaurada');
  }
}
