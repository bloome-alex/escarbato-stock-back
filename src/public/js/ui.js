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
      metodosPago: 'Metodos de pago',
      cajas: 'Cajas',
      stock: 'Stock',
      ventas: 'Ventas',
      mostrador: 'Mostrador'
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

  showLoading(section) {
    document.getElementById('topbarTitle').textContent = this.sectionTitles[section] || 'Cargando';
    document.querySelectorAll('[data-nav]').forEach(el => el.classList.toggle('active', el.dataset.nav === section));
    document.getElementById('sectionsRoot').innerHTML = `<section class="section active"><div class="section-loading"><span class="loading-spinner" aria-hidden="true"></span><span>Cargando ${this.sectionTitles[section] || 'sección'}...</span></div></section>`;
    this.closeSidebar();
  }

  async go(section) {
    if (section !== 'dashboard' && !this.app?.dataReady) {
      this.showLoading(section);
      try {
        await this.app.ensureDataReady();
      } catch (error) {
        this.app?.toasts?.show(error.message || 'No se pudo cargar la sección', 'error');
        return;
      }
    }

    let target = document.getElementById('sec-' + section);
    if (!target && this.app?.renderShell) {
      this.app.renderShell();
      target = document.getElementById('sec-' + section);
    }
    if (!target) {
      this.app?.toasts?.show('No se pudo cargar la sección. Recargá la página.', 'error');
      return;
    }

    document.querySelectorAll('.section').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('[data-nav]').forEach(el => el.classList.remove('active'));
    target.classList.add('active');
    document.querySelectorAll(`[data-nav="${section}"]`).forEach(el => el.classList.add('active'));
    document.getElementById('topbarTitle').textContent = this.sectionTitles[section];
    this.closeSidebar();
    await this.app.renderSection(section);
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

export class ThemeManager {
  constructor() {
    this.storageKey = 'petshop-theme';
    this.metaThemeColor = document.querySelector('meta[name="theme-color"]');
    this.button = null;
  }

  bind() {
    this.button = document.getElementById('themeToggleBtn');
    if (!this.button) return;

    this.apply(this.currentTheme(), false);
    this.button.addEventListener('click', () => {
      this.apply(this.currentTheme() === 'dark' ? 'light' : 'dark');
    });
  }

  currentTheme() {
    return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
  }

  apply(theme, persist = true) {
    const normalizedTheme = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.dataset.theme = normalizedTheme;
    if (persist) {
      try { localStorage.setItem(this.storageKey, normalizedTheme); } catch {}
    }
    if (this.metaThemeColor) this.metaThemeColor.content = normalizedTheme === 'dark' ? '#101611' : '#4E8055';

    if (!this.button) return;
    const isDark = normalizedTheme === 'dark';
    this.button.setAttribute('aria-pressed', String(isDark));
    this.button.setAttribute('aria-label', isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
    this.button.innerHTML = `<span class="theme-toggle-icon" aria-hidden="true">${isDark ? '☀️' : '🌙'}</span><span class="theme-toggle-text">${isDark ? 'Claro' : 'Oscuro'}</span>`;
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
