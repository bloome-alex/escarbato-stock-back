import { form } from '../ui.js';

const labels = {
  auth: 'AUTH',
  supervisor: 'SUPERVISOR'
};

const escapeHtml = value => String(value || '').replace(/[&<>"]/g, char => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;'
}[char]));

export class UsuariosComponent {
  constructor(app) {
    this.app = app;
    this.loading = false;
  }

  template() {
    return `<section class="section" id="sec-usuarios">
      <div id="wrap-usuarios" class="user-settings-shell"><div class="section-loading"><span class="loading-spinner"></span> Cargando usuario...</div></div>
    </section>`;
  }

  bind() {}

  async render() {
    if (this.loading) return;
    this.loading = true;
    document.getElementById('wrap-usuarios').innerHTML = `<div class="section-loading"><span class="loading-spinner"></span> Cargando usuario...</div>`;
    try {
      await this.app.store.getUsers();
      this.renderList();
    } catch (error) {
      this.app.toasts.show(error.message || 'No se pudieron cargar los usuarios', 'error');
    } finally {
      this.loading = false;
    }
  }

  renderList() {
    const user = (this.app.store.data.usuarios || [])[0];
    if (!user) {
      document.getElementById('wrap-usuarios').innerHTML = `<div class="section-loading">No se encontró el usuario activo</div>`;
      return;
    }

    document.getElementById('wrap-usuarios').innerHTML = this.cardTemplate(user);
  }

  cardTemplate(user) {
    const label = labels[user.id] || user.id;
    return `<div class="user-settings-card">
      <div class="user-settings-header">
        <div class="user-settings-icon">🔐</div>
        <div>
          <span class="user-settings-kicker">${label}</span>
          <h2>Configurá tu usuario</h2>
          <p>Estos datos se usan para iniciar sesión en la plataforma.</p>
        </div>
      </div>
      <div class="form-group">
        <label>Nombre de usuario</label>
        <input type="text" id="usuario-${user.id}-username" value="${escapeHtml(user.username)}" autocomplete="username" placeholder="Tu usuario">
      </div>
      <div class="form-group">
        <label>Nueva contraseña</label>
        <input type="password" id="usuario-${user.id}-password" placeholder="Dejar vacía para conservar la actual" autocomplete="new-password">
      </div>
      <button class="btn btn-primary user-settings-save" data-action="save-user" data-id="${user.id}">Guardar cambios</button>
    </div>`;
  }

  async save(id) {
    const username = form.trim(`usuario-${id}-username`);
    const password = form.value(`usuario-${id}-password`);
    if (!username) return this.app.toasts.show('El nombre de usuario es obligatorio', 'error');

    const invalidatesCurrentSession = Boolean(password && this.app.store.currentUser?.id === id);
    const user = await this.app.store.updateUser({ id, username, password });
    form.set(`usuario-${id}-password`, '');
    if (!invalidatesCurrentSession) await this.app.audit('Edición', 'Usuarios', labels[id] || user.username);
    this.app.toasts.show('Usuario guardado correctamente');

    if (invalidatesCurrentSession) {
      await this.app.store.handleAuthRejected('Volvé a iniciar sesión con la nueva contraseña');
    }
  }
}
