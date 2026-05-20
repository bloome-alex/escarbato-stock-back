export class BootstrapDataController {
  constructor(bootstrapDataService) {
    this.bootstrapDataService = bootstrapDataService;
    this.getData = this.getData.bind(this);
  }

  async getData(req, res, next) {
    try {
      res.json(await this.bootstrapDataService.getData());
    } catch (error) {
      next(error);
    }
  }
}
