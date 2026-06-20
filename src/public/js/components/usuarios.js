import { escapeHtml, form } from '../ui.js';

const labels = {
  auth: 'AUTH',
  supervisor: 'SUPERVISOR'
};

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

  bind() {
    document.addEventListener('click', event => {
      const toggle = event.target.closest('[data-user-password-toggle]');
      if (!toggle) return;
      this.togglePassword(toggle);
    });
  }

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
          <span class="user-settings-kicker">${escapeHtml(label)}</span>
          <h2>Configurá tu usuario</h2>
          <p>Estos datos se usan para iniciar sesión en la plataforma.</p>
        </div>
      </div>
      <div class="form-group">
        <label>Nombre de usuario</label>
        <input type="text" id="usuario-${escapeHtml(user.id)}-username" value="${escapeHtml(user.username)}" autocomplete="username" placeholder="Tu usuario">
      </div>
      <div class="form-group">
        <label>Nueva contraseña</label>
        <div class="password-field">
          <input type="password" id="usuario-${escapeHtml(user.id)}-password" placeholder="Dejar vacía para conservar la actual" autocomplete="new-password">
          <button type="button" class="password-toggle" data-user-password-toggle="usuario-${escapeHtml(user.id)}-password" aria-label="Mostrar contraseña" aria-pressed="false">
            <span class="password-eye" aria-hidden="true"></span>
          </button>
        </div>
      </div>
      <button class="btn btn-primary user-settings-save" data-action="save-user" data-id="${escapeHtml(user.id)}">Guardar cambios</button>
      <button class="btn btn-danger user-settings-reset" data-action="reset-app-cache">Borrar caché y reiniciar</button>
    </div>`;
  }

  togglePassword(toggle) {
    const input = document.getElementById(toggle.dataset.userPasswordToggle);
    if (!input) return;

    const showPassword = input.type === 'password';
    input.type = showPassword ? 'text' : 'password';
    toggle.setAttribute('aria-label', showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña');
    toggle.setAttribute('aria-pressed', String(showPassword));
    toggle.classList.toggle('is-visible', showPassword);
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

  async resetAppCache() {
    const confirmed = window.confirm('Se va a borrar el localStorage y la base local de IndexedDB. La aplicación se reiniciará y vas a tener que iniciar sesión nuevamente. ¿Continuar?');
    if (!confirmed) return;

    try {
      await this.app.store.clearLocalStorageAndIndexedDb();
    } finally {
      window.location.reload();
    }
  }
}
