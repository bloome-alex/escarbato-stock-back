import mongoose from 'mongoose';
import { baseFields } from './base.js';
import { PasswordHash } from '../utils/password-hash.js';

const usuarioSchema = new mongoose.Schema({
  ...baseFields,
  username: { type: String, required: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, required: true, enum: ['auth', 'supervisor'] },
  isActive: { type: Boolean, default: true },
  tokenVersion: { type: Number, default: 0 }
}, { versionKey: false });

usuarioSchema.index({ username: 1 }, { unique: true, collation: { locale: 'es', strength: 2 } });
usuarioSchema.index({ role: 1 }, { unique: true });

usuarioSchema.statics.hashPassword = function hashPassword(password) {
  return PasswordHash.hash(password);
};

usuarioSchema.statics.verifyPassword = function verifyPassword(password, storedHash) {
  return PasswordHash.verify(password, storedHash);
};

export const Usuario = mongoose.model('Usuario', usuarioSchema);
