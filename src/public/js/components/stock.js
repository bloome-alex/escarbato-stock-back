import { form } from '../ui.js';
import { DEFAULT_PAGE_SIZE, getResponsivePageItems, loadingTemplate, paginationTemplate } from '../pagination.js?v=20260521-1';
import { compareByName } from '../sort.js';

export class StockComponent {
  constructor(app) {
    this.app = app;
    this.statusLabel = { ok: 'Disponible', low: 'Stock bajo', out: 'Sin stock' };
    this.statusChip = { ok: 'chip-ok', low: 'chip-low', out: 'chip-out' };
    this.page = 1;
    this.totalPages = 1;
    this.loadingTimer = null;
    this.inlineSaveTimers = new Map();
  }

  template() {
    return `<section class="section" id="sec-stock">
      <div class="toolbar"><div class="search-box"><span class="search-icon">🔍</span><input type="text" placeholder="Buscar producto en stock…" id="searchStock"></div><select id="filterStockTipo" class="filter-control"><option value="">Todos los tipos</option></select><select id="filterStockProveedor" class="filter-control"><option value="">Todos los proveedores</option></select><select id="filterStockStatus" class="filter-control"><option value="">Todos</option><option value="ok">Disponible</option><option value="low">Stock bajo</option><option value="out">Sin stock</option></select></div>
      <div class="table-wrap" id="stock-list"><table class="data-table"><thead><tr><th>Producto</th><th>Tipo de producto</th><th>Proveedor</th><th>Mínimo</th><th>Stock</th><th>Estado</th></tr></thead><tbody id="tbl-stock"></tbody></table></div><div id="empty-stock" class="empty-state" style="display:none"><div class="empty-icon">📊</div><p>Agregá productos para gestionar el stock</p></div><div id="pager-stock"></div>
    </section>`;
  }

  modalTemplate() {
    return '';
  }

  bind() {
    document.getElementById('searchStock').addEventListener('input', () => this.resetAndRender());
    document.getElementById('filterStockTipo').addEventListener('change', () => this.resetAndRender());
    document.getElementById('filterStockProveedor').addEventListener('change', () => this.resetAndRender());
    document.getElementById('filterStockStatus').addEventListener('change', () => this.resetAndRender());
    document.getElementById('stock-list').addEventListener('input', event => {
      const input = event.target.closest('[data-stock-input]');
      if (input) this.scheduleInlineSave(input);
    });
    document.getElementById('stock-list').addEventListener('focusin', event => {
      const input = event.target.closest('[data-stock-input]');
      if (input && input.value === '0') input.value = '';
    });
    document.getElementById('stock-list').addEventListener('focusout', event => {
      const input = event.target.closest('[data-stock-input]');
      if (!input || input.value !== '') return;
      this.clearInlineSave(input.dataset.id);
      input.value = this.app.store.data.stock[input.dataset.id] || 0;
    });
    document.getElementById('stock-list').addEventListener('keydown', event => {
      const input = event.target.closest('[data-stock-input]');
      if (input && event.key === 'Enter') {
        event.preventDefault();
        this.clearInlineSave(input.dataset.id);
        this.saveInline(input, true);
      }
    });
  }

  getStatus(qty, min) {
    if (qty === 0) return 'out';
    if (qty <= min) return 'low';
    return 'ok';
  }

  refreshTipoSelects() {
    const filter = document.getElementById('filterStockTipo');
    const selectedFilter = filter ? filter.value : '';
    const opts = [...this.app.store.data.tipos]
      .sort(compareByName)
      .map(tipo => `<option value="${tipo.id}">${tipo.nombre}</option>`)
      .join('');
    document.getElementById('filterStockTipo').innerHTML = '<option value="">Todos los tipos</option>' + opts;
    if (selectedFilter) filter.value = selectedFilter;
  }

  refreshProveedorSelects() {
    const filter = document.getElementById('filterStockProveedor');
    const selectedFilter = filter ? filter.value : '';
    const opts = [...this.app.store.data.proveedores]
      .sort(compareByName)
      .map(prov => `<option value="${prov.id}">${prov.nombre}</option>`)
      .join('');
    document.getElementById('filterStockProveedor').innerHTML = '<option value="">Todos los proveedores</option><option value="sin-proveedor">Sin proveedor</option>' + opts;
    if (selectedFilter) filter.value = selectedFilter;
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
    this.refreshTipoSelects();
    this.refreshProveedorSelects();
    const data = this.app.store.data;
    const q = (form.value('searchStock') || '').toLowerCase();
    const tipoId = form.value('filterStockTipo');
    const proveedorId = form.value('filterStockProveedor');
    const filter = form.value('filterStockStatus');
    const list = data.productos.filter(producto => {
      const qty = (data.stock[producto.id] || 0) - (data.reservedStock?.[producto.id] || 0);
      const min = producto.minStock ?? 0;
      const status = this.getStatus(qty, min);
      const matchesProveedor = !proveedorId
        || (proveedorId === 'sin-proveedor' && !producto.proveedorId)
        || producto.proveedorId === proveedorId;
      return producto.nombre.toLowerCase().includes(q) && (!tipoId || producto.tipoId === tipoId) && matchesProveedor && (!filter || status === filter);
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
      const qty = (data.stock[producto.id] || 0) - (data.reservedStock?.[producto.id] || 0);
      const min = producto.minStock ?? 0;
      const status = this.getStatus(qty, min);
      const tipo = data.tipos.find(item => item.id === producto.tipoId);
      const proveedor = data.proveedores.find(item => item.id === producto.proveedorId);
      return `<tr><td data-label="Producto"><strong>${producto.nombre}</strong></td><td data-label="Tipo">${tipo ? tipo.nombre : '—'}</td><td data-label="Proveedor">${proveedor ? proveedor.nombre : '—'}</td><td data-label="Mínimo">${min} u.</td><td data-label="Stock"><input class="stock-qty" type="number" min="0" step="any" value="${qty}" data-stock-input data-id="${producto.id}" aria-label="Stock de ${producto.nombre}"></td><td data-label="Estado"><span class="chip ${this.statusChip[status]}" data-stock-status>${this.statusLabel[status]}</span></td></tr>`;
    }).join('');
    document.getElementById('pager-stock').innerHTML = paginationTemplate('stock', pageState);
  }

  scheduleInlineSave(input) {
    const id = input.dataset.id;
    if (!id) return;
    this.clearInlineSave(id);
    this.inlineSaveTimers.set(id, setTimeout(() => {
      this.inlineSaveTimers.delete(id);
      this.saveInline(input, true);
    }, 600));
  }

  clearInlineSave(id) {
    const timer = this.inlineSaveTimers.get(id);
    if (!timer) return;
    clearTimeout(timer);
    this.inlineSaveTimers.delete(id);
  }

  async saveInline(input, keepFocus = false) {
    const id = input.dataset.id;
    const value = input.value.trim();
    if (!id) return;
    if (value === '') return;

    const qty = Number(value);
    if (Number.isNaN(qty) || qty < 0) {
      input.value = this.app.store.data.stock[id] || 0;
      return this.app.toasts.show('Ingresá una cantidad válida', 'error');
    }

    const newQty = Number(qty.toFixed(4));
    if (newQty === (this.app.store.data.stock[id] || 0)) {
      input.value = newQty;
      return;
    }

    await this.setQuantity(id, newQty, 'Edición manual desde listado', false);
    if (Number(input.value) === newQty) this.updateInlineRow(input, newQty);
    if (keepFocus) input.focus();
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
    if (shouldRender) this.renderList();
    const status = this.getStatus(newQty, product ? (product.minStock ?? 0) : 0);
    this.app.toasts.show(`Stock actualizado: ${newQty} unidades`, status === 'ok' ? 'success' : 'error');
    this.app.updateBadge();
  }
}
