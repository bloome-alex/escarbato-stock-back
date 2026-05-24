import assert from 'node:assert/strict';
import { Usuario } from '../src/models/usuario.js';
import { AuthService } from '../src/services/auth.service.js';
import { PasswordHash } from '../src/utils/password-hash.js';

const password = 'pass-seguro-123';
const passwordHash = Usuario.hashPassword(password);

assert.match(passwordHash, /^\$scrypt\$v=1\$N=16384,r=8,p=1,keylen=64\$[^$]+\$[^$]+$/);
assert.notEqual(passwordHash, Usuario.hashPassword(password), 'el salt debe producir hashes distintos');
assert.deepEqual(Usuario.verifyPassword(password, passwordHash), { valid: true, needsRehash: false });
assert.equal(Usuario.verifyPassword('incorrecta', passwordHash).valid, false);

const migrated = [];
const legacyUser = {
  id: 'auth',
  role: 'auth',
  username: 'auth-user',
  passwordHash: PasswordHash.legacySha256(password),
  tokenVersion: 3
};
const UsuarioModel = {
  hashPassword: Usuario.hashPassword,
  verifyPassword: Usuario.verifyPassword,
  findOne() {
    return { collation: () => ({ lean: async () => legacyUser }) };
  },
  async updateOne(filter, update) {
    migrated.push({ filter, update });
  }
};
const authService = new AuthService({}, { connectionManager: { getModel: async () => UsuarioModel } });

const user = await authService.authenticate('auth-user', password);
assert.equal(user, legacyUser);
assert.equal(migrated.length, 1);
assert.deepEqual(migrated[0].filter, { id: legacyUser.id, passwordHash: legacyUser.passwordHash });
assert.equal(Usuario.verifyPassword(password, migrated[0].update.$set.passwordHash).valid, true);
assert.equal(/^[a-f0-9]{64}$/i.test(migrated[0].update.$set.passwordHash), false);
