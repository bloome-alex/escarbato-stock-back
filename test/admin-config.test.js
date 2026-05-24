import assert from 'node:assert/strict';
import { AppConfig } from '../src/config/app-config.js';
import { AdminConfig } from '../src/config/admin-config.js';
import { AdminAuthService } from '../src/services/admin-auth.service.js';
import { PasswordHash } from '../src/utils/password-hash.js';

assert.throws(() => new AppConfig({}), /ADMIN_USERNAME es obligatorio/);
assert.throws(() => new AppConfig({ ADMIN_USERNAME: 'admin' }), /ADMIN_PASSWORD o ADMIN_PASSWORD_HASH es obligatorio/);
assert.throws(() => new AppConfig({ ADMIN_USERNAME: 'admin', ADMIN_PASSWORD: 'admin123' }), /Credenciales admin por defecto/);
assert.throws(() => new AppConfig({ ADMIN_USERNAME: 'admin-operator', ADMIN_PASSWORD: 'short1!' }), /al menos 12 caracteres/);
assert.throws(() => new AppConfig({ ADMIN_USERNAME: 'admin-operator', ADMIN_PASSWORD: 'alllowercaseonly' }), /3 tipos de caracteres/);
assert.throws(() => new AppConfig({ ADMIN_USERNAME: 'admin-operator', ADMIN_PASSWORD_HASH: PasswordHash.legacySha256('Str0ng-passphrase!') }), /SHA-256 legado/);
assert.throws(() => new AppConfig({ ADMIN_USERNAME: 'admin-operator', ADMIN_PASSWORD: 'Str0ng-passphrase!', ADMIN_PASSWORD_HASH: PasswordHash.hash('Str0ng-passphrase!') }), /no ambos/);

const plainConfig = new AppConfig({ ADMIN_USERNAME: 'admin-operator', ADMIN_PASSWORD: 'Str0ng-passphrase!' });
const plainAuth = new AdminAuthService(new AdminConfig(plainConfig));
assert.equal(plainAuth.login('admin-operator', 'Str0ng-passphrase!')?.user.role, 'admin');
assert.equal(plainAuth.login('admin-operator', 'wrong-password'), null);

const hashConfig = new AppConfig({ ADMIN_USERNAME: 'admin-operator', ADMIN_PASSWORD_HASH: PasswordHash.hash('Str0ng-passphrase!') });
const hashAuth = new AdminAuthService(new AdminConfig(hashConfig));
assert.equal(hashAuth.login('admin-operator', 'Str0ng-passphrase!')?.user.role, 'admin');
assert.equal(hashAuth.login('admin-operator', 'wrong-password'), null);
