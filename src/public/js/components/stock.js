import { form } from '../ui.js';
import { DEFAULT_PAGE_SIZE, getResponsivePageItems, loadingTemplate, paginationTemplate } from '../pagination.js';
import { compareByName } from '../sort.js';

export class StockComponent {
  constructor(app) {
    this.app = app;
    this.statusLabel = { ok: 'Disponible', low: 'Stock bajo', out: 'Sin stock' };
    this.statusChip = { ok: 'chip-ok', low: 'chip-low', out: 'chip-out' };
    this.page = 1;
    this.totalPages = 1;
    this.loadingTimer = null;
  }

  template() {
    return `<section class="section" id="sec-stock">
      <div class="toolbar"><div class="search-box"><span class="search-icon">🔍</span><input type="text" placeholder="Buscar producto en stock…" id="searchStock"></div><select id="filterStockStatus" class="filter-control"><option value="">Todos</option><option value="ok">Disponible</option><option value="low">Stock bajo</option><option value="out">Sin stock</option></select></div>
      <div class="table-wrap" id="stock-list"><table class="data-table"><thead><tr><th>Producto</th><th>Tipo de producto</th><th>Proveedor</th><th>Mínimo</th><th>Stock</th><th>Estado</th></tr></thead><tbody id="tbl-stock"></tbody></table></div><div id="empty-stock" class="empty-state" style="display:none"><div class="empty-icon">📊</div><p>Agregá productos para gestionar el stock</p></div><div id="pager-stock"></div>
    </section>`;
  }

  modalTemplate() {
    return '';
  }

  bind() {
    document.getElementById('searchStock').addEventListener('input', () => this.resetAndRender());
    document.getElementById('filterStockStatus').addEventListener('change', () => this.resetAndRender());
    document.getElementById('stock-list').addEventListener('change', event => {
      const input = event.target.closest('[data-stock-input]');
      if (input) this.saveInline(input);
    });
    document.getElementById('stock-list').addEventListener('keydown', event => {
      const input = event.target.closest('[data-stock-input]');
      if (input && event.key === 'Enter') input.blur();
    });
  }

  getStatus(qty, min) {
    if (qty === 0) return 'out';
    if (qty <= min) return 'low';
    return 'ok';
  }

  render() {
    clearTimeout(this.loadingTimer);
    document.getElementById('stock-list').innerHTML = loadingTemplate('Cargando stock...');
    document.getElementById('empty-stock').style.display = 'none';
    document.getElementById('pager-stock').innerHTML = '';
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
    const data = this.app.store.data;
    const q = (form.value('searchStock') || '').toLowerCase();
    const filter = form.value('filterStockStatus');
    const list = data.productos.filter(producto => {
      const qty = data.stock[producto.id] || 0;
      const min = producto.minStock ?? 0;
      const status = this.getStatus(qty, min);
      return producto.nombre.toLowerCase().includes(q) && (!filter || status === filter);
    }).sort(compareByName);

    const listEl = document.getElementById('stock-list');
    const emptyEl = document.getElementById('empty-stock');
    const pageState = getResponsivePageItems(list, this.page, DEFAULT_PAGE_SIZE);
    this.page = pageState.page;
    this.totalPages = pageState.totalPages;
    const pageItems = pageState.items;
    if (!pageItems.length) {
      listEl.innerHTML = '';
      emptyEl.style.display = '';
      document.getElementById('pager-stock').innerHTML = '';
      return;
    }

    emptyEl.style.display = 'none';
    listEl.innerHTML = `<table class="data-table"><thead><tr><th>Producto</th><th>Tipo de producto</th><th>Proveedor</th><th>Mínimo</th><th>Stock</th><th>Estado</th></tr></thead><tbody id="tbl-stock"></tbody></table>`;
    document.getElementById('tbl-stock').innerHTML = pageItems.map(producto => {
      const qty = data.stock[producto.id] || 0;
      const min = producto.minStock ?? 0;
      const status = this.getStatus(qty, min);
      const tipo = data.tipos.find(item => item.id === producto.tipoId);
      const proveedor = data.proveedores.find(item => item.id === producto.proveedorId);
      return `<tr><td data-label="Producto"><strong>${producto.nombre}</strong></td><td data-label="Tipo">${tipo ? tipo.nombre : '—'}</td><td data-label="Proveedor">${proveedor ? proveedor.nombre : '—'}</td><td data-label="Mínimo">${min} u.</td><td data-label="Stock"><input class="stock-qty" type="number" min="0" step="1" value="${qty}" data-stock-input data-id="${producto.id}" aria-label="Stock de ${producto.nombre}"></td><td data-label="Estado"><span class="chip ${this.statusChip[status]}" data-stock-status>${this.statusLabel[status]}</span></td></tr>`;
    }).join('');
    document.getElementById('pager-stock').innerHTML = paginationTemplate('stock', pageState);
  }

  async saveInline(input) {
    const id = input.dataset.id;
    const qty = Number(input.value);
    if (!id) return;
    if (Number.isNaN(qty) || qty < 0 || !Number.isInteger(qty)) {
      input.value = this.app.store.data.stock[id] || 0;
      return this.app.toasts.show('Ingresá una cantidad entera válida', 'error');
    }

    const newQty = qty;
    if (newQty === (this.app.store.data.stock[id] || 0)) {
      input.value = newQty;
      return;
    }

    try {
      input.disabled = true;
      await this.setQuantity(id, newQty, 'Edición manual desde listado', false);
      this.updateInlineRow(input, newQty);
    } finally {
      input.disabled = false;
    }
  }

  updateInlineRow(input, qty) {
    input.value = qty;
    const product = this.app.store.data.productos.find(item => item.id === input.dataset.id);
    const status = this.getStatus(qty, product ? (product.minStock ?? 0) : 0);
    const statusEl = input.closest('tr')?.querySelector('[data-stock-status]');
    if (!statusEl) return;
    statusEl.className = `chip ${this.statusChip[status]}`;
    statusEl.textContent = this.statusLabel[status];
  }

  async setQuantity(id, qty, source = 'Ajuste rápido', shouldRender = true) {
    const data = this.app.store.data;
    const previousQty = data.stock[id] || 0;
    const newQty = Number(qty);
    if (newQty === previousQty) return;
    data.stock[id] = newQty;
    await this.app.store.put('stock', { id, qty: newQty });
    const product = data.productos.find(item => item.id === id);
    await this.app.audit('Edición', 'Stock', `${product ? product.nombre : 'Producto'}: ${previousQty} -> ${newQty} (${source})`);
    if (shouldRender) this.render();
    const status = this.getStatus(newQty, product ? (product.minStock ?? 0) : 0);
    this.app.toasts.show(`Stock actualizado: ${newQty} unidades`, status === 'ok' ? 'success' : 'error');
    this.app.updateBadge();
  }
}
