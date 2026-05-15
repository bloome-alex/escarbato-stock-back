import mongoose from 'mongoose';
import { baseFields } from './base.js';

const tipoSchema = new mongoose.Schema({
  ...baseFields,
  nombre: { type: String, required: true, trim: true },
  desc: { type: String, default: '' }
}, { versionKey: false });

tipoSchema.index({ nombre: 1 }, { unique: true, collation: { locale: 'es', strength: 2 } });

export const Tipo = mongoose.model('Tipo', tipoSchema);
