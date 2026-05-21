import { DataStore } from './data-store.js';
import { appConfig } from './config.js';
import { ModalManager, NavigationManager, ThemeManager, ToastManager } from './ui.js?v=20260517-1';
import { DashboardComponent } from './components/dashboard.js';
import { ProveedoresComponent } from './components/proveedores.js';
import { TiposComponent } from './components/tipos.js';
import { ProductosComponent } from './components/productos.js';
import { StockComponent } from './components/stock.js';
import { VentasComponent } from './components/ventas.js';
import { MostradorComponent } from './components/mostrador.js?v=20260519-2';
import { MetodosPagoComponent } from './components/metodos-pago.js';
import { CajasComponent } from './components/cajas.js';
import { PeluqueriaComponent } from './components/peluqueria.js';
import { UsuariosComponent } from './components/usuarios.js';
import { isMobileListView } from './pagination.js';

class PetshopApp {
  constructor() {
    this.store = new DataStore(undefined, this);
    this.modals = new ModalManager();
    this.toasts = new ToastManager();
    this.navigation = new NavigationManager(this);
    this.theme = new ThemeManager();
    this.dataReady = false;
    this.preloadPromise = null;
    this.realtimeRefreshTimer = null;
    this.pendingRealtimeStores = new Set();
    this.pendingRealtimeMessages = [];
    this.onWindowScroll = () => this.handleMobileListScroll();
    this.sectionOrder = ['dashboard', 'proveedores', 'tipos', 'productos', 'stock', 'metodosPago', 'cajas', 'ventas', 'mostrador', 'peluqueria', 'usuarios'];
    this.sectionMenu = {
      dashboard: { group: 'Principal', icon: '🏠', label: 'Panel' },
      proveedores: { group: 'Gestión', icon: '🚚', label: 'Proveedores' },
      tipos: { group: 'Gestión', icon: '🏷️', label: 'Tipos de Producto' },
      productos: { group: 'Gestión', icon: '📦', label: 'Productos' },
      metodosPago: { group: 'Gestión', icon: '💳', label: 'Metodos de pago' },
      cajas: { group: 'Gestión', icon: '💵', label: 'Cajas' },
      ventas: { group: 'Gestión', icon: '🧾', label: 'Ventas' },
      mostrador: { group: 'Gestión', icon: '🛒', label: 'Mostrador' },
      peluqueria: { group: 'Gestión', icon: '✂️', label: 'Peluquería' },
      stock: { group: 'Gestión', icon: '📊', label: 'Stock' },
      usuarios: { group: 'Configuración', icon: '🔐', label: 'Usuario' }
    };
    this.sections = appConfig.sections || {};
    if (!this.sectionOrder.some(section => this.sections[section] !== false)) this.sections.dashboard = true;
    this.components = {
      dashboard: new DashboardComponent(this),
      proveedores: new ProveedoresComponent(this),
      tipos: new TiposComponent(this),
      productos: new ProductosComponent(this),
      metodosPago: new MetodosPagoComponent(this),
      cajas: new CajasComponent(this),
      stock: new StockComponent(this),
      ventas: new VentasComponent(this),
      mostrador: new MostradorComponent(this),
      peluqueria: new PeluqueriaComponent(this),
      usuarios: new UsuariosComponent(this)
    };
  }

  async init() {
    await this.loadBackendConfig();
    this.renderMenu();
    this.renderShell();
    this.setMenuDisabled(true);
    this.bindEvents();
    this.registerServiceWorker();
    try {
      await this.store.init();
    } catch (error) {
      this.toasts.show(error.message || 'No se pudo inicializar la aplicación', 'error');
      throw error;
    }
    this.preloadPromise = this.preloadMenuData();
    this.navigation.go(this.initialSection());
    this.startHealthCron();
  }

  initialSection() {
    return this.sectionOrder.find(section => this.isSectionEnabled(section)) || 'dashboard';
  }

  isSectionEnabled(section) {
    return this.sections[section] !== false;
  }

  enabledSections() {
    return this.sectionOrder.filter(section => this.isSectionEnabled(section));
  }

  async loadBackendConfig() {
    try {
      const baseUrl = appConfig.backendUrl.replace(/\/$/, '');
      const response = await fetch(`${baseUrl}/api/config`, { cache: 'no-store' });
      if (!response.ok) return;
      const config = await response.json();
      if (config?.sections && typeof config.sections === 'object') {
        this.sections = { ...this.sections, ...config.sections };
      }
    } catch {
      // Si la configuración remota no está disponible, se usa la configuración inicial.
    }

    if (!this.sectionOrder.some(section => this.sections[section] !== false)) this.sections.dashboard = true;
  }

  renderMenu() {
    const nav = document.getElementById('sidebarNav');
    if (!nav) return;

    const activeSection = this.initialSection();
    const itemsByGroup = this.enabledSections().reduce((groups, section) => {
      const item = this.sectionMenu[section];
      if (!item) return groups;
      if (!groups[item.group]) groups[item.group] = [];
      groups[item.group].push({ section, ...item });
      return groups;
    }, {});

    nav.innerHTML = Object.entries(itemsByGroup).map(([group, items]) => `
      <div class="nav-section-label">${group}</div>
      ${items.map(item => `<button class="nav-item${item.section === activeSection ? ' active' : ''}" data-nav="${item.section}"><span class="nav-icon">${item.icon}</span> ${item.label}</button>`).join('')}
    `).join('');
  }

  async preloadMenuData() {
    try {
      await this.store.loadAll();
      this.components.dashboard.data = null;
      if (this.isSectionEnabled('productos')) {
        this.components.productos.refreshTipoSelects();
        this.components.productos.refreshProveedorSelects();
      }
      this.dataReady = true;
      this.setMenuDisabled(false);
      this.updateBadge();
      return true;
    } catch (error) {
      this.toasts.show(error.message || 'No se pudieron precargar las secciones', 'error');
      return false;
    }
  }

  async ensureDataReady() {
    if (this.dataReady) return true;
    if (!this.preloadPromise) this.preloadPromise = this.preloadMenuData();
    await this.preloadPromise;
    if (!this.dataReady) throw new Error('No se pudieron cargar los datos de la aplicación');
    return true;
  }

  setMenuDisabled(disabled) {
    document.querySelectorAll('[data-nav]:not([data-nav="dashboard"])').forEach(item => {
      item.disabled = disabled;
      item.setAttribute('aria-disabled', String(disabled));
      item.title = disabled ? 'Apartado deshabilitado: requiere precarga completa de datos' : '';
    });
  }

  startHealthCron() {
    const baseUrl = this.store.baseUrl;
    if (!baseUrl) return;
    setInterval(async () => {
      try {
        await fetch(`${baseUrl}/api/health`);
      } catch {}
    }, 2 * 60 * 1000);
  }

  registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;

    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // La app sigue funcionando aunque el navegador rechace el registro PWA.
      });
    });
  }

  renderShell() {
    const sectionTemplates = this.enabledSections()
      .map(section => this.components[section]?.template?.())
      .filter(Boolean);

    document.getElementById('sectionsRoot').innerHTML = sectionTemplates.join('');

    const modalTemplates = [
      this.isSectionEnabled('proveedores') ? this.components.proveedores.modalTemplate() : '',
      this.isSectionEnabled('tipos') ? this.components.tipos.modalTemplate() : '',
      this.isSectionEnabled('productos') ? this.components.productos.modalTemplate() : '',
      this.isSectionEnabled('metodosPago') ? this.components.metodosPago.modalTemplate() : '',
      this.isSectionEnabled('stock') ? this.components.stock.modalTemplate() : '',
      this.isSectionEnabled('peluqueria') ? this.components.peluqueria.modalTemplate() : '',
      this.detailModalTemplate(),
      this.confirmModalTemplate()
    ].filter(Boolean);

    document.getElementById('modalsRoot').innerHTML = modalTemplates.join('');

    this.enabledSections().forEach(section => this.components[section]?.bind?.());
  }

  confirmModalTemplate() {
    return `<div class="modal-overlay" id="modal-confirm"><div class="modal" style="max-width:380px"><div class="modal-title"><span>⚠️ Confirmar eliminación</span><button class="modal-close" data-close-modal="confirm">✕</button></div><p id="confirm-text" style="color:var(--text-soft);font-size:.92rem;margin-bottom:8px"></p><div class="modal-actions"><button class="btn btn-ghost" data-close-modal="confirm">Cancelar</button><button class="btn btn-danger" id="confirm-btn">Eliminar</button></div></div></div>`;
  }

  detailModalTemplate() {
    return `<div class="modal-overlay" id="modal-detail"><div class="modal modal-wide"><div class="modal-title"><span id="detail-title">Detalle</span><button class="modal-close" data-close-modal="detail">✕</button></div><div id="detail-content"></div><div class="modal-actions"><button class="btn btn-ghost" data-close-modal="detail">Cerrar</button></div></div></div>`;
  }

  bindEvents() {
    this.navigation.bind();
    this.theme.bind();
    this.modals.bindOverlayClose();
    window.addEventListener('scroll', this.onWindowScroll, { passive: true });

    document.addEventListener('click', async event => {
      const closeButton = event.target.closest('[data-close-modal]');
      if (closeButton) this.modals.close(closeButton.dataset.closeModal);

      const actionButton = event.target.closest('[data-action]');
      if (!actionButton) return;
      if (actionButton.disabled) return;

      const { action, id, entity, name } = actionButton.dataset;
      if (action === 'new-proveedor') return this.components.proveedores.openNew();
      if (action === 'save-proveedor') return this.runButtonAction(actionButton, () => this.components.proveedores.save(), 'Guardando');
      if (action === 'view-proveedor') this.components.proveedores.view(id);
      if (action === 'edit-proveedor') this.components.proveedores.edit(id);
      if (action === 'new-tipo') return this.components.tipos.openNew();
      if (action === 'save-tipo') return this.runButtonAction(actionButton, () => this.components.tipos.save(), 'Guardando');
      if (action === 'view-tipo') this.components.tipos.view(id);
      if (action === 'edit-tipo') this.components.tipos.edit(id);
      if (action === 'new-producto') return this.components.productos.openNew();
      if (action === 'save-producto') return this.runButtonAction(actionButton, () => this.components.productos.save(), 'Guardando');
      if (action === 'download-productos-pdf') return this.runButtonAction(actionButton, () => this.components.productos.downloadProviderProductsPdf(), 'Descargando');
      if (action === 'download-productos-xlsx') return this.runButtonAction(actionButton, () => this.components.productos.downloadProviderProductsXlsx(), 'Descargando');
      if (action === 'view-producto') this.components.productos.view(id);
      if (action === 'edit-producto') this.components.productos.edit(id);
      if (action === 'new-metodo-pago') return this.components.metodosPago.openNew();
      if (action === 'save-metodo-pago') return this.runButtonAction(actionButton, () => this.components.metodosPago.save(), 'Guardando');
      if (action === 'view-metodo-pago') this.components.metodosPago.view(id);
      if (action === 'edit-metodo-pago') this.components.metodosPago.edit(id);
      if (action === 'view-venta') this.components.ventas.view(id);
      if (action === 'open-caja') return this.runButtonAction(actionButton, () => this.components.cajas.open(), 'Abriendo');
      if (action === 'close-caja') return this.runButtonAction(actionButton, () => this.components.cajas.close(id), 'Cerrando');
      if (action === 'view-caja') this.components.cajas.view(id);
      if (action === 'open-counter-cart') this.components.mostrador.openCart();
      if (action === 'close-counter-cart') this.components.mostrador.closeCart();
      if (action === 'add-counter-item') this.components.mostrador.addItem(id);
      if (action === 'remove-counter-item') this.components.mostrador.removeItem(id);
      if (action === 'finish-counter-sale') return this.runButtonAction(actionButton, () => this.components.mostrador.finishSale(), 'Guardando');
      if (action === 'refresh-users') return this.runButtonAction(actionButton, () => this.components.usuarios.render(), 'Actualizando');
      if (action === 'save-user') return this.runButtonAction(actionButton, () => this.components.usuarios.save(id), 'Guardando');
      if (action === 'new-peluqueria-tipo') return this.components.peluqueria.openNewTipo();
      if (action === 'edit-peluqueria-tipo') return this.components.peluqueria.editTipo(id);
      if (action === 'view-peluqueria-tipo') return this.components.peluqueria.viewTipo(id);
      if (action === 'save-peluqueria-tipo') return this.runButtonAction(actionButton, () => this.components.peluqueria.saveTipo(), 'Guardando');
      if (action === 'new-peluqueria-servicio') return this.components.peluqueria.openNewServicio();
      if (action === 'edit-peluqueria-servicio') return this.components.peluqueria.editServicio(id);
      if (action === 'view-peluqueria-servicio') return this.components.peluqueria.viewServicio(id);
      if (action === 'save-peluqueria-servicio') return this.runButtonAction(actionButton, () => this.components.peluqueria.saveServicio(), 'Guardando');
      if (action === 'new-peluqueria-turno') return this.components.peluqueria.openNewTurno();
      if (action === 'new-peluqueria-turno-at') return this.components.peluqueria.openNewTurno({ fecha: actionButton.dataset.date, hora: actionButton.dataset.time, servicioId: actionButton.dataset.service, tipoPerroId: actionButton.dataset.type });
      if (action === 'edit-peluqueria-turno') return this.components.peluqueria.editTurno(id);
      if (action === 'view-peluqueria-turno') return this.components.peluqueria.viewTurno(id);
      if (action === 'pay-peluqueria-turno') return this.components.peluqueria.payTurno(id);
      if (action === 'do-peluqueria-pago') return this.runButtonAction(actionButton, () => this.components.peluqueria.doPago(), 'Procesando');
      // if (action === 'view-peluqueria-calendar-cell') return this.components.peluqueria.viewCalendarCell(actionButton.dataset.date, actionButton.dataset.time);
      if (action === 'save-peluqueria-turno') return this.runButtonAction(actionButton, () => this.components.peluqueria.saveTurno(), 'Guardando');
      if (action === 'peluqueria-prev-week') return this.components.peluqueria.changeWeek(-7);
      if (action === 'peluqueria-next-week') return this.components.peluqueria.changeWeek(7);
      if (action === 'peluqueria-current-week') { this.components.peluqueria.weekStart = this.components.peluqueria.getWeekStart(new Date()); return this.components.peluqueria.renderCalendario(); }
      if (action === 'add-peluqueria-horario-rango') return this.components.peluqueria.addHorarioRango(actionButton.dataset.day);
      if (action === 'remove-peluqueria-horario-rango') return this.components.peluqueria.removeHorarioRango(actionButton.dataset.day, actionButton.dataset.index);
      if (action === 'save-peluqueria-horarios') return this.runButtonAction(actionButton, () => this.components.peluqueria.saveHorarios(), 'Guardando');
      if (action === 'delete') this.confirmDelete(entity, id, name);
    });

    document.addEventListener('click', event => {
      const pageButton = event.target.closest('[data-pagination] [data-page]');
      if (!pageButton || pageButton.disabled) return;
      const componentName = pageButton.closest('[data-pagination]').dataset.pagination;
      const component = this.components[componentName];
      if (component?.setPage) component.setPage(Number(pageButton.dataset.page));
    });
  }

  handleMobileListScroll() {
    if (!isMobileListView()) return;
    const activeSection = document.querySelector('.section.active');
    if (!activeSection) return;
    const componentName = activeSection.id.replace('sec-', '');
    if (componentName === 'mostrador') return;
    const component = this.components[componentName];
    if (!component?.renderList || !component.totalPages || component.page >= component.totalPages) return;
    const nearBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 520;
    if (!nearBottom) return;

    component.page += 1;
    component.renderList();
  }

  async runButtonAction(button, action, loadingLabel) {
    this.setButtonLoading(button, true, loadingLabel);
    try {
      await action();
    } catch (error) {
      this.toasts.show(error.message || 'No se pudo completar la acción', 'error');
    } finally {
      this.setButtonLoading(button, false);
    }
  }

  setButtonLoading(button, loading, loadingLabel = 'Cargando') {
    if (!button) return;
    if (loading) {
      button.dataset.originalHtml = button.innerHTML;
      button.disabled = true;
      button.classList.add('is-loading');
      button.setAttribute('aria-busy', 'true');
      const label = loadingLabel ? `<span>${loadingLabel}</span>` : '';
      button.innerHTML = `<span class="loading-spinner" aria-hidden="true"></span>${label}`;
      return;
    }

    if (button.dataset.originalHtml) {
      button.innerHTML = button.dataset.originalHtml;
      delete button.dataset.originalHtml;
    }
    button.disabled = false;
    button.classList.remove('is-loading');
    button.removeAttribute('aria-busy');
  }

  async renderSection(section) {
    if (!this.isSectionEnabled(section) || !this.components[section]) return;

    if (section !== 'dashboard' && !this.dataReady) {
      try {
        await (this.preloadPromise || this.preloadMenuData());
      } catch (error) {
        this.toasts.show(error.message || 'No se pudieron cargar los datos', 'error');
        return;
      }
    }

    this.components[section].render();
  }

  resetSectionFilters(section) {
    const target = document.getElementById('sec-' + section);
    if (!target) return;

    target.querySelectorAll('.toolbar input, .toolbar select, .toolbar textarea').forEach(control => {
      if (control.type === 'checkbox' || control.type === 'radio') {
        control.checked = control.defaultChecked;
        return;
      }

      control.value = control.tagName === 'SELECT' ? (control.querySelector('option')?.value || '') : '';
    });

    const component = this.components[section];
    if (component?.resetFilters) {
      component.resetFilters();
      return;
    }

    if (component && 'page' in component) component.page = 1;
  }

  getLowStockProducts() {
    const data = this.store.data;
    return data.productos.filter(product => {
      const qty = (data.stock[product.id] || 0) - (data.reservedStock?.[product.id] || 0);
      const min = product.minStock ?? 0;
      return qty <= min;
    });
  }

  updateBadge() {
    const badge = document.getElementById('stockAlertBadge');
    if (!badge) return;
    const lowStockCount = this.store.dashboard?.totals?.lowStock ?? this.getLowStockProducts().length;
    badge.style.display = lowStockCount ? '' : 'none';
  }

  confirmDelete(entity, id, name) {
    document.getElementById('confirm-text').textContent = `¿Eliminar "${name}"? Esta acción no se puede deshacer.`;
    const confirmButton = document.getElementById('confirm-btn');
    confirmButton.onclick = () => this.runButtonAction(confirmButton, () => this.deleteEntity(entity, id), 'Eliminando');
    this.modals.open('confirm');
  }

  showDetail(title, content) {
    document.getElementById('detail-title').textContent = title;
    document.getElementById('detail-content').innerHTML = content;
    this.modals.open('detail');
  }

  async audit(action, entity, detail) {
    const record = {
      id: this.store.createId(),
      action,
      entity,
      detail,
      createdAt: new Date().toISOString()
    };
    const savedRecord = await this.store.put('auditoria', record);
    this.store.data.auditoria.push(savedRecord || record);
    if (document.getElementById('dash-audit')) this.components.dashboard.renderAudit();
  }

  async deleteEntity(entity, id) {
    const data = this.store.data;
    if (entity === 'prov') {
      const deleted = data.proveedores.find(item => item.id === id);
      await this.store.delete('proveedores', id);
      data.proveedores = data.proveedores.filter(item => item.id !== id);
      await this.audit('Eliminación', 'Proveedores', deleted ? deleted.nombre : 'Proveedor eliminado');
      this.modals.close('confirm');
      this.components.proveedores.renderList();
      if (this.isSectionEnabled('productos')) this.components.productos.refreshProveedorSelects();
    }

    if (entity === 'tipo') {
      const deleted = data.tipos.find(item => item.id === id);
      await this.store.delete('tipos', id);
      data.tipos = data.tipos.filter(item => item.id !== id);
      await this.audit('Eliminación', 'Tipos de producto', deleted ? deleted.nombre : 'Tipo eliminado');
      this.modals.close('confirm');
      this.components.tipos.renderList();
      if (this.isSectionEnabled('productos')) this.components.productos.refreshTipoSelects();
    }

    if (entity === 'prod') {
      const deleted = data.productos.find(item => item.id === id);
      await this.store.delete('productos', id);
      await this.store.delete('stock', id);
      data.productos = data.productos.filter(item => item.id !== id);
      delete data.stock[id];
      await this.audit('Eliminación', 'Productos', deleted ? deleted.nombre : 'Producto eliminado');
      this.modals.close('confirm');
      this.components.productos.renderList();
    }

    if (entity === 'metodo-pago') {
      const deleted = data.metodosPago.find(item => item.id === id);
      await this.store.delete('metodosPago', id);
      data.metodosPago = data.metodosPago.filter(item => item.id !== id);
      await this.audit('Eliminación', 'Métodos de pago', deleted ? deleted.nombre : 'Método de pago eliminado');
      this.modals.close('confirm');
      this.components.metodosPago.renderList();
    }

    if (entity === 'venta') {
      const venta = data.ventas.find(item => item.id === id);
      await this.store.delete('ventas', id);
      await this.store.loadAll();
      await this.audit('Eliminación', 'Ventas', venta ? `${venta.cliente || 'Cliente mostrador'} - ${new Date(venta.createdAt).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}` : 'Venta eliminada');
      this.modals.close('confirm');
      this.components.ventas.refreshPaymentMethodFilter();
      this.components.ventas.renderList();
      this.components.stock.renderList();
      this.components.cajas.render();
    }

    if (entity === 'peluqueria-tipo') {
      const deleted = data.peluqueriaTiposPerro.find(item => item.id === id);
      await this.store.delete('peluqueriaTiposPerro', id);
      data.peluqueriaTiposPerro = data.peluqueriaTiposPerro.filter(item => item.id !== id);
      await this.audit('Eliminación', 'Peluquería - tipos de perros', deleted ? deleted.nombre : 'Tipo eliminado');
      this.modals.close('confirm');
      this.components.peluqueria.renderActiveTab();
    }

    if (entity === 'peluqueria-servicio') {
      const deleted = data.peluqueriaServicios.find(item => item.id === id);
      await this.store.delete('peluqueriaServicios', id);
      data.peluqueriaServicios = data.peluqueriaServicios.filter(item => item.id !== id);
      await this.audit('Eliminación', 'Peluquería - servicios', deleted ? deleted.nombre : 'Servicio eliminado');
      this.modals.close('confirm');
      this.components.peluqueria.renderActiveTab();
    }

    if (entity === 'peluqueria-turno') {
      const deleted = data.peluqueriaTurnos.find(item => item.id === id);
      await this.store.delete('peluqueriaTurnos', id);
      data.peluqueriaTurnos = data.peluqueriaTurnos.filter(item => item.id !== id);
      await this.audit('Eliminación', 'Peluquería - turnos', deleted ? `${deleted.cliente} - ${deleted.fecha} ${deleted.hora}` : 'Turno eliminado');
      this.modals.close('confirm');
      this.components.peluqueria.renderActiveTab();
    }

    this.toasts.show('Eliminado correctamente');
    this.updateBadge();
  }

  handleRealtimeChange(message = {}) {
    if (message.store) this.pendingRealtimeStores.add(message.store);
    this.pendingRealtimeMessages.push(message);
    clearTimeout(this.realtimeRefreshTimer);
    this.realtimeRefreshTimer = setTimeout(() => this.applyRealtimeChanges(), 150);
  }

  handleCartStockChange(message = {}) {
    if (Array.isArray(message.affectedProductIds) && !message.affectedProductIds.length) return;
    const activeSection = document.querySelector('.section.active')?.id?.replace('sec-', '');
    if (activeSection === 'mostrador') {
      this.components.mostrador.renderProducts();
      this.components.mostrador.renderCart();
    }
    if (activeSection === 'stock') this.components.stock.renderList();
    if (activeSection === 'productos') this.components.productos.renderList();
    this.updateBadge();
  }

  async applyRealtimeChanges() {
    const changedStores = new Set(this.pendingRealtimeStores);
    const messages = this.pendingRealtimeMessages.splice(0);
    this.pendingRealtimeStores.clear();
    try {
      for (const message of messages) {
        await this.applyRealtimeMessage(message, changedStores);
      }
      this.components.dashboard.data = null;
      if (this.isSectionEnabled('productos')) {
        this.components.productos.refreshTipoSelects();
        this.components.productos.refreshProveedorSelects();
      }

      const activeSection = document.querySelector('.section.active')?.id?.replace('sec-', '');
      await this.renderRealtimeSection(activeSection, changedStores);
      this.updateBadge();
    } catch (error) {
      this.toasts.show(error.message || 'No se pudieron sincronizar los datos', 'error');
    }
  }

  async applyRealtimeMessage(message, changedStores) {
    const { store, action, id } = message;
    if (!store || !id) return;
    if (store === 'ventas') changedStores.add('stock');
    if (store === 'productos') changedStores.add('stock');

    if (action === 'delete') {
      this.applyRealtimeDelete(store, id);
      return;
    }

    const record = await this.store.getById(store, id);
    this.applyRealtimeUpsert(store, record);
  }

  applyRealtimeUpsert(store, record) {
    if (!record?.id) return;
    if (store === 'stock') {
      this.store.data.stock[record.id] = record.qty;
      return;
    }

    const list = this.store.data[store];
    if (!Array.isArray(list)) return;
    const index = list.findIndex(item => item.id === record.id);
    const previous = index >= 0 ? list[index] : null;
    if (index >= 0) list[index] = record;
    else list.push(record);

    if (store === 'ventas' && !previous) {
      for (const item of record.items || []) {
        const currentQty = this.store.data.stock[item.productId] || 0;
        this.store.data.stock[item.productId] = Number((currentQty - Number(item.qty || 0)).toFixed(4));
      }
    }
  }

  applyRealtimeDelete(store, id) {
    if (store === 'stock') {
      delete this.store.data.stock[id];
      return;
    }

    const list = this.store.data[store];
    if (!Array.isArray(list)) return;
    const deleted = list.find(item => item.id === id);
    this.store.data[store] = list.filter(item => item.id !== id);

    if (store === 'productos') delete this.store.data.stock[id];

    if (store === 'ventas' && deleted) {
      for (const item of deleted.items || []) {
        const currentQty = this.store.data.stock[item.productId] || 0;
        this.store.data.stock[item.productId] = Number((currentQty + Number(item.qty || 0)).toFixed(4));
      }
    }
  }

  async renderRealtimeSection(section, changedStores = new Set()) {
    const component = this.components[section];
    if (!component) return;
    if (!this.shouldRealtimeRender(section, changedStores)) return;

    if (section === 'dashboard') {
      component.data = await this.store.getDashboard();
      component.render();
      return;
    }

    if (section === 'mostrador') {
      component.refreshFilters();
      component.refreshPaymentMethods();
      component.renderCajaStatus();
      component.renderProducts();
      component.renderCart();
      return;
    }

    if (section === 'cajas') {
      component.render();
      return;
    }

    if (section === 'ventas') component.refreshPaymentMethodFilter?.();
    if (section === 'peluqueria') {
      component.renderActiveTab();
      return;
    }
    if (component.renderList) component.renderList();
  }

  shouldRealtimeRender(section, changedStores) {
    if (!changedStores.size) return true;
    const dependencies = {
      dashboard: ['proveedores', 'tipos', 'productos', 'stock', 'ventas', 'cajas', 'auditoria'],
      proveedores: ['proveedores', 'productos'],
      tipos: ['tipos', 'productos'],
      productos: ['productos', 'stock', 'tipos', 'proveedores', 'ventas'],
      metodosPago: ['metodosPago'],
      cajas: ['cajas', 'ventas', 'metodosPago'],
      ventas: ['ventas', 'metodosPago'],
      mostrador: ['productos', 'stock', 'tipos', 'proveedores', 'metodosPago', 'cajas', 'ventas'],
      peluqueria: ['peluqueriaTiposPerro', 'peluqueriaServicios', 'peluqueriaTurnos', 'peluqueriaHorarios'],
      stock: ['stock', 'productos', 'tipos', 'proveedores', 'ventas']
    };

    return (dependencies[section] || [section]).some(store => changedStores.has(store));
  }
}

const app = new PetshopApp();
app.init();
