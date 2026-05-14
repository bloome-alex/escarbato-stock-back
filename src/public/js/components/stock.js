import { form } from '../ui.js';

export class StockComponent {
  constructor(app) {
    this.app = app;
    this.statusLabel = { ok: 'Disponible', low: 'Stock bajo', out: 'Sin stock' };
    this.statusChip = { ok: 'chip-ok', low: 'chip-low', out: 'chip-out' };
  }

  template() {
    return `<section class="section" id="sec-stock">
      <div class="section-header"><div class="section-heading">📊 <span>Gestión de Stock</span></div></div>
      <div class="toolbar"><div class="search-box"><span class="search-icon">🔍</span><input type="text" placeholder="Buscar producto en stock…" id="searchStock"></div><select id="filterStockStatus" style="padding:10px 14px;border:1px solid var(--border);border-radius:var(--radius-sm);font-family:Inter,sans-serif;font-size:.9rem;background:var(--card);outline:none;"><option value="">Todos</option><option value="ok">Disponible</option><option value="low">Stock bajo</option><option value="out">Sin stock</option></select></div>
      <div id="stock-list"></div><div id="empty-stock" class="empty-state" style="display:none"><div class="empty-icon">📊</div><p>Agregá productos para gestionar el stock</p></div>
    </section>`;
  }

  modalTemplate() {
    return `<div class="modal-overlay" id="modal-stock"><div class="modal" style="max-width:420px"><div class="modal-title"><span>Editar stock</span><button class="modal-close" data-close-modal="stock">✕</button></div><input type="hidden" id="stock-id"><div class="form-group"><label>Producto</label><input type="text" id="stock-producto" readonly></div><div class="form-group"><label>Cantidad en stock *</label><input type="number" id="stock-cantidad" min="0" step="0.01" placeholder="0.00"></div><div class="modal-actions"><button class="btn btn-ghost" data-close-modal="stock">Cancelar</button><button class="btn btn-primary" data-action="save-stock">💾 Guardar</button></div></div></div>`;
  }

  bind() {
    document.getElementById('searchStock').addEventListener('input', () => this.render());
    document.getElementById('filterStockStatus').addEventListener('change', () => this.render());
  }

  getStatus(qty, min) {
    if (qty === 0) return 'out';
    if (qty <= min) return 'low';
    return 'ok';
  }

  render() {
    const data = this.app.store.data;
    const q = (form.value('searchStock') || '').toLowerCase();
    const filter = form.value('filterStockStatus');
    const list = data.productos.filter(producto => {
      const qty = data.stock[producto.id] || 0;
      const min = producto.minStock || 5;
      const status = this.getStatus(qty, min);
      return producto.nombre.toLowerCase().includes(q) && (!filter || status === filter);
    });

    const listEl = document.getElementById('stock-list');
    const emptyEl = document.getElementById('empty-stock');
    if (!list.length) {
      listEl.innerHTML = '';
      emptyEl.style.display = '';
      return;
    }

    emptyEl.style.display = 'none';
    listEl.innerHTML = list.map(producto => {
      const qty = data.stock[producto.id] || 0;
      const min = producto.minStock || 5;
      const status = this.getStatus(qty, min);
      const tipo = data.tipos.find(item => item.id === producto.tipoId);
      return `<div class="stock-card"><div style="font-size:1.6rem">${status === 'out' ? '📭' : status === 'low' ? '📉' : '📦'}</div><div class="stock-prod-info"><div class="stock-prod-name">${producto.nombre}</div><div class="stock-prod-type">${tipo ? tipo.nombre : '—'} · Mínimo: ${min} u.</div></div><div class="stock-controls"><button class="stock-btn minus" data-action="change-stock" data-id="${producto.id}" data-delta="-1">−</button><div class="stock-qty">${qty}</div><button class="stock-btn plus" data-action="change-stock" data-id="${producto.id}" data-delta="1">+</button></div><button class="btn btn-ghost btn-sm" data-action="edit-stock" data-id="${producto.id}">Editar</button><div class="stock-status"><span class="chip ${this.statusChip[status]}">${this.statusLabel[status]}</span></div></div>`;
    }).join('');
  }

  edit(id) {
    const product = this.app.store.data.productos.find(item => item.id === id);
    if (!product) return;
    form.set('stock-id', id);
    form.set('stock-producto', product.nombre);
    form.set('stock-cantidad', this.app.store.data.stock[id] || 0);
    this.app.modals.open('stock');
  }

  async save() {
    const id = form.value('stock-id');
    const qty = Number(form.value('stock-cantidad'));
    if (!id) return;
    if (Number.isNaN(qty) || qty < 0) return this.app.toasts.show('Ingresá una cantidad válida', 'error');

    await this.setQuantity(id, qty, 'Edición manual');
    this.app.modals.close('stock');
  }

  async setQuantity(id, qty, source = 'Ajuste rápido') {
    const data = this.app.store.data;
    const previousQty = data.stock[id] || 0;
    const newQty = Number(qty.toFixed(2));
    data.stock[id] = newQty;
    await this.app.store.put('stock', { id, qty: newQty });
    const product = data.productos.find(item => item.id === id);
    await this.app.audit('Edición', 'Stock', `${product ? product.nombre : 'Producto'}: ${previousQty} -> ${newQty} (${source})`);
    this.render();
    const status = this.getStatus(newQty, product ? (product.minStock || 5) : 5);
    this.app.toasts.show(`Stock actualizado: ${newQty} unidades`, status === 'ok' ? 'success' : 'error');
    this.app.updateBadge();
  }

  async change(id, delta) {
    const data = this.app.store.data;
    const newQty = Math.max(0, (data.stock[id] || 0) + delta);
    await this.setQuantity(id, newQty);
  }
}
