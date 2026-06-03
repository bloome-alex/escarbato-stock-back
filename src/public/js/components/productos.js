import { escapeHtml, form, searchableSelect } from '../ui.js';
import { DEFAULT_PAGE_SIZE, getResponsivePageItems, loadingTemplate, paginationTemplate } from '../pagination.js?v=20260521-1';
import { compareByName } from '../sort.js';

const normalizeUniqueName = value => value.trim().toLocaleLowerCase('es');

export class ProductosComponent {
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
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('es-AR');
  }

  getProductPrice(producto) {
    return producto.precioFinal ?? producto.precio;
  }

  calculatePrice(costo, porcentaje) {
    return Number((Number(costo) + (Number(costo) * Number(porcentaje) / 100)).toFixed(2));
  }

  increaseValue(value, percentage) {
    return Number((Number(value || 0) * (1 + Number(percentage) / 100)).toFixed(2));
  }

  template() {
    return `<section class="section" id="sec-productos">
      <div class="toolbar"><div class="search-box"><span class="search-icon">🔍</span><input type="text" placeholder="Buscar producto…" id="searchProd"></div>${searchableSelect.template({ id: 'filterTipo', placeholder: 'Todos los tipos', options: [], className: 'searchable-select--quarter' })}${searchableSelect.template({ id: 'filterGrupoProducto', placeholder: 'Todos los grupos', options: [] })}${searchableSelect.template({ id: 'filterProveedor', placeholder: 'Todos los proveedores', options: [] })}${searchableSelect.template({ id: 'filterStockProd', placeholder: 'Todo stock', options: [{ value: 'disponible', label: 'Disponible' }, { value: 'bajo', label: 'Stock bajo' }, { value: 'sin-stock', label: 'Sin stock' }] })}</div>
      <div class="table-wrap" id="wrap-productos"><table class="data-table"><thead><tr><th>Producto</th><th>Tipo</th><th>Grupo</th><th>Proveedor</th><th>Costo</th><th>Porcentaje</th><th>Precio</th><th>Precio final</th><th>Última actualización</th><th>Acciones</th></tr></thead><tbody id="tbl-productos"></tbody></table><div id="empty-productos" class="empty-state" style="display:none"><div class="empty-icon">📦</div><p>Aún no hay productos registrados</p></div></div><div id="pager-productos"></div>
    </section>`;
  }

  modalTemplate() {
    return `<div class="modal-overlay" id="modal-prod"><div class="modal"><div class="modal-title"><span id="modal-prod-title">Nuevo Producto</span><button class="modal-close" data-close-modal="prod">✕</button></div><input type="hidden" id="prod-id"><div class="form-group"><label>Nombre del producto *</label><input type="text" id="prod-nombre" placeholder="Ej: Croquetas Premium Perro Adulto 10kg"></div><div class="form-row"><div class="form-group"><label>Tipo *</label>${searchableSelect.template({ id: 'prod-tipo', placeholder: 'Seleccionar tipo…', options: [], className: 'searchable-select--quarter' })}</div><div class="form-group"><label>Grupo</label>${searchableSelect.template({ id: 'prod-grupo-producto', placeholder: 'Sin grupo', emptyLabel: 'Sin grupo', options: [] })}</div></div><div class="form-row"><div class="form-group"><label>Proveedor *</label>${searchableSelect.template({ id: 'prod-proveedor', placeholder: 'Seleccionar proveedor…', options: [] })}</div></div><div class="form-row"><div class="form-group"><label>Costo ($) *</label><input type="number" id="prod-costo" placeholder="0.00" min="0" step="0.01"></div><div class="form-group"><label>Porcentaje de ganancia (%) *</label><input type="number" id="prod-porcentaje" placeholder="0" min="0" step="0.01"></div></div><div class="form-row"><div class="form-group"><label>Precio calculado ($)</label><input type="number" id="prod-precio" placeholder="0.00" min="0" step="0.01" readonly></div><div class="form-group"><label>Precio final ($) *</label><input type="number" id="prod-precio-final" placeholder="Redondeado a mano" min="0" step="0.01"></div></div><div class="form-row"><div class="form-group"><label>Stock mínimo</label><input type="number" id="prod-min-stock" placeholder="0" min="0"></div></div><div class="form-group"><label>Descripción</label><textarea id="prod-desc" placeholder="Detalle del producto…"></textarea></div><div class="modal-actions"><button class="btn btn-ghost" data-close-modal="prod">Cancelar</button><button class="btn btn-primary" data-action="save-producto">💾 Guardar</button></div></div></div><div class="modal-overlay" id="modal-productos-aumento"><div class="modal"><div class="modal-title"><span>Aumento grupal</span><button class="modal-close" data-close-modal="productos-aumento">✕</button></div><div class="form-group"><label>Grupo *</label>${searchableSelect.template({ id: 'bulk-grupo-producto', placeholder: 'Seleccionar grupo…', options: [] })}</div><div class="form-group"><label>Porcentaje de aumento *</label><input type="number" id="bulk-aumento-porcentaje" placeholder="Ej: 10" min="0" step="0.01"></div><p style="color:var(--text-soft);font-size:.9rem;margin:0">Se actualizarán los precios de todos los productos del grupo seleccionado.</p><div class="modal-actions"><button class="btn btn-ghost" data-close-modal="productos-aumento">Cancelar</button><button class="btn btn-primary" data-action="apply-bulk-increase-productos">Aumentar</button></div></div></div>`;
  }

  bind() {
    document.getElementById('searchProd').addEventListener('input', () => this.resetAndRender());
    document.getElementById('filterTipo').addEventListener('change', () => this.resetAndRender());
    document.getElementById('filterGrupoProducto').addEventListener('change', () => this.resetAndRender());
    document.getElementById('filterProveedor').addEventListener('change', () => this.resetAndRender());
    document.getElementById('filterStockProd').addEventListener('change', () => this.resetAndRender());
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
    const tipos = [...this.app.store.data.tipos].sort(compareByName).map(tipo => ({ value: tipo.id, label: tipo.nombre }));
    searchableSelect.refresh('prod-tipo', tipos, 'Seleccionar tipo…');
    searchableSelect.refresh('filterTipo', tipos, 'Todos los tipos');
  }

  refreshProveedorSelects() {
    const proveedores = [...this.app.store.data.proveedores].sort(compareByName);
    searchableSelect.refresh('prod-proveedor', proveedores.map(prov => ({ value: prov.id, label: prov.nombre })), 'Seleccionar proveedor…');
    searchableSelect.refresh('filterProveedor', [{ value: 'sin-proveedor', label: 'Sin proveedor' }, ...proveedores.map(prov => ({ value: prov.id, label: prov.nombre }))], 'Todos los proveedores');
  }

  refreshGrupoSelects() {
    const grupos = [...(this.app.store.data.gruposProductos || [])].sort(compareByName);
    const options = grupos.map(grupo => ({ value: grupo.id, label: grupo.nombre }));
    searchableSelect.refresh('prod-grupo-producto', options, 'Sin grupo');
    searchableSelect.refresh('bulk-grupo-producto', options, 'Seleccionar grupo…');
    searchableSelect.refresh('filterGrupoProducto', [{ value: 'sin-grupo', label: 'Sin grupo' }, ...options], 'Todos los grupos');
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
    this.refreshGrupoSelects();
    this.refreshProveedorSelects();
    const data = this.app.store.data;
    const q = (form.value('searchProd') || '').toLowerCase();
    const tipoId = form.value('filterTipo');
    const grupoProductoId = form.value('filterGrupoProducto');
    const proveedorId = form.value('filterProveedor');
    const stockFilter = form.value('filterStockProd');
    const list = data.productos.filter(producto => {
      const qty = (data.stock[producto.id] || 0) - (data.reservedStock?.[producto.id] || 0);
      const min = producto.minStock ?? 0;
      const matchesStock = !stockFilter
        || (stockFilter === 'disponible' && qty > min)
        || (stockFilter === 'bajo' && qty > 0 && qty <= min)
        || (stockFilter === 'sin-stock' && qty <= 0);
      const matchesProveedor = !proveedorId
        || (proveedorId === 'sin-proveedor' && !producto.proveedorId)
        || producto.proveedorId === proveedorId;
      const productGroupId = producto.grupoProductoId || producto.grupoId || '';
      const matchesGrupo = !grupoProductoId
        || (grupoProductoId === 'sin-grupo' && !productGroupId)
        || productGroupId === grupoProductoId;
      return producto.nombre.toLowerCase().includes(q) && (!tipoId || producto.tipoId === tipoId) && matchesGrupo && matchesProveedor && matchesStock;
    }).sort(compareByName);
    document.getElementById('wrap-productos').innerHTML = `<table class="data-table"><thead><tr><th>Producto</th><th>Tipo</th><th>Grupo</th><th>Proveedor</th><th>Costo</th><th>Porcentaje</th><th>Precio</th><th>Precio final</th><th>Última actualización</th><th>Acciones</th></tr></thead><tbody id="tbl-productos"></tbody></table><div id="empty-productos" class="empty-state" style="display:none"><div class="empty-icon">📦</div><p>Aún no hay productos registrados</p></div>`;
    const tbody = document.getElementById('tbl-productos');
    const empty = document.getElementById('empty-productos');
    const pageState = getResponsivePageItems(list, this.page, DEFAULT_PAGE_SIZE);
    this.page = pageState.page;
    this.totalPages = pageState.totalPages;
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
      const grupo = (data.gruposProductos || []).find(item => item.id === (producto.grupoProductoId || producto.grupoId));
      const prov = data.proveedores.find(item => item.id === producto.proveedorId);
      const costo = producto.costo ?? producto.precio ?? 0;
      const porcentaje = producto.porcentaje ?? 0;
      const precio = this.formatMoney(producto.precio);
      const precioFinal = this.getProductPrice(producto) ?? 0;
      const desc = producto.desc ? `${escapeHtml(String(producto.desc).slice(0, 60))}${String(producto.desc).length > 60 ? '…' : ''}` : '';
      return `<tr data-product-row="${escapeHtml(producto.id)}"><td data-label="Producto"><div style="font-weight:800">${escapeHtml(producto.nombre)}</div>${desc ? `<div style="font-size:.78rem;color:var(--text-soft)">${desc}</div>` : ''}</td><td data-label="Tipo">${tipo ? `<span class="chip chip-ok">${escapeHtml(tipo.nombre)}</span>` : '—'}</td><td data-label="Grupo">${grupo ? escapeHtml(grupo.nombre) : '—'}</td><td data-label="Proveedor">${prov ? escapeHtml(prov.nombre) : '—'}</td><td data-label="Costo"><input class="inline-table-input" type="number" min="0" step="0.01" value="${costo}" data-product-field="costo" data-id="${escapeHtml(producto.id)}" aria-label="Costo de ${escapeHtml(producto.nombre)}"></td><td data-label="Porcentaje"><input class="inline-table-input" type="number" min="0" step="0.01" value="${porcentaje}" data-product-field="porcentaje" data-id="${escapeHtml(producto.id)}" aria-label="Porcentaje de ${escapeHtml(producto.nombre)}"></td><td class="price-value" data-label="Precio" data-inline-price>${precio}</td><td data-label="Precio final"><input class="inline-table-input" type="number" min="0" step="0.01" value="${precioFinal}" data-product-field="precioFinal" data-id="${escapeHtml(producto.id)}" aria-label="Precio final de ${escapeHtml(producto.nombre)}"></td><td data-label="Actualización" data-product-updated-at>${this.formatDate(producto.updatedAt)}</td><td data-label="Acciones"><div class="td-actions"><button class="btn btn-ghost btn-sm btn-icon" data-action="view-producto" data-id="${escapeHtml(producto.id)}" aria-label="Visualizar producto" title="Visualizar">👁️</button><button class="btn btn-ghost btn-sm btn-icon" data-action="edit-producto" data-id="${escapeHtml(producto.id)}" aria-label="Editar producto" title="Editar">✏️</button><button class="btn btn-danger btn-sm btn-icon" data-action="delete" data-entity="prod" data-id="${escapeHtml(producto.id)}" data-name="${escapeHtml(producto.nombre)}" aria-label="Eliminar producto" title="Eliminar">🗑️</button></div></td></tr>`;
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
    producto.updatedAt = new Date().toISOString();
    row.querySelector('[data-inline-price]').textContent = this.formatMoney(producto.precio);
    row.querySelector('[data-product-updated-at]').textContent = this.formatDate(producto.updatedAt);
    const savedProducto = await this.app.store.put('productos', producto);
    if (savedProducto) Object.assign(producto, savedProducto);
    row.querySelector('[data-product-updated-at]').textContent = this.formatDate(producto.updatedAt);
    await this.app.audit('Edición', 'Productos', `${producto.nombre} (precios)`);
    this.app.toasts.show('Producto actualizado ✅');
  }

  invalidInlineEdit(message) {
    this.app.toasts.show(message, 'error');
    this.renderList();
  }

  async downloadProviderProductsPdf() {
    await this.app.store.downloadProductsPdf();
    this.app.toasts.show('PDF descargado ✅');
  }

  async downloadProviderProductsXlsx() {
    await this.app.store.downloadProductsXlsx();
    this.app.toasts.show('XLSX descargado ✅');
  }

  openBulkIncrease() {
    this.refreshGrupoSelects();
    form.set('bulk-grupo-producto');
    form.set('bulk-aumento-porcentaje');
    this.app.modals.open('productos-aumento');
  }

  async applyBulkIncrease() {
    const grupoProductoId = form.value('bulk-grupo-producto');
    const porcentaje = form.value('bulk-aumento-porcentaje');
    if (!grupoProductoId) return this.app.toasts.show('Seleccioná un grupo de productos', 'error');
    if (porcentaje === '' || Number(porcentaje) <= 0) return this.app.toasts.show('Ingresá un porcentaje mayor a 0', 'error');

    const data = this.app.store.data;
    const grupo = (data.gruposProductos || []).find(item => item.id === grupoProductoId);
    const products = data.productos.filter(producto => (producto.grupoProductoId || producto.grupoId) === grupoProductoId);
    if (!products.length) return this.app.toasts.show('No hay productos en el grupo seleccionado', 'error');

    for (const producto of products) {
      const costoBase = producto.costo ?? producto.precio ?? 0;
      const precioBase = producto.precio ?? this.getProductPrice(producto) ?? 0;
      const precioFinalBase = this.getProductPrice(producto) ?? precioBase;
      producto.costo = this.increaseValue(costoBase, porcentaje);
      producto.precio = this.increaseValue(precioBase, porcentaje);
      producto.precioFinal = this.increaseValue(precioFinalBase, porcentaje);
      producto.updatedAt = new Date().toISOString();
      const savedProducto = await this.app.store.put('productos', producto);
      if (savedProducto) Object.assign(producto, savedProducto);
    }

    await this.app.audit('Edición', 'Productos', `Aumento grupal ${grupo ? grupo.nombre : grupoProductoId} (${Number(porcentaje)}%)`);
    this.app.modals.close('productos-aumento');
    this.renderList();
    this.app.toasts.show(`${products.length} productos actualizados ✅`);
  }

  view(id) {
    const producto = this.app.store.data.productos.find(item => item.id === id);
    if (!producto) return this.app.toasts.show('No se encontró el producto', 'error');

    const data = this.app.store.data;
    const tipo = data.tipos.find(item => item.id === producto.tipoId);
    const grupo = (data.gruposProductos || []).find(item => item.id === (producto.grupoProductoId || producto.grupoId));
    const prov = data.proveedores.find(item => item.id === producto.proveedorId);
    this.app.showDetail('Producto', `<div class="detail-list"><div><span>Nombre</span><strong>${escapeHtml(producto.nombre)}</strong></div><div><span>Tipo</span><strong>${tipo ? escapeHtml(tipo.nombre) : '—'}</strong></div><div><span>Grupo</span><strong>${grupo ? escapeHtml(grupo.nombre) : '—'}</strong></div><div><span>Proveedor</span><strong>${prov ? escapeHtml(prov.nombre) : '—'}</strong></div><div><span>Costo</span><strong class="price-value">${this.formatMoney(producto.costo ?? producto.precio)}</strong></div><div><span>Porcentaje de ganancia</span><strong>${producto.porcentaje ?? 0}%</strong></div><div><span>Precio calculado</span><strong class="price-value">${this.formatMoney(producto.precio)}</strong></div><div><span>Precio final</span><strong class="price-value">${this.formatMoney(this.getProductPrice(producto))}</strong></div><div><span>Stock mínimo</span><strong>${producto.minStock ?? 0} u.</strong></div><div><span>Última actualización</span><strong>${this.formatDate(producto.updatedAt)}</strong></div><div><span>Descripción</span><strong>${escapeHtml(producto.desc || '—')}</strong></div></div>`);
  }

  openNew() {
    this.refreshTipoSelects();
    this.refreshGrupoSelects();
    this.refreshProveedorSelects();
    form.set('prod-id');
    form.clear(['prod-nombre', 'prod-costo', 'prod-porcentaje', 'prod-precio', 'prod-precio-final', 'prod-min-stock', 'prod-desc']);
    form.set('prod-min-stock', 0);
    form.set('prod-tipo');
    form.set('prod-grupo-producto');
    form.set('prod-proveedor');
    document.getElementById('modal-prod-title').textContent = 'Nuevo Producto';
    this.app.modals.open('prod');
  }

  edit(id) {
    this.refreshTipoSelects();
    this.refreshGrupoSelects();
    this.refreshProveedorSelects();
    const producto = this.app.store.data.productos.find(item => item.id === id);
    if (!producto) return;
    form.set('prod-id', producto.id);
    form.set('prod-nombre', producto.nombre || '');
    form.set('prod-tipo', producto.tipoId || '');
    form.set('prod-grupo-producto', producto.grupoProductoId || producto.grupoId || '');
    form.set('prod-proveedor', producto.proveedorId || '');
    form.set('prod-costo', producto.costo ?? producto.precio ?? '');
    form.set('prod-porcentaje', producto.porcentaje ?? 0);
    form.set('prod-precio', producto.precio ?? '');
    form.set('prod-precio-final', this.getProductPrice(producto) ?? '');
    form.set('prod-min-stock', producto.minStock ?? '');
    form.set('prod-desc', producto.desc || '');
    document.getElementById('modal-prod-title').textContent = 'Editar Producto';
    this.app.modals.open('prod');
  }

  async save() {
    const nombre = form.trim('prod-nombre');
    const tipoId = form.value('prod-tipo');
    const grupoProductoId = form.value('prod-grupo-producto');
    const proveedorId = form.value('prod-proveedor');
    const costo = form.value('prod-costo');
    const porcentaje = form.value('prod-porcentaje');
    const precioFinal = form.value('prod-precio-final');
    if (!nombre) return this.app.toasts.show('El nombre es obligatorio', 'error');
    if (!tipoId) return this.app.toasts.show('Seleccioná un tipo de producto', 'error');
    if (!proveedorId) return this.app.toasts.show('Seleccioná un proveedor', 'error');
    if (costo === '' || Number(costo) < 0) return this.app.toasts.show('Ingresá un costo válido', 'error');
    if (porcentaje === '' || Number(porcentaje) < 0) return this.app.toasts.show('Ingresá un porcentaje válido', 'error');
    if (precioFinal === '' || Number(precioFinal) < 0) return this.app.toasts.show('Ingresá un precio final válido', 'error');

    const id = form.value('prod-id') || this.app.store.createId();
    const duplicated = this.app.store.data.productos.some(item => item.id !== id && item.proveedorId === proveedorId && normalizeUniqueName(item.nombre || '') === normalizeUniqueName(nombre));
    if (duplicated) return this.app.toasts.show('Ya existe un producto con ese nombre para el proveedor seleccionado', 'error');

    const precio = this.calculatePrice(costo, porcentaje);
    const minStockValue = form.value('prod-min-stock');
    const producto = { id, nombre, tipoId, grupoProductoId, proveedorId, costo: Number(costo), porcentaje: Number(porcentaje), precio, precioFinal: Number(precioFinal), minStock: minStockValue === '' ? 0 : Number(minStockValue), updatedAt: new Date().toISOString(), desc: form.trim('prod-desc') };
    const savedProducto = await this.app.store.put('productos', producto);
    const currentProducto = savedProducto || producto;
    const list = this.app.store.data.productos;
    const index = list.findIndex(item => item.id === id);
    if (index >= 0) list[index] = currentProducto;
    else list.push(currentProducto);
    await this.app.audit(index >= 0 ? 'Edición' : 'Creación', 'Productos', currentProducto.nombre);

    if (!(id in this.app.store.data.stock)) {
      this.app.store.data.stock[id] = 0;
      await this.app.store.put('stock', { id, qty: 0 });
    }

    this.app.modals.close('prod');
    this.renderList();
    this.app.toasts.show('Producto guardado ✅');
  }
}
