const DEFAULT_LIMITS = {
  admin: {
    windowMs: 60 * 1000,
    maxAttempts: 5,
    blockMs: 5 * 60 * 1000,
    maxBlockMs: 60 * 60 * 1000
  },
  tenant: {
    windowMs: 60 * 1000,
    maxAttempts: 8,
    blockMs: 2 * 60 * 1000,
    maxBlockMs: 30 * 60 * 1000
  }
};

export class LoginRateLimitMiddleware {
  constructor(limits = DEFAULT_LIMITS) {
    this.limits = limits;
    this.attempts = new Map();
    this.checkAdmin = this.check('admin');
    this.checkTenant = this.check('tenant');
  }

  check(scope) {
    return (req, res, next) => {
      const config = this.limits[scope];
      const keys = this.getKeys(scope, req);
      const blockedUntil = this.getBlockedUntil(keys);
      if (blockedUntil > Date.now()) {
        res.set('Retry-After', String(Math.ceil((blockedUntil - Date.now()) / 1000)));
        return res.status(429).json({ error: 'Demasiados intentos. Intentá nuevamente más tarde.' });
      }

      req.loginRateLimit = {
        failure: () => this.recordFailure(keys, config),
        success: () => this.clear(keys)
      };
      next();
    };
  }

  getKeys(scope, req) {
    const ip = this.normalizeIp(req.ip || req.socket?.remoteAddress || 'unknown');
    const username = String(req.body?.username || '').trim().toLowerCase() || 'unknown';
    if (scope === 'admin') return [`admin:ip:${ip}`, `admin:user:${username}`];

    const tenant = String(req.empresa?.nameSlug || req.hostname || req.headers.host || 'unknown').split(':')[0].toLowerCase();
    return [`tenant:ip:${ip}`, `tenant:user:${tenant}:${username}`];
  }

  getBlockedUntil(keys) {
    return Math.max(0, ...keys.map((key) => this.attempts.get(key)?.blockedUntil || 0));
  }

  recordFailure(keys, config) {
    const now = Date.now();
    for (const key of keys) {
      const current = this.attempts.get(key);
      const record = current && current.expiresAt > now
        ? current
        : { count: 0, strikes: current?.strikes || 0, expiresAt: now + config.windowMs, blockedUntil: 0 };

      record.count += 1;
      if (record.count >= config.maxAttempts) {
        record.strikes += 1;
        record.count = 0;
        record.expiresAt = now + config.windowMs;
        record.blockedUntil = now + Math.min(config.blockMs * (2 ** (record.strikes - 1)), config.maxBlockMs);
      }

      this.attempts.set(key, record);
    }
  }

  clear(keys) {
    for (const key of keys) this.attempts.delete(key);
  }

  normalizeIp(ip) {
    const value = String(ip || '').replace(/^::ffff:/, '');
    return value === '::1' ? '127.0.0.1' : value;
  }
}
