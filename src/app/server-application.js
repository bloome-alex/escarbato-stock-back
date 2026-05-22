import http from 'node:http';
import cors from 'cors';
import express from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { BootstrapDataController } from '../controllers/bootstrap-data.controller.js';
import { DashboardController } from '../controllers/dashboard.controller.js';
import { DataStoreController } from '../controllers/data-store.controller.js';
import { PublicController } from '../controllers/public.controller.js';
import { ReportController } from '../controllers/report.controller.js';
import { SystemController } from '../controllers/system.controller.js';
import { ErrorHandler } from '../middleware/error-handler.js';
import { AuthMiddleware } from '../middleware/auth-middleware.js';
import { ApiRoutes } from '../routes/api.routes.js';
import { PublicRoutes } from '../routes/public.routes.js';
import { BootstrapDataService } from '../services/bootstrap-data.service.js';
import { AuthService } from '../services/auth.service.js';
import { DashboardService } from '../services/dashboard.service.js';
import { DataStoreService } from '../services/data-store.service.js';
import { ModelRegistry } from '../services/model-registry.js';
import { ProductReportService } from '../services/product-report.service.js';
import { RealtimeService } from '../services/realtime.service.js';

export class ServerApplication {
  constructor(config) {
    this.config = config;
    this.app = express();
  }

  build() {
    const modelRegistry = new ModelRegistry();
    const authService = new AuthService(this.config);
    const authMiddleware = new AuthMiddleware(this.config, authService);
    const dataStoreService = new DataStoreService(modelRegistry);
    this.realtimeService = new RealtimeService(this.config, authMiddleware);

    this.app.use(cors({ origin: this.config.corsOrigin === '*' ? true : this.config.corsOrigin }));
    this.app.use(express.json({ limit: '1mb' }));

    new PublicRoutes(this.app, new PublicController(this.config)).register();
    this.app.use(express.static(this.config.publicDir, { index: false }));

    new ApiRoutes(this.app, {
      authMiddleware,
      authController: new AuthController(this.config, authMiddleware, authService),
      systemController: new SystemController(this.config),
      dashboardController: new DashboardController(new DashboardService()),
      bootstrapDataController: new BootstrapDataController(new BootstrapDataService()),
      reportController: new ReportController(new ProductReportService(this.config)),
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
