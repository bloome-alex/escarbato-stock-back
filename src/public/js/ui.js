export class ModalManager {
  open(name) {
    document.getElementById('modal-' + name).classList.add('open');
  }

  close(name) {
    document.getElementById('modal-' + name).classList.remove('open');
  }

  bindOverlayClose() {
    // Modals must stay open when clicking outside; close only through explicit actions.
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
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') this.closeSidebar();
    });
  }

  go(section) {
    document.querySelectorAll('.section').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('[data-nav]').forEach(el => el.classList.remove('active'));
    document.getElementById('sec-' + section).classList.add('active');
    document.querySelectorAll(`[data-nav="${section}"]`).forEach(el => el.classList.add('active'));
    document.getElementById('topbarTitle').textContent = this.sectionTitles[section];
    this.closeSidebar();
    this.app.renderSection(section);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const isOpen = sidebar.classList.toggle('open');
    overlay.classList.toggle('open', isOpen);
    document.getElementById('hamburgerBtn').setAttribute('aria-expanded', String(isOpen));
  }

  closeSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebarOverlay').classList.remove('open');
    document.getElementById('hamburgerBtn').setAttribute('aria-expanded', 'false');
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
