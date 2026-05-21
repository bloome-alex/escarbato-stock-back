import { appConfig } from './config.js';

const emptyData = () => ({ proveedores: [], tipos: [], productos: [], metodosPago: [], stock: {}, reservedStock: {}, ventas: [], cajas: [], peluqueriaTiposPerro: [], peluqueriaServicios: [], peluqueriaTurnos: [], peluqueriaHorarios: [], auditoria: [], usuarios: [] });

const reportTimestamp = (date = new Date()) => {
  const pad = value => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}-${pad(date.getHours())}-${pad(date.getMinutes())}`;
};

class BackendStore {
  constructor(config, app) {
    this.app = app;
    this.config = config;
    this.baseUrl = config.backendUrl.replace(/\/$/, '');
    this.token = sessionStorage.getItem('petshopAuthToken') || '';
    this.currentUser = this.parseTokenUser(this.token);
    this.clientId = globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : this.createId();
    this.data = emptyData();
    this.socket = null;
  }

  async init() {
    await this.ensureToken();
    this.dashboard = null;
    this.connectRealtime();
    window.addEventListener('pagehide', () => this.sendRealtime({ type: 'cart:clear' }));
  }

  async ensureToken() {
    if (this.token) return;

    let username, password, modal;
    if (this.config.username && this.config.password) {
      username = this.config.username;
      password = this.config.password;
    } else {
      const result = await this.askCredentials();
      username = result.username;
      password = result.password;
      modal = result.modal;
    }
    if (!username || !password) throw new Error('Credenciales del backend requeridas');

    const response = await fetch(`${this.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    if (!response.ok) {
      this.token = '';
      sessionStorage.removeItem('petshopAuthToken');
      if (modal) {
        const input = modal.querySelector('#backend-login-user');
        const errorMsg = modal.querySelector('.login-error') || document.createElement('div');
        errorMsg.className = 'login-error';
        errorMsg.style.cssText = 'color:var(--danger);font-size:.85rem;margin-top:8px;text-align:center';
        errorMsg.textContent = 'Usuario o contraseña incorrectos';
        if (!modal.querySelector('.login-error')) {
          modal.querySelector('.modal-actions').before(errorMsg);
        }
        input.value = '';
        input.focus();
        this.app?.toasts?.show('Usuario o contraseña incorrectos', 'error');
        return this.ensureToken();
      }
      this.app?.toasts?.show('Usuario o contraseña incorrectos', 'error');
      throw new Error('No se pudo iniciar sesión en el backend');
    }
    const result = await response.json();
    this.token = result.token;
    this.currentUser = result.user || null;
    sessionStorage.setItem('petshopAuthToken', this.token);
    if (modal) modal.remove();
  }

  askCredentials() {
    return new Promise(resolve => {
      document.querySelectorAll('.login-modal').forEach(m => m.remove());
      const modal = document.createElement('div');
      modal.className = 'modal-overlay open login-modal';
      modal.innerHTML = `<div class="modal" style="max-width:380px"><div class="modal-title"><span>Iniciar sesión</span></div><div class="form-group"><label>Usuario</label><input type="text" id="backend-login-user" autocomplete="username"></div><div class="form-group"><label>Contraseña</label><div class="password-field"><input type="password" id="backend-login-pass" autocomplete="current-password"><button type="button" class="password-toggle" id="backend-login-pass-toggle" aria-label="Mostrar contraseña" aria-pressed="false"><span class="password-eye" aria-hidden="true"></span></button></div></div><div class="modal-actions"><button class="btn btn-primary" id="backend-login-submit">Ingresar</button></div></div>`;
      document.body.appendChild(modal);

      const passwordInput = modal.querySelector('#backend-login-pass');
      const passwordToggle = modal.querySelector('#backend-login-pass-toggle');
      passwordToggle.addEventListener('click', () => {
        const showPassword = passwordInput.type === 'password';
        passwordInput.type = showPassword ? 'text' : 'password';
        passwordToggle.setAttribute('aria-label', showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña');
        passwordToggle.setAttribute('aria-pressed', String(showPassword));
        passwordToggle.classList.toggle('is-visible', showPassword);
      });

      const submit = () => {
        const username = document.getElementById('backend-login-user').value.trim();
        const password = document.getElementById('backend-login-pass').value;
        resolve({ username, password, modal });
      };

      modal.querySelector('#backend-login-submit').addEventListener('click', submit);
      modal.addEventListener('keydown', event => {
        if (event.key === 'Enter') submit();
      });
      modal.querySelector('#backend-login-user').focus();
    });
  }

  async request(path, options = {}, retry = true) {
    await this.ensureToken();
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Id': this.clientId,
        ...(options.headers || {}),
        Authorization: `Bearer ${this.token}`
      }
    });

    if (response.status === 401 && retry) {
      sessionStorage.removeItem('petshopAuthToken');
      this.token = '';
      return this.request(path, options, false);
    }

    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      throw new Error(result.error || 'Error del backend');
    }

    if (response.status === 204) return null;
    return response.json();
  }

  async loadAll() {
    const reservedStock = this.data.reservedStock || {};
    this.data = await this.request('/api/data');
    this.data.reservedStock = reservedStock;
    this.dashboard = null;
  }

  async getDashboard() {
    this.dashboard = await this.request('/api/dashboard');
    return this.dashboard;
  }

  async getPage(store, { page = 1, limit = 10, q = '' } = {}) {
    const params = new URLSearchParams({ page, limit });
    if (q) params.set('q', q);
    return this.request(`/api/${store}?${params.toString()}`);
  }

  async getById(store, id) {
    return this.request(`/api/${store}/${encodeURIComponent(id)}`);
  }

  async put(store, obj) {
    return this.request(`/api/${store}/${encodeURIComponent(obj.id)}`, {
      method: 'PUT',
      body: JSON.stringify(obj)
    });
  }

  async delete(store, id) {
    await this.request(`/api/${store}/${encodeURIComponent(id)}`, { method: 'DELETE' });
  }

  async getUsers() {
    const users = await this.request('/api/auth/users');
    this.data.usuarios = users;
    return users;
  }

  async updateUser(user) {
    const savedUser = await this.request(`/api/auth/users/${encodeURIComponent(user.id)}`, {
      method: 'PUT',
      body: JSON.stringify(user)
    });
    const index = this.data.usuarios.findIndex(item => item.id === savedUser.id);
    if (index >= 0) this.data.usuarios[index] = savedUser;
    else this.data.usuarios.push(savedUser);
    return savedUser;
  }

  async downloadProductsPdf(retry = true) {
    await this.ensureToken();
    const response = await fetch(`${this.baseUrl}/api/reportes/productos.pdf`, {
      headers: { Authorization: `Bearer ${this.token}` }
    });
    if (response.status === 401 && retry) {
      sessionStorage.removeItem('petshopAuthToken');
      this.token = '';
      return this.downloadProductsPdf(false);
    }
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      throw new Error(result.error || 'No se pudo descargar el PDF');
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reporte-productos-${reportTimestamp()}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async downloadProductsXlsx(retry = true) {
    await this.ensureToken();
    const response = await fetch(`${this.baseUrl}/api/reportes/productos.xlsx`, {
      headers: { Authorization: `Bearer ${this.token}` }
    });
    if (response.status === 401 && retry) {
      sessionStorage.removeItem('petshopAuthToken');
      this.token = '';
      return this.downloadProductsXlsx(false);
    }
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      throw new Error(result.error || 'No se pudo descargar el XLSX');
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reporte-productos-${reportTimestamp()}.xlsx`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  createId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  parseTokenUser(token) {
    try {
      const encodedPayload = ((token || '').split('.')[1] || '').replace(/-/g, '+').replace(/_/g, '/');
      const paddedPayload = encodedPayload.padEnd(Math.ceil(encodedPayload.length / 4) * 4, '=');
      const payload = JSON.parse(atob(paddedPayload));
      return payload.id ? { id: payload.id, username: payload.username || '' } : null;
    } catch {
      return null;
    }
  }

  connectRealtime() {
    if (!('WebSocket' in window) || this.socket) return;

    const httpBase = this.baseUrl || window.location.origin;
    const url = new URL(httpBase, window.location.origin);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    url.pathname = '/ws';
    url.search = new URLSearchParams({ token: this.token, clientId: this.clientId }).toString();

    this.socket = new WebSocket(url.toString());
    this.socket.addEventListener('message', event => {
      const message = JSON.parse(event.data || '{}');
      if (message.clientId && message.clientId === this.clientId) return;
      if (message.type === 'cart-stock-changed') {
        this.applyCartReservations(message.reservations || {});
        this.app?.handleCartStockChange?.(message);
        return;
      }
      if (message.type === 'data-changed') this.app?.handleRealtimeChange?.(message);
    });
    this.socket.addEventListener('close', () => {
      this.socket = null;
      setTimeout(() => this.connectRealtime(), 2000);
    });
    this.socket.addEventListener('error', () => this.socket?.close());
  }

  sendRealtime(message) {
    if (this.socket?.readyState !== WebSocket.OPEN) return;
    this.socket.send(JSON.stringify(message));
  }

  applyCartReservations(reservations) {
    const reservedStock = {};
    for (const [clientId, items] of Object.entries(reservations)) {
      if (clientId === this.clientId) continue;
      for (const [productId, qty] of Object.entries(items || {})) {
        reservedStock[productId] = Number((Number(reservedStock[productId] || 0) + Number(qty || 0)).toFixed(4));
      }
    }
    this.data.reservedStock = reservedStock;
  }
}

export class DataStore {
  constructor(config = appConfig, app) {
    return new BackendStore(config, app);
  }
}
