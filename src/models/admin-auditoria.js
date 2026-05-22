import mongoose from 'mongoose';

const adminAuditoriaSchema = new mongoose.Schema({
  action: { type: String, required: true },
  entity: { type: String, required: true },
  detail: { type: String, required: true },
  username: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
}, { versionKey: false });

export const AdminAuditoria = mongoose.model('AdminAuditoria', adminAuditoriaSchema, 'auditoria');
