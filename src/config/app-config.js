import path from 'node:path';

export class AppConfig {
  constructor(env = process.env) {
    this.port = 3000;
    this.mongoUri = env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
    this.mongoDbAdminName = env.MONGODB_DB_ADMIN_NAME || 'admin';
    this.jwtExpiresIn = '12h';
    this.corsOrigin = '*';
    this.adminUsername = env.ADMIN_USERNAME || 'admin';
    this.adminPassword = env.ADMIN_PASSWORD || 'admin123';
    this.adminDomain = env.ADMIN_DOMAIN || '127.0.0.1';
    this.trustedProxyIps = this.envList(env.TRUSTED_PROXY_IPS);
    this.publicDir = path.join(process.cwd(), 'src/public');
    this.sections = this.getSectionConfig(env);
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
      usuarios: this.envFlag(env, 'APP_SECTION_USUARIOS_ENABLED')
    };
  }
}
