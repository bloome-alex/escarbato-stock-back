import { form } from '../ui.js';
import { DEFAULT_PAGE_SIZE, getPageItems, loadingTemplate, paginationTemplate } from '../pagination.js';

export class VentasComponent {
  constructor(app) {
    this.app = app;
    this.cart = [];
    this.page = 1;
    this.loadingTimer = null;
  }

  formatMoney(value) {
    return value || value === 0 ? '$' + Number(value).toLocaleString('es-AR') : '—';
  }

  formatDate(value) {
    return new Date(value).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });
  }

  getProductPrice(producto) {
    return producto.precioFinal ?? producto.precio ?? 0;
  }

  getStockStatus(producto) {
    const qty = this.app.store.data.stock[producto.id] || 0;
    const min = producto.minStock || 5;
    if (qty <= 0) return { label: 'Sin stock', qty };
    if (qty <= min) return { label: 'Stock bajo', qty };
    return { label: 'Disponible', qty };
  }

  getCartQtyByProduct(productId) {
    return this.cart
      .filter(item => item.productId === productId)
      .reduce((sum, item) => sum + item.qty, 0);
  }

  getAvailableStock(productId) {
    const currentStock = this.app.store.data.stock[productId] || 0;
    const editingId = form.value('venta-id');
    const originalVenta = this.app.store.data.ventas.find(item => item.id === editingId);
    const originalQty = originalVenta
      ? originalVenta.items.filter(item => item.productId === productId).reduce((sum, item) => sum + item.qty, 0)
      : 0;

    return currentStock + originalQty;
  }

  getStockIssue() {
    const requestedByProduct = this.cart.reduce((acc, item) => {
      acc[item.productId] = (acc[item.productId] || 0) + item.qty;
      return acc;
    }, {});

    return Object.entries(requestedByProduct).map(([productId, qty]) => {
      const producto = this.app.store.data.productos.find(item => item.id === productId);
      const stock = this.getAvailableStock(productId);
      return { producto, qty, stock };
    }).find(item => item.qty > item.stock);
  }

  getCalculatedTotal() {
    return Number(this.cart.reduce((sum, item) => sum + item.qty * item.price, 0).toFixed(2));
  }

  template() {
    return `<section class="section" id="sec-ventas">
      <div class="section-header"><div class="section-heading">🧾 <span>Ventas</span></div><button class="btn btn-primary" data-action="new-venta">+ Nueva venta</button></div>
      <div class="toolbar"><div class="search-box"><span class="search-icon">🔍</span><input type="text" placeholder="Buscar venta por cliente o producto…" id="searchVenta"></div><select id="filterVentaCliente" class="filter-control"><option value="">Todos los clientes</option><option value="con-cliente">Con cliente</option><option value="mostrador">Mostrador</option></select><label class="filter-field"><span>Desde</span><input type="date" id="filterVentaDesde" class="filter-control"></label><label class="filter-field"><span>Hasta</span><input type="date" id="filterVentaHasta" class="filter-control"></label><select id="filterVentaTotal" class="filter-control"><option value="">Todos los totales</option><option value="igual">Final igual al calculado</option><option value="diferente">Final modificado</option></select></div>
      <div class="table-wrap" id="wrap-ventas"><table class="data-table"><thead><tr><th>Fecha y hora</th><th>Cliente</th><th>Productos</th><th>Total calculado</th><th>Total final</th><th>Acciones</th></tr></thead><tbody id="tbl-ventas"></tbody></table><div id="empty-ventas" class="empty-state" style="display:none"><div class="empty-icon">🧾</div><p>Aún no hay ventas cargadas</p></div></div><div id="pager-ventas"></div>
    </section>`;
  }

  modalTemplate() {
    return `<div class="modal-overlay" id="modal-venta"><div class="modal modal-wide"><div class="modal-title"><span id="modal-venta-title">Nueva venta</span><button class="modal-close" data-close-modal="venta">✕</button></div><input type="hidden" id="venta-id"><div class="form-group"><label>Cliente</label><input type="text" id="venta-cliente" placeholder="Cliente mostrador, nombre o referencia"></div><div class="sale-product-box"><div class="form-row"><div class="form-group"><label>Producto *</label><select id="venta-producto"><option value="">Seleccionar producto…</option></select></div><div class="form-group"><label>Cantidad *</label><input type="number" id="venta-cantidad" min="0.01" step="0.01" placeholder="1.00"></div></div><div class="form-row"><div class="form-group"><label>Precio unitario *</label><input type="number" id="venta-precio" min="0" step="0.01" placeholder="0.00"></div><div class="form-group sale-add-action"><button class="btn btn-amber" data-action="add-venta-item">+ Cargar producto</button></div></div></div><div class="table-wrap sale-cart-wrap"><table><thead><tr><th>Producto</th><th>Cantidad</th><th>Precio</th><th>Subtotal</th><th></th></tr></thead><tbody id="venta-cart"></tbody></table><div id="empty-venta-cart" class="empty-state sale-empty"><p>Agregá productos al carrito</p></div></div><div class="sale-totals"><div><span>Precio final calculado</span><strong id="venta-total-calculado">$0</strong></div><div class="form-group"><label>Precio final *</label><input type="number" id="venta-total-final" min="0" step="0.01" placeholder="0.00"></div></div><div class="modal-actions"><button class="btn btn-ghost" data-close-modal="venta">Cancelar</button><button class="btn btn-primary" data-action="save-venta">💾 Guardar venta</button></div></div></div>`;
  }

  bind() {
    document.getElementById('searchVenta').addEventListener('input', () => this.resetAndRender());
    document.getElementById('filterVentaCliente').addEventListener('change', () => this.resetAndRender());
    document.getElementById('filterVentaDesde').addEventListener('change', () => this.resetAndRender());
    document.getElementById('filterVentaHasta').addEventListener('change', () => this.resetAndRender());
    document.getElementById('filterVentaTotal').addEventListener('change', () => this.resetAndRender());
    document.querySelector('[data-action="new-venta"]').addEventListener('click', () => this.openNew());
    document.getElementById('venta-producto').addEventListener('change', () => this.updateSelectedProductPrice());
  }

  refreshProductSelect() {
    const select = document.getElementById('venta-producto');
    const selected = select ? select.value : '';
    const opts = this.app.store.data.productos.map(producto => {
      const status = this.getStockStatus(producto);
      return `<option value="${producto.id}">${producto.nombre} - ${status.label} (${status.qty} u.)</option>`;
    }).join('');
    select.innerHTML = '<option value="">Seleccionar producto…</option>' + opts;
    if (selected) select.value = selected;
  }

  render() {
    clearTimeout(this.loadingTimer);
    document.getElementById('wrap-ventas').innerHTML = loadingTemplate('Cargando ventas...');
    document.getElementById('pager-ventas').innerHTML = '';
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
    const q = (form.value('searchVenta') || '').toLowerCase();
    const clienteFilter = form.value('filterVentaCliente');
    const desde = form.value('filterVentaDesde');
    const hasta = form.value('filterVentaHasta');
    const totalFilter = form.value('filterVentaTotal');
    const list = [...this.app.store.data.ventas]
      .filter(venta => {
        const ventaDate = new Date(venta.createdAt);
        const matchesSearch = (venta.cliente || '').toLowerCase().includes(q) || venta.items.some(item => item.productName.toLowerCase().includes(q));
        const matchesCliente = !clienteFilter
          || (clienteFilter === 'con-cliente' && Boolean(venta.cliente))
          || (clienteFilter === 'mostrador' && !venta.cliente);
        const matchesDesde = !desde || ventaDate >= new Date(`${desde}T00:00:00`);
        const matchesHasta = !hasta || ventaDate <= new Date(`${hasta}T23:59:59`);
        const calculatedTotal = Number(venta.calculatedTotal || 0);
        const finalTotal = Number(venta.finalTotal || 0);
        const matchesTotal = !totalFilter
          || (totalFilter === 'igual' && finalTotal === calculatedTotal)
          || (totalFilter === 'diferente' && finalTotal !== calculatedTotal);
        return matchesSearch && matchesCliente && matchesDesde && matchesHasta && matchesTotal;
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    document.getElementById('wrap-ventas').innerHTML = `<table class="data-table"><thead><tr><th>Fecha y hora</th><th>Cliente</th><th>Productos</th><th>Total calculado</th><th>Total final</th><th>Acciones</th></tr></thead><tbody id="tbl-ventas"></tbody></table><div id="empty-ventas" class="empty-state" style="display:none"><div class="empty-icon">🧾</div><p>Aún no hay ventas cargadas</p></div>`;
    const tbody = document.getElementById('tbl-ventas');
    const empty = document.getElementById('empty-ventas');
    const pageState = getPageItems(list, this.page, DEFAULT_PAGE_SIZE);
    this.page = pageState.page;
    const pageItems = pageState.items;

    if (!pageItems.length) {
      tbody.innerHTML = '';
      empty.style.display = '';
      document.getElementById('pager-ventas').innerHTML = '';
      return;
    }

    empty.style.display = 'none';
    tbody.innerHTML = pageItems.map(venta => {
      const products = venta.items.map(item => `${item.productName} x ${item.qty}`).join(', ');
      const name = `${venta.cliente || 'Cliente mostrador'} - ${this.formatDate(venta.createdAt)}`;
      return `<tr><td data-label="Fecha"><strong>${this.formatDate(venta.createdAt)}</strong></td><td data-label="Cliente">${venta.cliente || 'Cliente mostrador'}</td><td data-label="Productos">${products}</td><td data-label="Calculado">${this.formatMoney(venta.calculatedTotal)}</td><td class="price-value" data-label="Final">${this.formatMoney(venta.finalTotal)}</td><td data-label="Acciones"><div class="td-actions"><button class="btn btn-ghost btn-sm btn-icon" data-action="view-venta" data-id="${venta.id}" aria-label="Visualizar venta" title="Visualizar">👁️</button><button class="btn btn-ghost btn-sm btn-icon" data-action="edit-venta" data-id="${venta.id}" aria-label="Editar venta" title="Editar">✏️</button><button class="btn btn-danger btn-sm btn-icon" data-action="delete" data-entity="venta" data-id="${venta.id}" data-name="${name}" aria-label="Eliminar venta" title="Eliminar">🗑️</button></div></td></tr>`;
    }).join('');
    document.getElementById('pager-ventas').innerHTML = paginationTemplate('ventas', pageState);
  }

  view(id) {
    const venta = this.app.store.data.ventas.find(item => item.id === id);
    if (!venta) return this.app.toasts.show('No se encontró la venta', 'error');

    const rows = venta.items.map(item => `<tr><td data-label="Producto"><strong>${item.productName}</strong></td><td data-label="Cantidad">${item.qty}</td><td class="price-value" data-label="Precio">${this.formatMoney(item.price)}</td><td class="price-value" data-label="Subtotal">${this.formatMoney(item.subtotal ?? item.qty * item.price)}</td></tr>`).join('');
    this.app.showDetail('Detalle de venta', `<div class="sale-detail-grid"><div><span>Fecha y hora</span><strong>${this.formatDate(venta.createdAt)}</strong></div><div><span>Cliente</span><strong>${venta.cliente || 'Cliente mostrador'}</strong></div><div><span>Total calculado</span><strong>${this.formatMoney(venta.calculatedTotal)}</strong></div><div><span>Total final</span><strong class="price-value">${this.formatMoney(venta.finalTotal)}</strong></div></div><div class="table-wrap sale-cart-wrap"><table><thead><tr><th>Producto</th><th>Cantidad</th><th>Precio</th><th>Subtotal</th></tr></thead><tbody>${rows}</tbody></table></div>`);
  }

  openNew() {
    this.cart = [];
    this.refreshProductSelect();
    form.set('venta-id');
    form.clear(['venta-cliente', 'venta-cantidad', 'venta-precio', 'venta-total-final']);
    form.set('venta-producto');
    document.getElementById('modal-venta-title').textContent = 'Nueva venta';
    this.renderCart();
    this.app.modals.open('venta');
  }

  edit(id) {
    const venta = this.app.store.data.ventas.find(item => item.id === id);
    if (!venta) return this.app.toasts.show('No se encontró la venta', 'error');

    this.cart = venta.items.map(item => ({ productId: item.productId, productName: item.productName, qty: item.qty, price: item.price }));
    this.refreshProductSelect();
    form.set('venta-id', venta.id);
    form.set('venta-cliente', venta.cliente || '');
    form.set('venta-producto');
    form.clear(['venta-cantidad', 'venta-precio']);
    document.getElementById('modal-venta-title').textContent = 'Editar venta';
    this.renderCart();
    form.set('venta-total-final', venta.finalTotal ?? venta.calculatedTotal ?? 0);
    this.app.modals.open('venta');
  }

  updateSelectedProductPrice() {
    const producto = this.app.store.data.productos.find(item => item.id === form.value('venta-producto'));
    form.set('venta-precio', producto ? this.getProductPrice(producto).toFixed(2) : '');
  }

  addItem() {
    const productId = form.value('venta-producto');
    const qty = Number(form.value('venta-cantidad'));
    const price = Number(form.value('venta-precio'));
    const producto = this.app.store.data.productos.find(item => item.id === productId);

    if (!producto) return this.app.toasts.show('Seleccioná un producto', 'error');
    if (!qty || qty <= 0) return this.app.toasts.show('Ingresá una cantidad válida', 'error');
    if (Number.isNaN(price) || price < 0) return this.app.toasts.show('Ingresá un precio válido', 'error');

    const availableStock = this.getAvailableStock(productId);
    const alreadyInCart = this.getCartQtyByProduct(productId);
    if (availableStock <= 0) return this.app.toasts.show('El producto no tiene stock disponible', 'error');
    if (alreadyInCart + qty > availableStock) return this.app.toasts.show(`Stock insuficiente. Disponible: ${availableStock} u.`, 'error');

    this.cart.push({ productId, productName: producto.nombre, qty, price });
    form.set('venta-producto');
    form.clear(['venta-cantidad', 'venta-precio']);
    this.renderCart();
  }

  removeItem(index) {
    this.cart.splice(Number(index), 1);
    this.renderCart();
  }

  renderCart() {
    const tbody = document.getElementById('venta-cart');
    const empty = document.getElementById('empty-venta-cart');
    const total = this.getCalculatedTotal();
    document.getElementById('venta-total-calculado').textContent = this.formatMoney(total);
    form.set('venta-total-final', total.toFixed(2));

    if (!this.cart.length) {
      tbody.innerHTML = '';
      empty.style.display = '';
      return;
    }

    empty.style.display = 'none';
    tbody.innerHTML = this.cart.map((item, index) => {
      const subtotal = Number((item.qty * item.price).toFixed(2));
      return `<tr><td data-label="Producto"><strong>${item.productName}</strong></td><td data-label="Cantidad">${item.qty}</td><td class="price-value" data-label="Precio">${this.formatMoney(item.price)}</td><td class="price-value" data-label="Subtotal">${this.formatMoney(subtotal)}</td><td data-label="Acción"><button class="btn btn-danger btn-sm btn-icon" data-action="remove-venta-item" data-index="${index}" aria-label="Eliminar producto" title="Eliminar">🗑️</button></td></tr>`;
    }).join('');
  }

  async restoreVentaStock(venta) {
    for (const item of venta.items) {
      const newQty = Number(((this.app.store.data.stock[item.productId] || 0) + item.qty).toFixed(2));
      this.app.store.data.stock[item.productId] = newQty;
      await this.app.store.put('stock', { id: item.productId, qty: newQty });
    }
  }

  async discountVentaStock(venta) {
    for (const item of venta.items) {
      const newQty = Number(((this.app.store.data.stock[item.productId] || 0) - item.qty).toFixed(2));
      this.app.store.data.stock[item.productId] = newQty;
      await this.app.store.put('stock', { id: item.productId, qty: newQty });
    }
  }

  async save() {
    const calculatedTotal = this.getCalculatedTotal();
    const finalTotal = Number(form.value('venta-total-final'));
    if (!this.cart.length) return this.app.toasts.show('Agregá al menos un producto al carrito', 'error');
    if (Number.isNaN(finalTotal) || finalTotal < 0) return this.app.toasts.show('Ingresá un precio final válido', 'error');

    const stockIssue = this.getStockIssue();
    if (stockIssue) {
      const name = stockIssue.producto ? stockIssue.producto.nombre : 'Producto';
      return this.app.toasts.show(`${name} no tiene stock suficiente. Disponible: ${stockIssue.stock} u.`, 'error');
    }

    const id = form.value('venta-id') || this.app.store.createId();
    const originalVenta = this.app.store.data.ventas.find(item => item.id === id);
    const venta = {
      id,
      cliente: form.trim('venta-cliente'),
      items: this.cart.map(item => ({ ...item, subtotal: Number((item.qty * item.price).toFixed(2)) })),
      calculatedTotal,
      finalTotal,
      createdAt: originalVenta ? originalVenta.createdAt : new Date().toISOString()
    };

    if (originalVenta) await this.restoreVentaStock(originalVenta);
    await this.discountVentaStock(venta);
    await this.app.store.put('ventas', venta);

    const list = this.app.store.data.ventas;
    const index = list.findIndex(item => item.id === id);
    if (index >= 0) list[index] = venta;
    else list.push(venta);
    await this.app.audit(originalVenta ? 'Edición' : 'Creación', 'Ventas', `${venta.cliente || 'Cliente mostrador'} - ${this.formatMoney(venta.finalTotal)}`);

    this.app.modals.close('venta');
    this.render();
    this.app.components.stock.render();
    this.app.updateBadge();
    this.app.toasts.show(originalVenta ? 'Venta actualizada ✅' : 'Venta guardada ✅');
  }
}
