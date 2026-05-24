import jwt from 'jsonwebtoken';

export class AdminMiddleware {
  constructor(adminConfig) {
    this.adminConfig = adminConfig;
    this.requireAdmin = this.requireAdmin.bind(this);
    this.requireAdminIp = this.requireAdminIp.bind(this);
  }

  requireAdminIp(req, res, next) {
    const ip = this.getClientIp(req);
    if (ip !== this.adminConfig.allowedIp) return res.status(403).json({ error: 'Acceso admin denegado' });
    next();
  }

  requireAdmin(req, res, next) {
    this.requireAdminIp(req, res, () => {
      const [scheme, token] = (req.headers.authorization || '').split(' ');
      if (scheme !== 'Bearer' || !token) return res.status(401).json({ error: 'Token requerido' });
      try {
        const payload = jwt.verify(token, this.adminConfig.jwtSecret);
        if (payload.role !== 'admin') return res.status(401).json({ error: 'Token inválido' });
        req.admin = payload;
        next();
      } catch {
        res.status(401).json({ error: 'Token inválido o vencido' });
      }
    });
  }

  getClientIp(req) {
    const ip = String(req.ip || req.socket.remoteAddress || '').replace(/^::ffff:/, '');
    return ip === '::1' ? '127.0.0.1' : ip;
  }
}
