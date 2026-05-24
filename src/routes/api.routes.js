export class ApiRoutes {
  constructor(app, dependencies) {
    this.app = app;
    this.authMiddleware = dependencies.authMiddleware;
    this.loginRateLimitMiddleware = dependencies.loginRateLimitMiddleware;
    this.authController = dependencies.authController;
    this.systemController = dependencies.systemController;
    this.dashboardController = dependencies.dashboardController;
    this.bootstrapDataController = dependencies.bootstrapDataController;
    this.reportController = dependencies.reportController;
    this.dataStoreController = dependencies.dataStoreController;
  }

  register() {
    this.app.get('/api/health', this.systemController.health);
    this.app.get('/api/config', this.systemController.configResponse);
    this.app.post('/api/auth/login', this.loginRateLimitMiddleware.checkTenant, this.authController.login);

    this.app.use('/api', this.authMiddleware.requireAuth);
    this.app.get('/api/auth/users', this.authController.listUsers);
    this.app.put('/api/auth/users/:id', this.authController.updateUser);
    this.app.get('/api/dashboard', this.dashboardController.getDashboard);
    this.app.get('/api/data', this.bootstrapDataController.getData);
    this.app.get('/api/reportes/productos.pdf', this.reportController.productsPdf);
    this.app.get('/api/reportes/productos.xlsx', this.reportController.productsXlsx);
    this.app.get('/api/:store', this.dataStoreController.list);
    this.app.get('/api/:store/:id', this.dataStoreController.getById);
    this.app.put('/api/:store/:id', this.dataStoreController.upsert);
    this.app.delete('/api/:store/:id', this.dataStoreController.delete);
  }
}
