export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[char]));

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
    el.textContent = (type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️') + ' ' + String(message ?? '');
    document.getElementById('toastContainer').appendChild(el);
    setTimeout(() => el.remove(), 3000);
  }

  isOfflineNetworkMessage(message = '') {
    return /sin conexi[oó]n|backend|sincron|failed to fetch|networkerror|no se pudo (completar|cargar|precargar|inicializar)|env[ií]o/i.test(String(message));
  }
}

const SEARCHABLE_SELECT_ROOT = '[data-searchable-select]';
const SEARCHABLE_SELECT_INPUT = '[data-searchable-select-input]';
const SEARCHABLE_SELECT_VALUE = '[data-searchable-select-value]';

const normalizeSearch = value => String(value ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLocaleLowerCase('es');

const escapeJsonAttr = value => escapeHtml(JSON.stringify(value));

const parseSearchableOptions = wrapper => {
  try {
    return JSON.parse(wrapper?.dataset?.options || '[]');
  } catch {
    return [];
  }
};

const getSearchableLabel = (wrapper, value) => {
  const options = parseSearchableOptions(wrapper);
  if (!value) return wrapper?.dataset?.emptyLabel || wrapper?.dataset?.placeholder || '';
  return options.find(option => String(option.value) === String(value))?.label || String(value);
};

const estimateSearchableWidth = (placeholder, options = [], value = '') => {
  const lengths = [placeholder, value, ...options.map(option => option.label)]
    .filter(Boolean)
    .map(label => String(label).length);
  const chars = Math.max(12, ...lengths, 0) + 2;
  return `${Math.min(chars, 28)}ch`;
};

export const searchableSelect = {
  template({ id, placeholder, options = [], value = '', allowEmpty = true, className = '' }) {
    const emptyLabel = placeholder || 'Seleccionar';
    const normalizedOptions = Array.isArray(options) ? options : [];
    const selectedLabel = value ? (normalizedOptions.find(option => String(option.value) === String(value))?.label || String(value)) : emptyLabel;
    const menuOptions = allowEmpty
      ? [{ value: '', label: emptyLabel, empty: true }, ...normalizedOptions]
      : normalizedOptions;

    const width = estimateSearchableWidth(emptyLabel, normalizedOptions, selectedLabel);

    return `<div class="searchable-select ${className}" data-searchable-select data-placeholder="${escapeHtml(emptyLabel)}" data-empty-label="${escapeHtml(emptyLabel)}" data-options="${escapeJsonAttr(normalizedOptions)}" style="--searchable-select-width:${width}">
      <input type="text" id="${escapeHtml(id)}-display" class="filter-control searchable-select-input" autocomplete="off" role="combobox" aria-expanded="false" aria-autocomplete="list" aria-controls="${escapeHtml(id)}-menu" value="${escapeHtml(selectedLabel)}" data-searchable-select-input>
      <span class="searchable-select-arrow" aria-hidden="true"><span class="searchable-select-arrow-icon"></span></span>
      <input type="hidden" id="${escapeHtml(id)}" value="${escapeHtml(value)}" data-searchable-select-value>
      <div class="searchable-select-menu" id="${escapeHtml(id)}-menu" hidden>
        ${menuOptions.map(option => `<button type="button" class="searchable-select-option${option.empty ? ' is-empty' : ''}" data-searchable-select-option data-value="${escapeHtml(option.value)}">${escapeHtml(option.label)}</button>`).join('')}
        <div class="searchable-select-empty" hidden>Sin coincidencias</div>
      </div>
    </div>`;
  },

  bind() {
    if (this.bound) return;
    this.bound = true;

    document.addEventListener('focusin', event => {
      const input = event.target.closest(SEARCHABLE_SELECT_INPUT);
      if (!input) return;
      const wrapper = input.closest(SEARCHABLE_SELECT_ROOT);
      if (!wrapper) return;
      this.beginSearch(wrapper);
    });

    document.addEventListener('input', event => {
      const input = event.target.closest(SEARCHABLE_SELECT_INPUT);
      if (!input) return;
      const wrapper = input.closest(SEARCHABLE_SELECT_ROOT);
      if (!wrapper) return;
      this.open(wrapper);
      this.filter(wrapper, input.value);
    });

    document.addEventListener('keydown', event => {
      const input = event.target.closest(SEARCHABLE_SELECT_INPUT);
      if (!input) return;
      const wrapper = input.closest(SEARCHABLE_SELECT_ROOT);
      if (!wrapper) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        this.sync(wrapper);
        this.close(wrapper);
        input.blur();
        return;
      }

      if (event.key === 'Enter') {
        const option = [...wrapper.querySelectorAll('[data-searchable-select-option]')].find(item => !item.hidden);
        if (!option) return;
        event.preventDefault();
        this.select(wrapper, option);
      }
    });

    document.addEventListener('pointerdown', event => {
      const option = event.target.closest('[data-searchable-select-option]');
      if (option) {
        const wrapper = option.closest(SEARCHABLE_SELECT_ROOT);
        if (!wrapper) return;
        event.preventDefault();
        this.select(wrapper, option);
        return;
      }

      if (!event.target.closest(SEARCHABLE_SELECT_ROOT)) this.closeAll();
    });

    document.addEventListener('focusout', event => {
      const input = event.target.closest(SEARCHABLE_SELECT_INPUT);
      if (!input) return;
      const wrapper = input.closest(SEARCHABLE_SELECT_ROOT);
      if (!wrapper) return;
      setTimeout(() => {
        if (wrapper.contains(document.activeElement)) return;
        this.sync(wrapper);
        this.close(wrapper);
      }, 80);
    }, true);
  },

  open(wrapper) {
    const input = wrapper?.querySelector(SEARCHABLE_SELECT_INPUT);
    const menu = wrapper?.querySelector('.searchable-select-menu');
    const arrow = wrapper?.querySelector('.searchable-select-arrow');
    const arrowIcon = wrapper?.querySelector('.searchable-select-arrow-icon');
    if (!input || !menu) return;
    menu.hidden = false;
    wrapper.classList.add('is-open');
    arrow?.classList.add('is-open');
    arrowIcon?.classList.add('is-open');
    input.setAttribute('aria-expanded', 'true');
    this.filter(wrapper, '');
  },

  beginSearch(wrapper) {
    const input = wrapper?.querySelector(SEARCHABLE_SELECT_INPUT);
    if (!input) return;
    input.value = '';
    input.dataset.searching = 'true';
    this.open(wrapper);
  },

  close(wrapper) {
    const input = wrapper?.querySelector(SEARCHABLE_SELECT_INPUT);
    const menu = wrapper?.querySelector('.searchable-select-menu');
    const arrow = wrapper?.querySelector('.searchable-select-arrow');
    const arrowIcon = wrapper?.querySelector('.searchable-select-arrow-icon');
    if (!input || !menu) return;
    menu.hidden = true;
    wrapper.classList.remove('is-open');
    arrow?.classList.remove('is-open');
    arrowIcon?.classList.remove('is-open');
    input.setAttribute('aria-expanded', 'false');
    this.filter(wrapper, input.value);
  },

  closeAll() {
    document.querySelectorAll(SEARCHABLE_SELECT_ROOT).forEach(wrapper => this.close(wrapper));
  },

  filter(wrapper, query = '') {
    const normalizedQuery = normalizeSearch(query);
    wrapper?.querySelectorAll('[data-searchable-select-option]').forEach(option => {
      if (option.classList.contains('is-empty')) {
        option.hidden = false;
        return;
      }
      option.hidden = !!normalizedQuery && !normalizeSearch(option.textContent).includes(normalizedQuery);
    });

    const emptyState = wrapper?.querySelector('.searchable-select-empty');
    if (emptyState) emptyState.hidden = wrapper.querySelectorAll('[data-searchable-select-option]:not([hidden]):not(.is-empty)').length > 0;
  },

  select(wrapper, option) {
    const hidden = wrapper?.querySelector(SEARCHABLE_SELECT_VALUE);
    const input = wrapper?.querySelector(SEARCHABLE_SELECT_INPUT);
    if (!hidden || !input) return;
    hidden.value = option?.dataset?.value || '';
    this.sync(wrapper);
    this.close(wrapper);
    hidden.dispatchEvent(new Event('input', { bubbles: true }));
    hidden.dispatchEvent(new Event('change', { bubbles: true }));
  },

  sync(target) {
    const hidden = target?.matches?.(SEARCHABLE_SELECT_VALUE) ? target : target?.querySelector?.(SEARCHABLE_SELECT_VALUE);
    if (!hidden) return;
    const wrapper = hidden.closest(SEARCHABLE_SELECT_ROOT);
    const input = wrapper?.querySelector(SEARCHABLE_SELECT_INPUT);
    if (!wrapper || !input) return;

    const value = hidden.value || '';
    const options = parseSearchableOptions(wrapper);
    const label = value ? (options.find(option => String(option.value) === String(value))?.label || String(value)) : (wrapper.dataset.emptyLabel || wrapper.dataset.placeholder || '');
    input.value = label;
    input.classList.toggle('is-placeholder', !value);
    input.dataset.selectedValue = value;
    wrapper.style.setProperty('--searchable-select-width', estimateSearchableWidth(wrapper.dataset.placeholder || wrapper.dataset.emptyLabel || 'Seleccionar', options, label));
    this.filter(wrapper, '');
  },

  refresh(id, options = [], placeholder) {
    const hidden = document.getElementById(id);
    if (!hidden) return;
    const wrapper = hidden.closest(SEARCHABLE_SELECT_ROOT);
    if (!wrapper) return;

    const normalizedOptions = Array.isArray(options) ? options : [];
    wrapper.dataset.options = JSON.stringify(normalizedOptions);
    if (placeholder) {
      wrapper.dataset.placeholder = placeholder;
      wrapper.dataset.emptyLabel = placeholder;
    }

    const menu = wrapper.querySelector('.searchable-select-menu');
    const emptyLabel = wrapper.dataset.emptyLabel || wrapper.dataset.placeholder || 'Seleccionar';
    const currentValue = hidden.value || '';
    const currentLabel = currentValue ? (normalizedOptions.find(option => String(option.value) === String(currentValue))?.label || '') : '';
    wrapper.style.setProperty('--searchable-select-width', estimateSearchableWidth(wrapper.dataset.placeholder || wrapper.dataset.emptyLabel || 'Seleccionar', normalizedOptions, currentLabel || currentValue));

    menu.innerHTML = [
      `<button type="button" class="searchable-select-option is-empty" data-searchable-select-option data-value="">${escapeHtml(emptyLabel)}</button>`,
      ...normalizedOptions.map(option => `<button type="button" class="searchable-select-option" data-searchable-select-option data-value="${escapeHtml(option.value)}">${escapeHtml(option.label)}</button>`)
    ].join('') + '<div class="searchable-select-empty" hidden>Sin coincidencias</div>';

    if (currentValue && !currentLabel) hidden.value = '';
    menu.hidden = true;
    wrapper.classList.remove('is-open');
    const input = wrapper.querySelector(SEARCHABLE_SELECT_INPUT);
    if (input) input.setAttribute('aria-expanded', 'false');
    this.sync(hidden);
  },

  isEmptySelection(wrapper) {
    return !wrapper?.querySelector(SEARCHABLE_SELECT_VALUE)?.value;
  }
};

export class NavigationManager {
  constructor(app) {
    this.app = app;
    this.touchStart = null;
    this.lockedScrollY = 0;
    this.scrollLockCount = 0;
    this.sectionTitles = {
      dashboard: 'Panel',
      proveedores: 'Proveedores',
      tipos: 'Tipos de Producto',
      gruposProductos: 'Grupos de productos',
      productos: 'Productos',
      metodosPago: 'Metodos de pago',
      cajas: 'Cajas',
      stock: 'Stock',
      reposicionStock: 'Reposicion de stock',
      ventas: 'Ventas',
      ticketConfig: 'Ticket de compra',
      mostrador: 'Mostrador',
      peluqueria: 'Peluquería'
    };
    this.sectionActions = {
      proveedores: '<button class="btn btn-primary" data-action="new-proveedor">+ Nuevo proveedor</button>',
      tipos: '<button class="btn btn-primary" data-action="new-tipo">+ Nuevo tipo</button>',
      gruposProductos: '<button class="btn btn-primary" data-action="new-grupo-producto">+ Nuevo grupo</button>',
      productos: '<div class="download-menu"><button class="btn btn-ghost" type="button" aria-haspopup="true">⬇️ Descargar ▾</button><div class="download-menu-list"><button type="button" data-action="download-productos-pdf">Descargar reporte PDF</button><button type="button" data-action="download-productos-xlsx">Descargar reporte XLSX</button></div></div><button class="btn btn-ghost" data-action="bulk-increase-productos">Aumento grupal</button><button class="btn btn-primary" data-action="new-producto">+ Nuevo producto</button>',
      reposicionStock: '<div class="download-menu"><button class="btn btn-ghost" type="button" aria-haspopup="true">⬇️ Descargar ▾</button><div class="download-menu-list"><button type="button" data-action="download-reposicion-stock-pdf">Descargar PDF</button><button type="button" data-action="download-reposicion-stock-xlsx">Descargar XLSX</button></div></div>',
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
    document.addEventListener('touchstart', event => this.handleTouchStart(event), { passive: true });
    document.addEventListener('touchend', event => this.handleTouchEnd(event), { passive: true });
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
    if (sidebar.classList.contains('open')) this.closeSidebar();
    else this.openSidebar();
  }

  openSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    sidebar.classList.add('open');
    overlay.classList.add('open');
    document.getElementById('hamburgerBtn').setAttribute('aria-expanded', 'true');
    this.lockBodyScroll();
  }

  closeSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebarOverlay').classList.remove('open');
    document.getElementById('hamburgerBtn').setAttribute('aria-expanded', 'false');
    this.unlockBodyScroll();
  }

  handleTouchStart(event) {
    if (!event.changedTouches?.length) return;
    const touch = event.changedTouches[0];
    this.touchStart = {
      x: touch.clientX,
      y: touch.clientY,
      sidebarOpen: document.getElementById('sidebar')?.classList.contains('open')
    };
  }

  handleTouchEnd(event) {
    if (!this.touchStart || !event.changedTouches?.length) return;
    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - this.touchStart.x;
    const deltaY = touch.clientY - this.touchStart.y;
    const isHorizontalSwipe = Math.abs(deltaX) > 60 && Math.abs(deltaX) > Math.abs(deltaY) * 1.4;
    const isEdgeSwipe = this.touchStart.x <= 32;

    if (isHorizontalSwipe && !this.touchStart.sidebarOpen && isEdgeSwipe && deltaX > 0) this.openSidebar();
    if (isHorizontalSwipe && this.touchStart.sidebarOpen && deltaX < 0) this.closeSidebar();
    this.touchStart = null;
  }

  lockBodyScroll() {
    if (this.scrollLockCount === 0) {
      this.lockedScrollY = window.scrollY || document.documentElement.scrollTop || 0;
      document.body.style.top = `-${this.lockedScrollY}px`;
      document.body.classList.add('sidebar-open');
    }
    this.scrollLockCount += 1;
  }

  unlockBodyScroll() {
    if (this.scrollLockCount === 0) return;
    this.scrollLockCount -= 1;
    if (this.scrollLockCount > 0) return;

    document.body.classList.remove('sidebar-open');
    document.body.style.top = '';
    window.scrollTo(0, this.lockedScrollY);
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
    const element = document.getElementById(id);
    if (!element) return;
    element.value = value;
    if (element.matches(SEARCHABLE_SELECT_VALUE)) searchableSelect.sync(element);
  },

  clear(ids) {
    ids.forEach(id => this.set(id));
  }
};
