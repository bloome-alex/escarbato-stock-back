import { Empresa } from '../models/empresa.js';

export class SubdomainMiddleware {
  constructor(config, connectionManager) {
    this.config = config;
    this.connectionManager = connectionManager;
    this.attachTenant = this.attachTenant.bind(this);
  }

  async attachTenant(req, res, next) {
    this.connectionManager.runWithTenant({}, async () => {
      try {
        const slug = this.getSubdomain(req);
        if (req.path.startsWith('/admin')) {
          if (slug) return res.status(404).json({ error: 'Empresa no encontrada' });
          return next();
        }
        if (!slug) {
          if (req.path === '/health') return next();
          if (req.path === '/auth/login') return res.status(401).json({ error: 'Usuario o contraseña inválidos' });
          return res.status(404).json({ error: 'Empresa no encontrada' });
        }

        const empresa = await Empresa.findOne({ nameSlug: slug, isActive: true }).lean();
        if (!empresa) {
          if (req.path === '/auth/login') return res.status(401).json({ error: 'Usuario o contraseña inválidos' });
          return res.status(404).json({ error: 'Empresa no encontrada' });
        }

        const tenant = this.fromEmpresa(empresa);
        req.empresa = tenant;
        this.connectionManager.setActiveTenant(tenant);
        next();
      } catch (error) {
        next(error);
      }
    });
  }

  getSubdomain(req) {
    const host = String(req.hostname || req.headers.host || '').split(':')[0].toLowerCase();
    if (!host || host === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(host)) return '';
    const parts = host.split('.').filter(Boolean);
    if (parts.length < 3) return '';
    const subdomain = parts[0];
    return subdomain === 'admin' ? '' : subdomain;
  }

  fromEmpresa(empresa) {
    return {
      id: String(empresa._id),
      name: empresa.name,
      nameSlug: empresa.nameSlug,
      businessType: empresa.businessType,
      assetsPath: this.config.normalizeAssetsPath(empresa.assetsPath),
      dbName: empresa.dbName,
      jwtSecret: empresa.jwtSecret
    };
  }

}
