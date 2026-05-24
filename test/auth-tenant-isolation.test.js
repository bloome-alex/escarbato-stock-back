import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { AuthMiddleware } from '../src/middleware/auth-middleware.js';

const sharedSecret = 'shared-secret';
const tenantA = { id: 'tenant-a', jwtSecret: sharedSecret };
const tenantB = { id: 'tenant-b', jwtSecret: sharedSecret };
const authService = {
  async getValidUser(id, tokenVersion) {
    if (id !== 'auth' || tokenVersion !== 0) return null;
    return { id: 'auth', username: 'auth-user', role: 'auth', tokenVersion: 0 };
  }
};
const middleware = new AuthMiddleware({}, authService);

const tenantAToken = jwt.sign({ id: 'auth', username: 'auth-user', role: 'auth', empresaId: tenantA.id, tokenVersion: 0 }, sharedSecret);
const tenantTokenWithoutEmpresa = jwt.sign({ id: 'auth', username: 'auth-user', role: 'auth', tokenVersion: 0 }, sharedSecret);
const tokenWithInvalidRole = jwt.sign({ id: 'auth', username: 'auth-user', role: 'admin', empresaId: tenantA.id, tokenVersion: 0 }, sharedSecret);
const tokenWithDifferentSecret = jwt.sign({ id: 'auth', username: 'auth-user', role: 'auth', empresaId: tenantA.id, tokenVersion: 0 }, 'other-secret');

assert.equal(await runRequireAuth({ empresa: tenantA, token: tenantAToken }), 200);
assert.equal(await runRequireAuth({ empresa: tenantB, token: tenantAToken }), 401, 'un token de otro tenant no debe aceptarse aunque comparta secreto');
assert.equal(await runRequireAuth({ empresa: tenantA, token: tenantTokenWithoutEmpresa }), 401, 'empresaId debe ser obligatorio');
assert.equal(await runRequireAuth({ empresa: tenantA, token: tokenWithInvalidRole }), 401, 'role debe estar permitido');
assert.equal(await runRequireAuth({ empresa: tenantA, token: tokenWithDifferentSecret }), 401, 'un secreto distinto debe invalidar la firma');

async function runRequireAuth({ empresa, token }) {
  const req = { empresa, headers: { authorization: `Bearer ${token}` } };
  const res = {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json() {
      return this;
    }
  };

  await middleware.requireAuth(req, res, () => {});
  return res.statusCode;
}
