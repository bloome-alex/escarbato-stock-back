import { DataStore } from './data-store.js';
import { ModalManager, NavigationManager, ToastManager } from './ui.js';
import { DashboardComponent } from './components/dashboard.js';
import { ProveedoresComponent } from './components/proveedores.js';
import { TiposComponent } from './components/tipos.js';
import { ProductosComponent } from './components/productos.js';
import { StockComponent } from './components/stock.js';
import { VentasComponent } from './components/ventas.js';

class PetshopApp {
  constructor() {
    this.store = new DataStore(undefined, this);
    this.modals = new ModalManager();
    this.toasts = new ToastManager();
    this.navigation = new NavigationManager(this);
    this.components = {
      dashboard: new DashboardComponent(this),
      proveedores: new ProveedoresComponent(this),
      tipos: new TiposComponent(this),
      productos: new ProductosComponent(this),
      stock: new StockComponent(this),
      ventas: new VentasComponent(this)
    };
  }

  async init() {
    this.renderShell();
    this.bindEvents();
    try {
      await this.store.init();
    } catch (error) {
      this.toasts.show(error.message || 'No se pudo inicializar la aplicación', 'error');
      throw error;
    }
    this.components.productos.refreshTipoSelects();
    this.components.productos.refreshProveedorSelects();
    this.renderSection('dashboard');
    this.updateBadge();
    this.startHealthCron();
  }

  startHealthCron() {
    const baseUrl = this.store.baseUrl;
    if (!baseUrl) return;
    setInterval(async () => {
      try {
        await fetch(`${baseUrl}/api/health`);
      } catch {}
    }, 10 * 60 * 1000);
  }

  renderShell() {
    document.getElementById('sectionsRoot').innerHTML = [
      this.components.dashboard.template(),
      this.components.proveedores.template(),
      this.components.tipos.template(),
      this.components.productos.template(),
      this.components.stock.template(),
      this.components.ventas.template()
    ].join('');

    document.getElementById('modalsRoot').innerHTML = [
      this.components.proveedores.modalTemplate(),
      this.components.tipos.modalTemplate(),
      this.components.productos.modalTemplate(),
      this.components.stock.modalTemplate(),
      this.components.ventas.modalTemplate(),
      this.detailModalTemplate(),
      this.confirmModalTemplate()
    ].join('');

    this.components.proveedores.bind();
    this.components.tipos.bind();
    this.components.productos.bind();
    this.components.stock.bind();
    this.components.ventas.bind();
  }

  confirmModalTemplate() {
    return `<div class="modal-overlay" id="modal-confirm"><div class="modal" style="max-width:380px"><div class="modal-title"><span>⚠️ Confirmar eliminación</span><button class="modal-close" data-close-modal="confirm">✕</button></div><p id="confirm-text" style="color:var(--text-soft);font-size:.92rem;margin-bottom:8px"></p><div class="modal-actions"><button class="btn btn-ghost" data-close-modal="confirm">Cancelar</button><button class="btn btn-danger" id="confirm-btn">Eliminar</button></div></div></div>`;
  }

  detailModalTemplate() {
    return `<div class="modal-overlay" id="modal-detail"><div class="modal modal-wide"><div class="modal-title"><span id="detail-title">Detalle</span><button class="modal-close" data-close-modal="detail">✕</button></div><div id="detail-content"></div><div class="modal-actions"><button class="btn btn-ghost" data-close-modal="detail">Cerrar</button></div></div></div>`;
  }

  bindEvents() {
    this.navigation.bind();
    this.modals.bindOverlayClose();

    document.addEventListener('click', event => {
      const closeButton = event.target.closest('[data-close-modal]');
      if (closeButton) this.modals.close(closeButton.dataset.closeModal);

      const actionButton = event.target.closest('[data-action]');
      if (!actionButton) return;

      const { action, id, entity, name, delta } = actionButton.dataset;
      if (action === 'save-proveedor') this.components.proveedores.save();
      if (action === 'view-proveedor') this.components.proveedores.view(id);
      if (action === 'edit-proveedor') this.components.proveedores.edit(id);
      if (action === 'save-tipo') this.components.tipos.save();
      if (action === 'view-tipo') this.components.tipos.view(id);
      if (action === 'edit-tipo') this.components.tipos.edit(id);
      if (action === 'save-producto') this.components.productos.save();
      if (action === 'view-producto') this.components.productos.view(id);
      if (action === 'edit-producto') this.components.productos.edit(id);
      if (action === 'change-stock') this.components.stock.change(id, Number(delta));
      if (action === 'edit-stock') this.components.stock.edit(id);
      if (action === 'save-stock') this.components.stock.save();
      if (action === 'add-venta-item') this.components.ventas.addItem();
      if (action === 'remove-venta-item') this.components.ventas.removeItem(actionButton.dataset.index);
      if (action === 'view-venta') this.components.ventas.view(id);
      if (action === 'edit-venta') this.components.ventas.edit(id);
      if (action === 'save-venta') this.components.ventas.save();
      if (action === 'delete') this.confirmDelete(entity, id, name);
    });
  }

  renderSection(section) {
    this.components[section].render();
  }

  getLowStockProducts() {
    const data = this.store.data;
    return data.productos.filter(product => {
      const qty = data.stock[product.id] || 0;
      const min = product.minStock || 5;
      return qty <= min;
    });
  }

  updateBadge() {
    const badge = document.getElementById('stockAlertBadge');
    badge.style.display = this.getLowStockProducts().length ? '' : 'none';
  }

  confirmDelete(entity, id, name) {
    document.getElementById('confirm-text').textContent = `¿Eliminar "${name}"? Esta acción no se puede deshacer.`;
    document.getElementById('confirm-btn').onclick = () => this.deleteEntity(entity, id);
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
    await this.store.put('auditoria', record);
    this.store.data.auditoria.push(record);
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

    if (entity === 'venta') {
      const venta = data.ventas.find(item => item.id === id);
      if (venta) {
        for (const item of venta.items) {
          const newQty = Number(((data.stock[item.productId] || 0) + item.qty).toFixed(2));
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
    }

    this.toasts.show('Eliminado correctamente');
    this.updateBadge();
  }
}

const app = new PetshopApp();
app.init();
