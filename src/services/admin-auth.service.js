import jwt from 'jsonwebtoken';

export class AdminAuthService {
  constructor(adminConfig) {
    this.adminConfig = adminConfig;
  }

  login(username, password) {
    if (username !== this.adminConfig.username || password !== this.adminConfig.password) return null;
    const user = { username, role: 'admin' };
    const token = jwt.sign(user, this.adminConfig.jwtSecret, { expiresIn: this.adminConfig.jwtExpiresIn });
    return { token, tokenType: 'Bearer', expiresIn: this.adminConfig.jwtExpiresIn, user };
  }
}
