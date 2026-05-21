import { form } from '../ui.js';
import { DEFAULT_PAGE_SIZE, getResponsivePageItems, loadingTemplate, paginationTemplate } from '../pagination.js?v=20260521-1';

const normalizeUniqueName = value => value.trim().toLocaleLowerCase('es');

const parsePercent = id => {
  const value = Number(form.value(id));
  return Number.isFinite(value) && value >= 0 ? value : 0;
};

const formatPercent = value => `${Number(value || 0).toLocaleString('es-AR', { maximumFractionDigits: 2 })}%`;

export class MetodosPagoComponent {
  constructor(app) {
    this.app = app;
    this.page = 1;
    this.totalPages = 1;
    this.loadingTimer = null;
  }

  template() {
    return `<section class="section" id="sec-metodosPago">
      <div class="toolbar"><div class="search-box"><span class="search-icon">🔍</span><input type="text" placeholder="Buscar método de pago…" id="searchMetodoPago"></div></div>
      <div class="table-wrap" id="wrap-metodos-pago"><table class="data-table"><thead><tr><th>Nombre</th><th>Descuento</th><th>Recargo</th><th>Acciones</th></tr></thead><tbody id="tbl-metodos-pago"></tbody></table><div id="empty-metodos-pago" class="empty-state" style="display:none"><div class="empty-icon">💳</div><p>Aún no hay métodos de pago</p></div></div><div id="pager-metodosPago"></div>
    </section>`;
  }

  modalTemplate() {
    return `<div class="modal-overlay" id="modal-metodo-pago"><div class="modal"><div class="modal-title"><span id="modal-metodo-pago-title">Nuevo método de pago</span><button class="modal-close" data-close-modal="metodo-pago">✕</button></div><input type="hidden" id="metodo-pago-id"><div class="form-group"><label>Nombre *</label><input type="text" id="metodo-pago-nombre" placeholder="Ej: Efectivo, Transferencia, Tarjeta"></div><div class="form-row"><div class="form-group"><label>Descuento (%)</label><input type="number" id="metodo-pago-descuento" min="0" step="0.01" value="0"></div><div class="form-group"><label>Recargo (%)</label><input type="number" id="metodo-pago-recargo" min="0" step="0.01" value="0"></div></div><div class="modal-actions"><button class="btn btn-ghost" data-close-modal="metodo-pago">Cancelar</button><button class="btn btn-primary" data-action="save-metodo-pago">💾 Guardar</button></div></div></div>`;
  }

  bind() {
    document.getElementById('searchMetodoPago').addEventListener('input', () => this.resetAndRender());
  }

  render() {
    clearTimeout(this.loadingTimer);
    document.getElementById('wrap-metodos-pago').innerHTML = loadingTemplate('Cargando métodos de pago...');
    document.getElementById('pager-metodosPago').innerHTML = '';
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
    const q = (form.value('searchMetodoPago') || '').toLowerCase();
    const list = this.app.store.data.metodosPago
      .filter(metodo => metodo.nombre.toLowerCase().includes(q))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));
    document.getElementById('wrap-metodos-pago').innerHTML = `<table class="data-table"><thead><tr><th>Nombre</th><th>Descuento</th><th>Recargo</th><th>Acciones</th></tr></thead><tbody id="tbl-metodos-pago"></tbody></table><div id="empty-metodos-pago" class="empty-state" style="display:none"><div class="empty-icon">💳</div><p>Aún no hay métodos de pago</p></div>`;
    const tbody = document.getElementById('tbl-metodos-pago');
    const empty = document.getElementById('empty-metodos-pago');
    const pageState = getResponsivePageItems(list, this.page, DEFAULT_PAGE_SIZE);
    this.page = pageState.page;
    this.totalPages = pageState.totalPages;

    if (!pageState.items.length) {
      tbody.innerHTML = '';
      empty.style.display = '';
      document.getElementById('pager-metodosPago').innerHTML = '';
      return;
    }

    empty.style.display = 'none';
    tbody.innerHTML = pageState.items.map(metodo => `<tr><td data-label="Nombre"><strong>${metodo.nombre}</strong></td><td data-label="Descuento"><span class="chip chip-ok">${formatPercent(metodo.descuento)}</span></td><td data-label="Recargo"><span class="chip chip-ok">${formatPercent(metodo.recargo ?? metodo.bonificacion)}</span></td><td data-label="Acciones"><div class="td-actions"><button class="btn btn-ghost btn-sm btn-icon" data-action="view-metodo-pago" data-id="${metodo.id}" aria-label="Visualizar método de pago" title="Visualizar">👁️</button><button class="btn btn-ghost btn-sm btn-icon" data-action="edit-metodo-pago" data-id="${metodo.id}" aria-label="Editar método de pago" title="Editar">✏️</button><button class="btn btn-danger btn-sm btn-icon" data-action="delete" data-entity="metodo-pago" data-id="${metodo.id}" data-name="${metodo.nombre}" aria-label="Eliminar método de pago" title="Eliminar">🗑️</button></div></td></tr>`).join('');
    document.getElementById('pager-metodosPago').innerHTML = paginationTemplate('metodosPago', pageState);
  }

  view(id) {
    const metodo = this.app.store.data.metodosPago.find(item => item.id === id);
    if (!metodo) return this.app.toasts.show('No se encontró el método de pago', 'error');

    this.app.showDetail('Método de pago', `<div class="detail-list"><div><span>Nombre</span><strong>${metodo.nombre}</strong></div><div><span>Descuento</span><strong>${formatPercent(metodo.descuento)}</strong></div><div><span>Recargo</span><strong>${formatPercent(metodo.recargo ?? metodo.bonificacion)}</strong></div></div>`);
  }

  openNew() {
    form.set('metodo-pago-id');
    form.clear(['metodo-pago-nombre']);
    form.set('metodo-pago-descuento', 0);
    form.set('metodo-pago-recargo', 0);
    document.getElementById('modal-metodo-pago-title').textContent = 'Nuevo método de pago';
    this.app.modals.open('metodo-pago');
  }

  edit(id) {
    const metodo = this.app.store.data.metodosPago.find(item => item.id === id);
    if (!metodo) return;
    form.set('metodo-pago-id', metodo.id);
    form.set('metodo-pago-nombre', metodo.nombre || '');
    form.set('metodo-pago-descuento', metodo.descuento || 0);
    form.set('metodo-pago-recargo', metodo.recargo ?? metodo.bonificacion ?? 0);
    document.getElementById('modal-metodo-pago-title').textContent = 'Editar método de pago';
    this.app.modals.open('metodo-pago');
  }

  async save() {
    const nombre = form.trim('metodo-pago-nombre');
    if (!nombre) return this.app.toasts.show('El nombre es obligatorio', 'error');

    const id = form.value('metodo-pago-id') || this.app.store.createId();
    const duplicated = this.app.store.data.metodosPago.some(item => item.id !== id && normalizeUniqueName(item.nombre || '') === normalizeUniqueName(nombre));
    if (duplicated) return this.app.toasts.show('Ya existe un método de pago con ese nombre', 'error');

    const metodo = { id, nombre, descuento: parsePercent('metodo-pago-descuento'), recargo: parsePercent('metodo-pago-recargo') };
    await this.app.store.put('metodosPago', metodo);
    const list = this.app.store.data.metodosPago;
    const index = list.findIndex(item => item.id === id);
    if (index >= 0) list[index] = metodo;
    else list.push(metodo);
    await this.app.audit(index >= 0 ? 'Edición' : 'Creación', 'Métodos de pago', metodo.nombre);
    this.app.modals.close('metodo-pago');
    this.renderList();
    this.app.toasts.show('Método de pago guardado ✅');
  }
}
