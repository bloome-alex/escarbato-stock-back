import jwt from 'jsonwebtoken';
import { PasswordHash } from '../utils/password-hash.js';

export class AdminAuthService {
  constructor(adminConfig) {
    this.adminConfig = adminConfig;
  }

  login(username, password) {
    const validPassword = this.adminConfig.passwordHash
      ? PasswordHash.verify(password, this.adminConfig.passwordHash).valid
      : PasswordHash.constantTimeEqual(password, this.adminConfig.password);
    if (username !== this.adminConfig.username || !validPassword) return null;
    const user = { username, role: 'admin' };
    const token = jwt.sign(user, this.adminConfig.jwtSecret, { expiresIn: this.adminConfig.jwtExpiresIn });
    return { token, tokenType: 'Bearer', expiresIn: this.adminConfig.jwtExpiresIn, user };
  }
}
