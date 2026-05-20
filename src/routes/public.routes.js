export class PublicRoutes {
  constructor(app, publicController) {
    this.app = app;
    this.publicController = publicController;
  }

  register() {
    this.app.get(['/', '/index.html'], this.publicController.serveConfiguredPublicFile('index.html', 'text/html; charset=utf-8'));
    this.app.get('/manifest.webmanifest', this.publicController.serveConfiguredPublicFile('manifest.webmanifest', 'application/manifest+json; charset=utf-8'));
    this.app.get('/sw.js', this.publicController.serveConfiguredPublicFile('sw.js', 'application/javascript; charset=utf-8'));
  }
}
