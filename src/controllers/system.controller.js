export class SystemController {
  constructor(config) {
    this.config = config;
    this.health = this.health.bind(this);
    this.configResponse = this.configResponse.bind(this);
  }

  health(req, res) {
    res.json({ ok: true });
  }

  configResponse(req, res) {
    if (!req.empresa) return res.status(404).json({ error: 'Empresa no encontrada' });
    res.json({
      sections: this.config.sections,
      appName: req.empresa.name,
      businessType: req.empresa.businessType,
      assetsPath: req.empresa.assetsPath
    });
  }
}
