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
    res.json({ sections: this.config.sections });
  }
}
