export class DashboardComponent {
  constructor(app) {
    this.app = app;
    this.data = null;
    this.loading = false;
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

  renderSkeleton() {
    document.querySelectorAll('.stat-num').forEach(el => {
      el.innerHTML = '<span class="skeleton skeleton-num"></span>';
    });
    document.getElementById('dash-alerts').innerHTML = this.skeletonList(4);
    document.getElementById('dash-recent').innerHTML = this.skeletonList(4);
    document.getElementById('dash-audit').innerHTML = this.skeletonList(5);
  }

  skeletonList(count) {
    return `<div class="skeleton-list">${Array.from({ length: count }, () => '<div class="skeleton-row"><span class="skeleton skeleton-dot"></span><span class="skeleton skeleton-line"></span></div>').join('')}</div>`;
  }

  async render() {
    if (!this.data) {
      this.renderSkeleton();
      if (this.loading) return;
      this.loading = true;
      try {
        this.data = await this.app.store.getDashboard();
      } catch (error) {
        this.app.toasts.show(error.message || 'No se pudo cargar el Panel', 'error');
        return;
      } finally {
        this.loading = false;
      }
    }

    const data = this.data;
    document.getElementById('stat-prov').textContent = data.totals.proveedores;
    document.getElementById('stat-tipos').textContent = data.totals.tipos;
    document.getElementById('stat-prod').textContent = data.totals.productos;
    document.getElementById('stat-low').textContent = data.totals.lowStock;
    this.app.updateBadge();

    const alertsEl = document.getElementById('dash-alerts');
    alertsEl.innerHTML = data.stockAlerts.length
      ? data.stockAlerts.map(product => {
        return `<div class="alert-item"><span class="alert-icon">⚠️</span><span>${product.nombre} — <strong>${product.qty}</strong> unidades</span><span class="chip ${product.qty === 0 ? 'chip-out' : 'chip-low'}" style="margin-left:auto">${product.status}</span></div>`;
      }).join('')
      : '<div class="empty-state" style="padding:24px"><p style="font-size:.85rem">Sin alertas 🎉</p></div>';

    const recentEl = document.getElementById('dash-recent');
    recentEl.innerHTML = data.recentProducts.length
      ? data.recentProducts.map(product => {
        const finalPrice = product.precioFinal ?? product.precio;
        const price = finalPrice || finalPrice === 0 ? '$' + Number(finalPrice).toLocaleString('es-AR') : '—';
        return `<div class="recent-item"><div><div class="recent-name">${product.nombre}</div><div class="recent-sub">${product.tipoNombre || '—'}</div></div><span class="tag tag-green">${price}</span></div>`;
      }).join('')
      : '<div class="empty-state" style="padding:24px"><p style="font-size:.85rem">Sin productos aún</p></div>';

    this.renderAudit();
  }

  renderAudit() {
    const auditEl = document.getElementById('dash-audit');
    if (!auditEl) return;

    const records = this.data?.auditActivity || [];

    auditEl.innerHTML = records.length
      ? `<div class="audit-list">${records.map(record => `<div class="audit-item"><div class="audit-main"><span class="audit-action ${this.actionClass(record.action)}">${record.action}</span><strong>${record.entity}</strong><span>${record.detail}</span></div><time>${this.formatDate(record.createdAt)}</time></div>`).join('')}</div>`
      : '<div class="empty-state" style="padding:24px"><p style="font-size:.85rem">Sin actividad registrada</p></div>';
  }
}
