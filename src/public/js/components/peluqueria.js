import { form } from '../ui.js';
import { DEFAULT_PAGE_SIZE, getResponsivePageItems, loadingTemplate, paginationTemplate } from '../pagination.js';

const ESTADOS = ['pendiente', 'en curso', 'completado', 'cancelado'];
const DAY_MS = 24 * 60 * 60 * 1000;
const OPEN_MINUTES = 8 * 60;
const CLOSE_MINUTES = 20 * 60;
const SLOT_MINUTES = 15;
const APPOINTMENT_COLOR_COUNT = 6;
const DIAS = [
  { diaSemana: 1, nombreDia: 'Lunes' },
  { diaSemana: 2, nombreDia: 'Martes' },
  { diaSemana: 3, nombreDia: 'Miércoles' },
  { diaSemana: 4, nombreDia: 'Jueves' },
  { diaSemana: 5, nombreDia: 'Viernes' },
  { diaSemana: 6, nombreDia: 'Sábado' },
  { diaSemana: 7, nombreDia: 'Domingo' }
];

const esc = value => String(value ?? '').replace(/[&<>"]/g, match => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[match]));
const normalizeUniqueName = value => value.trim().toLocaleLowerCase('es');
const pad = value => String(value).padStart(2, '0');
const dateKey = date => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const minutesToTime = minutes => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
const timeToMinutes = time => {
  const [hours, minutes] = String(time || '00:00').split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
};
const formatMoney = value => `$ ${Number(value || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatDate = value => value ? new Date(`${value}T00:00:00`).toLocaleDateString('es-AR', { weekday: 'short', day: '2-digit', month: '2-digit' }) : '-';

export class PeluqueriaComponent {
  constructor(app) {
    this.app = app;
    this.activeTab = 'calendario';
    this.pages = { tipos: 1, servicios: 1, turnos: 1 };
    this.totalPages = 1;
    this.weekStart = this.getWeekStart(new Date());
    this.calendarServicioId = '';
    this.calendarTipoPerroId = '';
    this.calendarStart = OPEN_MINUTES;
    this.calendarEnd = CLOSE_MINUTES;
    this.dragState = null;
    this.loadingTimer = null;
    this.lastMobileLayout = null;
    this.turnosFilters = {
      fechaDesde: dateKey(new Date()),
      cliente: '',
      servicioId: '',
      tipoPerroId: '',
      estado: '',
      isPaid: ''
    };
  }

  template() {
    return `<section class="section" id="sec-peluqueria">
      <div class="grooming-desktop">
        <div class="grooming-tabs" role="tablist">
          <button class="grooming-tab active" data-grooming-tab="calendario">Calendario semanal</button>
          <button class="grooming-tab" data-grooming-tab="turnos">Turnos</button>
          <button class="grooming-tab" data-grooming-tab="servicios">Servicios</button>
          <button class="grooming-tab" data-grooming-tab="tipos">Tipos de perros</button>
          <button class="grooming-tab" data-grooming-tab="horarios">Horarios</button>
        </div>
        <div id="peluqueria-content"></div>
      </div>
      <div class="grooming-mobile">
        <div class="grooming-mobile-hero">
          <span>Peluquería</span>
          <strong id="peluqueria-mobile-title">Calendario semanal</strong>
          <button class="btn btn-primary" data-action="new-peluqueria-turno">+ Turno</button>
        </div>
        <div class="grooming-mobile-tabs" role="tablist">
          <button class="grooming-mobile-tab active" data-grooming-tab="calendario">Agenda</button>
          <button class="grooming-mobile-tab" data-grooming-tab="turnos">Turnos</button>
          <button class="grooming-mobile-tab" data-grooming-tab="servicios">Servicios</button>
          <button class="grooming-mobile-tab" data-grooming-tab="tipos">Tipos</button>
          <button class="grooming-mobile-tab" data-grooming-tab="horarios">Horarios</button>
        </div>
        <div id="peluqueria-mobile-content"></div>
      </div>
    </section>`;
  }

  modalTemplate() {
    return `${this.tipoModalTemplate()}${this.servicioModalTemplate()}${this.turnoModalTemplate()}${this.pagoModalTemplate()}`;
  }

  pagoModalTemplate() {
    return `<div class="modal-overlay" id="modal-peluqueria-pago"><div class="modal"><div class="modal-title"><span id="peluqueria-pago-title">Abonar turno</span><button class="modal-close" data-close-modal="peluqueria-pago">✕</button></div><input type="hidden" id="peluqueria-pago-turno-id"><div class="peluqueria-pago-info"></div><div class="form-group"><label>Método de pago *</label><select id="peluqueria-pago-metodo"></select></div><div id="peluqueria-pago-resumen" class="peluqueria-pago-resumen"></div><div class="modal-actions"><button class="btn btn-ghost" data-close-modal="peluqueria-pago">Cancelar</button><button class="btn btn-primary" data-action="do-peluqueria-pago">💰 Abonar</button></div></div></div>`;
  }

  tipoModalTemplate() {
    return `<div class="modal-overlay" id="modal-peluqueria-tipo"><div class="modal"><div class="modal-title"><span id="peluqueria-tipo-title">Nuevo tipo de perro</span><button class="modal-close" data-close-modal="peluqueria-tipo">✕</button></div><input type="hidden" id="peluqueria-tipo-id"><div class="form-group"><label>Nombre *</label><input type="text" id="peluqueria-tipo-nombre" placeholder="Ej: Pequeño, Mediano, Grande"></div><div class="form-group"><label>Descripción</label><textarea id="peluqueria-tipo-desc" placeholder="Detalle del tamaño, peso o raza..."></textarea></div><div class="modal-actions"><button class="btn btn-ghost" data-close-modal="peluqueria-tipo">Cancelar</button><button class="btn btn-primary" data-action="save-peluqueria-tipo">💾 Guardar</button></div></div></div>`;
  }

  servicioModalTemplate() {
    return `<div class="modal-overlay" id="modal-peluqueria-servicio"><div class="modal modal-wide"><div class="modal-title"><span id="peluqueria-servicio-title">Nuevo servicio</span><button class="modal-close" data-close-modal="peluqueria-servicio">✕</button></div><input type="hidden" id="peluqueria-servicio-id"><div class="form-row"><div class="form-group"><label>Nombre *</label><input type="text" id="peluqueria-servicio-nombre" placeholder="Ej: Baño completo"></div><div class="form-group"><label>Descripción</label><input type="text" id="peluqueria-servicio-desc" placeholder="Incluye shampoo, secado, perfume..."></div></div><div class="service-price-title">Precio y duración por tipo de perro</div><div id="peluqueria-servicio-precios" class="service-price-grid"></div><div class="modal-actions"><button class="btn btn-ghost" data-close-modal="peluqueria-servicio">Cancelar</button><button class="btn btn-primary" data-action="save-peluqueria-servicio">💾 Guardar</button></div></div></div>`;
  }

  turnoModalTemplate() {
    return `<div class="modal-overlay" id="modal-peluqueria-turno"><div class="modal"><div class="modal-title"><span id="peluqueria-turno-title">Nuevo turno</span><button class="modal-close" data-close-modal="peluqueria-turno">✕</button></div><input type="hidden" id="peluqueria-turno-id"><div class="form-row"><div class="form-group"><label>Fecha *</label><input type="date" id="peluqueria-turno-fecha"></div><div class="form-group"><label>Hora *</label><input type="time" id="peluqueria-turno-hora" step="1800"></div></div><div class="form-row"><div class="form-group"><label>Servicio *</label><select id="peluqueria-turno-servicio"></select></div><div class="form-group"><label>Tipo de perro *</label><select id="peluqueria-turno-tipo"></select></div></div><div class="form-row"><div class="form-group"><label>Cliente *</label><input type="text" id="peluqueria-turno-cliente" placeholder="Nombre del cliente"></div><div class="form-group"><label>Estado</label><select id="peluqueria-turno-estado">${ESTADOS.map(estado => `<option value="${estado}">${estado}</option>`).join('')}</select></div></div><div class="form-group"><label>Observaciones</label><textarea id="peluqueria-turno-observaciones" placeholder="Notas internas..."></textarea></div><div id="peluqueria-turno-resumen" class="appointment-summary"></div><div class="modal-actions"><button class="btn btn-ghost" data-close-modal="peluqueria-turno">Cancelar</button><button class="btn btn-primary" data-action="save-peluqueria-turno">💾 Guardar</button></div></div></div>`;
  }

  bind() {
    document.querySelectorAll('[data-grooming-tab]').forEach(button => button.addEventListener('click', () => {
      this.activeTab = button.dataset.groomingTab;
      this.render();
    }));
    window.addEventListener('resize', () => {
      if (!document.getElementById('sec-peluqueria')?.classList.contains('active')) return;
      const isMobile = this.isMobileLayout();
      if (this.lastMobileLayout === isMobile) return;
      this.render();
    });
  }

  render() {
    document.querySelectorAll('[data-grooming-tab]').forEach(button => button.classList.toggle('active', button.dataset.groomingTab === this.activeTab));
    const title = document.getElementById('peluqueria-mobile-title');
    if (title) title.textContent = this.tabTitle(this.activeTab);
    this.lastMobileLayout = this.isMobileLayout();
    const content = this.contentTarget();
    if (!content) return;
    const inactiveContent = document.getElementById(this.isMobileLayout() ? 'peluqueria-content' : 'peluqueria-mobile-content');
    if (inactiveContent) inactiveContent.innerHTML = '';
    clearTimeout(this.loadingTimer);
    content.innerHTML = loadingTemplate('Cargando peluquería...');
    this.loadingTimer = setTimeout(() => this.renderActiveTab(), 80);
  }

  renderActiveTab() {
    if (this.isMobileLayout()) return this.renderMobileActiveTab();
    document.getElementById('peluqueria-content')?.classList.toggle('is-calendar', this.activeTab === 'calendario');
    if (this.activeTab === 'tipos') return this.renderTipos();
    if (this.activeTab === 'servicios') return this.renderServicios();
    if (this.activeTab === 'turnos') return this.renderTurnos();
    if (this.activeTab === 'horarios') return this.renderHorarios();
    return this.renderCalendario();
  }

  contentTarget() {
    return document.getElementById(this.isMobileLayout() ? 'peluqueria-mobile-content' : 'peluqueria-content');
  }

  isMobileLayout() {
    return window.matchMedia?.('(max-width: 760px)').matches;
  }

  tabTitle(tab) {
    return { calendario: 'Calendario semanal', turnos: 'Turnos', servicios: 'Servicios', tipos: 'Tipos de perros', horarios: 'Horarios' }[tab] || 'Peluquería';
  }

  renderMobileActiveTab() {
    const content = document.getElementById('peluqueria-mobile-content');
    if (!content) return;
    content.classList.toggle('is-calendar', this.activeTab === 'calendario');
    if (this.activeTab === 'tipos') return this.renderMobileTipos();
    if (this.activeTab === 'servicios') return this.renderMobileServicios();
    if (this.activeTab === 'turnos') return this.renderMobileTurnos();
    if (this.activeTab === 'horarios') return this.renderMobileHorarios();
    return this.renderMobileCalendario();
  }

  setPage(page) {
    this.pages[this.activeTab] = page;
    this.renderActiveTab();
  }

  resetFilters() {
    this.activeTab = 'calendario';
    this.pages = { tipos: 1, servicios: 1, turnos: 1 };
    this.weekStart = this.getWeekStart(new Date());
  }

  renderHorarios() {
    document.getElementById('peluqueria-content').innerHTML = `<div class="subsection-head"><div><h3>Horarios de disponibilidad</h3><p>Cargá uno o varios rangos por día. Los días sin rangos quedan cerrados y no generan turnos disponibles.</p></div><button class="btn btn-primary" data-action="save-peluqueria-horarios">💾 Guardar horarios</button></div><div class="schedule-grid">${DIAS.map(dia => this.horarioDayCard(dia)).join('')}</div>`;
  }

  horarioDayCard(dia) {
    const records = this.app.store.data.peluqueriaHorarios || [];
    const record = records.find(item => Number(item.diaSemana) === Number(dia.diaSemana));
    const rangos = record ? (record.rangos || []) : (!records.length ? [{ desde: '09:00', hasta: '18:00' }] : []);
    const rows = rangos.map((rango, index) => this.horarioRangeRow(dia.diaSemana, rango, index)).join('') || '<p class="empty-note">Cerrado: agregá un rango para habilitar turnos.</p>';
    return `<div class="schedule-card" data-schedule-day="${dia.diaSemana}"><div class="schedule-card-head"><strong>${dia.nombreDia}</strong><button class="btn btn-ghost btn-sm" data-action="add-peluqueria-horario-rango" data-day="${dia.diaSemana}">+ Rango</button></div><div class="schedule-ranges">${rows}</div></div>`;
  }

  horarioRangeRow(diaSemana, rango, index) {
    return `<div class="schedule-range" data-range-index="${index}"><label>Desde<input type="time" data-schedule-from value="${esc(rango.desde || '09:00')}" step="1800"></label><label>Hasta<input type="time" data-schedule-to value="${esc(rango.hasta || '18:00')}" step="1800"></label><label>Simultáneos<input type="number" min="1" step="1" data-schedule-capacity value="${Number(rango.turnosSimultaneos || 1)}"></label><button class="btn btn-danger btn-sm btn-icon" data-action="remove-peluqueria-horario-rango" data-day="${diaSemana}" data-index="${index}" title="Quitar rango">✕</button></div>`;
  }

  addHorarioRango(diaSemana) {
    const card = document.querySelector(`[data-schedule-day="${diaSemana}"] .schedule-ranges`);
    if (!card) return;
    card.querySelector('.empty-note')?.remove();
    const index = card.querySelectorAll('.schedule-range').length;
    card.insertAdjacentHTML('beforeend', this.horarioRangeRow(diaSemana, { desde: '09:00', hasta: '18:00' }, index));
  }

  removeHorarioRango(diaSemana, index) {
    document.querySelector(`[data-schedule-day="${diaSemana}"] [data-range-index="${index}"]`)?.remove();
  }

  async saveHorarios() {
    for (const dia of DIAS) {
      const card = document.querySelector(`[data-schedule-day="${dia.diaSemana}"]`);
      const rangos = [...card.querySelectorAll('.schedule-range')].map(row => ({
        desde: row.querySelector('[data-schedule-from]').value,
        hasta: row.querySelector('[data-schedule-to]').value,
        turnosSimultaneos: Number.parseInt(row.querySelector('[data-schedule-capacity]').value, 10) || 1
      })).filter(rango => rango.desde && rango.hasta && rango.desde < rango.hasta).sort((a, b) => a.desde.localeCompare(b.desde));
      const record = { id: `peluqueria-horario-${dia.diaSemana}`, diaSemana: dia.diaSemana, nombreDia: dia.nombreDia, rangos };
      await this.app.store.put('peluqueriaHorarios', record);
      this.upsertLocal('peluqueriaHorarios', record);
    }
    await this.app.audit('Edición', 'Peluquería - horarios', 'Horarios de disponibilidad actualizados');
    this.app.toasts.show('Horarios guardados ✅');
    this.renderActiveTab();
  }

  renderTipos() {
    const data = this.app.store.data;
    const list = [...data.peluqueriaTiposPerro].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));
    const pageState = getResponsivePageItems(list, this.pages.tipos, DEFAULT_PAGE_SIZE);
    this.pages.tipos = pageState.page;
    this.totalPages = pageState.totalPages;
    document.getElementById('peluqueria-content').innerHTML = `<div class="subsection-head"><div><h3>Tipos de perros</h3><p>ABM básico para definir tamaños o categorías de perro.</p></div><button class="btn btn-primary" data-action="new-peluqueria-tipo">+ Nuevo tipo</button></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Nombre</th><th>Descripción</th><th>Servicios configurados</th><th>Acciones</th></tr></thead><tbody>${pageState.items.map(tipo => this.tipoRow(tipo)).join('') || '<tr><td colspan="4">Aún no hay tipos de perros.</td></tr>'}</tbody></table></div><div id="pager-peluqueria"></div>`;
    document.getElementById('pager-peluqueria').innerHTML = paginationTemplate('peluqueria', pageState);
  }

  tipoRow(tipo) {
    const count = this.app.store.data.peluqueriaServicios.filter(servicio => (servicio.preciosPorTipo || []).some(item => item.tipoPerroId === tipo.id)).length;
    return `<tr><td data-label="Nombre"><strong>${esc(tipo.nombre)}</strong></td><td data-label="Descripción">${esc(tipo.desc || '-')}</td><td data-label="Servicios"><span class="chip chip-ok">${count} servicios</span></td><td data-label="Acciones"><div class="td-actions"><button class="btn btn-ghost btn-sm btn-icon" data-action="view-peluqueria-tipo" data-id="${tipo.id}" title="Visualizar">👁️</button><button class="btn btn-ghost btn-sm btn-icon" data-action="edit-peluqueria-tipo" data-id="${tipo.id}" title="Editar">✏️</button><button class="btn btn-danger btn-sm btn-icon" data-action="delete" data-entity="peluqueria-tipo" data-id="${tipo.id}" data-name="${esc(tipo.nombre)}" title="Eliminar">🗑️</button></div></td></tr>`;
  }

  renderServicios() {
    const list = [...this.app.store.data.peluqueriaServicios].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));
    const pageState = getResponsivePageItems(list, this.pages.servicios, DEFAULT_PAGE_SIZE);
    this.pages.servicios = pageState.page;
    this.totalPages = pageState.totalPages;
    document.getElementById('peluqueria-content').innerHTML = `<div class="subsection-head"><div><h3>Servicios</h3><p>Precio y duración estimada por tipo de perro. La capacidad simultánea se define en Horarios.</p></div><button class="btn btn-primary" data-action="new-peluqueria-servicio">+ Nuevo servicio</button></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Servicio</th><th>Configuración por tipo</th><th>Acciones</th></tr></thead><tbody>${pageState.items.map(servicio => this.servicioRow(servicio)).join('') || '<tr><td colspan="3">Aún no hay servicios.</td></tr>'}</tbody></table></div><div id="pager-peluqueria"></div>`;
    document.getElementById('pager-peluqueria').innerHTML = paginationTemplate('peluqueria', pageState);
  }

  servicioRow(servicio) {
    const prices = (servicio.preciosPorTipo || []).map(item => `<span class="service-pill">${esc(item.tipoPerroNombre)} · ${formatMoney(item.precio)} · ${item.duracionMinutos} min</span>`).join('') || '<span class="chip">Sin tipos configurados</span>';
    return `<tr><td data-label="Servicio"><strong>${esc(servicio.nombre)}</strong><br><small>${esc(servicio.desc || '')}</small></td><td data-label="Configuración"><div class="service-pill-list">${prices}</div></td><td data-label="Acciones"><div class="td-actions"><button class="btn btn-ghost btn-sm btn-icon" data-action="view-peluqueria-servicio" data-id="${servicio.id}" title="Visualizar">👁️</button><button class="btn btn-ghost btn-sm btn-icon" data-action="edit-peluqueria-servicio" data-id="${servicio.id}" title="Editar">✏️</button><button class="btn btn-danger btn-sm btn-icon" data-action="delete" data-entity="peluqueria-servicio" data-id="${servicio.id}" data-name="${esc(servicio.nombre)}" title="Eliminar">🗑️</button></div></td></tr>`;
  }

  renderTurnos() {
    const filtros = this.turnosFilters;
    const today = dateKey(new Date());

    const servicioOptions = this.app.store.data.peluqueriaServicios.map(s => `<option value="${s.id}" ${s.id === filtros.servicioId ? 'selected' : ''}>${esc(s.nombre)}</option>`).join('');
    const tipoOptions = this.app.store.data.peluqueriaTiposPerro.map(t => `<option value="${t.id}" ${t.id === filtros.tipoPerroId ? 'selected' : ''}>${esc(t.nombre)}</option>`).join('');

    let list = [...this.app.store.data.peluqueriaTurnos].filter(turno => {
      if (turno.fecha < filtros.fechaDesde) return false;
      if (filtros.cliente && !turno.cliente.toLowerCase().includes(filtros.cliente.toLowerCase())) return false;
      if (filtros.servicioId && turno.servicioId !== filtros.servicioId) return false;
      if (filtros.tipoPerroId && turno.tipoPerroId !== filtros.tipoPerroId) return false;
      if (filtros.estado && turno.estado !== filtros.estado) return false;
      if (filtros.isPaid === 'true' && !turno.isPaid) return false;
      if (filtros.isPaid === 'false' && turno.isPaid) return false;
      return true;
    }).sort((a, b) => `${a.fecha} ${a.hora}`.localeCompare(`${b.fecha} ${b.hora}`));

    const pageState = getResponsivePageItems(list, this.pages.turnos, DEFAULT_PAGE_SIZE);
    this.pages.turnos = pageState.page;
    this.totalPages = pageState.totalPages;

    document.getElementById('peluqueria-content').innerHTML = `<div class="subsection-head"><div><h3>Turnos</h3><p>Administración manual de turnos de peluquería.</p></div><button class="btn btn-primary" data-action="new-peluqueria-turno">+ Nuevo turno</button></div>
    <div class="toolbar">
      <label class="filter-field"><span>Fecha desde</span><input type="date" id="turnos-filter-fecha" class="filter-control" value="${filtros.fechaDesde}"></label>
      <div class="search-box"><span class="search-icon">🔍</span><input type="text" id="turnos-filter-cliente" placeholder="Buscar por cliente…" value="${esc(filtros.cliente)}"></div>
      <select id="turnos-filter-servicio" class="filter-control"><option value="">Todos los servicios</option>${servicioOptions}</select>
      <select id="turnos-filter-tipo" class="filter-control"><option value="">Todos los tipos</option>${tipoOptions}</select>
      <select id="turnos-filter-estado" class="filter-control"><option value="">Todos los estados</option>${ESTADOS.map(e => `<option value="${e}" ${filtros.estado === e ? 'selected' : ''}>${e}</option>`).join('')}</select>
      <select id="turnos-filter-pagado" class="filter-control"><option value="">Todos</option><option value="true" ${filtros.isPaid === 'true' ? 'selected' : ''}>Sí</option><option value="false" ${filtros.isPaid === 'false' ? 'selected' : ''}>No</option></select>
      <button class="btn btn-ghost" data-action="turnos-clear-filters">Limpiar</button>
    </div>
    <div class="table-wrap"><table class="data-table"><thead><tr><th>Fecha</th><th>Hora</th><th>Cliente</th><th>Servicio</th><th>Tipo</th><th>Estado</th><th>Pagado</th><th>Acciones</th></tr></thead><tbody>${pageState.items.map(turno => this.turnoRow(turno)).join('') || '<tr><td colspan="8">No hay turnos que coincidan con los filtros.</td></tr>'}</tbody></table></div>
    <div id="pager-peluqueria"></div>`;
    document.getElementById('pager-peluqueria').innerHTML = paginationTemplate('peluqueria', pageState);
    this.bindTurnosFilters();
  }

  bindTurnosFilters() {
    const update = (key, value) => {
      this.turnosFilters[key] = value;
      this.pages.turnos = 1;
      this.renderActiveTab();
    };
    document.getElementById('turnos-filter-fecha')?.addEventListener('change', e => update('fechaDesde', e.target.value));
    document.getElementById('turnos-filter-cliente')?.addEventListener('input', e => update('cliente', e.target.value));
    document.getElementById('turnos-filter-servicio')?.addEventListener('change', e => update('servicioId', e.target.value));
    document.getElementById('turnos-filter-tipo')?.addEventListener('change', e => update('tipoPerroId', e.target.value));
    document.getElementById('turnos-filter-estado')?.addEventListener('change', e => update('estado', e.target.value));
    document.getElementById('turnos-filter-pagado')?.addEventListener('change', e => update('isPaid', e.target.value));
  }

  clearTurnosFilters() {
    this.turnosFilters = {
      fechaDesde: dateKey(new Date()),
      cliente: '',
      servicioId: '',
      tipoPerroId: '',
      estado: '',
      isPaid: ''
    };
    this.pages.turnos = 1;
    this.renderActiveTab();
  }

  turnoRow(turno) {
    const paidBadge = turno.isPaid ? '<span class="chip chip-ok">✓ Pagado</span>' : '<span class="chip">Pendiente</span>';
    const payButton = turno.isPaid ? '' : `<button class="btn btn-ghost btn-sm btn-icon" data-action="pay-peluqueria-turno" data-id="${turno.id}" title="Abonar">💰</button>`;
    return `<tr><td data-label="Fecha"><strong>${formatDate(turno.fecha)}</strong></td><td data-label="Hora">${esc(turno.hora)}</td><td data-label="Cliente">${esc(turno.cliente)}</td><td data-label="Servicio">${esc(turno.servicioNombre)}</td><td data-label="Tipo">${esc(turno.tipoPerroNombre)}</td><td data-label="Estado"><span class="appointment-state state-${String(turno.estado).replace(/ /g, '-')}">${esc(turno.estado)}</span></td><td data-label="Pagado">${paidBadge}</td><td data-label="Acciones"><div class="td-actions"><button class="btn btn-ghost btn-sm btn-icon" data-action="view-peluqueria-turno" data-id="${turno.id}" title="Visualizar">👁️</button><button class="btn btn-ghost btn-sm btn-icon" data-action="edit-peluqueria-turno" data-id="${turno.id}" title="Editar">✏️</button>${payButton}<button class="btn btn-danger btn-sm btn-icon" data-action="delete" data-entity="peluqueria-turno" data-id="${turno.id}" data-name="${esc(turno.cliente)} - ${esc(turno.fecha)} ${esc(turno.hora)}" title="Eliminar">🗑️</button></div></td></tr>`;
  }

  renderMobileCalendario() {
    const days = Array.from({ length: 7 }, (_, index) => new Date(this.weekStart.getTime() + index * DAY_MS));
    const bounds = this.getCalendarBounds(days);
    this.calendarStart = bounds.start;
    this.calendarEnd = bounds.end;
    const serviceOptions = this.app.store.data.peluqueriaServicios.map(item => `<option value="${item.id}" ${item.id === this.calendarServicioId ? 'selected' : ''}>${esc(item.nombre)}</option>`).join('');
    const typeOptions = this.app.store.data.peluqueriaTiposPerro.map(item => `<option value="${item.id}" ${item.id === this.calendarTipoPerroId ? 'selected' : ''}>${esc(item.nombre)}</option>`).join('');
    document.getElementById('peluqueria-mobile-content').innerHTML = `<div class="mobile-agenda-panel"><div class="mobile-week-head"><button class="calendar-arrow" data-action="peluqueria-prev-week" aria-label="Semana anterior">‹</button><div><span>Semana</span><strong>${formatDate(dateKey(this.weekStart))} - ${formatDate(dateKey(days[6]))}</strong></div><button class="calendar-arrow" data-action="peluqueria-next-week" aria-label="Semana siguiente">›</button></div><div class="mobile-filter-card"><select id="peluqueria-mobile-calendar-servicio" class="filter-control"><option value="">Todos los servicios</option>${serviceOptions}</select><select id="peluqueria-mobile-calendar-tipo" class="filter-control"><option value="">Todos los tipos</option>${typeOptions}</select><div class="mobile-filter-row"><input type="date" class="filter-control" id="peluqueria-mobile-week-picker" value="${dateKey(this.weekStart)}"><button class="btn btn-ghost" data-action="peluqueria-current-week">Hoy</button></div></div><div class="mobile-agenda-days">${days.map(day => this.renderMobileAgendaDay(day)).join('')}</div></div>`;
    this.bindMobileCalendarControls();
  }

  renderMobileAgendaDay(day) {
    const key = dateKey(day);
    const appointments = this.filteredDayAppointments(key);
    const slots = this.renderMobileAvailableSlots(key);
    const body = [...appointments.map(turno => this.mobileTurnoCard(turno, 'agenda')), ...slots].join('') || '<p class="empty-note">Sin turnos ni huecos disponibles.</p>';
    return `<article class="mobile-day-card"><div class="mobile-day-head"><strong>${formatDate(key)}</strong><span>${this.getDateRanges(key).length ? 'Abierto' : 'Cerrado'}</span></div><div class="mobile-day-list">${body}</div></article>`;
  }

  filteredDayAppointments(fecha) {
    return this.app.store.data.peluqueriaTurnos.filter(turno => {
      if (turno.fecha !== fecha) return false;
      if (this.calendarServicioId && turno.servicioId !== this.calendarServicioId) return false;
      if (this.calendarTipoPerroId && turno.tipoPerroId !== this.calendarTipoPerroId) return false;
      return true;
    }).sort((a, b) => a.hora.localeCompare(b.hora));
  }

  renderMobileAvailableSlots(fecha) {
    const servicioId = this.calendarServicioId;
    const tipoPerroId = this.calendarTipoPerroId;
    const config = this.getServiceTypeConfig(servicioId, tipoPerroId);
    const slotDuration = Number(config?.duracionMinutos || 60);
    const slots = [];
    for (const rango of this.getDateRanges(fecha)) {
      const from = timeToMinutes(rango.desde);
      const to = timeToMinutes(rango.hasta);
      const firstHour = Math.ceil(from / 60) * 60;
      for (let minutes = firstHour; minutes + slotDuration <= to; minutes += 60) {
        if (this.availableCapacity(fecha, minutesToTime(minutes), slotDuration) <= 0) continue;
        if (this.getHourAppointments(fecha, minutes).length) continue;
        slots.push(`<button class="mobile-slot-card" data-action="new-peluqueria-turno-at" data-date="${fecha}" data-time="${minutesToTime(minutes)}" data-service="${servicioId}" data-type="${tipoPerroId}"><span>${minutesToTime(minutes)}</span><strong>Agregar turno</strong></button>`);
      }
    }
    return slots;
  }

  bindMobileCalendarControls() {
    document.getElementById('peluqueria-mobile-calendar-servicio')?.addEventListener('change', event => {
      this.calendarServicioId = event.target.value;
      this.renderMobileCalendario();
    });
    document.getElementById('peluqueria-mobile-calendar-tipo')?.addEventListener('change', event => {
      this.calendarTipoPerroId = event.target.value;
      this.renderMobileCalendario();
    });
    document.getElementById('peluqueria-mobile-week-picker')?.addEventListener('change', event => {
      this.weekStart = this.getWeekStart(new Date(`${event.target.value}T00:00:00`));
      this.renderMobileCalendario();
    });
  }

  renderMobileTurnos() {
    const filtros = this.turnosFilters;
    const servicioOptions = this.app.store.data.peluqueriaServicios.map(s => `<option value="${s.id}" ${s.id === filtros.servicioId ? 'selected' : ''}>${esc(s.nombre)}</option>`).join('');
    const tipoOptions = this.app.store.data.peluqueriaTiposPerro.map(t => `<option value="${t.id}" ${t.id === filtros.tipoPerroId ? 'selected' : ''}>${esc(t.nombre)}</option>`).join('');
    const list = [...this.app.store.data.peluqueriaTurnos].filter(turno => {
      if (turno.fecha < filtros.fechaDesde) return false;
      if (filtros.cliente && !turno.cliente.toLowerCase().includes(filtros.cliente.toLowerCase())) return false;
      if (filtros.servicioId && turno.servicioId !== filtros.servicioId) return false;
      if (filtros.tipoPerroId && turno.tipoPerroId !== filtros.tipoPerroId) return false;
      if (filtros.estado && turno.estado !== filtros.estado) return false;
      if (filtros.isPaid === 'true' && !turno.isPaid) return false;
      if (filtros.isPaid === 'false' && turno.isPaid) return false;
      return true;
    }).sort((a, b) => `${a.fecha} ${a.hora}`.localeCompare(`${b.fecha} ${b.hora}`));
    const pageState = getResponsivePageItems(list, this.pages.turnos, DEFAULT_PAGE_SIZE);
    this.pages.turnos = pageState.page;
    this.totalPages = pageState.totalPages;
    document.getElementById('peluqueria-mobile-content').innerHTML = `<div class="mobile-filter-card"><label>Desde<input type="date" id="turnos-filter-fecha" class="filter-control" value="${filtros.fechaDesde}"></label><input type="text" id="turnos-filter-cliente" class="filter-control" placeholder="Buscar cliente" value="${esc(filtros.cliente)}"><select id="turnos-filter-servicio" class="filter-control"><option value="">Todos los servicios</option>${servicioOptions}</select><select id="turnos-filter-tipo" class="filter-control"><option value="">Todos los tipos</option>${tipoOptions}</select><select id="turnos-filter-estado" class="filter-control"><option value="">Todos los estados</option>${ESTADOS.map(e => `<option value="${e}" ${filtros.estado === e ? 'selected' : ''}>${e}</option>`).join('')}</select><select id="turnos-filter-pagado" class="filter-control"><option value="">Todos</option><option value="true" ${filtros.isPaid === 'true' ? 'selected' : ''}>Pagados</option><option value="false" ${filtros.isPaid === 'false' ? 'selected' : ''}>Pendientes</option></select><button class="btn btn-ghost" data-action="turnos-clear-filters">Limpiar filtros</button></div><div class="mobile-card-list">${pageState.items.map(turno => this.mobileTurnoCard(turno)).join('') || '<p class="empty-note">No hay turnos que coincidan con los filtros.</p>'}</div><div id="pager-peluqueria"></div>`;
    document.getElementById('pager-peluqueria').innerHTML = paginationTemplate('peluqueria', pageState);
    this.bindTurnosFilters();
  }

  mobileTurnoCard(turno, variant = '') {
    const paidBadge = turno.isPaid ? '<span class="chip chip-ok">Pagado</span>' : '<span class="chip">Pendiente</span>';
    const payButton = turno.isPaid ? '' : `<button class="btn btn-ghost btn-sm" data-action="pay-peluqueria-turno" data-id="${turno.id}">Pagar</button>`;
    return `<article class="mobile-appointment-card ${variant === 'agenda' ? 'is-agenda' : ''}"><button class="mobile-card-main" data-action="view-peluqueria-turno" data-id="${turno.id}"><span>${formatDate(turno.fecha)} · ${esc(turno.hora)}</span><strong>${esc(turno.cliente)}</strong><em>${esc(turno.servicioNombre)} / ${esc(turno.tipoPerroNombre)}</em></button><div class="mobile-card-meta"><span class="appointment-state state-${String(turno.estado).replace(/ /g, '-')}">${esc(turno.estado)}</span>${paidBadge}</div><div class="mobile-card-actions"><button class="btn btn-ghost btn-sm" data-action="edit-peluqueria-turno" data-id="${turno.id}">Editar</button>${payButton}<button class="btn btn-danger btn-sm" data-action="delete" data-entity="peluqueria-turno" data-id="${turno.id}" data-name="${esc(turno.cliente)} - ${esc(turno.fecha)} ${esc(turno.hora)}">Eliminar</button></div></article>`;
  }

  renderMobileServicios() {
    const list = [...this.app.store.data.peluqueriaServicios].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));
    const pageState = getResponsivePageItems(list, this.pages.servicios, DEFAULT_PAGE_SIZE);
    this.pages.servicios = pageState.page;
    this.totalPages = pageState.totalPages;
    document.getElementById('peluqueria-mobile-content').innerHTML = `<div class="mobile-card-list">${pageState.items.map(servicio => this.mobileServicioCard(servicio)).join('') || '<p class="empty-note">Aún no hay servicios.</p>'}</div><div id="pager-peluqueria"></div>`;
    document.getElementById('pager-peluqueria').innerHTML = paginationTemplate('peluqueria', pageState);
  }

  mobileServicioCard(servicio) {
    const configs = servicio.preciosPorTipo || [];
    const prices = configs.map(item => `<div class="mobile-price-row"><div><strong>${esc(item.tipoPerroNombre)}</strong><span>${item.duracionMinutos} min</span></div><em>${formatMoney(item.precio)}</em></div>`).join('') || '<p class="empty-note">Sin precios configurados por tipo.</p>';
    return `<article class="mobile-service-card"><div class="mobile-record-top"><div class="mobile-record-icon">✂</div><div><span>Servicio</span><strong>${esc(servicio.nombre)}</strong><p>${esc(servicio.desc || 'Sin descripción')}</p></div></div><div class="mobile-record-summary"><span>${configs.length} tipo(s)</span><span>${configs[0] ? `Desde ${formatMoney(Math.min(...configs.map(item => Number(item.precio || 0))))}` : 'Sin precio'}</span></div><div class="mobile-price-list">${prices}</div><div class="mobile-record-actions"><button class="btn btn-ghost btn-sm" data-action="view-peluqueria-servicio" data-id="${servicio.id}">Ver</button><button class="btn btn-ghost btn-sm" data-action="edit-peluqueria-servicio" data-id="${servicio.id}">Editar</button><button class="btn btn-danger btn-sm" data-action="delete" data-entity="peluqueria-servicio" data-id="${servicio.id}" data-name="${esc(servicio.nombre)}">Eliminar</button></div></article>`;
  }

  renderMobileTipos() {
    const list = [...this.app.store.data.peluqueriaTiposPerro].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));
    const pageState = getResponsivePageItems(list, this.pages.tipos, DEFAULT_PAGE_SIZE);
    this.pages.tipos = pageState.page;
    this.totalPages = pageState.totalPages;
    document.getElementById('peluqueria-mobile-content').innerHTML = `<div class="mobile-card-list">${pageState.items.map(tipo => this.mobileTipoCard(tipo)).join('') || '<p class="empty-note">Aún no hay tipos de perros.</p>'}</div><div id="pager-peluqueria"></div>`;
    document.getElementById('pager-peluqueria').innerHTML = paginationTemplate('peluqueria', pageState);
  }

  mobileTipoCard(tipo) {
    const count = this.app.store.data.peluqueriaServicios.filter(servicio => (servicio.preciosPorTipo || []).some(item => item.tipoPerroId === tipo.id)).length;
    return `<article class="mobile-type-card"><div class="mobile-record-top"><div class="mobile-record-icon">🐶</div><div><span>Tipo de perro</span><strong>${esc(tipo.nombre)}</strong><p>${esc(tipo.desc || 'Sin descripción')}</p></div></div><div class="mobile-type-metric"><strong>${count}</strong><span>servicio(s) configurados</span></div><div class="mobile-record-actions"><button class="btn btn-ghost btn-sm" data-action="view-peluqueria-tipo" data-id="${tipo.id}">Ver</button><button class="btn btn-ghost btn-sm" data-action="edit-peluqueria-tipo" data-id="${tipo.id}">Editar</button><button class="btn btn-danger btn-sm" data-action="delete" data-entity="peluqueria-tipo" data-id="${tipo.id}" data-name="${esc(tipo.nombre)}">Eliminar</button></div></article>`;
  }

  renderMobileHorarios() {
    document.getElementById('peluqueria-mobile-content').innerHTML = `<div class="schedule-grid mobile-schedule-grid">${DIAS.map(dia => this.horarioDayCard(dia)).join('')}</div>`;
  }

  renderCalendario() {
    const days = Array.from({ length: 7 }, (_, index) => new Date(this.weekStart.getTime() + index * DAY_MS));
    const bounds = this.getCalendarBounds(days);
    this.calendarStart = bounds.start;
    this.calendarEnd = bounds.end;
    const hourHeight = (60 / (this.calendarEnd - this.calendarStart)) * 100;
    const serviceOptions = this.app.store.data.peluqueriaServicios.map(item => `<option value="${item.id}" ${item.id === this.calendarServicioId ? 'selected' : ''}>${esc(item.nombre)}</option>`).join('');
    const typeOptions = this.app.store.data.peluqueriaTiposPerro.map(item => `<option value="${item.id}" ${item.id === this.calendarTipoPerroId ? 'selected' : ''}>${esc(item.nombre)}</option>`).join('');
    document.getElementById('peluqueria-content').innerHTML = `<div class="calendar-panel calendar-panel-compact"><div class="calendar-compact-head"><button class="calendar-arrow" data-action="peluqueria-prev-week" aria-label="Semana anterior">‹</button><div><h3>${formatDate(dateKey(this.weekStart))} - ${formatDate(dateKey(days[6]))}</h3><p>Arrastrá turnos en bloques de 15 minutos. Pasá el mouse por un hueco para crear uno nuevo.</p></div><button class="calendar-arrow" data-action="peluqueria-next-week" aria-label="Semana siguiente">›</button></div><div class="calendar-filters calendar-filters-compact"><label><select id="peluqueria-calendar-servicio" class="filter-control"><option value="">Todos los servicios</option>${serviceOptions}</select></label><label><select id="peluqueria-calendar-tipo" class="filter-control"><option value="">Todos los tipos</option>${typeOptions}</select></label><input type="date" class="filter-control" id="peluqueria-week-picker" value="${dateKey(this.weekStart)}"><button class="btn btn-ghost" data-action="peluqueria-current-week">Esta semana</button></div><div class="week-calendar grooming-calendar" style="--calendar-hour-height:${hourHeight}%"><div class="time-rail">${this.renderTimeRail()}</div>${days.map(day => this.renderDayColumn(day)).join('')}</div><div class="calendar-legend"><span><i class="legend-dot available"></i>Hueco disponible</span><span><i class="legend-dot busy"></i>Turno</span><span><i class="legend-dot cancelled"></i>Cancelado/liberado</span><span><i class="legend-dot closed"></i>No disponible</span></div></div>`;
    this.bindCalendarControls();
  }

  renderTimeRail() {
    const rows = [];
    for (let minutes = this.calendarStart; minutes <= this.calendarEnd; minutes += 60) rows.push(`<span style="top:${this.minuteTop(minutes)}%">${minutesToTime(minutes)}</span>`);
    return rows.join('');
  }

  renderDayColumn(day) {
    const key = dateKey(day);
    const filtroServicio = this.calendarServicioId;
    const filtroTipo = this.calendarTipoPerroId;
    const appointments = this.app.store.data.peluqueriaTurnos.filter(turno => {
      if (turno.fecha !== key) return false;
      if (filtroServicio && turno.servicioId !== filtroServicio) return false;
      if (filtroTipo && turno.tipoPerroId !== filtroTipo) return false;
      return true;
    });
    const layouts = this.getAppointmentLayouts(appointments);
    return `<div class="day-column"><div class="day-head">${formatDate(key)}</div><div class="day-body" data-calendar-date="${key}">${this.renderClosedBlocks(key)}${this.renderAvailableSlots(key)}${appointments.map(turno => this.renderAppointmentBlock(turno, layouts.get(turno.id))).join('')}</div></div>`;
  }

  renderClosedBlocks(fecha) {
    const ranges = this.getDateRanges(fecha).map(rango => ({ from: timeToMinutes(rango.desde), to: timeToMinutes(rango.hasta) }));
    const blocks = [];
    let cursor = this.calendarStart;
    for (const range of ranges) {
      if (range.from > cursor) blocks.push(this.closedBlock(cursor, range.from));
      cursor = Math.max(cursor, range.to);
    }
    if (cursor < this.calendarEnd) blocks.push(this.closedBlock(cursor, this.calendarEnd));
    return blocks.join('');
  }

  closedBlock(from, to) {
    return `<div class="calendar-closed" style="top:${this.minuteTop(from)}%;height:${this.minuteHeight(to - from)}%"></div>`;
  }

  renderAvailableSlots(fecha) {
    const servicioId = this.calendarServicioId;
    const tipoPerroId = this.calendarTipoPerroId;
    const config = this.getServiceTypeConfig(servicioId, tipoPerroId);
    const slotDuration = Number(config?.duracionMinutos || 60);
    const slots = [];
    for (const rango of this.getDateRanges(fecha)) {
      const from = timeToMinutes(rango.desde);
      const to = timeToMinutes(rango.hasta);
      const firstHour = Math.ceil(from / 60) * 60;
      for (let minutes = firstHour; minutes + slotDuration <= to; minutes += 60) {
        if (this.availableCapacity(fecha, minutesToTime(minutes), slotDuration) <= 0) continue;
        const cellAppointments = this.getHourAppointments(fecha, minutes);
        if (cellAppointments.length) continue;
        slots.push(`<button class="available-slot" style="top:${this.minuteTop(minutes)}%;height:${this.minuteHeight(60)}%" data-action="new-peluqueria-turno-at" data-date="${fecha}" data-time="${minutesToTime(minutes)}" data-service="${servicioId}" data-type="${tipoPerroId}" title="Añadir turno ${minutesToTime(minutes)}"><span>+</span></button>`);
      }
    }
    return slots.join('');
  }

  renderAppointmentBlock(turno, layout = { column: 0, columns: 1, colorIndex: 0 }) {
    const start = timeToMinutes(turno.hora);
    const duration = Number(turno.duracionMinutos || 60);
    const cancelled = turno.estado === 'cancelado';
    const cellStart = Math.floor(start / 60) * 60;
    const horizontalStyle = this.getAppointmentHorizontalStyle(layout);
    const colorClass = `appointment-color-${layout.colorIndex % APPOINTMENT_COLOR_COUNT}`;
    return `<button class="appointment-block ${colorClass} ${cancelled ? 'is-cancelled' : ''}" style="top:${this.minuteTop(start)}%;height:${this.minuteHeight(duration)}%;${horizontalStyle}" data-action="view-peluqueria-calendar-cell" data-date="${turno.fecha}" data-time="${minutesToTime(cellStart)}" data-appointment-id="${turno.id}" title="Click para ver turnos de esta hora. Arrastrar para mover. Doble click para editar."><strong>${esc(turno.hora)} · ${esc(turno.cliente)}</strong><span>${esc(turno.servicioNombre)} / ${esc(turno.tipoPerroNombre)}</span><em>${esc(turno.estado)}</em></button>`;
  }

  getAppointmentHorizontalStyle(layout) {
    const columns = Number(layout?.columns || 1);
    if (columns <= 1) return '';
    const column = Number(layout?.column || 0);
    const width = 100 / columns;
    return `left:${column * width}%;right:auto;width:${width}%;`;
  }

  getAppointmentLayouts(appointments) {
    const layouts = new Map();
    const sorted = appointments.map((turno, index) => {
      const start = timeToMinutes(turno.hora);
      return { turno, index, start, end: start + Number(turno.duracionMinutos || 60) };
    }).sort((a, b) => a.start - b.start || a.end - b.end || a.index - b.index);

    let group = [];
    let groupEnd = 0;
    const flushGroup = () => {
      if (!group.length) return;
      const columnEnds = [];
      const assigned = group.map(item => {
        let column = columnEnds.findIndex(end => end <= item.start);
        if (column === -1) column = columnEnds.length;
        columnEnds[column] = item.end;
        return { ...item, column };
      });
      const columns = Math.max(1, columnEnds.length);
      assigned.forEach(item => layouts.set(item.turno.id, { column: item.column, columns, colorIndex: item.column }));
      group = [];
      groupEnd = 0;
    };

    for (const item of sorted) {
      if (group.length && item.start >= groupEnd) flushGroup();
      group.push(item);
      groupEnd = Math.max(groupEnd, item.end);
    }
    flushGroup();

    return layouts;
  }

  bindCalendarControls() {
    document.getElementById('peluqueria-calendar-servicio')?.addEventListener('change', event => {
      this.calendarServicioId = event.target.value;
      this.renderCalendario();
    });
    document.getElementById('peluqueria-calendar-tipo')?.addEventListener('change', event => {
      this.calendarTipoPerroId = event.target.value;
      this.renderCalendario();
    });
    document.getElementById('peluqueria-week-picker')?.addEventListener('change', event => {
      this.weekStart = this.getWeekStart(new Date(`${event.target.value}T00:00:00`));
      this.renderCalendario();
    });
    document.querySelectorAll('[data-appointment-id]').forEach(block => {
      block.addEventListener('dblclick', () => this.editTurno(block.dataset.appointmentId));
      block.addEventListener('pointerdown', event => this.startAppointmentDrag(event, block.dataset.appointmentId));
      block.addEventListener('contextmenu', event => this.openCalendarContextMenu(event, block.dataset.appointmentId));
    });
    document.querySelectorAll('.grooming-calendar .day-body').forEach(body => {
      body.addEventListener('contextmenu', event => this.openCalendarContextMenu(event));
    });
  }

  openCalendarContextMenu(event, appointmentId = '') {
    event.preventDefault();
    event.stopPropagation();
    this.closeCalendarContextMenu();

    const turno = appointmentId ? this.app.store.data.peluqueriaTurnos.find(item => item.id === appointmentId) : null;
    const target = turno ? { fecha: turno.fecha, hora: turno.hora } : this.getCalendarDropTarget(event.clientX, event.clientY);
    if (!target) return;

    const canAdd = this.canAddTurnoAt(target.fecha, target.hora);
    const items = [];
    if (canAdd) items.push(`<button type="button" data-calendar-menu-action="new" data-date="${target.fecha}" data-time="${target.hora}">Agregar nuevo turno</button>`);
    if (turno) {
      items.push(`<button type="button" data-calendar-menu-action="view" data-id="${turno.id}">Ver turno</button>`);
      items.push(`<button type="button" data-calendar-menu-action="edit" data-id="${turno.id}">Editar turno</button>`);
      if (!turno.isPaid) items.push(`<button type="button" data-calendar-menu-action="pay" data-id="${turno.id}">Pagar</button>`);
      items.push(`<button type="button" class="danger" data-calendar-menu-action="delete" data-id="${turno.id}">Eliminar turno</button>`);
    }
    if (!items.length) return;

    const menu = document.createElement('div');
    menu.className = 'calendar-context-menu';
    menu.innerHTML = items.join('');
    document.body.appendChild(menu);

    const rect = menu.getBoundingClientRect();
    const left = Math.min(window.innerWidth - rect.width - 8, Math.max(8, event.clientX));
    const top = Math.min(window.innerHeight - rect.height - 8, Math.max(8, event.clientY));
    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;

    menu.addEventListener('click', clickEvent => {
      clickEvent.preventDefault();
      clickEvent.stopPropagation();
      const button = clickEvent.target.closest('[data-calendar-menu-action]');
      if (!button) return;
      this.handleCalendarContextAction(button.dataset, turno);
    });
    setTimeout(() => {
      document.addEventListener('click', this.closeCalendarContextMenu, { once: true });
      document.addEventListener('scroll', this.closeCalendarContextMenu, { once: true, capture: true });
    });
  }

  closeCalendarContextMenu = () => {
    document.querySelector('.calendar-context-menu')?.remove();
  };

  handleCalendarContextAction(dataset, turno) {
    this.closeCalendarContextMenu();
    if (dataset.calendarMenuAction === 'view') return this.viewTurno(dataset.id);
    if (dataset.calendarMenuAction === 'edit') return this.editTurno(dataset.id);
    if (dataset.calendarMenuAction === 'pay') return this.payTurno(dataset.id);
    if (dataset.calendarMenuAction === 'delete') {
      const selected = turno || this.app.store.data.peluqueriaTurnos.find(item => item.id === dataset.id);
      return this.app.confirmDelete('peluqueria-turno', dataset.id, selected ? `${selected.cliente} - ${selected.fecha} ${selected.hora}` : 'Turno');
    }
    if (dataset.calendarMenuAction === 'new') return this.openNewTurno({ fecha: dataset.date, hora: dataset.time, servicioId: this.calendarServicioId, tipoPerroId: this.calendarTipoPerroId });
  }

  canAddTurnoAt(fecha, hora) {
    const config = this.getServiceTypeConfig(this.calendarServicioId, this.calendarTipoPerroId);
    const duration = Number(config?.duracionMinutos || 60);
    return this.isInsideAvailability(fecha, hora, duration) && this.availableCapacity(fecha, hora, config || duration) > 0;
  }

  minuteTop(minutes) {
    return ((minutes - this.calendarStart) / (this.calendarEnd - this.calendarStart)) * 100;
  }

  minuteHeight(minutes) {
    return (minutes / (this.calendarEnd - this.calendarStart)) * 100;
  }

  getCalendarBounds(days) {
    const minutes = [];
    for (const day of days) {
      const key = dateKey(day);
      for (const rango of this.getDateRanges(key)) minutes.push(timeToMinutes(rango.desde), timeToMinutes(rango.hasta));
      for (const turno of this.app.store.data.peluqueriaTurnos.filter(item => item.fecha === key)) {
        const start = timeToMinutes(turno.hora);
        minutes.push(start, start + Number(turno.duracionMinutos || 60));
      }
    }
    if (!minutes.length) return { start: OPEN_MINUTES, end: CLOSE_MINUTES };
    const start = Math.max(0, Math.floor(Math.min(...minutes) / 60) * 60);
    const end = Math.min(24 * 60, Math.ceil(Math.max(...minutes) / 60) * 60);
    return end > start ? { start, end } : { start: OPEN_MINUTES, end: CLOSE_MINUTES };
  }

  getDateRanges(fecha) {
    const day = new Date(`${fecha}T00:00:00`).getDay() || 7;
    return this.getConfiguredDayRanges(day);
  }

  getConfiguredDayRanges(diaSemana) {
    const records = this.app.store.data.peluqueriaHorarios || [];
    const record = records.find(item => Number(item.diaSemana) === Number(diaSemana));
    return (record?.rangos || []).filter(rango => rango.desde && rango.hasta && rango.desde < rango.hasta).sort((a, b) => a.desde.localeCompare(b.desde));
  }

  getWeekStart(date) {
    const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const day = copy.getDay() || 7;
    copy.setDate(copy.getDate() - day + 1);
    return copy;
  }

  getServiceTypeConfig(servicioId, tipoPerroId) {
    const servicio = this.app.store.data.peluqueriaServicios.find(item => item.id === servicioId);
    return (servicio?.preciosPorTipo || []).find(item => item.tipoPerroId === tipoPerroId) || null;
  }

  availableCapacity(fecha, hora, durationOrConfig, editingId = '') {
    const start = timeToMinutes(hora);
    const duration = Number(durationOrConfig?.duracionMinutos || durationOrConfig || 60);
    const end = start + duration;
    const busy = this.app.store.data.peluqueriaTurnos.filter(turno => turno.id !== editingId && turno.fecha === fecha && turno.estado !== 'cancelado').filter(turno => {
      const turnoStart = timeToMinutes(turno.hora);
      const turnoEnd = turnoStart + Number(turno.duracionMinutos || 60);
      return start < turnoEnd && end > turnoStart;
    }).length;
    return this.getRangeCapacity(fecha, start, duration) - busy;
  }

  getRangeCapacity(fecha, start, duration) {
    const end = start + Number(duration || 60);
    const range = this.getDateRanges(fecha).find(rango => start >= timeToMinutes(rango.desde) && end <= timeToMinutes(rango.hasta));
    return Number(range?.turnosSimultaneos || 1);
  }

  openNewTipo() {
    form.set('peluqueria-tipo-id');
    form.clear(['peluqueria-tipo-nombre', 'peluqueria-tipo-desc']);
    document.getElementById('peluqueria-tipo-title').textContent = 'Nuevo tipo de perro';
    this.app.modals.open('peluqueria-tipo');
  }

  editTipo(id) {
    const tipo = this.app.store.data.peluqueriaTiposPerro.find(item => item.id === id);
    if (!tipo) return;
    form.set('peluqueria-tipo-id', tipo.id);
    form.set('peluqueria-tipo-nombre', tipo.nombre || '');
    form.set('peluqueria-tipo-desc', tipo.desc || '');
    document.getElementById('peluqueria-tipo-title').textContent = 'Editar tipo de perro';
    this.app.modals.open('peluqueria-tipo');
  }

  viewTipo(id) {
    const tipo = this.app.store.data.peluqueriaTiposPerro.find(item => item.id === id);
    if (!tipo) return;
    this.app.showDetail('Tipo de perro', `<div class="detail-list"><div><span>Nombre</span><strong>${esc(tipo.nombre)}</strong></div><div><span>Descripción</span><strong>${esc(tipo.desc || '-')}</strong></div></div>`);
  }

  async saveTipo() {
    const nombre = form.trim('peluqueria-tipo-nombre');
    if (!nombre) return this.app.toasts.show('El nombre es obligatorio', 'error');
    const id = form.value('peluqueria-tipo-id') || this.app.store.createId();
    const duplicated = this.app.store.data.peluqueriaTiposPerro.some(item => item.id !== id && normalizeUniqueName(item.nombre || '') === normalizeUniqueName(nombre));
    if (duplicated) return this.app.toasts.show('Ya existe un tipo de perro con ese nombre', 'error');
    const tipo = { id, nombre, desc: form.trim('peluqueria-tipo-desc') };
    await this.app.store.put('peluqueriaTiposPerro', tipo);
    this.upsertLocal('peluqueriaTiposPerro', tipo);
    await this.app.audit(form.value('peluqueria-tipo-id') ? 'Edición' : 'Creación', 'Peluquería - tipos de perros', tipo.nombre);
    this.app.modals.close('peluqueria-tipo');
    this.renderActiveTab();
    this.app.toasts.show('Tipo de perro guardado ✅');
  }

  openNewServicio() {
    form.set('peluqueria-servicio-id');
    form.clear(['peluqueria-servicio-nombre', 'peluqueria-servicio-desc']);
    document.getElementById('peluqueria-servicio-title').textContent = 'Nuevo servicio';
    this.renderServicioPrecios([]);
    this.app.modals.open('peluqueria-servicio');
  }

  editServicio(id) {
    const servicio = this.app.store.data.peluqueriaServicios.find(item => item.id === id);
    if (!servicio) return;
    form.set('peluqueria-servicio-id', servicio.id);
    form.set('peluqueria-servicio-nombre', servicio.nombre || '');
    form.set('peluqueria-servicio-desc', servicio.desc || '');
    document.getElementById('peluqueria-servicio-title').textContent = 'Editar servicio';
    this.renderServicioPrecios(servicio.preciosPorTipo || []);
    this.app.modals.open('peluqueria-servicio');
  }

  viewServicio(id) {
    const servicio = this.app.store.data.peluqueriaServicios.find(item => item.id === id);
    if (!servicio) return;
    const rows = (servicio.preciosPorTipo || []).map(item => `<div><span>${esc(item.tipoPerroNombre)}</span><strong>${formatMoney(item.precio)} · ${item.duracionMinutos} min</strong></div>`).join('');
    this.app.showDetail('Servicio de peluquería', `<div class="detail-list"><div><span>Nombre</span><strong>${esc(servicio.nombre)}</strong></div><div><span>Descripción</span><strong>${esc(servicio.desc || '-')}</strong></div>${rows}</div>`);
  }

  renderServicioPrecios(existing) {
    const byType = Object.fromEntries(existing.map(item => [item.tipoPerroId, item]));
    document.getElementById('peluqueria-servicio-precios').innerHTML = this.app.store.data.peluqueriaTiposPerro.map(tipo => {
      const item = byType[tipo.id] || {};
      return `<div class="service-price-card" data-type-id="${tipo.id}" data-type-name="${esc(tipo.nombre)}"><strong>${esc(tipo.nombre)}</strong><label>Precio<input type="number" min="0" step="0.01" data-price value="${item.precio || 0}"></label><label>Duración (min)<input type="number" min="5" step="5" data-duration value="${item.duracionMinutos || 60}"></label></div>`;
    }).join('') || '<p class="empty-note">Creá tipos de perros antes de configurar servicios.</p>';
  }

  async saveServicio() {
    const nombre = form.trim('peluqueria-servicio-nombre');
    if (!nombre) return this.app.toasts.show('El nombre es obligatorio', 'error');
    const id = form.value('peluqueria-servicio-id') || this.app.store.createId();
    const duplicated = this.app.store.data.peluqueriaServicios.some(item => item.id !== id && normalizeUniqueName(item.nombre || '') === normalizeUniqueName(nombre));
    if (duplicated) return this.app.toasts.show('Ya existe un servicio con ese nombre', 'error');
    const preciosPorTipo = [...document.querySelectorAll('#peluqueria-servicio-precios [data-type-id]')].map(card => ({
      tipoPerroId: card.dataset.typeId,
      tipoPerroNombre: card.dataset.typeName,
      precio: Number(card.querySelector('[data-price]').value || 0),
      duracionMinutos: Number.parseInt(card.querySelector('[data-duration]').value, 10) || 60
    }));
    const servicio = { id, nombre, desc: form.trim('peluqueria-servicio-desc'), preciosPorTipo };
    await this.app.store.put('peluqueriaServicios', servicio);
    this.upsertLocal('peluqueriaServicios', servicio);
    await this.app.audit(form.value('peluqueria-servicio-id') ? 'Edición' : 'Creación', 'Peluquería - servicios', servicio.nombre);
    this.app.modals.close('peluqueria-servicio');
    this.renderActiveTab();
    this.app.toasts.show('Servicio guardado ✅');
  }

  openNewTurno(defaults = {}) {
    this.app.modals.close('detail');
    form.set('peluqueria-turno-id');
    form.set('peluqueria-turno-fecha', defaults.fecha || dateKey(new Date()));
    form.set('peluqueria-turno-hora', defaults.hora || '09:00');
    this.refreshTurnoSelects(defaults.servicioId || '', defaults.tipoPerroId || '');
    form.set('peluqueria-turno-cliente', '');
    form.set('peluqueria-turno-estado', 'pendiente');
    form.set('peluqueria-turno-observaciones', '');
    document.getElementById('peluqueria-turno-title').textContent = 'Nuevo turno';
    this.bindTurnoSummary();
    this.updateTurnoSummary();
    this.app.modals.open('peluqueria-turno');
  }

  editTurno(id) {
    const turno = this.app.store.data.peluqueriaTurnos.find(item => item.id === id);
    if (!turno) return;
    this.app.modals.close('detail');
    form.set('peluqueria-turno-id', turno.id);
    form.set('peluqueria-turno-fecha', turno.fecha || '');
    form.set('peluqueria-turno-hora', turno.hora || '');
    this.refreshTurnoSelects(turno.servicioId, turno.tipoPerroId);
    form.set('peluqueria-turno-cliente', turno.cliente || '');
    form.set('peluqueria-turno-estado', turno.estado || 'pendiente');
    form.set('peluqueria-turno-observaciones', turno.observaciones || '');
    document.getElementById('peluqueria-turno-title').textContent = 'Editar turno';
    this.bindTurnoSummary();
    this.updateTurnoSummary();
    this.app.modals.open('peluqueria-turno');
  }

  viewTurno(id) {
    const turno = this.app.store.data.peluqueriaTurnos.find(item => item.id === id);
    if (!turno) return;
    const paidLabel = turno.isPaid ? '<span class="chip chip-ok">✓ Abonado</span>' : '<span class="chip">Pendiente</span>';
    const paidInfo = turno.isPaid && turno.paidDate ? `<div><span>Fecha de pago</span><strong>${formatDate(turno.paidDate)}</strong></div><div><span>Método de pago</span><strong>${esc(turno.paidMethod?.nombre || '-')}</strong></div>` : '';
    this.app.showDetail('Turno de peluquería', `<div class="detail-list"><div><span>Fecha y hora</span><strong>${formatDate(turno.fecha)} ${esc(turno.hora)}</strong></div><div><span>Cliente</span><strong>${esc(turno.cliente)}</strong></div><div><span>Servicio</span><strong>${esc(turno.servicioNombre)}</strong></div><div><span>Tipo de perro</span><strong>${esc(turno.tipoPerroNombre)}</strong></div><div><span>Estado</span><strong>${esc(turno.estado)}</strong></div><div><span>Pagado</span><strong>${paidLabel}</strong></div>${paidInfo}<div><span>Precio</span><strong>${formatMoney(turno.precio)}</strong></div><div><span>Duración</span><strong>${turno.duracionMinutos} min</strong></div><div><span>Observaciones</span><strong>${esc(turno.observaciones || '-')}</strong></div></div>`);
  }

  refreshTurnoSelects(servicioId = '', tipoPerroId = '') {
    document.getElementById('peluqueria-turno-servicio').innerHTML = '<option value="">Seleccionar</option>' + this.app.store.data.peluqueriaServicios.map(item => `<option value="${item.id}">${esc(item.nombre)}</option>`).join('');
    document.getElementById('peluqueria-turno-tipo').innerHTML = '<option value="">Seleccionar</option>' + this.app.store.data.peluqueriaTiposPerro.map(item => `<option value="${item.id}">${esc(item.nombre)}</option>`).join('');
    form.set('peluqueria-turno-servicio', servicioId);
    form.set('peluqueria-turno-tipo', tipoPerroId);
  }

  bindTurnoSummary() {
    ['peluqueria-turno-servicio', 'peluqueria-turno-tipo', 'peluqueria-turno-fecha', 'peluqueria-turno-hora'].forEach(id => document.getElementById(id).onchange = () => this.updateTurnoSummary());
  }

  updateTurnoSummary() {
    const config = this.getSelectedTurnoConfig();
    const summary = document.getElementById('peluqueria-turno-resumen');
    if (!config) {
      summary.textContent = 'Seleccioná servicio y tipo de perro para calcular precio, duración y cupos.';
      return;
    }
    const capacity = this.availableCapacity(form.value('peluqueria-turno-fecha'), form.value('peluqueria-turno-hora'), config, form.value('peluqueria-turno-id'));
    summary.innerHTML = `<strong>${formatMoney(config.precio)}</strong> · ${config.duracionMinutos} min · ${Math.max(0, capacity)} cupo(s) disponibles en ese horario`;
  }

  getSelectedTurnoConfig() {
    const servicioId = form.value('peluqueria-turno-servicio');
    const tipoPerroId = form.value('peluqueria-turno-tipo');
    const item = this.getServiceTypeConfig(servicioId, tipoPerroId);
    return item ? { ...item, servicioId, tipoPerroId } : null;
  }

  getHourAppointments(fecha, minutes) {
    const end = minutes + 60;
    return this.app.store.data.peluqueriaTurnos.filter(turno => {
      if (turno.fecha !== fecha) return false;
      const start = timeToMinutes(turno.hora);
      const turnoEnd = start + Number(turno.duracionMinutos || 60);
      return start < end && turnoEnd > minutes;
    }).sort((a, b) => a.hora.localeCompare(b.hora));
  }

  viewCalendarCell(fecha, hora) {
    const minutes = timeToMinutes(hora);
    const turnos = this.getHourAppointments(fecha, minutes);
    if (!turnos.length) return this.openNewTurno({ fecha, hora, servicioId: this.calendarServicioId, tipoPerroId: this.calendarTipoPerroId });
    const rows = turnos.map(turno => `<div><span>${esc(turno.hora)} · ${esc(turno.estado)}</span><strong>${esc(turno.cliente)} · ${esc(turno.servicioNombre)} / ${esc(turno.tipoPerroNombre)}</strong><button class="btn btn-ghost btn-sm" data-action="edit-peluqueria-turno" data-id="${turno.id}">Editar</button></div>`).join('');
    this.app.showDetail(`Turnos ${formatDate(fecha)} ${esc(hora)}`, `<div class="detail-list calendar-cell-detail">${rows}</div>`);
  }

  async saveTurno() {
    const fecha = form.value('peluqueria-turno-fecha');
    const hora = form.value('peluqueria-turno-hora');
    const servicio = this.app.store.data.peluqueriaServicios.find(item => item.id === form.value('peluqueria-turno-servicio'));
    const tipo = this.app.store.data.peluqueriaTiposPerro.find(item => item.id === form.value('peluqueria-turno-tipo'));
    const cliente = form.trim('peluqueria-turno-cliente');
    const config = this.getSelectedTurnoConfig();
    if (!fecha || !hora || !servicio || !tipo || !cliente || !config) return this.app.toasts.show('Completá fecha, hora, servicio, tipo y cliente', 'error');
    const id = form.value('peluqueria-turno-id') || this.app.store.createId();
    const estado = form.value('peluqueria-turno-estado');
    if (estado !== 'cancelado' && !this.isInsideAvailability(fecha, hora, config.duracionMinutos)) return this.app.toasts.show('Ese turno está fuera de los horarios de disponibilidad', 'error');
    if (estado !== 'cancelado' && this.availableCapacity(fecha, hora, config, id) <= 0) return this.app.toasts.show('Ese horario no tiene cupos disponibles', 'error');
    const turno = { id, fecha, hora, servicioId: servicio.id, servicioNombre: servicio.nombre, tipoPerroId: tipo.id, tipoPerroNombre: tipo.nombre, cliente, estado, precio: config.precio, duracionMinutos: config.duracionMinutos, observaciones: form.trim('peluqueria-turno-observaciones') };
    await this.app.store.put('peluqueriaTurnos', turno);
    this.upsertLocal('peluqueriaTurnos', turno);
    await this.app.audit(form.value('peluqueria-turno-id') ? 'Edición' : 'Creación', 'Peluquería - turnos', `${turno.cliente} - ${turno.fecha} ${turno.hora}`);
    this.app.modals.close('peluqueria-turno');
    this.renderActiveTab();
    this.app.toasts.show('Turno guardado ✅');
  }

  payTurno(id) {
    const turno = this.app.store.data.peluqueriaTurnos.find(item => item.id === id);
    if (!turno) return;
    if (turno.isPaid) return this.app.toasts.show('Este turno ya está abonado', 'error');
    form.set('peluqueria-pago-turno-id', id);
    document.getElementById('peluqueria-pago-metodo').innerHTML = '<option value="">Seleccionar método de pago</option>' + this.app.store.data.metodosPago.map(item => `<option value="${item.id}" data-descuento="${item.descuento}" data-recargo="${item.recargo}">${esc(item.nombre)}</option>`).join('');
    const info = document.querySelector('#modal-peluqueria-pago .peluqueria-pago-info');
    info.innerHTML = `<div class="detail-list"><div><span>Cliente</span><strong>${esc(turno.cliente)}</strong></div><div><span>Servicio</span><strong>${esc(turno.servicioNombre)}</strong></div><div><span>Fecha y hora</span><strong>${formatDate(turno.fecha)} ${esc(turno.hora)}</strong></div><div><span>Precio original</span><strong>${formatMoney(turno.precio)}</strong></div></div>`;
    this.updatePagoResumen();
    document.getElementById('peluqueria-pago-metodo').onchange = () => this.updatePagoResumen();
    this.app.modals.open('peluqueria-pago');
  }

  updatePagoResumen() {
    const turnoId = form.value('peluqueria-pago-turno-id');
    const turno = this.app.store.data.peluqueriaTurnos.find(item => item.id === turnoId);
    if (!turno) return;
    const methodSelect = document.getElementById('peluqueria-pago-metodo');
    const selected = methodSelect.options[methodSelect.selectedIndex];
    if (!selected?.value) {
      document.getElementById('peluqueria-pago-resumen').innerHTML = '';
      return;
    }
    const descuento = Number(selected.dataset.descuento || 0);
    const recargo = Number(selected.dataset.recargo || 0);
    const precioBase = Number(turno.precio || 0);
    const montoDescuento = (precioBase * descuento) / 100;
    const montoRecargo = (precioBase * recargo) / 100;
    const finalTotal = precioBase - montoDescuento + montoRecargo;
    const rows = [];
    if (descuento > 0) rows.push(`<div><span>Descuento (${descuento}%)</span><span class="text-success">- ${formatMoney(montoDescuento)}</span></div>`);
    if (recargo > 0) rows.push(`<div><span>Recargo (${recargo}%)</span><span class="text-danger">+ ${formatMoney(montoRecargo)}</span></div>`);
    rows.push(`<div class="total-row"><span>Total a pagar</span><strong>${formatMoney(finalTotal)}</strong></div>`);
    document.getElementById('peluqueria-pago-resumen').innerHTML = `<div class="detail-list">${rows.join('')}</div>`;
  }

  async doPago() {
    const turnoId = form.value('peluqueria-pago-turno-id');
    const metodoId = form.value('peluqueria-pago-metodo');
    if (!turnoId || !metodoId) return this.app.toasts.show('Seleccioná un método de pago', 'error');
    const turno = this.app.store.data.peluqueriaTurnos.find(item => item.id === turnoId);
    if (!turno) return;
    if (turno.isPaid) return this.app.toasts.show('Este turno ya está abonado', 'error');
    const metodo = this.app.store.data.metodosPago.find(item => item.id === metodoId);
    if (!metodo) return;
    const openCaja = this.app.store.data.cajas.find(caja => caja.status === 'abierta');
    if (!openCaja) return this.app.toasts.show('No hay caja abierta. Abrí una caja antes de cobrar.', 'error');
    const precioBase = Number(turno.precio || 0);
    const descuento = Number(metodo.descuento || 0);
    const recargo = Number(metodo.recargo || 0);
    const finalTotal = precioBase - (precioBase * descuento) / 100 + (precioBase * recargo) / 100;
    const updatedTurno = {
      ...turno,
      isPaid: true,
      paidDate: new Date().toISOString(),
      paidMethod: {
        id: metodo.id,
        nombre: metodo.nombre,
        descuento,
        recargo
      }
    };
    await this.app.store.put('peluqueriaTurnos', updatedTurno);
    this.upsertLocal('peluqueriaTurnos', updatedTurno);
    await this.app.audit('Cobro', 'Peluquería - turnos', `${turno.cliente} - ${turno.fecha} ${turno.hora} - ${metodo.nombre} - ${formatMoney(finalTotal)}`);
    this.app.modals.close('peluqueria-pago');
    this.renderActiveTab();
    this.app.toasts.show('Turno abonado correctamente ✅');
  }

  upsertLocal(store, record) {
    const list = this.app.store.data[store];
    const index = list.findIndex(item => item.id === record.id);
    if (index >= 0) list[index] = record;
    else list.push(record);
  }

  changeWeek(days) {
    this.weekStart = new Date(this.weekStart.getTime() + days * DAY_MS);
    this.renderActiveTab();
  }

  currentWeek() {
    this.weekStart = this.getWeekStart(new Date());
    this.renderActiveTab();
  }

  isInsideAvailability(fecha, hora, duracionMinutos) {
    const start = timeToMinutes(hora);
    const end = start + Number(duracionMinutos || 60);
    return this.getDateRanges(fecha).some(rango => start >= timeToMinutes(rango.desde) && end <= timeToMinutes(rango.hasta));
  }

  startAppointmentDrag(event, id) {
    if (event.button !== 0) return;
    const turno = this.app.store.data.peluqueriaTurnos.find(item => item.id === id);
    if (!turno) return;
    const block = event.currentTarget;
    event.preventDefault();
    this.dragState = { id, block, startX: event.clientX, startY: event.clientY, moved: false };
    block.classList.add('is-dragging');
    document.body.classList.add('calendar-dragging');
    document.addEventListener('pointermove', this.onAppointmentDragMove);
    document.addEventListener('pointerup', this.onAppointmentDragEnd, { once: true });
  }

  onAppointmentDragMove = event => {
    if (!this.dragState) return;
    const dx = event.clientX - this.dragState.startX;
    const dy = event.clientY - this.dragState.startY;
    if (Math.abs(dx) + Math.abs(dy) > 4) this.dragState.moved = true;
    this.dragState.block.style.transform = `translate(${dx}px, ${dy}px)`;
  };

  onAppointmentDragEnd = async event => {
    document.removeEventListener('pointermove', this.onAppointmentDragMove);
    const state = this.dragState;
    this.dragState = null;
    document.body.classList.remove('calendar-dragging');
    if (!state) return;

    state.block.classList.remove('is-dragging');
    state.block.style.transform = '';
    if (!state.moved) return;

    const target = this.getCalendarDropTarget(event.clientX, event.clientY);
    if (!target) return this.app.toasts.show('Soltá el turno sobre un día de esta semana', 'error');

    try {
      await this.moveTurno(state.id, target.fecha, target.hora);
    } catch (error) {
      this.app.toasts.show(error.message || 'No se pudo mover el turno', 'error');
    }
  };

  getCalendarDropTarget(clientX, clientY) {
    const body = document.elementsFromPoint(clientX, clientY).find(element => element.classList?.contains('day-body'));
    if (!body?.dataset.calendarDate) return null;
    const rect = body.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));
    const rawMinutes = this.calendarStart + ratio * (this.calendarEnd - this.calendarStart);
    const snapped = Math.round(rawMinutes / SLOT_MINUTES) * SLOT_MINUTES;
    const minutes = Math.min(this.calendarEnd - SLOT_MINUTES, Math.max(this.calendarStart, snapped));
    return { fecha: body.dataset.calendarDate, hora: minutesToTime(minutes) };
  }

  async moveTurno(id, fecha, hora) {
    const turno = this.app.store.data.peluqueriaTurnos.find(item => item.id === id);
    if (!turno) throw new Error('No se encontró el turno');
    const duration = Number(turno.duracionMinutos || 60);
    if (turno.estado !== 'cancelado' && !this.isInsideAvailability(fecha, hora, duration)) {
      throw new Error('Ese horario no está disponible para cargar turnos');
    }
    if (turno.estado !== 'cancelado' && this.availableCapacity(fecha, hora, duration, id) <= 0) {
      throw new Error('Ese horario no tiene cupos disponibles');
    }

    const moved = { ...turno, fecha, hora };
    await this.app.store.put('peluqueriaTurnos', moved);
    this.upsertLocal('peluqueriaTurnos', moved);
    this.renderActiveTab();
    this.app.toasts.show('Turno movido ✅');
  }
}
