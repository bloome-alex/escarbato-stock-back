import { searchableSelect } from '../ui.js';

export class AdminPanelComponent {
  constructor(root) {
    this.root = root;
    this.token = sessionStorage.getItem('admin-token') || '';
    this.empresas = [];
    this.editingId = '';
    this.passwordEmpresaId = '';
  }

  async init() {
    searchableSelect.bind();
    this.render();
    if (this.token) await this.loadEmpresas();
  }

  render() {
    this.root.innerHTML = `<div class="shell">
      <section class="card top"><div><p class="muted">Administración centralizada</p><h1>Empresas</h1></div><button class="secondary" data-action="logout">Salir</button></section>
      ${this.token ? this.renderPanel() : this.renderLogin()}
    </div>`;
    this.bindEvents();
  }

  renderLogin() {
    return `<section class="card"><h2>Ingreso admin</h2><p class="muted">Disponible solo desde la IP/VPN configurada.</p><div class="grid"><input id="admin-user" placeholder="Usuario"><input id="admin-pass" type="password" placeholder="Contraseña"></div><p class="error" id="admin-error"></p><button data-action="login">Ingresar</button></section>`;
  }

  renderPanel() {
    const editing = this.empresas.find(empresa => empresa._id === this.editingId) || null;
    const rows = this.empresas.map(empresa => `<tr><td><strong>${this.escape(empresa.name)}</strong><br><span class="muted">${this.escape(empresa.nameSlug || '')}</span></td><td>${this.escape(empresa.dbName)}</td><td>${empresa.isActive ? 'Activa' : 'Inactiva'}</td><td><div class="actions"><button class="secondary" data-action="edit" data-id="${empresa._id}">Editar</button><button class="secondary" data-action="password" data-id="${empresa._id}">Password</button><button class="danger" data-action="disable" data-id="${empresa._id}">Deshabilitar</button></div></td></tr>`).join('');
    return `<section class="card"><div class="top"><h2>Empresas registradas</h2><button data-action="refresh">Actualizar</button></div><table><thead><tr><th>Empresa</th><th>DB</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>${rows || '<tr><td colspan="4" class="muted">No hay empresas registradas.</td></tr>'}</tbody></table></section>
    <section class="card"><h2>${editing ? 'Editar empresa' : 'Nueva empresa'}</h2><div class="grid">
      ${this.input('name', 'Nombre', editing?.name)}${this.input('nameSlug', 'Subdominio slug', editing?.nameSlug)}${this.input('businessType', 'Tipo de negocio', editing?.businessType)}${this.input('assetsPath', 'assets/empresa', editing?.assetsPath)}${this.input('dbName', 'db_empresa', editing?.dbName, Boolean(editing))}${this.input('jwtSecret', editing ? 'JWT secret (nuevo o actual)' : 'JWT secret')}${this.input('authUsername', 'Usuario auth', editing?.authUsername)}${this.input('supervisorUsername', 'Usuario supervisor', editing?.supervisorUsername)}${editing ? '' : `${this.input('authPassword', 'Password auth', '', false, 'password')}${this.input('supervisorPassword', 'Password supervisor', '', false, 'password')}`}
    </div><p class="error" id="admin-error"></p><div class="actions"><button data-action="${editing ? 'update' : 'create'}">${editing ? 'Guardar cambios' : 'Crear empresa'}</button>${editing ? '<button class="secondary" data-action="cancel-edit">Cancelar</button>' : ''}</div></section>
    <section class="card ${this.passwordEmpresaId ? '' : 'hidden'}"><h2>Cambiar contraseña</h2><div class="grid">${searchableSelect.template({ id: 'password-role', placeholder: 'Rol', value: 'auth', options: [{ value: 'auth', label: 'Auth' }, { value: 'supervisor', label: 'Supervisor' }] })}<input id="password-value" type="password" placeholder="Nueva contraseña"></div><p class="muted">${this.escape(this.passwordEmpresaName())}</p><div class="actions"><button data-action="save-password">Actualizar contraseña</button><button class="secondary" data-action="cancel-password">Cancelar</button></div></section>`;
  }

  input(id, placeholder, value = '', disabled = false, type = 'text') {
    return `<input id="${id}" type="${type}" placeholder="${this.escape(placeholder)}" value="${this.escape(value || '')}" ${disabled ? 'disabled' : ''}>`;
  }

  bindEvents() {
    this.root.querySelector('[data-action="login"]')?.addEventListener('click', () => this.login());
    this.root.querySelector('[data-action="logout"]')?.addEventListener('click', () => this.logout());
    this.root.querySelector('[data-action="refresh"]')?.addEventListener('click', () => this.loadEmpresas());
    this.root.querySelector('[data-action="create"]')?.addEventListener('click', () => this.createEmpresa());
    this.root.querySelector('[data-action="update"]')?.addEventListener('click', () => this.updateEmpresa());
    this.root.querySelector('[data-action="cancel-edit"]')?.addEventListener('click', () => { this.editingId = ''; this.render(); });
    this.root.querySelector('[data-action="save-password"]')?.addEventListener('click', () => this.updatePassword());
    this.root.querySelector('[data-action="cancel-password"]')?.addEventListener('click', () => { this.passwordEmpresaId = ''; this.render(); });
    this.root.querySelectorAll('[data-action="edit"]').forEach(button => button.addEventListener('click', () => { this.editingId = button.dataset.id; this.render(); }));
    this.root.querySelectorAll('[data-action="password"]').forEach(button => button.addEventListener('click', () => { this.passwordEmpresaId = button.dataset.id; this.render(); }));
    this.root.querySelectorAll('[data-action="disable"]').forEach(button => button.addEventListener('click', () => this.disableEmpresa(button.dataset.id)));
  }

  async request(path, options = {}) {
    const response = await fetch(path, { ...options, headers: { 'Content-Type': 'application/json', ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}), ...(options.headers || {}) } });
    if (!response.ok) throw new Error((await response.json().catch(() => null))?.error || 'Operación fallida');
    return response.status === 204 ? null : response.json();
  }

  async login() {
    try {
      const result = await this.request('/api/admin/login', { method: 'POST', body: JSON.stringify({ username: this.value('admin-user'), password: this.value('admin-pass') }) });
      this.token = result.token;
      sessionStorage.setItem('admin-token', this.token);
      await this.loadEmpresas();
    } catch (error) { this.showError(error.message); }
  }

  async loadEmpresas() {
    try {
      this.empresas = await this.request('/api/admin/empresas');
      this.render();
    } catch (error) { this.showError(error.message); }
  }

  async createEmpresa() {
    try {
      await this.request('/api/admin/empresas', { method: 'POST', body: JSON.stringify(this.formPayload(true)) });
      this.editingId = '';
      await this.loadEmpresas();
    } catch (error) { this.showError(error.message); }
  }

  async updateEmpresa() {
    try {
      await this.request(`/api/admin/empresas/${this.editingId}`, { method: 'PUT', body: JSON.stringify(this.formPayload(false)) });
      this.editingId = '';
      await this.loadEmpresas();
    } catch (error) { this.showError(error.message); }
  }

  async disableEmpresa(id) {
    if (!confirm('¿Deshabilitar esta empresa?')) return;
    await this.request(`/api/admin/empresas/${id}`, { method: 'DELETE' });
    await this.loadEmpresas();
  }

  async updatePassword() {
    try {
      await this.request(`/api/admin/empresas/${this.passwordEmpresaId}/password`, { method: 'PUT', body: JSON.stringify({ role: this.value('password-role'), password: this.value('password-value') }) });
      this.passwordEmpresaId = '';
      await this.loadEmpresas();
    } catch (error) { this.showError(error.message); }
  }

  formPayload(includePasswords) {
    const fields = ['name', 'nameSlug', 'businessType', 'assetsPath', 'dbName', 'jwtSecret', 'authUsername', 'supervisorUsername'];
    if (includePasswords) fields.push('authPassword', 'supervisorPassword');
    return Object.fromEntries(fields.map(field => [field, this.value(field)]));
  }

  passwordEmpresaName() {
    const empresa = this.empresas.find(item => item._id === this.passwordEmpresaId);
    return empresa ? `Empresa: ${empresa.name}` : '';
  }

  logout() { this.token = ''; sessionStorage.removeItem('admin-token'); this.render(); }
  value(id) { return this.root.querySelector(`#${id}`)?.value?.trim() || ''; }
  showError(message) { const el = this.root.querySelector('#admin-error'); if (el) el.textContent = message; }
  escape(value) { return String(value ?? '').replace(/[&<>"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char])); }
}
