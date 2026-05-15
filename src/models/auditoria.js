import mongoose from 'mongoose';
import { baseFields } from './base.js';

const auditoriaSchema = new mongoose.Schema({
  ...baseFields,
  action: { type: String, required: true },
  entity: { type: String, required: true },
  detail: { type: String, required: true },
  createdAt: { type: String, required: true }
}, { versionKey: false });

export const Auditoria = mongoose.model('Auditoria', auditoriaSchema);
