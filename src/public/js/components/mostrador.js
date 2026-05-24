import { escapeHtml, form, searchableSelect } from '../ui.js';
import { compareByName } from '../sort.js';

const DEFAULT_CLIENT = 'mostrador';
const PRODUCT_PAGE_SIZE = 24;
const STOCK_DECIMALS = 4;
const PREFERENCES_STORAGE_KEY = 'mostrador-preferences';
const formatPercent = value => `${Number(value || 0).toLocaleString('es-AR', { maximumFractionDigits: 2 })}%`;

export class MostradorComponent {
  constructor(app) {
    this.app = app;
    this.cart = [];
    this.visibleCount = PRODUCT_PAGE_SIZE;
    this.filteredTotal = 0;
    this.filterKey = '';
    this.preferences = this.loadPreferences();
    this.viewMode = this.preferences.viewMode;
    this.onWindowScroll = () => this.handleScroll();
  }

  template() {
    const measureMode = this.preferences.measureMode;
    const stockViewMode = this.preferences.stockViewMode;
    const isGridView = this.viewMode === 'grid';
    return `<section class="section" id="sec-mostrador">
      <div id="counter-caja-status"></div>
      <div class="counter-shell">
        <div class="counter-header-row"><div class="counter-client form-group"><label>Cliente</label><input type="text" id="mostrador-cliente" value="${DEFAULT_CLIENT}" autocomplete="off"></div><div class="counter-measure form-group"><label>Unidad de medición</label>${searchableSelect.template({ id: 'counter-measure-mode', placeholder: 'Unidad', value: measureMode, options: [{ value: 'qty', label: 'Unidad' }, { value: 'amount', label: 'Pesos' }] })}</div><div class="counter-stock-view form-group"><label>Visualizar stock</label>${searchableSelect.template({ id: 'counter-stock-view-mode', placeholder: 'Unidades', value: stockViewMode, options: [{ value: 'qty', label: 'Unidades' }, { value: 'amount', label: 'Pesos' }] })}</div><div class="counter-view-toggle form-group" aria-label="Modo de vista"><label>Vista</label><div class="counter-view-switch" role="group"><button type="button" class="counter-view-btn ${isGridView ? 'active' : ''}" data-counter-view="grid" aria-label="Vista en cuadricula" aria-pressed="${String(isGridView)}"><span class="counter-view-icon counter-view-icon-grid" aria-hidden="true"></span></button><button type="button" class="counter-view-btn ${!isGridView ? 'active' : ''}" data-counter-view="list" aria-label="Vista en listado" aria-pressed="${String(!isGridView)}"><span class="counter-view-icon counter-view-icon-list" aria-hidden="true"></span></button></div></div></div>
        <div class="toolbar"><div class="search-box"><span class="search-icon">🔍</span><input type="text" placeholder="Buscar producto…" id="searchMostrador"></div>${searchableSelect.template({ id: 'filterMostradorTipo', placeholder: 'Todos los tipos', options: [] })}${searchableSelect.template({ id: 'filterMostradorProveedor', placeholder: 'Todos los proveedores', options: [] })}${searchableSelect.template({ id: 'filterMostradorStock', placeholder: 'Todos', value: '', options: [{ value: 'disponible', label: 'Disponible' }, { value: 'sin-stock', label: 'Sin stock' }] })}</div>
        <div class="counter-products" id="mostrador-products"></div>
        <div class="counter-load-more" id="mostrador-load-more" style="display:none"><span class="loading-spinner" aria-hidden="true"></span><span>Cargando más productos...</span></div>
        <div id="empty-mostrador" class="empty-state" style="display:none"><div class="empty-icon">🛒</div><p>No hay productos para mostrar</p></div>
      </div>
      <button class="cart-float" data-action="open-counter-cart" aria-label="Abrir carrito"><span>🛒</span><strong id="counter-cart-count">0</strong></button>
      <div class="drawer-backdrop" id="counter-drawer-backdrop" data-action="close-counter-cart"></div>
      <aside class="cart-drawer" id="counter-cart-drawer" aria-label="Carrito de mostrador">
        <div class="cart-drawer-header"><div><span>Carrito</span><strong>Nueva venta</strong></div><button class="modal-close" data-action="close-counter-cart" aria-label="Cerrar carrito">✕</button></div>
        <div class="cart-drawer-list" id="counter-cart-list"></div>
        <div class="empty-state sale-empty" id="empty-counter-cart"><p>Agregá productos al carrito</p></div>
        <div class="cart-drawer-footer"><div class="form-group"><label>Método de pago *</label>${searchableSelect.template({ id: 'counter-payment-method', placeholder: 'Seleccionar método', options: [] })}</div><div id="counter-payment-summary"></div><div class="cart-total"><span>Total final</span><strong id="counter-cart-total">$0</strong></div><button class="btn btn-primary" data-action="finish-counter-sale">Finalizar compra</button></div>
      </aside>
    </section>`;
  }

  bind() {
    document.getElementById('searchMostrador').addEventListener('input', () => this.resetProducts());
    document.getElementById('filterMostradorTipo').addEventListener('change', () => this.resetProducts());
    document.getElementById('filterMostradorProveedor').addEventListener('change', () => this.resetProducts());
    document.getElementById('filterMostradorStock').addEventListener('change', () => this.resetProducts());
    document.getElementById('counter-measure-mode').addEventListener('change', event => {
      this.preferences.measureMode = event.target.value === 'amount' ? 'amount' : 'qty';
      this.savePreferences();
      this.renderProducts();
      this.renderCart();
    });
    document.getElementById('counter-stock-view-mode').addEventListener('change', event => {
      this.preferences.stockViewMode = event.target.value === 'amount' ? 'amount' : 'qty';
      this.savePreferences();
      this.renderProducts();
      this.renderCart();
    });
    document.querySelectorAll('[data-counter-view]').forEach(button => {
      button.addEventListener('click', () => this.setViewMode(button.dataset.counterView));
    });
    document.getElementById('counter-payment-method').addEventListener('change', () => this.renderCart());
    document.getElementById('mostrador-products').addEventListener('input', event => {
      if (event.target.matches('[data-counter-value]')) {
        this.updateAddButton(event.target);
      }
    });
    document.getElementById('mostrador-products').addEventListener('change', event => {
      if (event.target.matches('[data-counter-value]')) {
        this.updateAddButton(event.target);
      }
    });
    document.getElementById('counter-cart-list').addEventListener('input', event => {
      if (event.target.matches('[data-cart-value]')) this.updateCartInputState(event.target);
    });
    document.getElementById('counter-cart-list').addEventListener('change', event => {
      if (event.target.matches('[data-cart-value]')) {
        this.setItemValue(event.target.dataset.cartValue, event.target.value);
      }
    });
    document.getElementById('counter-cart-list').addEventListener('keydown', event => {
      if (event.key === 'Enter' && event.target.matches('[data-cart-value]')) {
        event.preventDefault();
        event.target.blur();
      }
    });
    window.addEventListener('scroll', this.onWindowScroll, { passive: true });

    const cliente = document.getElementById('mostrador-cliente');
    cliente.addEventListener('focus', () => {
      if (cliente.value.trim().toLowerCase() === DEFAULT_CLIENT) cliente.value = '';
    });
    cliente.addEventListener('blur', () => {
      if (!cliente.value.trim()) cliente.value = DEFAULT_CLIENT;
    });
  }

  formatMoney(value) {
    return value || value === 0 ? '$' + Number(value).toLocaleString('es-AR') : '—';
  }

  loadPreferences() {
    const defaults = { measureMode: 'qty', stockViewMode: 'qty', viewMode: 'grid' };
    try {
      const saved = JSON.parse(localStorage.getItem(PREFERENCES_STORAGE_KEY) || '{}');
      return {
        measureMode: saved.measureMode === 'amount' ? 'amount' : defaults.measureMode,
        stockViewMode: saved.stockViewMode === 'amount' ? 'amount' : defaults.stockViewMode,
        viewMode: saved.viewMode === 'list' ? 'list' : defaults.viewMode
      };
    } catch {
      return defaults;
    }
  }

  savePreferences() {
    try {
      localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(this.preferences));
    } catch {}
  }

  getProductPrice(producto) {
    return producto.precioFinal ?? producto.precio ?? 0;
  }

  roundQty(value) {
    return Number(Number(value).toFixed(STOCK_DECIMALS));
  }

  formatQty(value) {
    return Number(value || 0).toLocaleString('es-AR', { maximumFractionDigits: STOCK_DECIMALS });
  }

  getCartQty(productId) {
    const item = this.cart.find(cartItem => cartItem.productId === productId);
    return item ? item.qty : 0;
  }

  getAvailableStock(productId) {
    const stock = this.app.store.data.stock || {};
    const reservedStock = this.app.store.data.reservedStock || {};
    this.app.store.data.stock = stock;
    this.app.store.data.reservedStock = reservedStock;
    return this.roundQty((stock[productId] || 0) - (reservedStock[productId] || 0) - this.getCartQty(productId));
  }

  getProductStock(productId) {
    const stock = this.app.store.data.stock || {};
    const reservedStock = this.app.store.data.reservedStock || {};
    this.app.store.data.stock = stock;
    this.app.store.data.reservedStock = reservedStock;
    return this.roundQty((stock[productId] || 0) - (reservedStock[productId] || 0));
  }

  notifyCartReservations() {
    this.app.store.sendRealtime?.({
      type: 'cart:set',
      items: this.cart.map(item => ({ productId: item.productId, qty: item.qty }))
    });
  }

  clearCartReservations() {
    this.app.store.sendRealtime?.({ type: 'cart:clear' });
  }

  getTotal() {
    return Number(this.cart.reduce((sum, item) => sum + (item.subtotal ?? item.qty * item.price), 0).toFixed(2));
  }

  getSelectedPaymentMethod() {
    const id = form.value('counter-payment-method');
    if (!id) return null;
    return (this.app.store.data.metodosPago || []).find(method => method.id === id) || null;
  }

  getMeasureMode() {
    return document.getElementById('counter-measure-mode')?.value === 'amount' ? 'amount' : 'qty';
  }

  getStockViewMode() {
    return document.getElementById('counter-stock-view-mode')?.value === 'amount' ? 'amount' : 'qty';
  }

  setViewMode(mode) {
    this.viewMode = mode === 'list' ? 'list' : 'grid';
    this.preferences.viewMode = this.viewMode;
    this.savePreferences();
    document.querySelectorAll('[data-counter-view]').forEach(button => {
      const active = button.dataset.counterView === this.viewMode;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    this.renderProducts();
  }

  formatStockValue(producto, qty) {
    if (this.getStockViewMode() === 'amount') return this.formatMoney(Number((qty * this.getProductPrice(producto)).toFixed(2)));
    return `${this.formatQty(qty)} u.`;
  }

  updateAddButton(input) {
    const button = document.querySelector(`[data-action="add-counter-item"][data-id="${input.dataset.counterValue}"]`);
    if (!button) return;

    const value = Number(input.value);
    button.disabled = !input.value || !value || value <= 0;
  }

  updateCartInputState(input) {
    const value = Number(input.value);
    input.setAttribute('aria-invalid', String(!input.value || !value || value <= 0));
  }

  getOpenCaja() {
    return this.app.components.cajas?.getOpenCaja() || null;
  }

  getPaymentTotals(method = this.getSelectedPaymentMethod()) {
    const subtotal = this.getTotal();
    const descuento = Number(method?.descuento || 0);
    const recargo = Number(method?.recargo ?? method?.bonificacion ?? 0);
    const discountAmount = Number((subtotal * descuento / 100).toFixed(2));
    const surchargeAmount = Number((subtotal * recargo / 100).toFixed(2));
    const finalTotal = Number(Math.max(0, subtotal - discountAmount + surchargeAmount).toFixed(2));
    return { subtotal, descuento, recargo, discountAmount, surchargeAmount, finalTotal };
  }

  refreshPaymentMethods() {
    const methods = [...(this.app.store.data.metodosPago || [])].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));
    searchableSelect.refresh('counter-payment-method', methods.map(method => ({ value: method.id, label: method.nombre })), 'Seleccionar método');
  }

  refreshFilters() {
    const data = this.app.store.data;
    const tipos = [...(data.tipos || [])].sort(compareByName).map(tipo => ({ value: tipo.id, label: tipo.nombre }));
    const proveedores = [...(data.proveedores || [])].sort(compareByName).map(proveedor => ({ value: proveedor.id, label: proveedor.nombre }));
    searchableSelect.refresh('filterMostradorTipo', tipos, 'Todos los tipos');
    searchableSelect.refresh('filterMostradorProveedor', [{ value: 'sin-proveedor', label: 'Sin proveedor' }, ...proveedores], 'Todos los proveedores');
  }

  render() {
    this.refreshFilters();
    this.refreshPaymentMethods();
    this.renderCajaStatus();
    this.renderProducts();
    this.renderCart();
  }

  renderCajaStatus() {
    const container = document.getElementById('counter-caja-status');
    if (!container) return;
    const openCaja = this.getOpenCaja();
    container.innerHTML = openCaja
      ? `<div class="detail-list" style="margin-bottom:14px"><div><span>Caja</span><strong>Abierta desde ${new Date(openCaja.openedAt).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}</strong></div></div>`
      : `<div class="detail-list" style="margin-bottom:14px"><div><span>Caja</span><strong>No hay caja abierta. No se pueden realizar ventas.</strong></div></div>`;
  }

  resetProducts() {
    this.visibleCount = PRODUCT_PAGE_SIZE;
    this.renderProducts();
  }

  resetFilters() {
    form.clear(['searchMostrador', 'filterMostradorTipo', 'filterMostradorProveedor', 'filterMostradorStock']);
    this.visibleCount = PRODUCT_PAGE_SIZE;
    this.filteredTotal = 0;
    this.filterKey = '';
  }

  getCurrentFilterKey() {
    return [
      form.value('searchMostrador') || '',
      form.value('filterMostradorTipo') || '',
      form.value('filterMostradorProveedor') || '',
      form.value('filterMostradorStock') || ''
    ].join('|');
  }

  handleScroll() {
    if (!document.getElementById('sec-mostrador')?.classList.contains('active')) return;
    if (this.visibleCount >= this.filteredTotal) return;
    const nearBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 520;
    if (!nearBottom) return;

    this.visibleCount += PRODUCT_PAGE_SIZE;
    this.renderProducts();
  }

  renderProducts() {
    const data = this.app.store.data;
    const productos = data.productos || [];
    const stockData = data.stock || {};
    const tipos = data.tipos || [];
    const proveedores = data.proveedores || [];
    const q = (form.value('searchMostrador') || '').toLowerCase();
    const tipoId = form.value('filterMostradorTipo');
    const proveedorId = form.value('filterMostradorProveedor');
    const stockFilter = form.value('filterMostradorStock');
    const measureMode = this.getMeasureMode();
    const valuePlaceholder = measureMode === 'amount' ? 'Importe $' : 'Cantidad';
    const nextFilterKey = this.getCurrentFilterKey();
    if (nextFilterKey !== this.filterKey) {
      this.filterKey = nextFilterKey;
      this.visibleCount = PRODUCT_PAGE_SIZE;
    }

    const list = productos.filter(producto => {
      const nombre = producto.nombre || '';
      const qty = stockData[producto.id] || 0;
      const matchesProveedor = !proveedorId
        || (proveedorId === 'sin-proveedor' && !producto.proveedorId)
        || producto.proveedorId === proveedorId;
      const matchesStock = !stockFilter
        || (stockFilter === 'disponible' && qty > 0)
        || (stockFilter === 'sin-stock' && qty <= 0);
      return nombre.toLowerCase().includes(q) && (!tipoId || producto.tipoId === tipoId) && matchesProveedor && matchesStock;
    }).sort(compareByName);

    const container = document.getElementById('mostrador-products');
    const empty = document.getElementById('empty-mostrador');
    const loadMore = document.getElementById('mostrador-load-more');
    container.classList.toggle('counter-products-list', this.viewMode === 'list');
    this.filteredTotal = list.length;
    if (!list.length) {
      container.innerHTML = '';
      empty.style.display = '';
      if (loadMore) loadMore.style.display = 'none';
      return;
    }

    empty.style.display = 'none';
    const visibleItems = list.slice(0, this.visibleCount);
    container.innerHTML = visibleItems.map(producto => {
      const tipo = tipos.find(item => item.id === producto.tipoId);
      const proveedor = proveedores.find(item => item.id === producto.proveedorId);
      const available = this.getAvailableStock(producto.id);
      const inputDisabled = available <= 0 ? 'disabled' : '';
      return `<article class="counter-product-card"><div class="counter-product-main"><strong>${escapeHtml(producto.nombre)}</strong><div>${tipo ? escapeHtml(tipo.nombre) : 'Sin tipo'} · ${proveedor ? escapeHtml(proveedor.nombre) : 'Sin proveedor'}</div><span class="price-value">${this.formatMoney(this.getProductPrice(producto))}</span></div><div class="counter-stock"><span>Stock</span><strong>${this.formatStockValue(producto, available)}</strong></div><div class="counter-add"><input type="number" min="0" step="1" placeholder="${escapeHtml(valuePlaceholder)}" data-counter-value="${escapeHtml(producto.id)}" ${inputDisabled}><button class="btn btn-amber btn-sm counter-add-btn" data-action="add-counter-item" data-id="${escapeHtml(producto.id)}" disabled>Agregar</button></div></article>`;
    }).join('');
    if (loadMore) loadMore.style.display = this.visibleCount < list.length ? '' : 'none';
  }

  addItem(id) {
    const producto = (this.app.store.data.productos || []).find(item => item.id === id);
    const valueInput = document.querySelector(`[data-counter-value="${id}"]`);
    const mode = this.getMeasureMode();
    const hasValue = !!valueInput && valueInput.value !== '';
    if (!producto) return this.app.toasts.show('No se encontró el producto', 'error');
    const price = this.getProductPrice(producto);
    const value = hasValue ? Number(valueInput.value) : 1;
    if (!value || value <= 0) return this.app.toasts.show(mode === 'amount' ? 'Ingresá un importe válido' : 'Ingresá una cantidad válida', 'error');
    if (mode === 'amount' && (!price || price <= 0)) return this.app.toasts.show('El producto no tiene precio para convertir el importe', 'error');
    const qty = mode === 'amount' ? this.roundQty(value / price) : value;
    const subtotal = mode === 'amount' ? Number(value.toFixed(2)) : Number((qty * price).toFixed(2));
    if (!qty || qty <= 0) return this.app.toasts.show('Ingresá una cantidad válida', 'error');
    if (qty > this.getAvailableStock(id)) return this.app.toasts.show(`Stock insuficiente. Disponible: ${this.formatQty(this.getAvailableStock(id))} u.`, 'error');

    const cartItem = this.cart.find(item => item.productId === id);
    if (cartItem) {
      const currentSubtotal = cartItem.subtotal ?? Number((cartItem.qty * cartItem.price).toFixed(2));
      cartItem.qty = this.roundQty(cartItem.qty + qty);
      cartItem.subtotal = Number((currentSubtotal + subtotal).toFixed(2));
    } else {
      this.cart.push({ productId: id, productName: producto.nombre, qty, price, subtotal });
    }
    if (valueInput) valueInput.value = '';
    this.notifyCartReservations();
    this.renderProducts();
    this.renderCart();
    this.app.toasts.show('Producto agregado al carrito');
  }

  setItemValue(id, rawValue) {
    const item = this.cart.find(cartItem => cartItem.productId === id);
    if (!item) return;
    const value = Number(rawValue);
    const mode = this.getMeasureMode();
    if (!value || value <= 0) {
      this.renderCart();
      return this.app.toasts.show(mode === 'amount' ? 'Ingresá un importe válido' : 'Ingresá una cantidad válida', 'error');
    }
    if (mode === 'amount' && (!item.price || item.price <= 0)) {
      this.renderCart();
      return this.app.toasts.show('El producto no tiene precio para convertir el importe', 'error');
    }

    const qty = mode === 'amount' ? this.roundQty(value / item.price) : this.roundQty(value);
    const stock = this.getProductStock(id);
    if (!qty || qty <= 0) {
      this.renderCart();
      return this.app.toasts.show('Ingresá una cantidad válida', 'error');
    }
    if (qty > stock) {
      this.renderCart();
      return this.app.toasts.show(`Stock insuficiente. Disponible: ${this.formatQty(stock)} u.`, 'error');
    }

    item.qty = qty;
    item.subtotal = mode === 'amount' ? Number(value.toFixed(2)) : Number((qty * item.price).toFixed(2));
    this.notifyCartReservations();
    this.renderProducts();
    this.renderCart();
  }

  removeItem(id) {
    this.cart = this.cart.filter(item => item.productId !== id);
    this.notifyCartReservations();
    this.renderProducts();
    this.renderCart();
  }

  renderCart() {
    this.refreshPaymentMethods();
    const count = this.cart.reduce((sum, item) => sum + item.qty, 0);
    const method = this.getSelectedPaymentMethod();
    const totals = this.getPaymentTotals(method);
    document.getElementById('counter-cart-count').textContent = count.toLocaleString('es-AR');
    document.getElementById('counter-cart-total').textContent = this.formatMoney(totals.finalTotal);
    document.getElementById('counter-payment-summary').innerHTML = this.paymentSummaryTemplate(method, totals);
    const list = document.getElementById('counter-cart-list');
    const empty = document.getElementById('empty-counter-cart');

    if (!this.cart.length) {
      list.innerHTML = '';
      empty.style.display = '';
      return;
    }

    empty.style.display = 'none';
    const mode = this.getMeasureMode();
    const inputLabel = mode === 'amount' ? 'Importe $' : 'Cantidad';
    list.innerHTML = this.cart.map(item => {
      const stock = this.getProductStock(item.productId);
      const producto = (this.app.store.data.productos || []).find(product => product.id === item.productId);
      const subtotal = item.subtotal ?? item.qty * item.price;
      const inputValue = mode === 'amount' ? Number(subtotal).toFixed(2) : item.qty;
      return `<div class="cart-line"><div class="cart-line-header"><div><strong>${escapeHtml(item.productName)}</strong><span>${this.formatMoney(item.price)} c/u · Subtotal ${this.formatMoney(subtotal)}</span></div><button class="btn btn-danger btn-icon btn-sm" data-action="remove-counter-item" data-id="${escapeHtml(item.productId)}" aria-label="Eliminar producto" title="Eliminar">🗑️</button></div><div class="cart-line-meta"><div><span>Stock</span><strong>${this.formatStockValue(producto || { precioFinal: item.price }, stock)}</strong></div><div><span>En carrito</span><strong>${this.formatQty(item.qty)} u.</strong></div></div><label class="cart-line-input"><span>${escapeHtml(inputLabel)}</span><input type="number" min="0" step="1" value="${inputValue}" data-cart-value="${escapeHtml(item.productId)}" aria-label="${escapeHtml(inputLabel)} de ${escapeHtml(item.productName)}"></label></div>`;
    }).join('');
  }

  paymentSummaryTemplate(method, totals) {
    if (!method) return '<div class="detail-list"><div><span>Método de pago</span><strong>Seleccioná uno para continuar</strong></div></div>';

    const adjustments = [];
    if (totals.descuento > 0) adjustments.push(`<div><span>Descuento ${formatPercent(totals.descuento)}</span><strong>-${this.formatMoney(totals.discountAmount)}</strong></div>`);
    if (totals.recargo > 0) adjustments.push(`<div><span>Recargo ${formatPercent(totals.recargo)}</span><strong>+${this.formatMoney(totals.surchargeAmount)}</strong></div>`);
    return `<div class="detail-list"><div><span>Método de pago</span><strong>${escapeHtml(method.nombre)}</strong></div><div><span>Total calculado</span><strong>${this.formatMoney(totals.subtotal)}</strong></div>${adjustments.join('') || '<div><span>Ajustes</span><strong>Sin descuento ni recargo</strong></div>'}</div>`;
  }

  openCart() {
    document.getElementById('counter-cart-drawer').classList.add('open');
    document.getElementById('counter-drawer-backdrop').classList.add('open');
    this.app.navigation.lockBodyScroll();
  }

  closeCart() {
    document.getElementById('counter-cart-drawer').classList.remove('open');
    document.getElementById('counter-drawer-backdrop').classList.remove('open');
    this.app.navigation.unlockBodyScroll();
  }

  getCliente() {
    const cliente = form.trim('mostrador-cliente');
    return cliente.toLowerCase() === DEFAULT_CLIENT ? '' : cliente;
  }

  async finishSale() {
    const openCaja = this.getOpenCaja();
    if (!openCaja) return this.app.toasts.show('Abrí una caja antes de realizar ventas', 'error');
    if (!this.cart.length) return this.app.toasts.show('Agregá al menos un producto al carrito', 'error');
    const method = this.getSelectedPaymentMethod();
    if (!method) return this.app.toasts.show('Seleccioná un método de pago', 'error');
    const stock = this.app.store.data.stock || {};
    this.app.store.data.stock = stock;
    const stockIssue = this.cart.find(item => item.qty > (stock[item.productId] || 0));
    if (stockIssue) return this.app.toasts.show(`${stockIssue.productName} no tiene stock suficiente`, 'error');

    const totals = this.getPaymentTotals(method);
    const venta = {
      id: this.app.store.createId(),
      cliente: this.getCliente(),
      items: this.cart.map(item => ({ ...item, subtotal: Number((item.subtotal ?? item.qty * item.price).toFixed(2)) })),
      metodoPago: {
        id: method.id,
        nombre: method.nombre,
        descuento: totals.descuento,
        recargo: totals.recargo
      },
      cajaId: openCaja.id,
      calculatedTotal: totals.subtotal,
      finalTotal: totals.finalTotal,
      createdAt: new Date().toISOString()
    };

    const savedVenta = await this.app.store.put('ventas', venta);
    const currentVenta = savedVenta || venta;
    this.app.store.data.ventas = this.app.store.data.ventas || [];
    const index = this.app.store.data.ventas.findIndex(item => item.id === currentVenta.id);
    if (index >= 0) this.app.store.data.ventas[index] = currentVenta;
    else this.app.store.data.ventas.push(currentVenta);
    await this.app.store.loadAll();
    await this.app.audit('Creación', 'Ventas', `${currentVenta.cliente || 'Cliente mostrador'} - ${this.formatMoney(currentVenta.finalTotal)}`);

    this.cart = [];
    this.clearCartReservations();
    form.set('mostrador-cliente', DEFAULT_CLIENT);
    form.set('counter-payment-method');
    this.closeCart();
    this.render();
    this.app.components.ventas.refreshPaymentMethodFilter();
    this.app.components.ventas.renderList();
    this.app.components.stock.renderList();
    this.app.components.cajas.render();
    this.app.updateBadge();
    this.app.components.ventas.view(currentVenta.id);
    this.app.toasts.show('Venta guardada ✅');
  }
}
