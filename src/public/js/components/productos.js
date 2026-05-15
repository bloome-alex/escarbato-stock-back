import { form } from '../ui.js';
import { DEFAULT_PAGE_SIZE, getPageItems, loadingTemplate, paginationTemplate } from '../pagination.js';

const normalizeUniqueName = value => value.trim().toLocaleLowerCase('es');

export class ProductosComponent {
  constructor(app) {
    this.app = app;
    this.page = 1;
    this.loadingTimer = null;
  }

  formatMoney(value) {
    return value || value === 0 ? '$' + Number(value).toLocaleString('es-AR') : '—';
  }

  getProductPrice(producto) {
    return producto.precioFinal ?? producto.precio;
  }

  calculatePrice(costo, porcentaje) {
    return Number((Number(costo) + (Number(costo) * Number(porcentaje) / 100)).toFixed(2));
  }

  template() {
    return `<section class="section" id="sec-productos">
      <div class="section-header"><div class="section-heading">📦 <span>Productos</span></div><button class="btn btn-primary" data-action="new-producto">+ Nuevo producto</button></div>
      <div class="toolbar"><div class="search-box"><span class="search-icon">🔍</span><input type="text" placeholder="Buscar producto…" id="searchProd"></div><select id="filterTipo" class="filter-control"><option value="">Todos los tipos</option></select><select id="filterProveedor" class="filter-control"><option value="">Todos los proveedores</option></select><select id="filterStockProd" class="filter-control"><option value="">Todo stock</option><option value="disponible">Disponible</option><option value="bajo">Stock bajo</option><option value="sin-stock">Sin stock</option></select></div>
      <div class="table-wrap" id="wrap-productos"><table class="data-table"><thead><tr><th>Producto</th><th>Tipo</th><th>Proveedor</th><th>Costo</th><th>Porcentaje</th><th>Precio</th><th>Precio final</th><th>Acciones</th></tr></thead><tbody id="tbl-productos"></tbody></table><div id="empty-productos" class="empty-state" style="display:none"><div class="empty-icon">📦</div><p>Aún no hay productos registrados</p></div></div><div id="pager-productos"></div>
    </section>`;
  }

  modalTemplate() {
    return `<div class="modal-overlay" id="modal-prod"><div class="modal"><div class="modal-title"><span id="modal-prod-title">Nuevo Producto</span><button class="modal-close" data-close-modal="prod">✕</button></div><input type="hidden" id="prod-id"><div class="form-group"><label>Nombre del producto *</label><input type="text" id="prod-nombre" placeholder="Ej: Croquetas Premium Perro Adulto 10kg"></div><div class="form-row"><div class="form-group"><label>Tipo *</label><select id="prod-tipo"><option value="">Seleccionar tipo…</option></select></div><div class="form-group"><label>Proveedor</label><select id="prod-proveedor"><option value="">Sin proveedor</option></select></div></div><div class="form-row"><div class="form-group"><label>Costo ($) *</label><input type="number" id="prod-costo" placeholder="0.00" min="0" step="0.01"></div><div class="form-group"><label>Porcentaje de ganancia (%) *</label><input type="number" id="prod-porcentaje" placeholder="0" min="0" step="0.01"></div></div><div class="form-row"><div class="form-group"><label>Precio calculado ($)</label><input type="number" id="prod-precio" placeholder="0.00" min="0" step="0.01" readonly></div><div class="form-group"><label>Precio final ($) *</label><input type="number" id="prod-precio-final" placeholder="Redondeado a mano" min="0" step="0.01"></div></div><div class="form-row"><div class="form-group"><label>Stock mínimo</label><input type="number" id="prod-min-stock" placeholder="5" min="0"></div></div><div class="form-group"><label>Descripción</label><textarea id="prod-desc" placeholder="Detalle del producto…"></textarea></div><div class="modal-actions"><button class="btn btn-ghost" data-close-modal="prod">Cancelar</button><button class="btn btn-primary" data-action="save-producto">💾 Guardar</button></div></div></div>`;
  }

  bind() {
    document.getElementById('searchProd').addEventListener('input', () => this.resetAndRender());
    document.getElementById('filterTipo').addEventListener('change', () => this.resetAndRender());
    document.getElementById('filterProveedor').addEventListener('change', () => this.resetAndRender());
    document.getElementById('filterStockProd').addEventListener('change', () => this.resetAndRender());
    document.querySelector('[data-action="new-producto"]').addEventListener('click', () => this.openNew());
    document.getElementById('prod-costo').addEventListener('input', () => this.updateCalculatedPrice());
    document.getElementById('prod-porcentaje').addEventListener('input', () => this.updateCalculatedPrice());
    document.getElementById('wrap-productos').addEventListener('input', event => {
      if (event.target.matches('[data-product-field="costo"], [data-product-field="porcentaje"]')) this.updateInlineCalculatedPrice(event.target);
    });
    document.getElementById('wrap-productos').addEventListener('change', event => {
      if (event.target.matches('[data-product-field]')) this.saveInline(event.target.dataset.id);
    });
  }

  updateCalculatedPrice() {
    const costo = form.value('prod-costo');
    const porcentaje = form.value('prod-porcentaje');
    if (costo === '' || porcentaje === '' || Number(costo) < 0 || Number(porcentaje) < 0) {
      form.set('prod-precio');
      return;
    }

    form.set('prod-precio', this.calculatePrice(costo, porcentaje).toFixed(2));
  }

  refreshTipoSelects() {
    const filter = document.getElementById('filterTipo');
    const selectedFilter = filter ? filter.value : '';
    const opts = [...this.app.store.data.tipos]
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }))
      .map(tipo => `<option value="${tipo.id}">${tipo.nombre}</option>`)
      .join('');
    document.getElementById('prod-tipo').innerHTML = '<option value="">Seleccionar tipo…</option>' + opts;
    document.getElementById('filterTipo').innerHTML = '<option value="">Todos los tipos</option>' + opts;
    if (selectedFilter) filter.value = selectedFilter;
  }

  refreshProveedorSelects() {
    const filter = document.getElementById('filterProveedor');
    const selectedFilter = filter ? filter.value : '';
    const opts = [...this.app.store.data.proveedores]
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }))
      .map(prov => `<option value="${prov.id}">${prov.nombre}</option>`)
      .join('');
    document.getElementById('prod-proveedor').innerHTML = '<option value="">Sin proveedor</option>' + opts;
    document.getElementById('filterProveedor').innerHTML = '<option value="">Todos los proveedores</option><option value="sin-proveedor">Sin proveedor</option>' + opts;
    if (selectedFilter) filter.value = selectedFilter;
  }

  render() {
    clearTimeout(this.loadingTimer);
    document.getElementById('wrap-productos').innerHTML = loadingTemplate('Cargando productos...');
    document.getElementById('pager-productos').innerHTML = '';
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
    const q = (form.value('searchProd') || '').toLowerCase();
    const tipoId = form.value('filterTipo');
    const proveedorId = form.value('filterProveedor');
    const stockFilter = form.value('filterStockProd');
    const list = data.productos.filter(producto => {
      const qty = data.stock[producto.id] || 0;
      const min = producto.minStock || 5;
      const matchesStock = !stockFilter
        || (stockFilter === 'disponible' && qty > min)
        || (stockFilter === 'bajo' && qty > 0 && qty <= min)
        || (stockFilter === 'sin-stock' && qty <= 0);
      const matchesProveedor = !proveedorId
        || (proveedorId === 'sin-proveedor' && !producto.proveedorId)
        || producto.proveedorId === proveedorId;
      return producto.nombre.toLowerCase().includes(q) && (!tipoId || producto.tipoId === tipoId) && matchesProveedor && matchesStock;
    }).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));
    document.getElementById('wrap-productos').innerHTML = `<table class="data-table"><thead><tr><th>Producto</th><th>Tipo</th><th>Proveedor</th><th>Costo</th><th>Porcentaje</th><th>Precio</th><th>Precio final</th><th>Acciones</th></tr></thead><tbody id="tbl-productos"></tbody></table><div id="empty-productos" class="empty-state" style="display:none"><div class="empty-icon">📦</div><p>Aún no hay productos registrados</p></div>`;
    const tbody = document.getElementById('tbl-productos');
    const empty = document.getElementById('empty-productos');
    const pageState = getPageItems(list, this.page, DEFAULT_PAGE_SIZE);
    this.page = pageState.page;
    const pageItems = pageState.items;

    if (!pageItems.length) {
      tbody.innerHTML = '';
      empty.style.display = '';
      document.getElementById('pager-productos').innerHTML = '';
      return;
    }

    empty.style.display = 'none';
    tbody.innerHTML = pageItems.map(producto => {
      const tipo = data.tipos.find(item => item.id === producto.tipoId);
      const prov = data.proveedores.find(item => item.id === producto.proveedorId);
      const costo = producto.costo ?? producto.precio ?? 0;
      const porcentaje = producto.porcentaje ?? 0;
      const precio = this.formatMoney(producto.precio);
      const precioFinal = this.getProductPrice(producto) ?? 0;
      return `<tr data-product-row="${producto.id}"><td><div style="font-weight:800">${producto.nombre}</div>${producto.desc ? `<div style="font-size:.78rem;color:var(--text-soft)">${producto.desc.slice(0, 60)}${producto.desc.length > 60 ? '…' : ''}</div>` : ''}</td><td>${tipo ? `<span class="chip chip-ok">${tipo.nombre}</span>` : '—'}</td><td>${prov ? prov.nombre : '—'}</td><td><input class="inline-table-input" type="number" min="0" step="0.01" value="${costo}" data-product-field="costo" data-id="${producto.id}" aria-label="Costo de ${producto.nombre}"></td><td><input class="inline-table-input" type="number" min="0" step="0.01" value="${porcentaje}" data-product-field="porcentaje" data-id="${producto.id}" aria-label="Porcentaje de ${producto.nombre}"></td><td class="price-value" data-inline-price>${precio}</td><td><input class="inline-table-input" type="number" min="0" step="0.01" value="${precioFinal}" data-product-field="precioFinal" data-id="${producto.id}" aria-label="Precio final de ${producto.nombre}"></td><td><div class="td-actions"><button class="btn btn-ghost btn-sm btn-icon" data-action="view-producto" data-id="${producto.id}" aria-label="Visualizar producto" title="Visualizar">👁️</button><button class="btn btn-ghost btn-sm btn-icon" data-action="edit-producto" data-id="${producto.id}" aria-label="Editar producto" title="Editar">✏️</button><button class="btn btn-danger btn-sm btn-icon" data-action="delete" data-entity="prod" data-id="${producto.id}" data-name="${producto.nombre}" aria-label="Eliminar producto" title="Eliminar">🗑️</button></div></td></tr>`;
    }).join('');
    document.getElementById('pager-productos').innerHTML = paginationTemplate('productos', pageState);
  }

  updateInlineCalculatedPrice(input) {
    const row = input.closest('[data-product-row]');
    const costo = row.querySelector('[data-product-field="costo"]').value;
    const porcentaje = row.querySelector('[data-product-field="porcentaje"]').value;
    const priceEl = row.querySelector('[data-inline-price]');
    if (costo === '' || porcentaje === '' || Number(costo) < 0 || Number(porcentaje) < 0) {
      priceEl.textContent = '—';
      return;
    }

    priceEl.textContent = this.formatMoney(this.calculatePrice(costo, porcentaje));
  }

  async saveInline(id) {
    const producto = this.app.store.data.productos.find(item => item.id === id);
    const row = document.querySelector(`[data-product-row="${id}"]`);
    if (!producto || !row) return;

    const costo = row.querySelector('[data-product-field="costo"]').value;
    const porcentaje = row.querySelector('[data-product-field="porcentaje"]').value;
    const precioFinal = row.querySelector('[data-product-field="precioFinal"]').value;
    if (costo === '' || Number(costo) < 0) return this.invalidInlineEdit('Ingresá un costo válido');
    if (porcentaje === '' || Number(porcentaje) < 0) return this.invalidInlineEdit('Ingresá un porcentaje válido');
    if (precioFinal === '' || Number(precioFinal) < 0) return this.invalidInlineEdit('Ingresá un precio final válido');

    producto.costo = Number(costo);
    producto.porcentaje = Number(porcentaje);
    producto.precio = this.calculatePrice(costo, porcentaje);
    producto.precioFinal = Number(precioFinal);
    row.querySelector('[data-inline-price]').textContent = this.formatMoney(producto.precio);
    await this.app.store.put('productos', producto);
    await this.app.audit('Edición', 'Productos', `${producto.nombre} (precios)`);
    this.app.toasts.show('Producto actualizado ✅');
  }

  invalidInlineEdit(message) {
    this.app.toasts.show(message, 'error');
    this.render();
  }

  view(id) {
    const producto = this.app.store.data.productos.find(item => item.id === id);
    if (!producto) return this.app.toasts.show('No se encontró el producto', 'error');

    const data = this.app.store.data;
    const tipo = data.tipos.find(item => item.id === producto.tipoId);
    const prov = data.proveedores.find(item => item.id === producto.proveedorId);
    this.app.showDetail('Producto', `<div class="detail-list"><div><span>Nombre</span><strong>${producto.nombre}</strong></div><div><span>Tipo</span><strong>${tipo ? tipo.nombre : '—'}</strong></div><div><span>Proveedor</span><strong>${prov ? prov.nombre : '—'}</strong></div><div><span>Costo</span><strong class="price-value">${this.formatMoney(producto.costo ?? producto.precio)}</strong></div><div><span>Porcentaje de ganancia</span><strong>${producto.porcentaje ?? 0}%</strong></div><div><span>Precio calculado</span><strong class="price-value">${this.formatMoney(producto.precio)}</strong></div><div><span>Precio final</span><strong class="price-value">${this.formatMoney(this.getProductPrice(producto))}</strong></div><div><span>Stock mínimo</span><strong>${producto.minStock || 5} u.</strong></div><div><span>Descripción</span><strong>${producto.desc || '—'}</strong></div></div>`);
  }

  openNew() {
    this.refreshTipoSelects();
    this.refreshProveedorSelects();
    form.set('prod-id');
    form.clear(['prod-nombre', 'prod-costo', 'prod-porcentaje', 'prod-precio', 'prod-precio-final', 'prod-min-stock', 'prod-desc']);
    form.set('prod-tipo');
    form.set('prod-proveedor');
    document.getElementById('modal-prod-title').textContent = 'Nuevo Producto';
    this.app.modals.open('prod');
  }

  edit(id) {
    this.refreshTipoSelects();
    this.refreshProveedorSelects();
    const producto = this.app.store.data.productos.find(item => item.id === id);
    if (!producto) return;
    form.set('prod-id', producto.id);
    form.set('prod-nombre', producto.nombre || '');
    form.set('prod-tipo', producto.tipoId || '');
    form.set('prod-proveedor', producto.proveedorId || '');
    form.set('prod-costo', producto.costo ?? producto.precio ?? '');
    form.set('prod-porcentaje', producto.porcentaje ?? 0);
    form.set('prod-precio', producto.precio ?? '');
    form.set('prod-precio-final', this.getProductPrice(producto) ?? '');
    form.set('prod-min-stock', producto.minStock || '');
    form.set('prod-desc', producto.desc || '');
    document.getElementById('modal-prod-title').textContent = 'Editar Producto';
    this.app.modals.open('prod');
  }

  async save() {
    const nombre = form.trim('prod-nombre');
    const tipoId = form.value('prod-tipo');
    const costo = form.value('prod-costo');
    const porcentaje = form.value('prod-porcentaje');
    const precioFinal = form.value('prod-precio-final');
    if (!nombre) return this.app.toasts.show('El nombre es obligatorio', 'error');
    if (!tipoId) return this.app.toasts.show('Seleccioná un tipo de producto', 'error');
    if (costo === '' || Number(costo) < 0) return this.app.toasts.show('Ingresá un costo válido', 'error');
    if (porcentaje === '' || Number(porcentaje) < 0) return this.app.toasts.show('Ingresá un porcentaje válido', 'error');
    if (precioFinal === '' || Number(precioFinal) < 0) return this.app.toasts.show('Ingresá un precio final válido', 'error');

    const id = form.value('prod-id') || this.app.store.createId();
    const proveedorId = form.value('prod-proveedor') || null;
    const duplicated = this.app.store.data.productos.some(item => item.id !== id && item.proveedorId === proveedorId && normalizeUniqueName(item.nombre || '') === normalizeUniqueName(nombre));
    if (duplicated) return this.app.toasts.show('Ya existe un producto con ese nombre para el proveedor seleccionado', 'error');

    const precio = this.calculatePrice(costo, porcentaje);
    const producto = { id, nombre, tipoId, proveedorId, costo: Number(costo), porcentaje: Number(porcentaje), precio, precioFinal: Number(precioFinal), minStock: Number(form.value('prod-min-stock')) || 5, desc: form.trim('prod-desc') };
    await this.app.store.put('productos', producto);
    const list = this.app.store.data.productos;
    const index = list.findIndex(item => item.id === id);
    if (index >= 0) list[index] = producto;
    else list.push(producto);
    await this.app.audit(index >= 0 ? 'Edición' : 'Creación', 'Productos', producto.nombre);

    if (!(id in this.app.store.data.stock)) {
      this.app.store.data.stock[id] = 0;
      await this.app.store.put('stock', { id, qty: 0 });
    }

    this.app.modals.close('prod');
    this.render();
    this.app.toasts.show('Producto guardado ✅');
  }
}
