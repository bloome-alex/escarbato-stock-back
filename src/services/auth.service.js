import { Usuario } from '../models/index.js';
import { HttpError } from '../utils/http-error.js';
import { Sanitizer } from '../utils/sanitize.js';

export class AuthService {
  constructor(config) {
    this.config = config;
    this.allowedIds = ['auth', 'supervisor'];
  }

  async initializeUsers() {
    await Usuario.deleteMany({ id: { $nin: this.allowedIds } });

    const count = await Usuario.countDocuments();
    if (count === 0) {
      await Usuario.insertMany([
        this.buildUser('auth', this.config.authUsername, this.config.authPassword),
        this.buildUser('supervisor', this.config.supervisorUsername, this.config.supervisorPassword)
      ]);
      return;
    }

    for (const id of this.allowedIds) {
      const exists = await Usuario.exists({ id });
      if (!exists) await Usuario.create(this.buildUser(id, id, id));
    }
  }

  buildUser(id, username, password) {
    return {
      id,
      role: id,
      username: String(username || id).trim() || id,
      passwordHash: Usuario.hashPassword(password || id)
    };
  }

  async authenticate(username, password) {
    const user = await Usuario.findOne({ username: String(username || '').trim() }).collation({ locale: 'es', strength: 2 }).lean();
    if (!user || user.passwordHash !== Usuario.hashPassword(password)) return null;
    return user;
  }

  async getValidUser(id, credentials) {
    const user = await Usuario.findOne({ id }).lean();
    if (!user || user.passwordHash !== credentials) return null;
    return user;
  }

  async listUsers(currentUserId) {
    const users = await Usuario.find({ id: currentUserId }).lean();
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
      payload.passwordHash = Usuario.hashPassword(body.password);
    }

    const record = await Usuario.findOneAndUpdate(
      { id },
      payload,
      { new: true, runValidators: true }
    );
    if (!record) throw new HttpError('Usuario no encontrado', 404);

    const { passwordHash, ...user } = Sanitizer.record(record);
    return user;
  }
}
