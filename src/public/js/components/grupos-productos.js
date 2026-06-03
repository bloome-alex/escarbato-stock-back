import { escapeHtml, form } from '../ui.js';
import { DEFAULT_PAGE_SIZE, getResponsivePageItems, loadingTemplate, paginationTemplate } from '../pagination.js?v=20260521-1';

const normalizeUniqueName = value => value.trim().toLocaleLowerCase('es');

export class GruposProductosComponent {
  constructor(app) {
    this.app = app;
    this.page = 1;
    this.totalPages = 1;
    this.loadingTimer = null;
  }

  template() {
    return `<section class="section" id="sec-gruposProductos">
      <div class="toolbar"><div class="search-box"><span class="search-icon">🔍</span><input type="text" placeholder="Buscar grupo…" id="searchGrupoProducto"></div></div>
      <div class="table-wrap" id="wrap-grupos-productos"><table class="data-table"><thead><tr><th>Nombre</th><th>Descripción</th><th>Productos</th><th>Acciones</th></tr></thead><tbody id="tbl-grupos-productos"></tbody></table><div id="empty-grupos-productos" class="empty-state" style="display:none"><div class="empty-icon">🧩</div><p>Aún no hay grupos de productos</p></div></div><div id="pager-gruposProductos"></div>
    </section>`;
  }

  modalTemplate() {
    return `<div class="modal-overlay" id="modal-grupo-producto"><div class="modal"><div class="modal-title"><span id="modal-grupo-producto-title">Nuevo grupo de productos</span><button class="modal-close" data-close-modal="grupo-producto">✕</button></div><input type="hidden" id="grupo-producto-id"><div class="form-group"><label>Nombre *</label><input type="text" id="grupo-producto-nombre" placeholder="Ej: Alimentos balanceados, Accesorios"></div><div class="form-group"><label>Descripción</label><textarea id="grupo-producto-desc" placeholder="Breve descripción del grupo…"></textarea></div><div class="modal-actions"><button class="btn btn-ghost" data-close-modal="grupo-producto">Cancelar</button><button class="btn btn-primary" data-action="save-grupo-producto">💾 Guardar</button></div></div></div>`;
  }

  bind() {
    document.getElementById('searchGrupoProducto').addEventListener('input', () => this.resetAndRender());
  }

  render() {
    clearTimeout(this.loadingTimer);
    document.getElementById('wrap-grupos-productos').innerHTML = loadingTemplate('Cargando grupos...');
    document.getElementById('pager-gruposProductos').innerHTML = '';
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

  getProductCount(groupId) {
    return (this.app.store.data.productos || []).filter(producto => producto.grupoProductoId === groupId || producto.grupoId === groupId).length;
  }

  renderList() {
    const q = (form.value('searchGrupoProducto') || '').toLowerCase();
    const list = (this.app.store.data.gruposProductos || [])
      .filter(grupo => `${grupo.nombre || ''} ${grupo.desc || ''}`.toLowerCase().includes(q))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));
    document.getElementById('wrap-grupos-productos').innerHTML = `<table class="data-table"><thead><tr><th>Nombre</th><th>Descripción</th><th>Productos</th><th>Acciones</th></tr></thead><tbody id="tbl-grupos-productos"></tbody></table><div id="empty-grupos-productos" class="empty-state" style="display:none"><div class="empty-icon">🧩</div><p>Aún no hay grupos de productos</p></div>`;
    const tbody = document.getElementById('tbl-grupos-productos');
    const empty = document.getElementById('empty-grupos-productos');
    const pageState = getResponsivePageItems(list, this.page, DEFAULT_PAGE_SIZE);
    this.page = pageState.page;
    this.totalPages = pageState.totalPages;

    if (!pageState.items.length) {
      tbody.innerHTML = '';
      empty.style.display = '';
      document.getElementById('pager-gruposProductos').innerHTML = '';
      return;
    }

    empty.style.display = 'none';
    tbody.innerHTML = pageState.items.map(grupo => {
      const count = this.getProductCount(grupo.id);
      return `<tr><td data-label="Nombre"><strong>${escapeHtml(grupo.nombre)}</strong></td><td data-label="Descripción">${escapeHtml(grupo.desc || '—')}</td><td data-label="Productos"><span class="chip chip-ok">${count} prod.</span></td><td data-label="Acciones"><div class="td-actions"><button class="btn btn-ghost btn-sm btn-icon" data-action="view-grupo-producto" data-id="${escapeHtml(grupo.id)}" aria-label="Visualizar grupo" title="Visualizar">👁️</button><button class="btn btn-ghost btn-sm btn-icon" data-action="edit-grupo-producto" data-id="${escapeHtml(grupo.id)}" aria-label="Editar grupo" title="Editar">✏️</button><button class="btn btn-danger btn-sm btn-icon" data-action="delete" data-entity="grupo-producto" data-id="${escapeHtml(grupo.id)}" data-name="${escapeHtml(grupo.nombre)}" aria-label="Eliminar grupo" title="Eliminar">🗑️</button></div></td></tr>`;
    }).join('');
    document.getElementById('pager-gruposProductos').innerHTML = paginationTemplate('gruposProductos', pageState);
  }

  view(id) {
    const grupo = this.app.store.data.gruposProductos.find(item => item.id === id);
    if (!grupo) return this.app.toasts.show('No se encontró el grupo', 'error');

    const count = this.getProductCount(grupo.id);
    this.app.showDetail('Grupo de productos', `<div class="detail-list"><div><span>Nombre</span><strong>${escapeHtml(grupo.nombre)}</strong></div><div><span>Descripción</span><strong>${escapeHtml(grupo.desc || '—')}</strong></div><div><span>Productos asociados</span><strong>${count}</strong></div></div>`);
  }

  openNew() {
    form.set('grupo-producto-id');
    form.clear(['grupo-producto-nombre', 'grupo-producto-desc']);
    document.getElementById('modal-grupo-producto-title').textContent = 'Nuevo grupo de productos';
    this.app.modals.open('grupo-producto');
  }

  edit(id) {
    const grupo = this.app.store.data.gruposProductos.find(item => item.id === id);
    if (!grupo) return;
    form.set('grupo-producto-id', grupo.id);
    form.set('grupo-producto-nombre', grupo.nombre || '');
    form.set('grupo-producto-desc', grupo.desc || '');
    document.getElementById('modal-grupo-producto-title').textContent = 'Editar grupo de productos';
    this.app.modals.open('grupo-producto');
  }

  async save() {
    const nombre = form.trim('grupo-producto-nombre');
    if (!nombre) return this.app.toasts.show('El nombre es obligatorio', 'error');

    const id = form.value('grupo-producto-id') || this.app.store.createId();
    const duplicated = this.app.store.data.gruposProductos.some(item => item.id !== id && normalizeUniqueName(item.nombre || '') === normalizeUniqueName(nombre));
    if (duplicated) return this.app.toasts.show('Ya existe un grupo de productos con ese nombre', 'error');

    const grupo = { id, nombre, desc: form.trim('grupo-producto-desc') };
    await this.app.store.put('gruposProductos', grupo);
    const list = this.app.store.data.gruposProductos;
    const index = list.findIndex(item => item.id === id);
    if (index >= 0) list[index] = grupo;
    else list.push(grupo);
    await this.app.audit(index >= 0 ? 'Edición' : 'Creación', 'Grupos de productos', grupo.nombre);
    this.app.modals.close('grupo-producto');
    this.renderList();
    this.app.toasts.show('Grupo guardado ✅');
  }
}
