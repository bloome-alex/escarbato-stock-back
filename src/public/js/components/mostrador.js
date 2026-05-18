import { form } from '../ui.js';
import { compareByName } from '../sort.js';

const DEFAULT_CLIENT = 'mostrador';
const PRODUCT_PAGE_SIZE = 24;
const formatPercent = value => `${Number(value || 0).toLocaleString('es-AR', { maximumFractionDigits: 2 })}%`;

export class MostradorComponent {
  constructor(app) {
    this.app = app;
    this.cart = [];
    this.visibleCount = PRODUCT_PAGE_SIZE;
    this.filteredTotal = 0;
    this.filterKey = '';
    this.onWindowScroll = () => this.handleScroll();
  }

  template() {
    return `<section class="section" id="sec-mostrador">
      <div class="section-header"><div class="section-heading">🛒 <span>Mostrador</span></div></div>
      <div id="counter-caja-status"></div>
      <div class="counter-shell">
        <div class="counter-client form-group"><label>Cliente</label><input type="text" id="mostrador-cliente" value="${DEFAULT_CLIENT}" autocomplete="off"></div>
        <div class="toolbar"><div class="search-box"><span class="search-icon">🔍</span><input type="text" placeholder="Buscar producto…" id="searchMostrador"></div><select id="filterMostradorTipo" class="filter-control"><option value="">Todos los tipos</option></select><select id="filterMostradorProveedor" class="filter-control"><option value="">Todos los proveedores</option></select><select id="filterMostradorStock" class="filter-control"><option value="">Todos</option><option value="disponible">Disponible</option><option value="sin-stock">Sin stock</option></select></div>
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
        <div class="cart-drawer-footer"><div class="form-group"><label>Método de pago *</label><select id="counter-payment-method" class="filter-control"><option value="">Seleccionar método</option></select></div><div id="counter-payment-summary"></div><div class="cart-total"><span>Total final</span><strong id="counter-cart-total">$0</strong></div><button class="btn btn-primary" data-action="finish-counter-sale">Finalizar compra</button></div>
      </aside>
    </section>`;
  }

  bind() {
    document.getElementById('searchMostrador').addEventListener('input', () => this.resetProducts());
    document.getElementById('filterMostradorTipo').addEventListener('change', () => this.resetProducts());
    document.getElementById('filterMostradorProveedor').addEventListener('change', () => this.resetProducts());
    document.getElementById('filterMostradorStock').addEventListener('change', () => this.resetProducts());
    document.getElementById('counter-payment-method').addEventListener('change', () => this.renderCart());
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

  getProductPrice(producto) {
    return producto.precioFinal ?? producto.precio ?? 0;
  }

  getCartQty(productId) {
    const item = this.cart.find(cartItem => cartItem.productId === productId);
    return item ? item.qty : 0;
  }

  getAvailableStock(productId) {
    const stock = this.app.store.data.stock || {};
    this.app.store.data.stock = stock;
    return Number(((stock[productId] || 0) - this.getCartQty(productId)).toFixed(2));
  }

  getTotal() {
    return Number(this.cart.reduce((sum, item) => sum + item.qty * item.price, 0).toFixed(2));
  }

  getSelectedPaymentMethod() {
    const id = form.value('counter-payment-method');
    if (!id) return null;
    return (this.app.store.data.metodosPago || []).find(method => method.id === id) || null;
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
    const select = document.getElementById('counter-payment-method');
    if (!select) return;
    const selected = select.value;
    const options = [...(this.app.store.data.metodosPago || [])]
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }))
      .map(method => `<option value="${method.id}">${method.nombre}</option>`)
      .join('');
    select.innerHTML = '<option value="">Seleccionar método</option>' + options;
    if (selected && (this.app.store.data.metodosPago || []).some(method => method.id === selected)) select.value = selected;
  }

  refreshFilters() {
    const data = this.app.store.data;
    const tipoFilter = document.getElementById('filterMostradorTipo');
    const proveedorFilter = document.getElementById('filterMostradorProveedor');
    if (!tipoFilter || !proveedorFilter) return;

    const selectedTipo = tipoFilter.value;
    const selectedProveedor = proveedorFilter.value;
    const tipos = [...(data.tipos || [])].sort(compareByName).map(tipo => `<option value="${tipo.id}">${tipo.nombre}</option>`).join('');
    const proveedores = [...(data.proveedores || [])].sort(compareByName).map(proveedor => `<option value="${proveedor.id}">${proveedor.nombre}</option>`).join('');

    tipoFilter.innerHTML = '<option value="">Todos los tipos</option>' + tipos;
    proveedorFilter.innerHTML = '<option value="">Todos los proveedores</option><option value="sin-proveedor">Sin proveedor</option>' + proveedores;
    if (selectedTipo) tipoFilter.value = selectedTipo;
    if (selectedProveedor) proveedorFilter.value = selectedProveedor;
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
      const stock = stockData[producto.id] || 0;
      const available = this.getAvailableStock(producto.id);
      const disabled = available <= 0 ? 'disabled' : '';
      return `<article class="counter-product-card"><div class="counter-product-main"><strong>${producto.nombre}</strong><div>${tipo ? tipo.nombre : 'Sin tipo'} · ${proveedor ? proveedor.nombre : 'Sin proveedor'}</div><span class="price-value">${this.formatMoney(this.getProductPrice(producto))}</span></div><div class="counter-stock"><span>Stock</span><strong>${stock} u.</strong></div><div class="counter-add"><input type="number" min="0.01" step="0.01" max="${available}" placeholder="Cant." data-counter-qty="${producto.id}" ${disabled}><button class="btn btn-amber btn-sm counter-add-btn" data-action="add-counter-item" data-id="${producto.id}" ${disabled}>Agregar</button></div></article>`;
    }).join('');
    if (loadMore) loadMore.style.display = this.visibleCount < list.length ? '' : 'none';
  }

  addItem(id) {
    const producto = (this.app.store.data.productos || []).find(item => item.id === id);
    const input = document.querySelector(`[data-counter-qty="${id}"]`);
    const qty = input?.value === '' ? 1 : Number(input?.value);
    if (!producto) return this.app.toasts.show('No se encontró el producto', 'error');
    if (!qty || qty <= 0) return this.app.toasts.show('Ingresá una cantidad válida', 'error');
    if (qty > this.getAvailableStock(id)) return this.app.toasts.show(`Stock insuficiente. Disponible: ${this.getAvailableStock(id)} u.`, 'error');

    const cartItem = this.cart.find(item => item.productId === id);
    if (cartItem) cartItem.qty = Number((cartItem.qty + qty).toFixed(2));
    else this.cart.push({ productId: id, productName: producto.nombre, qty, price: this.getProductPrice(producto) });
    if (input) input.value = '';
    this.renderProducts();
    this.renderCart();
    this.app.toasts.show('Producto agregado al carrito');
  }

  changeItem(id, delta) {
    const item = this.cart.find(cartItem => cartItem.productId === id);
    if (!item) return;
    const nextQty = Number((item.qty + delta).toFixed(2));
    if (nextQty <= 0) return this.removeItem(id);
    const stock = this.app.store.data.stock || {};
    const available = (stock[id] || 0) - item.qty;
    if (delta > 0 && delta > available) return this.app.toasts.show(`Stock insuficiente. Disponible: ${Number(available.toFixed(2))} u.`, 'error');
    item.qty = nextQty;
    this.renderProducts();
    this.renderCart();
  }

  removeItem(id) {
    this.cart = this.cart.filter(item => item.productId !== id);
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
    list.innerHTML = this.cart.map(item => `<div class="cart-line"><div><strong>${item.productName}</strong><span>${this.formatMoney(item.price)} c/u</span></div><div class="cart-line-actions"><button class="stock-btn minus" data-action="decrease-counter-item" data-id="${item.productId}">−</button><strong>${item.qty}</strong><button class="stock-btn plus" data-action="increase-counter-item" data-id="${item.productId}">+</button><button class="btn btn-danger btn-icon btn-sm" data-action="remove-counter-item" data-id="${item.productId}" aria-label="Eliminar producto">🗑️</button></div></div>`).join('');
  }

  paymentSummaryTemplate(method, totals) {
    if (!method) return '<div class="detail-list"><div><span>Método de pago</span><strong>Seleccioná uno para continuar</strong></div></div>';

    const adjustments = [];
    if (totals.descuento > 0) adjustments.push(`<div><span>Descuento ${formatPercent(totals.descuento)}</span><strong>-${this.formatMoney(totals.discountAmount)}</strong></div>`);
    if (totals.recargo > 0) adjustments.push(`<div><span>Recargo ${formatPercent(totals.recargo)}</span><strong>+${this.formatMoney(totals.surchargeAmount)}</strong></div>`);
    return `<div class="detail-list"><div><span>Método de pago</span><strong>${method.nombre}</strong></div><div><span>Total calculado</span><strong>${this.formatMoney(totals.subtotal)}</strong></div>${adjustments.join('') || '<div><span>Ajustes</span><strong>Sin descuento ni recargo</strong></div>'}</div>`;
  }

  openCart() {
    document.getElementById('counter-cart-drawer').classList.add('open');
    document.getElementById('counter-drawer-backdrop').classList.add('open');
  }

  closeCart() {
    document.getElementById('counter-cart-drawer').classList.remove('open');
    document.getElementById('counter-drawer-backdrop').classList.remove('open');
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
      items: this.cart.map(item => ({ ...item, subtotal: Number((item.qty * item.price).toFixed(2)) })),
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

    for (const item of venta.items) {
      const newQty = Number(((stock[item.productId] || 0) - item.qty).toFixed(2));
      this.app.store.data.stock[item.productId] = newQty;
      await this.app.store.put('stock', { id: item.productId, qty: newQty });
    }

    const savedVenta = await this.app.store.put('ventas', venta);
    this.app.store.data.ventas = this.app.store.data.ventas || [];
    this.app.store.data.ventas.push(savedVenta || venta);
    await this.app.audit('Creación', 'Ventas', `${(savedVenta || venta).cliente || 'Cliente mostrador'} - ${this.formatMoney((savedVenta || venta).finalTotal)}`);

    this.cart = [];
    form.set('mostrador-cliente', DEFAULT_CLIENT);
    form.set('counter-payment-method');
    this.closeCart();
    this.render();
    this.app.components.ventas.render();
    this.app.components.stock.render();
    this.app.components.cajas.render();
    this.app.updateBadge();
    this.app.toasts.show('Venta guardada ✅');
  }
}
