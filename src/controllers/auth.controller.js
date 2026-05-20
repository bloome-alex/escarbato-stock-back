import jwt from 'jsonwebtoken';

export class AuthController {
  constructor(config, authMiddleware) {
    this.config = config;
    this.authMiddleware = authMiddleware;
    this.login = this.login.bind(this);
  }

  login(req, res) {
    const { username, password } = req.body || {};
    if (username !== this.config.authUsername || password !== this.config.authPassword) {
      return res.status(401).json({ error: 'Usuario o contraseña inválidos' });
    }

    const token = jwt.sign(
      { username, credentials: this.authMiddleware.credentialHash() },
      this.config.jwtSecret,
      { expiresIn: this.config.jwtExpiresIn }
    );
    res.json({ token, tokenType: 'Bearer', expiresIn: this.config.jwtExpiresIn });
  }
}
