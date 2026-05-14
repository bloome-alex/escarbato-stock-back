import { appConfig } from './config.js';

const emptyData = () => ({ proveedores: [], tipos: [], productos: [], stock: {}, ventas: [], auditoria: [] });

class IndexedDbStore {
  constructor(app) {
    this.app = app;
    this.dbName = 'EscarbatoDB';
    this.dbVersion = 3;
    this.db = null;
    this.data = emptyData();
  }

  async init() {
    await this.openDB();
    await this.loadAll();
  }

  openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this.dbName, this.dbVersion);
      req.onupgradeneeded = event => {
        const db = event.target.result;
        ['proveedores', 'tipos', 'productos', 'stock', 'ventas', 'auditoria'].forEach(store => {
          if (!db.objectStoreNames.contains(store)) {
            db.createObjectStore(store, { keyPath: 'id' });
          }
        });
      };
      req.onsuccess = event => {
        this.db = event.target.result;
        resolve(this.db);
      };
      req.onerror = () => reject(req.error);
    });
  }

  getAll(store) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(store, 'readonly');
      const req = tx.objectStore(store).getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  put(store, obj) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(store, 'readwrite');
      const req = tx.objectStore(store).put(obj);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  delete(store, id) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(store, 'readwrite');
      const req = tx.objectStore(store).delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async loadAll() {
    this.data.proveedores = await this.getAll('proveedores');
    this.data.tipos = await this.getAll('tipos');
    this.data.productos = await this.getAll('productos');
    this.data.ventas = await this.getAll('ventas');
    this.data.auditoria = await this.getAll('auditoria');
    const stockRecords = await this.getAll('stock');
    this.data.stock = {};
    stockRecords.forEach(record => {
      this.data.stock[record.id] = record.qty;
    });
  }

  createId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }
}

class BackendStore {
  constructor(config, app) {
    this.app = app;
    this.config = config;
    this.baseUrl = config.backendUrl.replace(/\/$/, '');
    this.token = sessionStorage.getItem('petshopAuthToken') || '';
    this.data = emptyData();
  }

  async init() {
    await this.ensureToken();
    await this.loadAll();
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
        errorMsg.style.cssText = 'color:#e53;color;font-size:.85rem;margin-top:8px;text-align:center';
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
    sessionStorage.setItem('petshopAuthToken', this.token);
    if (modal) modal.remove();
  }

  askCredentials() {
    return new Promise(resolve => {
      document.querySelectorAll('.login-modal').forEach(m => m.remove());
      const modal = document.createElement('div');
      modal.className = 'modal-overlay open login-modal';
      modal.innerHTML = `<div class="modal" style="max-width:380px"><div class="modal-title"><span>Iniciar sesión</span></div><div class="form-group"><label>Usuario</label><input type="text" id="backend-login-user" autocomplete="username"></div><div class="form-group"><label>Contraseña</label><input type="password" id="backend-login-pass" autocomplete="current-password"></div><div class="modal-actions"><button class="btn btn-primary" id="backend-login-submit">Ingresar</button></div></div>`;
      document.body.appendChild(modal);

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
    this.data = await this.request('/api/data');
  }

  async put(store, obj) {
    await this.request(`/api/${store}/${encodeURIComponent(obj.id)}`, {
      method: 'PUT',
      body: JSON.stringify(obj)
    });
  }

  async delete(store, id) {
    await this.request(`/api/${store}/${encodeURIComponent(id)}`, { method: 'DELETE' });
  }

  createId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }
}

export class DataStore {
  constructor(config = appConfig, app) {
    return config.dataProvider === 'backend' ? new BackendStore(config, app) : new IndexedDbStore(app);
  }
}
