export class CajasComponent {
  constructor(app) {
    this.app = app;
  }

  template() {
    return `<section class="section" id="sec-cajas">
      <div class="counter-shell">
        <div id="caja-status"></div>
        <div id="caja-open-form"></div>
      </div>
      <div class="table-wrap" id="wrap-cajas" style="margin-top:24px"><table class="data-table"><thead><tr><th>Estado</th><th>Apertura</th><th>Cierre</th><th>Ventas</th><th>Total ingresos</th><th>Acciones</th></tr></thead><tbody id="tbl-cajas"></tbody></table><div id="empty-cajas" class="empty-state" style="display:none"><div class="empty-icon">💵</div><p>Aún no hay cajas registradas</p></div></div>
    </section>`;
  }

  bind() {}

  formatMoney(value) {
    return value || value === 0 ? '$' + Number(value).toLocaleString('es-AR') : '—';
  }

  formatDate(value) {
    return value ? new Date(value).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' }) : '—';
  }

  getOpenCaja() {
    return (this.app.store.data.cajas || []).find(caja => caja.status === 'abierta') || null;
  }

  getCajaVentas(caja) {
    if (!caja) return [];
    const openedAt = new Date(caja.openedAt);
    const closedAt = caja.closedAt ? new Date(caja.closedAt) : null;
    return (this.app.store.data.ventas || []).filter(venta => {
      if (venta.cajaId) return venta.cajaId === caja.id;
      const createdAt = new Date(venta.createdAt);
      return createdAt >= openedAt && (!closedAt || createdAt <= closedAt);
    });
  }

  getPaymentRows(caja) {
    const initialAmounts = caja?.initialAmounts || [];
    const ventas = this.getCajaVentas(caja);
    const methodMap = new Map();
    initialAmounts.forEach(amount => {
      methodMap.set(amount.metodoPagoId, {
        id: amount.metodoPagoId,
        nombre: amount.metodoPagoNombre,
        inicial: Number(amount.monto || 0),
        ingresos: 0
      });
    });

    ventas.forEach(venta => {
      const method = venta.metodoPago || {};
      const id = method.id || 'sin-metodo';
      if (!methodMap.has(id)) {
        methodMap.set(id, { id, nombre: method.nombre || 'Sin método', inicial: 0, ingresos: 0 });
      }
      methodMap.get(id).ingresos += Number(venta.finalTotal || 0);
    });

    return [...methodMap.values()].map(row => ({
      ...row,
      ingresos: Number(row.ingresos.toFixed(2)),
      esperado: Number((row.inicial + row.ingresos).toFixed(2))
    }));
  }

  getCajaIncome(caja) {
    return this.getPaymentRows(caja).reduce((sum, row) => sum + row.ingresos, 0);
  }

  render() {
    this.renderStatus();
    this.renderOpenForm();
    this.renderList();
  }

  renderStatus() {
    const openCaja = this.getOpenCaja();
    const status = document.getElementById('caja-status');
    if (!status) return;
    status.innerHTML = openCaja
      ? `<div class="detail-list"><div><span>Estado</span><strong>Abierta</strong></div><div><span>Fecha de apertura</span><strong>${this.formatDate(openCaja.openedAt)}</strong></div><div><span>Ventas registradas</span><strong>${this.getCajaVentas(openCaja).length}</strong></div><div><span>Ingresos</span><strong>${this.formatMoney(this.getCajaIncome(openCaja))}</strong></div></div><div class="modal-actions" style="position:static;margin:16px 0 0;padding:0;background:transparent;border:0"><button class="btn btn-danger" data-action="close-caja" data-id="${openCaja.id}">Cerrar caja</button></div>`
      : `<div class="detail-list"><div><span>Estado</span><strong>No hay caja abierta</strong></div><div><span>Ventas</span><strong>Bloqueadas hasta abrir caja</strong></div></div>`;
  }

  renderOpenForm() {
    const container = document.getElementById('caja-open-form');
    if (!container) return;
    const openCaja = this.getOpenCaja();
    if (openCaja) {
      container.innerHTML = '';
      return;
    }

    const methods = [...(this.app.store.data.metodosPago || [])]
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));
    if (!methods.length) {
      container.innerHTML = '<div class="empty-state sale-empty"><p>Cargá métodos de pago antes de abrir caja.</p></div>';
      return;
    }

    const inputs = methods.map(method => `<div class="form-group"><label>${method.nombre}</label><input type="number" min="0" step="0.01" value="0" data-caja-initial="${method.id}"></div>`).join('');
    container.innerHTML = `<h3 style="margin:18px 0 12px">Abrir caja</h3><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px">${inputs}</div><div class="modal-actions" style="position:static;margin:16px 0 0;padding:0;background:transparent;border:0"><button class="btn btn-primary" data-action="open-caja">Abrir caja</button></div>`;
  }

  renderList() {
    const tbody = document.getElementById('tbl-cajas');
    const empty = document.getElementById('empty-cajas');
    if (!tbody || !empty) return;
    const cajas = [...(this.app.store.data.cajas || [])].sort((a, b) => new Date(b.openedAt) - new Date(a.openedAt));
    if (!cajas.length) {
      tbody.innerHTML = '';
      empty.style.display = '';
      return;
    }

    empty.style.display = 'none';
    tbody.innerHTML = cajas.map(caja => {
      const ventas = this.getCajaVentas(caja);
      return `<tr><td data-label="Estado"><strong>${caja.status === 'abierta' ? 'Abierta' : 'Cerrada'}</strong></td><td data-label="Apertura">${this.formatDate(caja.openedAt)}</td><td data-label="Cierre">${this.formatDate(caja.closedAt)}</td><td data-label="Ventas">${ventas.length}</td><td class="price-value" data-label="Ingresos">${this.formatMoney(this.getCajaIncome(caja))}</td><td data-label="Acciones"><button class="btn btn-ghost btn-sm btn-icon" data-action="view-caja" data-id="${caja.id}" aria-label="Visualizar caja" title="Visualizar">👁️</button></td></tr>`;
    }).join('');
  }

  async open() {
    if (this.getOpenCaja()) return this.app.toasts.show('Ya hay una caja abierta', 'error');
    const methods = this.app.store.data.metodosPago || [];
    if (!methods.length) return this.app.toasts.show('Cargá métodos de pago antes de abrir caja', 'error');

    const initialAmounts = methods.map(method => {
      const input = document.querySelector(`[data-caja-initial="${method.id}"]`);
      return {
        metodoPagoId: method.id,
        metodoPagoNombre: method.nombre,
        monto: Math.max(0, Number(input?.value || 0))
      };
    });
    const now = new Date().toISOString();
    const caja = { id: this.app.store.createId(), status: 'abierta', openedAt: now, closedAt: '', initialAmounts, createdAt: now };
    const savedCaja = await this.app.store.put('cajas', caja);
    this.app.store.data.cajas = this.app.store.data.cajas || [];
    this.app.store.data.cajas.push(savedCaja || caja);
    await this.app.audit('Creación', 'Cajas', `Caja abierta - ${this.formatDate((savedCaja || caja).openedAt)}`);
    this.render();
    this.app.components.mostrador.render();
    this.app.toasts.show('Caja abierta');
  }

  async close(id) {
    const caja = (this.app.store.data.cajas || []).find(item => item.id === id);
    if (!caja || caja.status !== 'abierta') return this.app.toasts.show('No se encontró una caja abierta', 'error');
    const closedCaja = { ...caja, status: 'cerrada', closedAt: new Date().toISOString() };
    const savedCaja = await this.app.store.put('cajas', closedCaja);
    this.app.store.data.cajas = this.app.store.data.cajas.map(item => item.id === id ? (savedCaja || closedCaja) : item);
    await this.app.audit('Edición', 'Cajas', `Caja cerrada - ${this.formatDate((savedCaja || closedCaja).closedAt)}`);
    this.render();
    this.app.components.mostrador.render();
    this.app.toasts.show('Caja cerrada');
  }

  view(id) {
    const caja = (this.app.store.data.cajas || []).find(item => item.id === id);
    if (!caja) return this.app.toasts.show('No se encontró la caja', 'error');
    const rows = this.getPaymentRows(caja);
    const ventas = this.getCajaVentas(caja);
    const paymentRows = rows.map(row => `<tr><td data-label="Método"><strong>${row.nombre}</strong></td><td class="price-value" data-label="Inicio">${this.formatMoney(row.inicial)}</td><td class="price-value" data-label="Ingresos">${this.formatMoney(row.ingresos)}</td><td class="price-value" data-label="Debería haber">${this.formatMoney(row.esperado)}</td></tr>`).join('');
    const salesRows = ventas.map(venta => `<tr><td data-label="Fecha">${this.formatDate(venta.createdAt)}</td><td data-label="Cliente">${venta.cliente || 'Cliente mostrador'}</td><td data-label="Método">${venta.metodoPago?.nombre || 'Sin método'}</td><td class="price-value" data-label="Total">${this.formatMoney(venta.finalTotal)}</td></tr>`).join('') || '<tr><td colspan="4">No hubo ventas durante esta caja.</td></tr>';
    const totalIngresos = rows.reduce((sum, row) => sum + row.ingresos, 0);
    const totalEsperado = rows.reduce((sum, row) => sum + row.esperado, 0);
    this.app.showDetail('Detalle de caja', `<div class="sale-detail-grid"><div><span>Fecha de apertura</span><strong>${this.formatDate(caja.openedAt)}</strong></div><div><span>Fecha de cierre</span><strong>${this.formatDate(caja.closedAt)}</strong></div><div><span>Estado</span><strong>${caja.status === 'abierta' ? 'Abierta' : 'Cerrada'}</strong></div><div><span>Total ingresos</span><strong class="price-value">${this.formatMoney(totalIngresos)}</strong></div><div><span>Total esperado</span><strong class="price-value">${this.formatMoney(totalEsperado)}</strong></div></div><h3 style="margin:18px 0 10px">Montos por método de pago</h3><div class="table-wrap sale-cart-wrap"><table><thead><tr><th>Método</th><th>Inicio</th><th>Ingresos</th><th>Debería haber</th></tr></thead><tbody>${paymentRows}</tbody></table></div><h3 style="margin:18px 0 10px">Ventas de la caja</h3><div class="table-wrap sale-cart-wrap"><table><thead><tr><th>Fecha</th><th>Cliente</th><th>Método</th><th>Total</th></tr></thead><tbody>${salesRows}</tbody></table></div>`);
  }
}
