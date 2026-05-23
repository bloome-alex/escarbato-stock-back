import { escapeHtml, form } from '../ui.js';
import { DEFAULT_PAGE_SIZE, getResponsivePageItems, loadingTemplate, paginationTemplate } from '../pagination.js?v=20260521-1';
import { buildTicketDocumentHtml, normalizeTicketConfig, renderTicketHtml } from '../ticket.js';

export class VentasComponent {
  constructor(app) {
    this.app = app;
    this.page = 1;
    this.totalPages = 1;
    this.loadingTimer = null;
  }

  formatMoney(value) {
    return value || value === 0 ? '$' + Number(value).toLocaleString('es-AR') : '—';
  }

  formatDate(value) {
    return new Date(value).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });
  }

  formatPercent(value) {
    return `${Number(value || 0).toLocaleString('es-AR', { maximumFractionDigits: 2 })}%`;
  }

  formatQty(value) {
    return Number(value || 0).toLocaleString('es-AR', { maximumFractionDigits: 4 });
  }

  paymentLabel(venta) {
    return venta.metodoPago?.nombre || 'Sin método';
  }

  refreshPaymentMethodFilter() {
    const select = document.getElementById('filterVentaMetodoPago');
    if (!select) return;

    const selected = select.value;
    const methods = [...(this.app.store.data.metodosPago || [])].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    select.innerHTML = `<option value="">Todos los métodos</option>${methods.map(method => `<option value="${escapeHtml(method.id)}">${escapeHtml(method.nombre)}</option>`).join('')}`;
    select.value = methods.some(method => method.id === selected) ? selected : '';
  }

  template() {
    return `<section class="section" id="sec-ventas">
      <div class="toolbar"><div class="search-box"><span class="search-icon">🔍</span><input type="text" placeholder="Buscar venta por cliente, producto o método…" id="searchVenta"></div><select id="filterVentaMetodoPago" class="filter-control"><option value="">Todos los métodos</option></select><label class="filter-field"><span>Desde</span><input type="date" id="filterVentaDesde" class="filter-control"></label><label class="filter-field"><span>Hasta</span><input type="date" id="filterVentaHasta" class="filter-control"></label></div>
      <div class="table-wrap" id="wrap-ventas"><table class="data-table"><thead><tr><th>Fecha y hora</th><th>Cliente</th><th>Método de pago</th><th>Productos</th><th>Total calculado</th><th>Total final</th><th>Acciones</th></tr></thead><tbody id="tbl-ventas"></tbody></table><div id="empty-ventas" class="empty-state" style="display:none"><div class="empty-icon">🧾</div><p>Aún no hay ventas cargadas</p></div></div><div id="pager-ventas"></div>
    </section>`;
  }

  bind() {
    document.getElementById('searchVenta').addEventListener('input', () => this.resetAndRender());
    document.getElementById('filterVentaMetodoPago').addEventListener('change', () => this.resetAndRender());
    document.getElementById('filterVentaDesde').addEventListener('change', () => this.resetAndRender());
    document.getElementById('filterVentaHasta').addEventListener('change', () => this.resetAndRender());
  }

  render() {
    clearTimeout(this.loadingTimer);
    this.refreshPaymentMethodFilter();
    document.getElementById('wrap-ventas').innerHTML = loadingTemplate('Cargando ventas...');
    document.getElementById('pager-ventas').innerHTML = '';
    this.loadingTimer = setTimeout(() => this.renderList(), 120);
  }

  resetAndRender() {
    this.page = 1;
    this.render();
  }

  setPage(page) {
    this.page = page;
    this.render();
  }

  renderList() {
    const q = (form.value('searchVenta') || '').toLowerCase();
    const methodFilter = form.value('filterVentaMetodoPago');
    const desde = form.value('filterVentaDesde');
    const hasta = form.value('filterVentaHasta');
    const list = [...this.app.store.data.ventas]
      .filter(venta => {
        const ventaDate = new Date(venta.createdAt);
        const matchesSearch = (venta.cliente || '').toLowerCase().includes(q) || this.paymentLabel(venta).toLowerCase().includes(q) || venta.items.some(item => item.productName.toLowerCase().includes(q));
        const matchesPaymentMethod = !methodFilter || venta.metodoPago?.id === methodFilter;
        const matchesDesde = !desde || ventaDate >= new Date(`${desde}T00:00:00`);
        const matchesHasta = !hasta || ventaDate <= new Date(`${hasta}T23:59:59`);
        return matchesSearch && matchesPaymentMethod && matchesDesde && matchesHasta;
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    document.getElementById('wrap-ventas').innerHTML = `<table class="data-table"><thead><tr><th>Fecha y hora</th><th>Cliente</th><th>Método de pago</th><th>Productos</th><th>Total calculado</th><th>Total final</th><th>Acciones</th></tr></thead><tbody id="tbl-ventas"></tbody></table><div id="empty-ventas" class="empty-state" style="display:none"><div class="empty-icon">🧾</div><p>Aún no hay ventas cargadas</p></div>`;
    const tbody = document.getElementById('tbl-ventas');
    const empty = document.getElementById('empty-ventas');
    const pageState = getResponsivePageItems(list, this.page, DEFAULT_PAGE_SIZE);
    this.page = pageState.page;
    this.totalPages = pageState.totalPages;
    const pageItems = pageState.items;

    if (!pageItems.length) {
      tbody.innerHTML = '';
      empty.style.display = '';
      document.getElementById('pager-ventas').innerHTML = '';
      return;
    }

    empty.style.display = 'none';
    tbody.innerHTML = pageItems.map(venta => {
      const products = venta.items.map(item => `${escapeHtml(item.productName)} x ${this.formatQty(item.qty)}`).join(', ');
      const name = `${venta.cliente || 'Cliente mostrador'} - ${this.formatDate(venta.createdAt)}`;
      return `<tr><td data-label="Fecha"><strong>${this.formatDate(venta.createdAt)}</strong></td><td data-label="Cliente">${escapeHtml(venta.cliente || 'Cliente mostrador')}</td><td data-label="Método">${escapeHtml(this.paymentLabel(venta))}</td><td data-label="Productos">${products}</td><td data-label="Calculado">${this.formatMoney(venta.calculatedTotal)}</td><td class="price-value" data-label="Final">${this.formatMoney(venta.finalTotal)}</td><td data-label="Acciones"><div class="td-actions"><button class="btn btn-ghost btn-sm btn-icon" data-action="view-venta" data-id="${escapeHtml(venta.id)}" aria-label="Visualizar venta" title="Visualizar">👁️</button><button class="btn btn-danger btn-sm btn-icon" data-action="delete" data-entity="venta" data-id="${escapeHtml(venta.id)}" data-name="${escapeHtml(name)}" aria-label="Eliminar venta" title="Eliminar">🗑️</button></div></td></tr>`;
    }).join('');
    document.getElementById('pager-ventas').innerHTML = paginationTemplate('ventas', pageState);
  }

  view(id) {
    const venta = this.app.store.data.ventas.find(item => item.id === id);
    if (!venta) return this.app.toasts.show('No se encontró la venta', 'error');

    const rows = venta.items.map(item => `<tr><td data-label="Producto"><strong>${escapeHtml(item.productName)}</strong></td><td data-label="Cantidad">${this.formatQty(item.qty)}</td><td class="price-value" data-label="Precio">${this.formatMoney(item.price)}</td><td class="price-value" data-label="Subtotal">${this.formatMoney(item.subtotal ?? item.qty * item.price)}</td></tr>`).join('');
    const method = venta.metodoPago || {};
    const paymentDetail = method.nombre ? `<div><span>Método de pago</span><strong>${escapeHtml(method.nombre)}</strong></div><div><span>Descuento</span><strong>${this.formatPercent(method.descuento)}</strong></div><div><span>Recargo</span><strong>${this.formatPercent(method.recargo ?? method.bonificacion)}</strong></div>` : '<div><span>Método de pago</span><strong>Sin método</strong></div>';
    const ticketConfig = normalizeTicketConfig(this.app.store.data.ticketConfig?.[0]);
    this.app.showDetail('Detalle de venta', `<div class="sale-detail-grid"><div><span>Fecha y hora</span><strong>${this.formatDate(venta.createdAt)}</strong></div><div><span>Cliente</span><strong>${escapeHtml(venta.cliente || 'Cliente mostrador')}</strong></div>${paymentDetail}<div><span>Total calculado</span><strong>${this.formatMoney(venta.calculatedTotal)}</strong></div><div><span>Total final</span><strong class="price-value">${this.formatMoney(venta.finalTotal)}</strong></div></div><div class="modal-actions" style="position:static;padding:0;margin:16px 0 0;background:transparent;border:0"><button class="btn btn-primary" data-action="print-sale-ticket" data-id="${escapeHtml(venta.id)}">Imprimir ticket</button></div><div class="table-wrap sale-cart-wrap" style="margin-top:16px"><table><thead><tr><th>Producto</th><th>Cantidad</th><th>Precio</th><th>Subtotal</th></tr></thead><tbody>${rows}</tbody></table></div>`);
  }

  printTicket(id) {
    const venta = this.app.store.data.ventas.find(item => item.id === id);
    if (!venta) return this.app.toasts.show('No se encontró la venta', 'error');

    const ticketConfig = normalizeTicketConfig(this.app.store.data.ticketConfig?.[0]);
    const html = buildTicketDocumentHtml(venta, ticketConfig, {
      escapeHtml,
      formatMoney: value => this.formatMoney(value),
      formatDate: value => this.formatDate(value),
      formatPercent: value => this.formatPercent(value),
      fallbackBrandName: window.PETSHOP_CONFIG?.appName || ''
    });
    const win = window.open('', '_blank', 'width=480,height=820');
    if (!win) return this.app.toasts.show('El navegador bloqueó la impresión', 'error');
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 250);
  }
}
