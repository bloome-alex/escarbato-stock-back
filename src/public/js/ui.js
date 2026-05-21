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
    if (type === 'error' && document.body?.dataset.connection === 'offline' && this.isOfflineNetworkMessage(message)) return;
    const el = document.createElement('div');
    el.className = 'toast ' + type;
    el.innerHTML = (type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️') + ' ' + message;
    document.getElementById('toastContainer').appendChild(el);
    setTimeout(() => el.remove(), 3000);
  }

  isOfflineNetworkMessage(message = '') {
    return /sin conexi[oó]n|backend|sincron|failed to fetch|networkerror|no se pudo (completar|cargar|precargar|inicializar)|env[ií]o/i.test(String(message));
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
      mostrador: 'Mostrador',
      peluqueria: 'Peluquería'
    };
    this.sectionActions = {
      proveedores: '<button class="btn btn-primary" data-action="new-proveedor">+ Nuevo proveedor</button>',
      tipos: '<button class="btn btn-primary" data-action="new-tipo">+ Nuevo tipo</button>',
      productos: '<div class="download-menu"><button class="btn btn-ghost" type="button" aria-haspopup="true">⬇️ Descargar ▾</button><div class="download-menu-list"><button type="button" data-action="download-productos-pdf">Descargar reporte PDF</button><button type="button" data-action="download-productos-xlsx">Descargar reporte XLSX</button></div></div><button class="btn btn-primary" data-action="new-producto">+ Nuevo producto</button>',
      metodosPago: '<button class="btn btn-primary" data-action="new-metodo-pago">+ Nuevo método</button>'
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
    this.updateHeader('dashboard');
  }

  showLoading(section) {
    this.updateHeader(section);
    document.querySelectorAll('[data-nav]').forEach(el => el.classList.toggle('active', el.dataset.nav === section));
    document.getElementById('sectionsRoot').innerHTML = `<section class="section active"><div class="section-loading"><span class="loading-spinner" aria-hidden="true"></span><span>Cargando ${this.sectionTitles[section] || 'sección'}...</span></div></section>`;
    this.closeSidebar();
  }

  async go(section) {
    if (this.app?.isSectionEnabled && !this.app.isSectionEnabled(section)) {
      this.app?.toasts?.show('La sección está deshabilitada', 'error');
      return;
    }

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

    const activeSection = document.querySelector('.section.active')?.id.replace('sec-', '');

    document.querySelectorAll('.section').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('[data-nav]').forEach(el => el.classList.remove('active'));
    target.classList.add('active');
    document.querySelectorAll(`[data-nav="${section}"]`).forEach(el => el.classList.add('active'));
    this.updateHeader(section);
    this.closeSidebar();
    if (activeSection !== section) this.app?.resetSectionFilters?.(section);
    await this.app.renderSection(section);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  updateHeader(section) {
    const title = document.getElementById('topbarTitle');
    const actions = document.getElementById('topbarActions');
    if (title) title.textContent = this.sectionTitles[section] || 'Cargando';
    if (actions) actions.innerHTML = this.sectionActions[section] || '';
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
