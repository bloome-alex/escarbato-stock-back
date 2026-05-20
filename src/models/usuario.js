import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { baseFields } from './base.js';

const usuarioSchema = new mongoose.Schema({
  ...baseFields,
  username: { type: String, required: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, required: true, enum: ['auth', 'supervisor'] }
}, { versionKey: false });

usuarioSchema.index({ username: 1 }, { unique: true, collation: { locale: 'es', strength: 2 } });
usuarioSchema.index({ role: 1 }, { unique: true });

usuarioSchema.statics.hashPassword = function hashPassword(password) {
  return crypto.createHash('sha256').update(String(password || '')).digest('hex');
};

export const Usuario = mongoose.model('Usuario', usuarioSchema);
