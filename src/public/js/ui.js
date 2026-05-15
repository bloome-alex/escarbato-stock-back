export class ModalManager {
  open(name) {
    document.getElementById('modal-' + name).classList.add('open');
  }

  close(name) {
    document.getElementById('modal-' + name).classList.remove('open');
  }

  bindOverlayClose() {
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', event => {
        if (event.target === overlay) overlay.classList.remove('open');
      });
    });
  }
}

export class ToastManager {
  show(message, type = 'success') {
    const el = document.createElement('div');
    el.className = 'toast ' + type;
    el.innerHTML = (type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️') + ' ' + message;
    document.getElementById('toastContainer').appendChild(el);
    setTimeout(() => el.remove(), 3000);
  }
}

export class NavigationManager {
  constructor(app) {
    this.app = app;
    this.sectionTitles = {
      dashboard: 'Panel',
      proveedores: 'Proveedores',
      tipos: 'Tipos de Producto',
      productos: 'Productos',
      stock: 'Stock',
      ventas: 'Ventas'
    };
  }

  bind() {
    document.querySelectorAll('[data-nav]').forEach(item => {
      item.addEventListener('click', () => this.go(item.dataset.nav));
    });

    document.getElementById('hamburgerBtn').addEventListener('click', () => this.toggleSidebar());
    document.getElementById('sidebarOverlay').addEventListener('click', () => this.closeSidebar());
  }

  go(section) {
    document.querySelectorAll('.section').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.getElementById('sec-' + section).classList.add('active');
    document.querySelector(`[data-nav="${section}"]`).classList.add('active');
    document.getElementById('topbarTitle').textContent = this.sectionTitles[section];
    this.closeSidebar();
    this.app.renderSection(section);
  }

  toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('sidebarOverlay').classList.toggle('open');
  }

  closeSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebarOverlay').classList.remove('open');
  }
}

export const form = {
  value(id) {
    return document.getElementById(id).value;
  },

  trim(id) {
    return document.getElementById(id).value.trim();
  },

  set(id, value = '') {
    document.getElementById(id).value = value;
  },

  clear(ids) {
    ids.forEach(id => this.set(id));
  }
};
