import crypto from 'node:crypto';

export class AdminConfig {
  constructor(config) {
    this.username = config.adminUsername;
    this.password = config.adminPassword;
    this.passwordHash = config.adminPasswordHash;
    this.allowedIp = config.adminDomain;
    this.jwtExpiresIn = config.jwtExpiresIn || '12h';
  }

  get jwtSecret() {
    return crypto.createHash('sha256').update(`${this.username}${this.passwordHash || this.password}`).digest('hex');
  }
}
