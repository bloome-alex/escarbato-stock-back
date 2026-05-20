import path from 'node:path';

export class AppConfig {
  constructor(env = process.env) {
    this.port = env.PORT || 3000;
    this.mongoUri = env.MONGODB_URI || 'mongodb://127.0.0.1:27017/escarbato_petshop';
    this.mongoDbName = env.MONGODB_DB_NAME;
    this.jwtSecret = env.JWT_SECRET || 'change-me';
    this.jwtExpiresIn = env.JWT_EXPIRES_IN || '8h';
    this.authUsername = env.AUTH_USERNAME || 'admin';
    this.authPassword = env.AUTH_PASSWORD || 'admin';
    this.corsOrigin = env.CORS_ORIGIN || '*';
    this.appName = env.APP_NAME || 'Escarbato';
    this.appAssetsPath = this.normalizeAssetsPath(env.APP_ASSETS_PATH || 'assets/escarbato');
    this.publicDir = path.join(process.cwd(), 'src/public');
    this.sections = this.getSectionConfig(env);
  }

  normalizeAssetsPath(value) {
    const pathValue = String(value || '').trim().replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
    return `/${pathValue || 'assets/escarbato'}`;
  }

  envFlag(env, name, defaultValue = true) {
    const value = env[name];
    if (value === undefined || value === '') return defaultValue;
    return !['0', 'false', 'no', 'off', 'disabled'].includes(String(value).trim().toLowerCase());
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
      stock: this.envFlag(env, 'APP_SECTION_STOCK_ENABLED')
    };
  }
}
