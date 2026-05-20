export class DataStoreController {
  constructor(dataStoreService, realtimeService) {
    this.dataStoreService = dataStoreService;
    this.realtimeService = realtimeService;
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
      const record = await this.dataStoreService.upsert(req.params.store, req.params.id, req.body);
      this.realtimeService?.broadcast({
        store: req.params.store,
        action: 'upsert',
        id: req.params.id,
        clientId: req.get('X-Client-Id') || ''
      });
      res.json(record);
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      await this.dataStoreService.delete(req.params.store, req.params.id);
      this.realtimeService?.broadcast({
        store: req.params.store,
        action: 'delete',
        id: req.params.id,
        clientId: req.get('X-Client-Id') || ''
      });
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  }
}
