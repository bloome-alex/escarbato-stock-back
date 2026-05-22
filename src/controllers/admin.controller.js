export class AdminController {
  constructor(adminAuthService, empresaService) {
    this.adminAuthService = adminAuthService;
    this.empresaService = empresaService;
    this.login = this.login.bind(this);
    this.listEmpresas = this.listEmpresas.bind(this);
    this.getEmpresa = this.getEmpresa.bind(this);
    this.createEmpresa = this.createEmpresa.bind(this);
    this.updateEmpresa = this.updateEmpresa.bind(this);
    this.deleteEmpresa = this.deleteEmpresa.bind(this);
    this.updateEmpresaPassword = this.updateEmpresaPassword.bind(this);
  }

  login(req, res) {
    const result = this.adminAuthService.login(req.body?.username, req.body?.password);
    if (!result) return res.status(401).json({ error: 'Usuario o contraseña inválidos' });
    res.json(result);
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
