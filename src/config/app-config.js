import path from 'node:path';

export class AppConfig {
  constructor(env = process.env) {
    this.port = 3000;
    this.mongoUri = env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
    this.mongoDbAdminName = env.MONGODB_DB_ADMIN_NAME || 'admin';
    this.jwtExpiresIn = '12h';
    this.corsOrigin = '*';
    this.adminUsername = this.requiredEnv(env, 'ADMIN_USERNAME');
    this.adminPassword = this.optionalEnv(env, 'ADMIN_PASSWORD');
    this.adminPasswordHash = this.optionalEnv(env, 'ADMIN_PASSWORD_HASH');
    this.validateAdminCredentials();
    this.adminDomain = env.ADMIN_DOMAIN || '127.0.0.1';
    this.trustedProxyIps = this.envList(env.TRUSTED_PROXY_IPS);
    this.publicDir = path.join(process.cwd(), 'src/public');
    this.sections = this.getSectionConfig(env);
  }

  optionalEnv(env, name) {
    const value = env[name];
    if (value === undefined || String(value).trim() === '') return '';
    return String(value);
  }

  requiredEnv(env, name) {
    const value = this.optionalEnv(env, name);
    if (!value) throw new Error(`${name} es obligatorio`);
    return value;
  }

  validateAdminCredentials() {
    if (!this.adminPassword && !this.adminPasswordHash) {
      throw new Error('ADMIN_PASSWORD o ADMIN_PASSWORD_HASH es obligatorio');
    }

    if (this.adminPassword && this.adminPasswordHash) {
      throw new Error('Configurar solo ADMIN_PASSWORD o ADMIN_PASSWORD_HASH, no ambos');
    }

    if (this.adminPasswordHash) {
      if (/^[a-f0-9]{64}$/i.test(this.adminPasswordHash)) throw new Error('ADMIN_PASSWORD_HASH no puede usar hash SHA-256 legado');
      if (!/^\$scrypt\$v=1\$/.test(this.adminPasswordHash)) throw new Error('ADMIN_PASSWORD_HASH debe usar formato scrypt soportado');
      return;
    }

    const username = this.adminUsername.trim().toLowerCase();
    const password = this.adminPassword;
    const normalizedPassword = password.trim().toLowerCase();
    const unsafePasswords = new Set(['admin', 'admin123', 'password', 'password123', '123456', '12345678', 'changeme', 'changeit']);

    if (username === 'admin' && normalizedPassword === 'admin123') throw new Error('Credenciales admin por defecto no permitidas');
    if (unsafePasswords.has(normalizedPassword)) throw new Error('ADMIN_PASSWORD usa un valor inseguro conocido');
    if (password.length < 12) throw new Error('ADMIN_PASSWORD debe tener al menos 12 caracteres');

    const classes = [/[a-z]/.test(password), /[A-Z]/.test(password), /\d/.test(password), /[^A-Za-z0-9]/.test(password)].filter(Boolean).length;
    if (classes < 3) throw new Error('ADMIN_PASSWORD debe combinar al menos 3 tipos de caracteres');
    if (password.toLowerCase().includes(username) || username.includes(normalizedPassword)) throw new Error('ADMIN_PASSWORD no debe contener ADMIN_USERNAME');
  }

  normalizeAssetsPath(value) {
    const pathValue = String(value || '').trim().replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
    return `/${pathValue || 'assets'}`;
  }

  envFlag(env, name, defaultValue = true) {
    const value = env[name];
    if (value === undefined || value === '') return defaultValue;
    return !['0', 'false', 'no', 'off', 'disabled'].includes(String(value).trim().toLowerCase());
  }

  envList(value) {
    return String(value || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  getSectionConfig(env) {
    return {
      dashboard: this.envFlag(env, 'APP_SECTION_DASHBOARD_ENABLED'),
      proveedores: this.envFlag(env, 'APP_SECTION_PROVEEDORES_ENABLED'),
      tipos: this.envFlag(env, 'APP_SECTION_TIPOS_ENABLED'),
      productos: this.envFlag(env, 'APP_SECTION_PRODUCTOS_ENABLED'),
      metodosPago: this.envFlag(env, 'APP_SECTION_METODOS_PAGO_ENABLED'),
      cajas: this.envFlag(env, 'APP_SECTION_CAJAS_ENABLED'),
      ventas: this.envFlag(env, 'APP_SECTION_VENTAS_ENABLED'),
      mostrador: this.envFlag(env, 'APP_SECTION_MOSTRADOR_ENABLED'),
      peluqueria: this.envFlag(env, 'APP_SECTION_PELUQUERIA_ENABLED'),
      stock: this.envFlag(env, 'APP_SECTION_STOCK_ENABLED'),
      ticketConfig: this.envFlag(env, 'APP_SECTION_TICKET_CONFIG_ENABLED'),
      usuarios: this.envFlag(env, 'APP_SECTION_USUARIOS_ENABLED')
    };
  }
}
