import { form } from '../ui.js';
import { DEFAULT_PAGE_SIZE, getPageItems, loadingTemplate, paginationTemplate } from '../pagination.js';

const normalizeUniqueName = value => value.trim().toLocaleLowerCase('es');

export class ProveedoresComponent {
  constructor(app) {
    this.app = app;
    this.page = 1;
    this.loadingTimer = null;
  }

  template() {
    return `<section class="section" id="sec-proveedores">
      <div class="section-header"><div class="section-heading">🚚 <span>Proveedores</span></div><button class="btn btn-primary" data-action="new-proveedor">+ Nuevo proveedor</button></div>
      <div class="toolbar"><div class="search-box"><span class="search-icon">🔍</span><input type="text" placeholder="Buscar proveedor…" id="searchProv"></div><select id="filterProvInfo" class="filter-control"><option value="">Todos</option><option value="contacto">Con contacto</option><option value="sin-contacto">Sin contacto</option><option value="email">Con email</option><option value="sin-email">Sin email</option></select></div>
      <div class="table-wrap" id="wrap-proveedores"><table class="data-table"><thead><tr><th>Nombre</th><th>Contacto</th><th>Teléfono</th><th>Email</th><th>Acciones</th></tr></thead><tbody id="tbl-proveedores"></tbody></table><div id="empty-proveedores" class="empty-state" style="display:none"><div class="empty-icon">🚚</div><p>Aún no hay proveedores registrados</p></div></div><div id="pager-proveedores"></div>
    </section>`;
  }

  modalTemplate() {
    return `<div class="modal-overlay" id="modal-prov"><div class="modal"><div class="modal-title"><span id="modal-prov-title">Nuevo Proveedor</span><button class="modal-close" data-close-modal="prov">✕</button></div><input type="hidden" id="prov-id"><div class="form-group"><label>Nombre *</label><input type="text" id="prov-nombre" placeholder="Ej: Distribuidora Peludo SA"></div><div class="form-row"><div class="form-group"><label>Contacto</label><input type="text" id="prov-contacto" placeholder="Nombre del contacto"></div><div class="form-group"><label>Teléfono</label><input type="text" id="prov-telefono" placeholder="11-1234-5678"></div></div><div class="form-group"><label>Email</label><input type="email" id="prov-email" placeholder="correo@proveedor.com"></div><div class="form-group"><label>Notas</label><textarea id="prov-notas" placeholder="Condiciones de pago, días de entrega…"></textarea></div><div class="modal-actions"><button class="btn btn-ghost" data-close-modal="prov">Cancelar</button><button class="btn btn-primary" data-action="save-proveedor">💾 Guardar</button></div></div></div>`;
  }

  bind() {
    document.getElementById('searchProv').addEventListener('input', () => this.resetAndRender());
    document.getElementById('filterProvInfo').addEventListener('change', () => this.resetAndRender());
    document.querySelector('[data-action="new-proveedor"]').addEventListener('click', () => this.openNew());
  }

  render() {
    clearTimeout(this.loadingTimer);
    document.getElementById('wrap-proveedores').innerHTML = loadingTemplate('Cargando proveedores...');
    document.getElementById('pager-proveedores').innerHTML = '';
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
    const q = (form.value('searchProv') || '').toLowerCase();
    const info = form.value('filterProvInfo');
    const list = this.app.store.data.proveedores.filter(prov => {
      const matchesSearch = prov.nombre.toLowerCase().includes(q) || (prov.contacto || '').toLowerCase().includes(q) || (prov.email || '').toLowerCase().includes(q);
      const matchesInfo = !info
        || (info === 'contacto' && Boolean(prov.contacto))
        || (info === 'sin-contacto' && !prov.contacto)
        || (info === 'email' && Boolean(prov.email))
        || (info === 'sin-email' && !prov.email);
      return matchesSearch && matchesInfo;
    });
    const tbody = document.getElementById('tbl-proveedores');
    const empty = document.getElementById('empty-proveedores');
    document.getElementById('wrap-proveedores').innerHTML = `<table class="data-table"><thead><tr><th>Nombre</th><th>Contacto</th><th>Teléfono</th><th>Email</th><th>Acciones</th></tr></thead><tbody id="tbl-proveedores"></tbody></table><div id="empty-proveedores" class="empty-state" style="display:none"><div class="empty-icon">🚚</div><p>Aún no hay proveedores registrados</p></div>`;
    const pageState = getPageItems(list, this.page, DEFAULT_PAGE_SIZE);
    this.page = pageState.page;
    const pageItems = pageState.items;
    const nextTbody = document.getElementById('tbl-proveedores');
    const nextEmpty = document.getElementById('empty-proveedores');

    if (!pageItems.length) {
      nextTbody.innerHTML = '';
      nextEmpty.style.display = '';
      document.getElementById('pager-proveedores').innerHTML = '';
      return;
    }

    nextEmpty.style.display = 'none';
    nextTbody.innerHTML = pageItems.map(prov => `<tr><td><strong>${prov.nombre}</strong></td><td>${prov.contacto || '—'}</td><td>${prov.telefono || '—'}</td><td>${prov.email || '—'}</td><td><div class="td-actions"><button class="btn btn-ghost btn-sm btn-icon" data-action="view-proveedor" data-id="${prov.id}" aria-label="Visualizar proveedor" title="Visualizar">👁️</button><button class="btn btn-ghost btn-sm btn-icon" data-action="edit-proveedor" data-id="${prov.id}" aria-label="Editar proveedor" title="Editar">✏️</button><button class="btn btn-danger btn-sm btn-icon" data-action="delete" data-entity="prov" data-id="${prov.id}" data-name="${prov.nombre}" aria-label="Eliminar proveedor" title="Eliminar">🗑️</button></div></td></tr>`).join('');
    document.getElementById('pager-proveedores').innerHTML = paginationTemplate('proveedores', pageState);
  }

  view(id) {
    const prov = this.app.store.data.proveedores.find(item => item.id === id);
    if (!prov) return this.app.toasts.show('No se encontró el proveedor', 'error');

    this.app.showDetail('Proveedor', `<div class="detail-list"><div><span>Nombre</span><strong>${prov.nombre}</strong></div><div><span>Contacto</span><strong>${prov.contacto || '—'}</strong></div><div><span>Teléfono</span><strong>${prov.telefono || '—'}</strong></div><div><span>Email</span><strong>${prov.email || '—'}</strong></div><div><span>Notas</span><strong>${prov.notas || '—'}</strong></div></div>`);
  }

  openNew() {
    form.set('prov-id');
    form.clear(['prov-nombre', 'prov-contacto', 'prov-telefono', 'prov-email', 'prov-notas']);
    document.getElementById('modal-prov-title').textContent = 'Nuevo Proveedor';
    this.app.modals.open('prov');
  }

  edit(id) {
    const prov = this.app.store.data.proveedores.find(item => item.id === id);
    if (!prov) return;
    form.set('prov-id', prov.id);
    form.set('prov-nombre', prov.nombre || '');
    form.set('prov-contacto', prov.contacto || '');
    form.set('prov-telefono', prov.telefono || '');
    form.set('prov-email', prov.email || '');
    form.set('prov-notas', prov.notas || '');
    document.getElementById('modal-prov-title').textContent = 'Editar Proveedor';
    this.app.modals.open('prov');
  }

  async save() {
    const nombre = form.trim('prov-nombre');
    if (!nombre) return this.app.toasts.show('El nombre es obligatorio', 'error');

    const id = form.value('prov-id') || this.app.store.createId();
    const duplicated = this.app.store.data.proveedores.some(item => item.id !== id && normalizeUniqueName(item.nombre || '') === normalizeUniqueName(nombre));
    if (duplicated) return this.app.toasts.show('Ya existe un proveedor con ese nombre', 'error');

    const prov = { id, nombre, contacto: form.trim('prov-contacto'), telefono: form.trim('prov-telefono'), email: form.trim('prov-email'), notas: form.trim('prov-notas') };
    await this.app.store.put('proveedores', prov);
    const list = this.app.store.data.proveedores;
    const index = list.findIndex(item => item.id === id);
    if (index >= 0) list[index] = prov;
    else list.push(prov);
    await this.app.audit(index >= 0 ? 'Edición' : 'Creación', 'Proveedores', prov.nombre);
    this.app.modals.close('prov');
    this.render();
    this.app.components.productos.refreshProveedorSelects();
    this.app.toasts.show('Proveedor guardado ✅');
  }
}
