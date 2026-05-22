import { AdminAuditoria } from '../models/admin-auditoria.js';

export class AuditoriaService {
  async admin(action, entity, detail, username = 'admin') {
    await AdminAuditoria.create({ action, entity, detail, username });
  }
}
