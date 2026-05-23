import { appConfig } from './config.js?v=20260523-1';

const emptyData = () => ({ proveedores: [], tipos: [], productos: [], metodosPago: [], stock: {}, reservedStock: {}, ventas: [], cajas: [], peluqueriaTiposPerro: [], peluqueriaServicios: [], peluqueriaTurnos: [], peluqueriaHorarios: [], ticketConfig: [], auditoria: [], usuarios: [] });
const DB_NAME = 'petshopOfflineStore';
const DB_VERSION = 1;
const DB_STORE = 'state';
const CACHE_KEY = 'petshopDataCache';
const OFFLINE_QUEUE_KEY = 'petshopOfflineQueue';
const REALTIME_RECONNECT_DELAY = 30000;
const REALTIME_HEARTBEAT_TIMEOUT = 7000;
const REALTIME_HEARTBEAT_CHECK_INTERVAL = 1000;

const reportTimestamp = (date = new Date()) => {
  const pad = value => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}-${pad(date.getHours())}-${pad(date.getMinutes())}`;
};

class BackendStore {
  constructor(config, app) {
    this.app = app;
    this.config = config;
    this.baseUrl = config.backendUrl.replace(/\/$/, '');
    this.token = localStorage.getItem('petshopAuthToken') || sessionStorage.getItem('petshopAuthToken') || '';
    this.currentUser = this.parseTokenUser(this.token);
    this.clientId = globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : this.createId();
    this.data = emptyData();
    this.offlineQueue = [];
    this.isSyncingOfflineQueue = false;
    this.wasOffline = false;
    this.socket = null;
    this.realtimeReconnectTimer = null;
    this.realtimeHeartbeatTimer = null;
    this.lastRealtimeMessageAt = 0;
    this.loginPromise = null;
  }

  async init() {
    this.offlineQueue = await this.loadOfflineQueue();
    this.data = await this.loadCachedData() || this.data;
    if (this.token || !this.hasCachedData()) {
      try {
        await this.ensureToken();
      } catch (error) {
        if (!this.hasCachedData() || !this.isNetworkError(error)) throw error;
        this.handleConnectionLost('Sin conexión con el backend: entrando con datos guardados localmente');
      }
    }
    this.dashboard = null;
    this.connectRealtime();
    window.addEventListener('online', () => this.connectRealtime());
    window.addEventListener('offline', () => this.forceRealtimeReconnect());
    if (!navigator.onLine) this.handleConnectionLost();
    window.addEventListener('pagehide', () => this.sendRealtime({ type: 'cart:clear' }));
  }

  async ensureToken({ interactive = false } = {}) {
    if (this.token) return;
    if (!navigator.onLine && this.hasCachedData()) return;

    if (this.loginPromise) return this.loginPromise;
    this.loginPromise = this.login({ interactive });
    try {
      await this.loginPromise;
    } finally {
      this.loginPromise = null;
    }
  }

  async login({ interactive = false } = {}) {
    let username, password, modal;
    if (!interactive && this.config.username && this.config.password) {
      username = this.config.username;
      password = this.config.password;
    } else {
      const result = await this.askCredentials();
      username = result.username;
      password = result.password;
      modal = result.modal;
    }
    if (!username || !password) throw new Error('Credenciales del backend requeridas');

    let response;
    try {
      response = await fetch(`${this.baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
    } catch (error) {
      if (this.isNetworkError(error) && this.hasCachedData()) {
        if (modal) modal.remove();
        this.handleConnectionLost('Sin conexión: entrando con datos guardados localmente');
        return;
      }
      throw error;
    }

    if (!response.ok) {
      this.token = '';
      sessionStorage.removeItem('petshopAuthToken');
      localStorage.removeItem('petshopAuthToken');
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
        return this.login({ interactive: true });
      }
      this.app?.toasts?.show('Usuario o contraseña incorrectos', 'error');
      throw new Error('No se pudo iniciar sesión en el backend');
    }
    const result = await response.json();
    this.token = result.token;
    this.currentUser = result.user || null;
    sessionStorage.setItem('petshopAuthToken', this.token);
    localStorage.setItem('petshopAuthToken', this.token);
    if (modal) modal.remove();
    this.connectRealtime();
    this.processOfflineQueue();
  }

  async handleAuthRejected(message = 'La sesión venció. Iniciá sesión nuevamente') {
    sessionStorage.removeItem('petshopAuthToken');
    localStorage.removeItem('petshopAuthToken');
    this.token = '';
    this.currentUser = null;
    this.disconnectRealtime();
    this.app?.toasts?.show(message, 'error');
    await this.ensureToken({ interactive: true });
    this.connectRealtime();
    this.processOfflineQueue();
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
    if (!this.token && !navigator.onLine && this.hasCachedData()) {
      throw new TypeError('Offline without token');
    }
    await this.ensureToken();
    let response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'X-Client-Id': this.clientId,
          ...(options.headers || {}),
          Authorization: `Bearer ${this.token}`
        }
      });
    } catch (error) {
      if (this.isNetworkError(error)) this.handleConnectionLost();
      throw error;
    }

    if (response.status === 401 && retry) {
      await this.handleAuthRejected();
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
    if (!navigator.onLine && this.hasCachedData()) {
      this.handleConnectionLost('Sin conexión: usando datos guardados localmente');
      this.data.reservedStock = reservedStock;
      this.dashboard = null;
      return;
    }

    try {
      this.data = await this.request('/api/data');
      this.wasOffline = false;
    } catch (error) {
      const cachedData = await this.loadCachedData();
      if (!cachedData || !this.isNetworkError(error)) throw error;
      this.data = cachedData;
      this.handleConnectionLost('Sin conexión: usando datos guardados localmente');
    }
    this.data.reservedStock = reservedStock;
    this.dashboard = null;
    await this.saveCachedData();
  }

  async getDashboard() {
    if (!this.token && this.hasCachedData()) {
      this.dashboard = this.getLocalDashboard();
      return this.dashboard;
    }

    try {
      this.dashboard = await this.request('/api/dashboard');
    } catch (error) {
      if (!this.isNetworkError(error)) throw error;
      this.handleConnectionLost();
      this.dashboard = this.getLocalDashboard();
    }
    return this.dashboard;
  }

  async getPage(store, { page = 1, limit = 10, q = '' } = {}) {
    const params = new URLSearchParams({ page, limit });
    if (q) params.set('q', q);
    try {
      return await this.request(`/api/${store}?${params.toString()}`);
    } catch (error) {
      if (!this.isNetworkError(error)) throw error;
      this.handleConnectionLost();
      return this.getLocalPage(store, { page, limit, q });
    }
  }

  async getById(store, id) {
    try {
      return await this.request(`/api/${store}/${encodeURIComponent(id)}`);
    } catch (error) {
      if (!this.isNetworkError(error)) throw error;
      this.handleConnectionLost();
      const localRecord = this.getLocalRecord(store, id);
      if (localRecord) return localRecord;
      throw error;
    }
  }

  async put(store, obj) {
    const path = `/api/${store}/${encodeURIComponent(obj.id)}`;
    const options = { method: 'PUT', body: JSON.stringify(obj) };
    const previous = this.getLocalRecord(store, obj.id);
    if (!navigator.onLine) {
      await this.queueOfflineOperation({ store, action: 'upsert', id: obj.id, path, options, record: obj, previous });
      this.applyLocalUpsert(store, obj);
      await this.saveCachedData();
      this.handleConnectionLost('Sin conexión: cambio guardado localmente para sincronizar luego');
      return obj;
    }

    try {
      const savedRecord = await this.request(path, options);
      this.applyLocalUpsert(store, savedRecord || obj);
      await this.saveCachedData();
      return savedRecord;
    } catch (error) {
      if (!this.isNetworkError(error)) throw error;
      await this.queueOfflineOperation({ store, action: 'upsert', id: obj.id, path, options, record: obj, previous });
      this.applyLocalUpsert(store, obj);
      await this.saveCachedData();
      this.handleConnectionLost('Sin conexión: cambio guardado localmente para sincronizar luego');
      return obj;
    }
  }

  async delete(store, id) {
    const path = `/api/${store}/${encodeURIComponent(id)}`;
    const options = { method: 'DELETE' };
    if (!navigator.onLine) {
      const previous = this.getLocalRecord(store, id);
      await this.queueOfflineOperation({ store, action: 'delete', id, path, options, previous });
      this.applyLocalDelete(store, id);
      await this.saveCachedData();
      this.handleConnectionLost('Sin conexión: eliminación guardada localmente para sincronizar luego');
      return;
    }

    try {
      await this.request(path, options);
      this.applyLocalDelete(store, id);
      await this.saveCachedData();
    } catch (error) {
      if (!this.isNetworkError(error)) throw error;
      const previous = this.getLocalRecord(store, id);
      await this.queueOfflineOperation({ store, action: 'delete', id, path, options, previous });
      this.applyLocalDelete(store, id);
      await this.saveCachedData();
      this.handleConnectionLost('Sin conexión: eliminación guardada localmente para sincronizar luego');
    }
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
      await this.handleAuthRejected();
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
      await this.handleAuthRejected();
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
    if (!this.token) return;
    if (this.realtimeReconnectTimer) {
      clearTimeout(this.realtimeReconnectTimer);
      this.realtimeReconnectTimer = null;
    }

    const httpBase = this.baseUrl || window.location.origin;
    const url = new URL(httpBase, window.location.origin);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    url.pathname = '/ws';
    url.search = new URLSearchParams({ token: this.token, clientId: this.clientId }).toString();

    this.socket = new WebSocket(url.toString());
    const socket = this.socket;
    socket.addEventListener('open', () => {
      this.lastRealtimeMessageAt = Date.now();
      this.startRealtimeHeartbeatMonitor(socket);
      this.handleConnectionRestored();
    });
    socket.addEventListener('message', event => {
      this.lastRealtimeMessageAt = Date.now();
      const message = JSON.parse(event.data || '{}');
      if (message.type === 'connected' || message.type === 'heartbeat') return;
      if (message.clientId && message.clientId === this.clientId) return;
      if (message.type === 'cart-stock-changed') {
        this.applyCartReservations(message.reservations || {});
        this.app?.handleCartStockChange?.(message);
        return;
      }
      if (message.type === 'data-changed') this.app?.handleRealtimeChange?.(message);
    });
    socket.addEventListener('close', event => {
      if (this.socket === socket) this.socket = null;
      this.stopRealtimeHeartbeatMonitor();
      if (event.code === 1008) return;
      this.handleConnectionLost();
      this.scheduleRealtimeReconnect();
    });
    socket.addEventListener('error', () => socket.close());
  }

  startRealtimeHeartbeatMonitor(socket) {
    this.stopRealtimeHeartbeatMonitor();
    this.realtimeHeartbeatTimer = setInterval(() => {
      if (this.socket !== socket || socket.readyState !== WebSocket.OPEN) return;
      if (Date.now() - this.lastRealtimeMessageAt <= REALTIME_HEARTBEAT_TIMEOUT) return;
      this.handleConnectionLost();
      this.forceRealtimeReconnect(socket);
    }, REALTIME_HEARTBEAT_CHECK_INTERVAL);
  }

  forceRealtimeReconnect(socket = this.socket) {
    if (socket && this.socket === socket) this.socket = null;
    this.stopRealtimeHeartbeatMonitor();
    this.handleConnectionLost();
    try {
      if (socket && socket.readyState !== WebSocket.CLOSED) socket.close();
    } catch {}
    this.scheduleRealtimeReconnect();
  }

  scheduleRealtimeReconnect() {
    if (this.realtimeReconnectTimer) return;
    this.realtimeReconnectTimer = setTimeout(() => {
      this.realtimeReconnectTimer = null;
      this.connectRealtime();
    }, REALTIME_RECONNECT_DELAY);
  }

  stopRealtimeHeartbeatMonitor() {
    if (!this.realtimeHeartbeatTimer) return;
    clearInterval(this.realtimeHeartbeatTimer);
    this.realtimeHeartbeatTimer = null;
  }

  disconnectRealtime() {
    if (this.realtimeReconnectTimer) {
      clearTimeout(this.realtimeReconnectTimer);
      this.realtimeReconnectTimer = null;
    }
    if (!this.socket) return;
    const socket = this.socket;
    this.socket = null;
    this.stopRealtimeHeartbeatMonitor();
    socket.close(1008, 'auth');
  }

  sendRealtime(message) {
    if (this.socket?.readyState !== WebSocket.OPEN) return;
    this.socket.send(JSON.stringify(message));
  }

  isNetworkError(error) {
    return !navigator.onLine || error instanceof TypeError || error?.name === 'NetworkError' || error?.message === 'Failed to fetch';
  }

  hasCachedData() {
    return Object.entries(this.data || {}).some(([key, value]) => {
      if (key === 'reservedStock') return false;
      if (Array.isArray(value)) return value.length > 0;
      return value && typeof value === 'object' && Object.keys(value).length > 0;
    });
  }

  openOfflineDb() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(DB_STORE)) db.createObjectStore(DB_STORE);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async idbGet(key) {
    if (!('indexedDB' in window)) return null;
    const db = await this.openOfflineDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(DB_STORE, 'readonly');
      const request = transaction.objectStore(DB_STORE).get(key);
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error);
      transaction.oncomplete = () => db.close();
      transaction.onerror = () => db.close();
    });
  }

  async idbSet(key, value) {
    if (!('indexedDB' in window)) return;
    const db = await this.openOfflineDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(DB_STORE, 'readwrite');
      transaction.objectStore(DB_STORE).put(value, key);
      transaction.oncomplete = () => {
        db.close();
        resolve();
      };
      transaction.onerror = () => {
        db.close();
        reject(transaction.error);
      };
    });
  }

  async loadCachedData() {
    try {
      const cached = await this.idbGet(CACHE_KEY);
      return cached && typeof cached === 'object' ? { ...emptyData(), ...cached } : null;
    } catch {
      return null;
    }
  }

  async saveCachedData() {
    try {
      await this.idbSet(CACHE_KEY, { ...this.data, reservedStock: {} });
    } catch {}
  }

  async loadOfflineQueue() {
    try {
      const queue = await this.idbGet(OFFLINE_QUEUE_KEY);
      return Array.isArray(queue) ? queue : [];
    } catch {
      return [];
    }
  }

  async saveOfflineQueue() {
    try {
      await this.idbSet(OFFLINE_QUEUE_KEY, this.offlineQueue);
    } catch {}
  }

  async queueOfflineOperation(operation) {
    const queuedOperation = { ...operation, queuedAt: new Date().toISOString() };
    const index = this.offlineQueue.findIndex(item => item.store === operation.store && item.id === operation.id);
    const existingOperation = index >= 0 ? this.offlineQueue[index] : null;
    if (operation.action === 'delete' && existingOperation?.action === 'upsert' && !existingOperation.previous) {
      this.offlineQueue.splice(index, 1);
    } else if (index >= 0) {
      this.offlineQueue[index] = queuedOperation;
    } else {
      this.offlineQueue.push(queuedOperation);
    }
    await this.saveOfflineQueue();
  }

  async processOfflineQueue() {
    if (this.isSyncingOfflineQueue || !this.offlineQueue.length || !navigator.onLine || !this.token) return;
    this.isSyncingOfflineQueue = true;
    try {
      while (this.offlineQueue.length) {
        const operation = this.offlineQueue[0];
        await this.request(operation.path, operation.options);
        this.offlineQueue.shift();
        await this.saveOfflineQueue();
      }
      await this.loadAll();
      this.app?.toasts?.show('Cambios locales sincronizados');
      this.app?.handleRealtimeChange?.({ type: 'data-changed' });
    } catch (error) {
      if (!this.isNetworkError(error)) this.app?.toasts?.show(error.message || 'No se pudieron sincronizar los cambios locales', 'error');
    } finally {
      this.isSyncingOfflineQueue = false;
    }
  }

  handleConnectionLost(message = '') {
    if (this.wasOffline) return;
    this.wasOffline = true;
    this.app?.setConnectionStatus?.(true);
  }

  handleConnectionRestored({ silent = false } = {}) {
    const shouldNotify = this.wasOffline && !silent;
    this.wasOffline = false;
    this.app?.setConnectionStatus?.(false);
    if (shouldNotify) this.app?.toasts?.show('Conexión restaurada. Sincronizando cambios locales');
    this.processOfflineQueue();
  }

  getLocalRecord(store, id) {
    if (store === 'stock') return id in (this.data.stock || {}) ? { id, qty: this.data.stock[id] } : null;
    const list = this.data[store];
    return Array.isArray(list) ? list.find(item => item.id === id) || null : null;
  }

  getLocalPage(store, { page = 1, limit = 10, q = '' } = {}) {
    const list = Array.isArray(this.data[store]) ? this.data[store] : [];
    const normalizedQuery = String(q || '').toLocaleLowerCase('es');
    const filtered = normalizedQuery
      ? list.filter(item => JSON.stringify(item).toLocaleLowerCase('es').includes(normalizedQuery))
      : list;
    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const currentPage = Math.min(Math.max(1, Number(page) || 1), totalPages);
    const start = (currentPage - 1) * limit;
    return { items: filtered.slice(start, start + Number(limit)), page: currentPage, limit: Number(limit), total, totalPages };
  }

  getLocalDashboard() {
    const data = this.data || emptyData();
    const stock = data.stock || {};
    const productos = data.productos || [];
    const lowProducts = productos.filter(product => {
      const qty = stock[product.id] || 0;
      const minStock = product.minStock ?? 0;
      return qty <= minStock;
    });
    const tipoById = new Map((data.tipos || []).map(item => [item.id, item.nombre]));

    return {
      totals: {
        proveedores: (data.proveedores || []).length,
        tipos: (data.tipos || []).length,
        productos: productos.length,
        lowStock: lowProducts.length
      },
      stockAlerts: lowProducts.slice(0, 8).map(product => {
        const qty = stock[product.id] || 0;
        return {
          ...product,
          qty,
          status: qty === 0 ? 'Sin stock' : 'Stock bajo'
        };
      }),
      recentProducts: [...productos]
        .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))
        .slice(0, 8)
        .map(product => ({ ...product, tipoNombre: tipoById.get(product.tipoId) || '' })),
      auditActivity: [...(data.auditoria || [])]
        .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
        .slice(0, 12)
    };
  }

  applyLocalUpsert(store, record) {
    if (!record?.id) return;
    if (store === 'stock') {
      this.data.stock = this.data.stock || {};
      this.data.stock[record.id] = record.qty;
      return;
    }

    const list = Array.isArray(this.data[store]) ? this.data[store] : [];
    this.data[store] = list;
    const index = list.findIndex(item => item.id === record.id);
    const previous = index >= 0 ? list[index] : null;
    if (index >= 0) list[index] = record;
    else list.push(record);

    if (store === 'ventas' && !previous) {
      for (const item of record.items || []) {
        const currentQty = this.data.stock[item.productId] || 0;
        this.data.stock[item.productId] = Number((currentQty - Number(item.qty || 0)).toFixed(4));
      }
    }
  }

  applyLocalDelete(store, id) {
    if (store === 'stock') {
      delete this.data.stock[id];
      return;
    }

    const list = Array.isArray(this.data[store]) ? this.data[store] : [];
    const deleted = list.find(item => item.id === id);
    this.data[store] = list.filter(item => item.id !== id);
    if (store === 'productos') delete this.data.stock[id];
    if (store === 'ventas' && deleted) {
      for (const item of deleted.items || []) {
        const currentQty = this.data.stock[item.productId] || 0;
        this.data.stock[item.productId] = Number((currentQty + Number(item.qty || 0)).toFixed(4));
      }
    }
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
