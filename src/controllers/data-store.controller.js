export class DataStoreController {
  constructor(dataStoreService) {
    this.dataStoreService = dataStoreService;
    this.list = this.list.bind(this);
    this.getById = this.getById.bind(this);
    this.upsert = this.upsert.bind(this);
    this.delete = this.delete.bind(this);
  }

  async list(req, res, next) {
    try {
      res.json(await this.dataStoreService.list(req.params.store, req.query));
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      res.json(await this.dataStoreService.getById(req.params.store, req.params.id));
    } catch (error) {
      next(error);
    }
  }

  async upsert(req, res, next) {
    try {
      res.json(await this.dataStoreService.upsert(req.params.store, req.params.id, req.body));
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      await this.dataStoreService.delete(req.params.store, req.params.id);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  }
}
