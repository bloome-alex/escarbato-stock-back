export class AdminController {
  constructor(adminAuthService, empresaService, auditoriaService) {
    this.adminAuthService = adminAuthService;
    this.empresaService = empresaService;
    this.auditoriaService = auditoriaService;
    this.login = this.login.bind(this);
    this.listEmpresas = this.listEmpresas.bind(this);
    this.getEmpresa = this.getEmpresa.bind(this);
    this.createEmpresa = this.createEmpresa.bind(this);
    this.updateEmpresa = this.updateEmpresa.bind(this);
    this.deleteEmpresa = this.deleteEmpresa.bind(this);
    this.updateEmpresaPassword = this.updateEmpresaPassword.bind(this);
  }

  async login(req, res, next) {
    try {
      const result = this.adminAuthService.login(req.body?.username, req.body?.password);
      if (!result) {
        req.loginRateLimit?.failure();
        await this.recordFailedAdminLogin(req);
        return res.status(401).json({ error: 'Usuario o contraseña inválidos' });
      }
      req.loginRateLimit?.success();
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async recordFailedAdminLogin(req) {
    const username = String(req.body?.username || '').trim() || 'usuario vacío';
    try {
      await this.auditoriaService.admin('Autenticación fallida', 'Admin', `Login fallido desde ${this.getClientIp(req)} para ${username}`, username);
    } catch {
      // La auditoría no debe cambiar la semántica de autenticación.
    }
  }

  getClientIp(req) {
    const ip = String(req.ip || req.socket?.remoteAddress || '').replace(/^::ffff:/, '');
    return ip === '::1' ? '127.0.0.1' : ip;
  }

  async listEmpresas(req, res, next) {
    try {
      res.json(await this.empresaService.list());
    } catch (error) {
      next(error);
    }
  }

  async getEmpresa(req, res, next) {
    try {
      res.json(await this.empresaService.getById(req.params.id));
    } catch (error) {
      next(error);
    }
  }

  async createEmpresa(req, res, next) {
    try {
      res.status(201).json(await this.empresaService.create(req.body, req.admin?.username));
    } catch (error) {
      next(error);
    }
  }

  async updateEmpresa(req, res, next) {
    try {
      res.json(await this.empresaService.update(req.params.id, req.body, req.admin?.username));
    } catch (error) {
      next(error);
    }
  }

  async deleteEmpresa(req, res, next) {
    try {
      res.json(await this.empresaService.remove(req.params.id, req.admin?.username));
    } catch (error) {
      next(error);
    }
  }

  async updateEmpresaPassword(req, res, next) {
    try {
      res.json(await this.empresaService.updatePassword(req.params.id, req.body, req.admin?.username));
    } catch (error) {
      next(error);
    }
  }
}
