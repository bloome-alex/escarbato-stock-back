export class AdminRoutes {
  constructor(app, dependencies) {
    this.app = app;
    this.adminMiddleware = dependencies.adminMiddleware;
    this.adminController = dependencies.adminController;
  }

  register() {
    this.app.post('/api/admin/login', this.adminMiddleware.requireAdminIp, this.adminController.login);
    this.app.use('/api/admin', this.adminMiddleware.requireAdmin);
    this.app.get('/api/admin/empresas', this.adminController.listEmpresas);
    this.app.get('/api/admin/empresas/:id', this.adminController.getEmpresa);
    this.app.post('/api/admin/empresas', this.adminController.createEmpresa);
    this.app.put('/api/admin/empresas/:id', this.adminController.updateEmpresa);
    this.app.delete('/api/admin/empresas/:id', this.adminController.deleteEmpresa);
    this.app.put('/api/admin/empresas/:id/password', this.adminController.updateEmpresaPassword);
  }
}
