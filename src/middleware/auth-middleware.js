import jwt from 'jsonwebtoken';

export class AuthMiddleware {
  constructor(config, authService) {
    this.config = config;
    this.authService = authService;
    this.requireAuth = this.requireAuth.bind(this);
  }

  async requireAuth(req, res, next) {
    const [scheme, token] = (req.headers.authorization || '').split(' ');
    if (scheme !== 'Bearer' || !token) return res.status(401).json({ error: 'Token requerido' });
    if (!req.empresa?.jwtSecret) return res.status(404).json({ error: 'Empresa no encontrada' });

    try {
      const payload = jwt.verify(token, req.empresa.jwtSecret);
      const user = await this.authService.getValidUser(payload.id, payload.credentials);
      if (!user) {
        return res.status(401).json({ error: 'Token inválido' });
      }
      req.user = { ...payload, username: user.username, empresaId: req.empresa?.id };
      next();
    } catch {
      res.status(401).json({ error: 'Token inválido o vencido' });
    }
  }
}
