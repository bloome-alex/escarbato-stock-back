import http from 'node:http';
import cors from 'cors';
import express from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { AdminController } from '../controllers/admin.controller.js';
import { BootstrapDataController } from '../controllers/bootstrap-data.controller.js';
import { DashboardController } from '../controllers/dashboard.controller.js';
import { DataStoreController } from '../controllers/data-store.controller.js';
import { PublicController } from '../controllers/public.controller.js';
import { ReportController } from '../controllers/report.controller.js';
import { SystemController } from '../controllers/system.controller.js';
import { ErrorHandler } from '../middleware/error-handler.js';
import { AdminMiddleware } from '../middleware/admin-middleware.js';
import { AuthMiddleware } from '../middleware/auth-middleware.js';
import { ProxyHeaderMiddleware } from '../middleware/proxy-header-middleware.js';
import { SubdomainMiddleware } from '../middleware/subdomain-middleware.js';
import { AdminRoutes } from '../routes/admin.routes.js';
import { ApiRoutes } from '../routes/api.routes.js';
import { PublicRoutes } from '../routes/public.routes.js';
import { BootstrapDataService } from '../services/bootstrap-data.service.js';
import { AdminAuthService } from '../services/admin-auth.service.js';
import { AuthService } from '../services/auth.service.js';
import { AuditoriaService } from '../services/auditoria.service.js';
import { DashboardService } from '../services/dashboard.service.js';
import { DataStoreService } from '../services/data-store.service.js';
import { EmpresaService } from '../services/empresa.service.js';
import { ModelRegistry } from '../services/model-registry.js';
import { ProductReportService } from '../services/product-report.service.js';
import { RealtimeService } from '../services/realtime.service.js';
import { AdminConfig } from '../config/admin-config.js';
import { ConnectionManager } from '../database/connection-manager.js';

export class ServerApplication {
  constructor(config, connectionManager = new ConnectionManager(config)) {
    this.config = config;
    this.connectionManager = connectionManager;
    this.app = express();
  }

  build() {
    const modelRegistry = new ModelRegistry(this.connectionManager);
    const authService = new AuthService(this.config, modelRegistry);
    const authMiddleware = new AuthMiddleware(this.config, authService);
    const adminConfig = new AdminConfig(this.config);
    const adminMiddleware = new AdminMiddleware(adminConfig);
    const proxyHeaderMiddleware = new ProxyHeaderMiddleware(this.config);
    const auditoriaService = new AuditoriaService();
    const dataStoreService = new DataStoreService(modelRegistry);
    this.realtimeService = new RealtimeService(this.config, authMiddleware, this.connectionManager);

    proxyHeaderMiddleware.configure(this.app);
    this.app.use(proxyHeaderMiddleware.rejectUntrustedForwardedHeaders);
    this.app.use(cors({ origin: this.config.corsOrigin === '*' ? true : this.config.corsOrigin }));
    this.app.use(express.json({ limit: '1mb' }));

    new PublicRoutes(this.app, new PublicController(this.config)).register();
    this.app.use(express.static(this.config.publicDir, { index: false }));
    this.app.use('/api', new SubdomainMiddleware(this.config, this.connectionManager).attachTenant);

    new AdminRoutes(this.app, {
      adminMiddleware,
      adminController: new AdminController(new AdminAuthService(adminConfig), new EmpresaService(this.connectionManager, auditoriaService))
    }).register();

    new ApiRoutes(this.app, {
      authMiddleware,
      authController: new AuthController(this.config, authMiddleware, authService),
      systemController: new SystemController(this.config),
      dashboardController: new DashboardController(new DashboardService(modelRegistry)),
      bootstrapDataController: new BootstrapDataController(new BootstrapDataService(modelRegistry)),
      reportController: new ReportController(new ProductReportService(this.config, modelRegistry)),
      dataStoreController: new DataStoreController(dataStoreService, this.realtimeService)
    }).register();

    this.app.use(new ErrorHandler(dataStoreService).handle);
    return this.app;
  }

  listen() {
    const server = http.createServer(this.app);
    server.keepAliveTimeout = 10000;
    server.headersTimeout = 15000;
    server.requestTimeout = 120000;
    server.timeout = 120000;
    this.realtimeService.attach(server);
    server.listen(this.config.port, () => {
      console.log(`Backend escuchando en http://localhost:${this.config.port}`);
    });
  }
}
