import crypto from 'node:crypto';

export class AdminConfig {
  constructor(config) {
    this.username = config.adminUsername;
    this.password = config.adminPassword;
    this.allowedIp = config.adminDomain;
    this.jwtExpiresIn = config.jwtExpiresIn || '12h';
  }

  get jwtSecret() {
    return crypto.createHash('sha256').update(`${this.username}${this.password}`).digest('hex');
  }
}
