import { DataStore } from './data-store.js';
import { ModalManager, NavigationManager, ThemeManager, ToastManager } from './ui.js?v=20260517-1';
import { DashboardComponent } from './components/dashboard.js';
import { ProveedoresComponent } from './components/proveedores.js';
import { TiposComponent } from './components/tipos.js';
import { ProductosComponent } from './components/productos.js';
import { StockComponent } from './components/stock.js';
import { VentasComponent } from './components/ventas.js';
import { MostradorComponent } from './components/mostrador.js?v=20260519-1';
import { MetodosPagoComponent } from './components/metodos-pago.js';
import { CajasComponent } from './components/cajas.js';
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
    this.onWindowScroll = () => this.handleMobileListScroll();
    this.components = {
      dashboard: new DashboardComponent(this),
      proveedores: new ProveedoresComponent(this),
      tipos: new TiposComponent(this),
      productos: new ProductosComponent(this),
      metodosPago: new MetodosPagoComponent(this),
      cajas: new CajasComponent(this),
      stock: new StockComponent(this),
      ventas: new VentasComponent(this),
      mostrador: new MostradorComponent(this)
    };
  }

  async init() {
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
    this.renderSection('dashboard');
    this.preloadPromise = this.preloadMenuData();
    this.startHealthCron();
  }

  async preloadMenuData() {
    try {
      await this.store.loadAll();
      this.components.productos.refreshTipoSelects();
      this.components.productos.refreshProveedorSelects();
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
    document.getElementById('sectionsRoot').innerHTML = [
      this.components.dashboard.template(),
      this.components.proveedores.template(),
      this.components.tipos.template(),
      this.components.productos.template(),
      this.components.metodosPago.template(),
      this.components.cajas.template(),
      this.components.stock.template(),
      this.components.ventas.template(),
      this.components.mostrador.template()
    ].join('');

    document.getElementById('modalsRoot').innerHTML = [
      this.components.proveedores.modalTemplate(),
      this.components.tipos.modalTemplate(),
      this.components.productos.modalTemplate(),
      this.components.metodosPago.modalTemplate(),
      this.components.stock.modalTemplate(),
      this.detailModalTemplate(),
      this.confirmModalTemplate()
    ].join('');

    this.components.proveedores.bind();
    this.components.tipos.bind();
    this.components.productos.bind();
    this.components.metodosPago.bind();
    this.components.cajas.bind();
    this.components.stock.bind();
    this.components.ventas.bind();
    this.components.mostrador.bind();
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

      const { action, id, entity, name, delta } = actionButton.dataset;
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
      if (action === 'change-stock') return this.runButtonAction(actionButton, () => this.components.stock.change(id, Number(delta)), '');
      if (action === 'edit-stock') this.components.stock.edit(id);
      if (action === 'save-stock') return this.runButtonAction(actionButton, () => this.components.stock.save(), 'Guardando');
      if (action === 'view-venta') this.components.ventas.view(id);
      if (action === 'open-caja') return this.runButtonAction(actionButton, () => this.components.cajas.open(), 'Abriendo');
      if (action === 'close-caja') return this.runButtonAction(actionButton, () => this.components.cajas.close(id), 'Cerrando');
      if (action === 'view-caja') this.components.cajas.view(id);
      if (action === 'open-counter-cart') this.components.mostrador.openCart();
      if (action === 'close-counter-cart') this.components.mostrador.closeCart();
      if (action === 'add-counter-item') this.components.mostrador.addItem(id);
      if (action === 'remove-counter-item') this.components.mostrador.removeItem(id);
      if (action === 'finish-counter-sale') return this.runButtonAction(actionButton, () => this.components.mostrador.finishSale(), 'Guardando');
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

  getLowStockProducts() {
    const data = this.store.data;
    return data.productos.filter(product => {
      const qty = data.stock[product.id] || 0;
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
      this.components.proveedores.render();
      this.components.productos.refreshProveedorSelects();
    }

    if (entity === 'tipo') {
      const deleted = data.tipos.find(item => item.id === id);
      await this.store.delete('tipos', id);
      data.tipos = data.tipos.filter(item => item.id !== id);
      await this.audit('Eliminación', 'Tipos de producto', deleted ? deleted.nombre : 'Tipo eliminado');
      this.modals.close('confirm');
      this.components.tipos.render();
      this.components.productos.refreshTipoSelects();
    }

    if (entity === 'prod') {
      const deleted = data.productos.find(item => item.id === id);
      await this.store.delete('productos', id);
      await this.store.delete('stock', id);
      data.productos = data.productos.filter(item => item.id !== id);
      delete data.stock[id];
      await this.audit('Eliminación', 'Productos', deleted ? deleted.nombre : 'Producto eliminado');
      this.modals.close('confirm');
      this.components.productos.render();
    }

    if (entity === 'metodo-pago') {
      const deleted = data.metodosPago.find(item => item.id === id);
      await this.store.delete('metodosPago', id);
      data.metodosPago = data.metodosPago.filter(item => item.id !== id);
      await this.audit('Eliminación', 'Métodos de pago', deleted ? deleted.nombre : 'Método de pago eliminado');
      this.modals.close('confirm');
      this.components.metodosPago.render();
    }

    if (entity === 'venta') {
      const venta = data.ventas.find(item => item.id === id);
      if (venta) {
        for (const item of venta.items) {
          const newQty = Number(((data.stock[item.productId] || 0) + item.qty).toFixed(4));
          data.stock[item.productId] = newQty;
          await this.store.put('stock', { id: item.productId, qty: newQty });
        }
      }

      await this.store.delete('ventas', id);
      data.ventas = data.ventas.filter(item => item.id !== id);
      await this.audit('Eliminación', 'Ventas', venta ? `${venta.cliente || 'Cliente mostrador'} - ${new Date(venta.createdAt).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}` : 'Venta eliminada');
      this.modals.close('confirm');
      this.components.ventas.render();
      this.components.stock.render();
      this.components.cajas.render();
    }

    this.toasts.show('Eliminado correctamente');
    this.updateBadge();
  }
}

const app = new PetshopApp();
app.init();
