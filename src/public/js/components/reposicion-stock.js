import { escapeHtml, form, searchableSelect } from '../ui.js';
import { DEFAULT_PAGE_SIZE, getResponsivePageItems, loadingTemplate, paginationTemplate } from '../pagination.js?v=20260521-1';
import { compareByName } from '../sort.js';

export class ReposicionStockComponent {
  constructor(app) {
    this.app = app;
    this.statusLabel = { ok: 'Disponible', low: 'Stock bajo', out: 'Sin stock' };
    this.statusChip = { ok: 'chip-ok', low: 'chip-low', out: 'chip-out' };
    this.page = 1;
    this.totalPages = 1;
    this.loadingTimer = null;
    this.orderQty = new Map();
  }

  template() {
    return `<section class="section" id="sec-reposicionStock">
      <div class="toolbar"><div class="search-box"><span class="search-icon">🔍</span><input type="text" placeholder="Buscar producto a reponer…" id="searchReposicionStock"></div>${searchableSelect.template({ id: 'filterReposicionTipo', placeholder: 'Todos los tipos', options: [] })}${searchableSelect.template({ id: 'filterReposicionGrupo', placeholder: 'Todos los grupos', options: [] })}${searchableSelect.template({ id: 'filterReposicionProveedor', placeholder: 'Todos los proveedores', options: [] })}${searchableSelect.template({ id: 'filterReposicionStock', placeholder: 'Todo stock', options: [{ value: 'ok', label: 'Disponible' }, { value: 'low', label: 'Stock bajo' }, { value: 'out', label: 'Sin stock' }] })}</div>
      <div class="table-wrap" id="reposicion-stock-list"><table class="data-table"><thead><tr><th>Proveedor</th><th>Producto</th><th>Stock</th><th>Estado</th><th>Cantidad a solicitar</th></tr></thead><tbody id="tbl-reposicion-stock"></tbody></table></div><div id="empty-reposicion-stock" class="empty-state" style="display:none"><div class="empty-icon">📊</div><p>No hay productos para mostrar</p></div><div id="pager-reposicionStock"></div>
    </section>`;
  }

  bind() {
    document.getElementById('searchReposicionStock').addEventListener('input', () => this.resetAndRender());
    document.getElementById('filterReposicionTipo').addEventListener('change', () => this.resetAndRender());
    document.getElementById('filterReposicionGrupo').addEventListener('change', () => this.resetAndRender());
    document.getElementById('filterReposicionProveedor').addEventListener('change', () => this.resetAndRender());
    document.getElementById('filterReposicionStock').addEventListener('change', () => this.resetAndRender());
    document.getElementById('reposicion-stock-list').addEventListener('focusin', event => {
      const input = event.target.closest('[data-reposicion-qty]');
      if (input?.value === '0') input.value = '';
    });
    document.getElementById('reposicion-stock-list').addEventListener('input', event => {
      const input = event.target.closest('[data-reposicion-qty]');
      if (!input) return;
      this.orderQty.set(input.dataset.id, input.value);
    });
  }

  getStatus(qty, min) {
    if (qty <= 0) return 'out';
    if (qty <= min) return 'low';
    return 'ok';
  }

  getFilteredProducts() {
    const data = this.app.store.data;
    const q = (form.value('searchReposicionStock') || '').toLowerCase();
    const tipoId = form.value('filterReposicionTipo');
    const grupoId = form.value('filterReposicionGrupo');
    const proveedorId = form.value('filterReposicionProveedor');
    const stockFilter = form.value('filterReposicionStock');
    return data.productos.filter(producto => {
      const qty = (data.stock[producto.id] || 0) - (data.reservedStock?.[producto.id] || 0);
      const status = this.getStatus(qty, producto.minStock ?? 0);
      const productGroupId = producto.grupoProductoId || producto.grupoId || '';
      const matchesGrupo = !grupoId
        || (grupoId === 'sin-grupo' && !productGroupId)
        || productGroupId === grupoId;
      const matchesProveedor = !proveedorId
        || (proveedorId === 'sin-proveedor' && !producto.proveedorId)
        || producto.proveedorId === proveedorId;
      return producto.nombre.toLowerCase().includes(q)
        && (!tipoId || producto.tipoId === tipoId)
        && matchesGrupo
        && matchesProveedor
        && (!stockFilter || status === stockFilter);
    }).sort(compareByName);
  }

  getReportRows() {
    const data = this.app.store.data;
    return this.getFilteredProducts().map(producto => {
      const qty = (data.stock[producto.id] || 0) - (data.reservedStock?.[producto.id] || 0);
      const status = this.getStatus(qty, producto.minStock ?? 0);
      const tipo = data.tipos.find(item => item.id === producto.tipoId);
      const grupo = (data.gruposProductos || []).find(item => item.id === (producto.grupoProductoId || producto.grupoId));
      const proveedor = data.proveedores.find(item => item.id === producto.proveedorId);
      return {
        producto: producto.nombre || '-',
        tipo: tipo?.nombre || '-',
        grupo: grupo?.nombre || '-',
        proveedor: proveedor?.nombre || 'Sin proveedor',
        stock: qty,
        estado: this.statusLabel[status],
        cantidad: Math.max(Number(this.orderQty.get(producto.id) || 0), 0)
      };
    });
  }

  getFilterSummary() {
    const label = id => document.querySelector(`#${id}`)?.closest('[data-searchable-select]')?.querySelector('[data-searchable-select-input]')?.value || 'Todos';
    return {
      busqueda: form.value('searchReposicionStock') || 'Todas',
      tipo: label('filterReposicionTipo'),
      grupo: label('filterReposicionGrupo'),
      proveedor: label('filterReposicionProveedor'),
      stock: label('filterReposicionStock')
    };
  }

  refreshFilters() {
    const data = this.app.store.data;
    const tipos = [...data.tipos].sort(compareByName).map(tipo => ({ value: tipo.id, label: tipo.nombre }));
    const grupos = [...(data.gruposProductos || [])].sort(compareByName).map(grupo => ({ value: grupo.id, label: grupo.nombre }));
    const proveedores = [...data.proveedores].sort(compareByName).map(prov => ({ value: prov.id, label: prov.nombre }));
    searchableSelect.refresh('filterReposicionTipo', tipos, 'Todos los tipos');
    searchableSelect.refresh('filterReposicionGrupo', [{ value: 'sin-grupo', label: 'Sin grupo' }, ...grupos], 'Todos los grupos');
    searchableSelect.refresh('filterReposicionProveedor', [{ value: 'sin-proveedor', label: 'Sin proveedor' }, ...proveedores], 'Todos los proveedores');
  }

  render() {
    clearTimeout(this.loadingTimer);
    document.getElementById('reposicion-stock-list').innerHTML = loadingTemplate('Cargando reposición de stock...');
    document.getElementById('empty-reposicion-stock').style.display = 'none';
    document.getElementById('pager-reposicionStock').innerHTML = '';
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
    this.refreshFilters();
    const data = this.app.store.data;
    const list = this.getFilteredProducts();

    const listEl = document.getElementById('reposicion-stock-list');
    const emptyEl = document.getElementById('empty-reposicion-stock');
    const pageState = getResponsivePageItems(list, this.page, DEFAULT_PAGE_SIZE);
    this.page = pageState.page;
    this.totalPages = pageState.totalPages;
    const pageItems = pageState.items;
    if (!pageItems.length) {
      listEl.innerHTML = '';
      emptyEl.style.display = '';
      document.getElementById('pager-reposicionStock').innerHTML = '';
      return;
    }

    emptyEl.style.display = 'none';
    listEl.innerHTML = `<table class="data-table"><thead><tr><th>Proveedor</th><th>Producto</th><th>Stock</th><th>Estado</th><th>Cantidad a solicitar</th></tr></thead><tbody id="tbl-reposicion-stock"></tbody></table>`;
    document.getElementById('tbl-reposicion-stock').innerHTML = pageItems.map(producto => {
      const qty = (data.stock[producto.id] || 0) - (data.reservedStock?.[producto.id] || 0);
      const min = producto.minStock ?? 0;
      const status = this.getStatus(qty, min);
      const orderQty = this.orderQty.get(producto.id) || 0;
      const proveedor = data.proveedores.find(item => item.id === producto.proveedorId);
      return `<tr><td data-label="Proveedor"><strong>${proveedor ? escapeHtml(proveedor.nombre) : 'Sin proveedor'}</strong></td><td data-label="Producto"><strong>${escapeHtml(producto.nombre)}</strong></td><td data-label="Stock">${qty} u.</td><td data-label="Estado"><span class="chip ${this.statusChip[status]}">${this.statusLabel[status]}</span></td><td data-label="Cantidad a solicitar"><input class="inline-table-input" type="number" min="0" step="any" value="${escapeHtml(orderQty)}" data-reposicion-qty data-id="${escapeHtml(producto.id)}" aria-label="Cantidad a solicitar de ${escapeHtml(producto.nombre)}"></td></tr>`;
    }).join('');
    document.getElementById('pager-reposicionStock').innerHTML = paginationTemplate('reposicionStock', pageState);
  }

  async downloadPdf() {
    const rows = this.getReportRows().filter(row => row.cantidad > 0);
    if (!rows.length) return this.app.toasts.show('No hay productos para descargar', 'error');
    await this.app.store.downloadStockRepositionPdf({ rows, filters: this.getFilterSummary() });
    this.app.toasts.show('PDF descargado ✅');
  }

  async downloadXlsx() {
    const rows = this.getReportRows().filter(row => row.cantidad > 0);
    if (!rows.length) return this.app.toasts.show('No hay productos para descargar', 'error');
    await this.app.store.downloadStockRepositionXlsx({ rows, filters: this.getFilterSummary() });
    this.app.toasts.show('XLSX descargado ✅');
  }
}
