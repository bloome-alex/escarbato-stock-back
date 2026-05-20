export class ErrorHandler {
  constructor(storeService) {
    this.storeService = storeService;
    this.handle = this.handle.bind(this);
  }

  handle(error, req, res, next) {
    console.error(error);
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    if (error.name === 'ValidationError') return res.status(400).json({ error: error.message });
    if (error.code === 11000) {
      if (req.path.startsWith('/api/auth/users')) return res.status(400).json({ error: 'Ya existe un usuario con ese nombre' });
      return res.status(400).json({ error: this.storeService.getDuplicateKeyMessage(req.params.store, error) });
    }
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}
