import { form } from '../ui.js';

export class TiposComponent {
  constructor(app) {
    this.app = app;
  }

  template() {
    return `<section class="section" id="sec-tipos">
      <div class="section-header"><div class="section-heading">🏷️ <span>Tipos de Producto</span></div><button class="btn btn-primary" data-action="new-tipo">+ Nuevo tipo</button></div>
      <div class="toolbar"><div class="search-box"><span class="search-icon">🔍</span><input type="text" placeholder="Buscar tipo…" id="searchTipo"></div><select id="filterTipoUso" class="filter-control"><option value="">Todos</option><option value="con-productos">Con productos</option><option value="sin-productos">Sin productos</option></select></div>
      <div class="table-wrap"><table class="data-table"><thead><tr><th>Nombre</th><th>Descripción</th><th>Productos</th><th>Acciones</th></tr></thead><tbody id="tbl-tipos"></tbody></table><div id="empty-tipos" class="empty-state" style="display:none"><div class="empty-icon">🏷️</div><p>Aún no hay tipos de producto</p></div></div>
    </section>`;
  }

  modalTemplate() {
    return `<div class="modal-overlay" id="modal-tipo"><div class="modal"><div class="modal-title"><span id="modal-tipo-title">Nuevo Tipo de Producto</span><button class="modal-close" data-close-modal="tipo">✕</button></div><input type="hidden" id="tipo-id"><div class="form-group"><label>Nombre *</label><input type="text" id="tipo-nombre" placeholder="Ej: Alimentos, Juguetes, Medicamentos"></div><div class="form-group"><label>Descripción</label><textarea id="tipo-desc" placeholder="Breve descripción de esta categoría…"></textarea></div><div class="modal-actions"><button class="btn btn-ghost" data-close-modal="tipo">Cancelar</button><button class="btn btn-primary" data-action="save-tipo">💾 Guardar</button></div></div></div>`;
  }

  bind() {
    document.getElementById('searchTipo').addEventListener('input', () => this.render());
    document.getElementById('filterTipoUso').addEventListener('change', () => this.render());
    document.querySelector('[data-action="new-tipo"]').addEventListener('click', () => this.openNew());
  }

  render() {
    const q = (form.value('searchTipo') || '').toLowerCase();
    const uso = form.value('filterTipoUso');
    const data = this.app.store.data;
    const list = data.tipos.filter(tipo => {
      const count = data.productos.filter(producto => producto.tipoId === tipo.id).length;
      return tipo.nombre.toLowerCase().includes(q)
        && (!uso || (uso === 'con-productos' && count > 0) || (uso === 'sin-productos' && count === 0));
    });
    const tbody = document.getElementById('tbl-tipos');
    const empty = document.getElementById('empty-tipos');

    if (!list.length) {
      tbody.innerHTML = '';
      empty.style.display = '';
      return;
    }

    empty.style.display = 'none';
    tbody.innerHTML = list.map(tipo => {
      const count = data.productos.filter(producto => producto.tipoId === tipo.id).length;
      return `<tr><td><strong>${tipo.nombre}</strong></td><td>${tipo.desc || '—'}</td><td><span class="chip chip-ok">${count} prod.</span></td><td><div class="td-actions"><button class="btn btn-ghost btn-sm btn-icon" data-action="view-tipo" data-id="${tipo.id}" aria-label="Visualizar tipo" title="Visualizar">👁️</button><button class="btn btn-ghost btn-sm btn-icon" data-action="edit-tipo" data-id="${tipo.id}" aria-label="Editar tipo" title="Editar">✏️</button><button class="btn btn-danger btn-sm btn-icon" data-action="delete" data-entity="tipo" data-id="${tipo.id}" data-name="${tipo.nombre}" aria-label="Eliminar tipo" title="Eliminar">🗑️</button></div></td></tr>`;
    }).join('');
  }

  view(id) {
    const tipo = this.app.store.data.tipos.find(item => item.id === id);
    if (!tipo) return this.app.toasts.show('No se encontró el tipo', 'error');

    const count = this.app.store.data.productos.filter(producto => producto.tipoId === tipo.id).length;
    this.app.showDetail('Tipo de producto', `<div class="detail-list"><div><span>Nombre</span><strong>${tipo.nombre}</strong></div><div><span>Descripción</span><strong>${tipo.desc || '—'}</strong></div><div><span>Productos asociados</span><strong>${count}</strong></div></div>`);
  }

  openNew() {
    form.set('tipo-id');
    form.clear(['tipo-nombre', 'tipo-desc']);
    document.getElementById('modal-tipo-title').textContent = 'Nuevo Tipo de Producto';
    this.app.modals.open('tipo');
  }

  edit(id) {
    const tipo = this.app.store.data.tipos.find(item => item.id === id);
    if (!tipo) return;
    form.set('tipo-id', tipo.id);
    form.set('tipo-nombre', tipo.nombre || '');
    form.set('tipo-desc', tipo.desc || '');
    document.getElementById('modal-tipo-title').textContent = 'Editar Tipo';
    this.app.modals.open('tipo');
  }

  async save() {
    const nombre = form.trim('tipo-nombre');
    if (!nombre) return this.app.toasts.show('El nombre es obligatorio', 'error');

    const id = form.value('tipo-id') || this.app.store.createId();
    const tipo = { id, nombre, desc: form.trim('tipo-desc') };
    await this.app.store.put('tipos', tipo);
    const list = this.app.store.data.tipos;
    const index = list.findIndex(item => item.id === id);
    if (index >= 0) list[index] = tipo;
    else list.push(tipo);
    await this.app.audit(index >= 0 ? 'Edición' : 'Creación', 'Tipos de producto', tipo.nombre);
    this.app.modals.close('tipo');
    this.render();
    this.app.components.productos.refreshTipoSelects();
    this.app.toasts.show('Tipo guardado ✅');
  }
}
