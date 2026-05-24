import assert from 'node:assert/strict';
import { LoginRateLimitMiddleware } from '../src/middleware/login-rate-limit-middleware.js';

const limiter = new LoginRateLimitMiddleware({
  admin: { windowMs: 1000, maxAttempts: 2, blockMs: 1000, maxBlockMs: 4000 },
  tenant: { windowMs: 1000, maxAttempts: 2, blockMs: 1000, maxBlockMs: 4000 }
});

const first = run(limiter.checkAdmin, { ip: '::ffff:203.0.113.10', body: { username: 'admin' } });
assert.equal(first.statusCode, 200);
first.req.loginRateLimit.failure();

const second = run(limiter.checkAdmin, { ip: '203.0.113.10', body: { username: 'admin' } });
assert.equal(second.statusCode, 200);
second.req.loginRateLimit.failure();

const blocked = run(limiter.checkAdmin, { ip: '203.0.113.10', body: { username: 'other' } });
assert.equal(blocked.statusCode, 429, 'el limite por IP debe bloquear aunque cambie el usuario');
assert.ok(Number(blocked.headers['Retry-After']) > 0);

const tenantLimiter = new LoginRateLimitMiddleware({
  admin: { windowMs: 1000, maxAttempts: 2, blockMs: 1000, maxBlockMs: 4000 },
  tenant: { windowMs: 1000, maxAttempts: 2, blockMs: 1000, maxBlockMs: 4000 }
});

for (let i = 0; i < 2; i += 1) {
  const attempt = run(tenantLimiter.checkTenant, { ip: '198.51.100.10', empresa: { nameSlug: 'tenant-a' }, body: { username: 'auth' } });
  assert.equal(attempt.statusCode, 200);
  attempt.req.loginRateLimit.failure();
}

assert.equal(run(tenantLimiter.checkTenant, { ip: '198.51.100.11', empresa: { nameSlug: 'tenant-a' }, body: { username: 'auth' } }).statusCode, 429, 'el limite por tenant/usuario debe bloquear aunque cambie la IP');
assert.equal(run(tenantLimiter.checkTenant, { ip: '198.51.100.11', empresa: { nameSlug: 'tenant-b' }, body: { username: 'auth' } }).statusCode, 200, 'el limite por tenant no debe cruzar subdominios');

function run(middleware, req = {}) {
  req.socket = req.socket || { remoteAddress: req.ip };
  const res = {
    statusCode: 200,
    headers: {},
    set(name, value) {
      this.headers[name] = value;
      return this;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    }
  };
  middleware(req, res, () => {});
  return { req, res, statusCode: res.statusCode, headers: res.headers };
}
