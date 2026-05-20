import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';

export class AuthMiddleware {
  constructor(config) {
    this.config = config;
    this.requireAuth = this.requireAuth.bind(this);
  }

  credentialHash() {
    return crypto
      .createHash('sha256')
      .update(`${this.config.authUsername}:${this.config.authPassword}`)
      .digest('hex');
  }

  requireAuth(req, res, next) {
    const [scheme, token] = (req.headers.authorization || '').split(' ');
    if (scheme !== 'Bearer' || !token) return res.status(401).json({ error: 'Token requerido' });

    try {
      const payload = jwt.verify(token, this.config.jwtSecret);
      if (payload.username !== this.config.authUsername || payload.credentials !== this.credentialHash()) {
        return res.status(401).json({ error: 'Token inválido' });
      }
      req.user = payload;
      next();
    } catch {
      res.status(401).json({ error: 'Token inválido o vencido' });
    }
  }
}
