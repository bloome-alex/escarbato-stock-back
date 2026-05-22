import { Usuario } from '../models/index.js';
import { HttpError } from '../utils/http-error.js';
import { Sanitizer } from '../utils/sanitize.js';

export class AuthService {
  constructor(config, modelRegistry = null) {
    this.config = config;
    this.modelRegistry = modelRegistry;
    this.allowedIds = ['auth', 'supervisor'];
  }

  async getUsuarioModel() {
    return this.modelRegistry ? this.modelRegistry.connectionManager.getModel('usuarios') : Usuario;
  }

  async initializeUsers() {
    throw new Error('La inicialización de usuarios debe hacerse desde la configuración de empresa');
  }

  buildUser(UsuarioModel, id, username, password) {
    return {
      id,
      role: id,
      username: String(username || id).trim() || id,
      passwordHash: UsuarioModel.hashPassword(password || id)
    };
  }

  async authenticate(username, password) {
    const UsuarioModel = await this.getUsuarioModel();
    const user = await UsuarioModel.findOne({ username: String(username || '').trim() }).collation({ locale: 'es', strength: 2 }).lean();
    if (!user || user.passwordHash !== UsuarioModel.hashPassword(password)) return null;
    return user;
  }

  async getValidUser(id, credentials) {
    const UsuarioModel = await this.getUsuarioModel();
    const user = await UsuarioModel.findOne({ id }).lean();
    if (!user || user.passwordHash !== credentials) return null;
    return user;
  }

  async listUsers(currentUserId) {
    const UsuarioModel = await this.getUsuarioModel();
    const users = await UsuarioModel.find({ id: currentUserId }).lean();
    const byId = new Map(users.map(user => [user.id, user]));
    return this.allowedIds
      .map(id => byId.get(id))
      .filter(Boolean)
      .map(user => {
        const { passwordHash, ...safeUser } = Sanitizer.record(user);
        return safeUser;
      });
  }

  async updateUser(id, body = {}, currentUserId) {
    if (!this.allowedIds.includes(id)) throw new HttpError('Usuario no encontrado', 404);
    if (id !== currentUserId) throw new HttpError('Solo podés actualizar tu propio usuario', 403);

    const username = String(body.username || '').trim();
    if (!username) throw new HttpError('El nombre de usuario es obligatorio');

    const payload = { username };
    if (body.password !== undefined && String(body.password).length > 0) {
      const UsuarioModel = await this.getUsuarioModel();
      payload.passwordHash = UsuarioModel.hashPassword(body.password);
    }

    const UsuarioModel = await this.getUsuarioModel();
    const record = await UsuarioModel.findOneAndUpdate(
      { id },
      payload,
      { new: true, runValidators: true }
    );
    if (!record) throw new HttpError('Usuario no encontrado', 404);

    const { passwordHash, ...user } = Sanitizer.record(record);
    return user;
  }
}
