export class DashboardComponent {
  constructor(app) {
    this.app = app;
  }

  template() {
    return `<section class="section active" id="sec-dashboard">
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-icon green">🚚</div><div class="stat-info"><div class="stat-num" id="stat-prov">0</div><div class="stat-label">Proveedores</div></div></div>
        <div class="stat-card"><div class="stat-icon amber">🏷️</div><div class="stat-info"><div class="stat-num" id="stat-tipos">0</div><div class="stat-label">Tipos de producto</div></div></div>
        <div class="stat-card"><div class="stat-icon brown">📦</div><div class="stat-info"><div class="stat-num" id="stat-prod">0</div><div class="stat-label">Productos</div></div></div>
        <div class="stat-card"><div class="stat-icon blue">⚠️</div><div class="stat-info"><div class="stat-num" id="stat-low">0</div><div class="stat-label">Stock bajo</div></div></div>
      </div>
      <div class="dashboard-grid">
        <div class="panel"><div class="panel-title">⚠️ Alertas de stock</div><div id="dash-alerts"><div class="empty-state" style="padding:24px"><p style="font-size:.85rem">Sin alertas 🎉</p></div></div></div>
        <div class="panel"><div class="panel-title">📦 Últimos productos</div><div id="dash-recent"><div class="empty-state" style="padding:24px"><p style="font-size:.85rem">Sin productos aún</p></div></div></div>
      </div>
      <div class="panel audit-panel"><div class="panel-title">🧾 Auditoría de actividad</div><div id="dash-audit"><div class="empty-state" style="padding:24px"><p style="font-size:.85rem">Sin actividad registrada</p></div></div></div>
    </section>`;
  }

  formatDate(value) {
    return new Date(value).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });
  }

  actionClass(action) {
    if (action === 'Creación') return 'audit-create';
    if (action === 'Edición') return 'audit-edit';
    if (action === 'Eliminación') return 'audit-delete';
    return '';
  }

  render() {
    const data = this.app.store.data;
    document.getElementById('stat-prov').textContent = data.proveedores.length;
    document.getElementById('stat-tipos').textContent = data.tipos.length;
    document.getElementById('stat-prod').textContent = data.productos.length;

    const lowProducts = this.app.getLowStockProducts();
    document.getElementById('stat-low').textContent = lowProducts.length;
    this.app.updateBadge();

    const alertsEl = document.getElementById('dash-alerts');
    alertsEl.innerHTML = lowProducts.length
      ? lowProducts.slice(0, 5).map(product => {
        const qty = data.stock[product.id] || 0;
        const status = qty === 0 ? 'Sin stock' : 'Stock bajo';
        return `<div class="alert-item"><span class="alert-icon">⚠️</span><span>${product.nombre} — <strong>${qty}</strong> unidades</span><span class="chip ${qty === 0 ? 'chip-out' : 'chip-low'}" style="margin-left:auto">${status}</span></div>`;
      }).join('')
      : '<div class="empty-state" style="padding:24px"><p style="font-size:.85rem">Sin alertas 🎉</p></div>';

    const recent = [...data.productos].reverse().slice(0, 5);
    const recentEl = document.getElementById('dash-recent');
    recentEl.innerHTML = recent.length
      ? recent.map(product => {
        const tipo = data.tipos.find(item => item.id === product.tipoId);
        const finalPrice = product.precioFinal ?? product.precio;
        const price = finalPrice || finalPrice === 0 ? '$' + Number(finalPrice).toLocaleString('es-AR') : '—';
        return `<div class="recent-item"><div><div class="recent-name">${product.nombre}</div><div class="recent-sub">${tipo ? tipo.nombre : '—'}</div></div><span class="tag tag-green">${price}</span></div>`;
      }).join('')
      : '<div class="empty-state" style="padding:24px"><p style="font-size:.85rem">Sin productos aún</p></div>';

    this.renderAudit();
  }

  renderAudit() {
    const auditEl = document.getElementById('dash-audit');
    if (!auditEl) return;

    const records = [...this.app.store.data.auditoria]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 8);

    auditEl.innerHTML = records.length
      ? `<div class="audit-list">${records.map(record => `<div class="audit-item"><div class="audit-main"><span class="audit-action ${this.actionClass(record.action)}">${record.action}</span><strong>${record.entity}</strong><span>${record.detail}</span></div><time>${this.formatDate(record.createdAt)}</time></div>`).join('')}</div>`
      : '<div class="empty-state" style="padding:24px"><p style="font-size:.85rem">Sin actividad registrada</p></div>';
  }
}
