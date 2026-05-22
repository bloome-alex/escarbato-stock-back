import jwt from 'jsonwebtoken';

export class AuthController {
  constructor(config, authMiddleware, authService) {
    this.config = config;
    this.authMiddleware = authMiddleware;
    this.authService = authService;
    this.login = this.login.bind(this);
    this.listUsers = this.listUsers.bind(this);
    this.updateUser = this.updateUser.bind(this);
  }

  async login(req, res, next) {
    try {
      if (!req.empresa) return res.status(404).json({ error: 'Empresa no encontrada' });
      const { username, password } = req.body || {};
      const user = await this.authService.authenticate(username, password);
      if (!user) {
        return res.status(401).json({ error: 'Usuario o contraseña inválidos' });
      }

      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role, empresaId: req.empresa?.id, tokenVersion: user.tokenVersion ?? 0 },
        req.empresa.jwtSecret,
        { expiresIn: this.config.jwtExpiresIn }
      );
      res.json({ token, tokenType: 'Bearer', expiresIn: this.config.jwtExpiresIn, user: { id: user.id, username: user.username, role: user.role } });
    } catch (error) {
      next(error);
    }
  }

  async listUsers(req, res, next) {
    try {
      res.json(await this.authService.listUsers(req.user.id));
    } catch (error) {
      next(error);
    }
  }

  async updateUser(req, res, next) {
    try {
      res.json(await this.authService.updateUser(req.params.id, req.body, req.user.id));
    } catch (error) {
      next(error);
    }
  }
}
