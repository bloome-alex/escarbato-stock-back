import mongoose from 'mongoose';
import { baseFields } from './base.js';

const grupoProductoSchema = new mongoose.Schema({
  ...baseFields,
  nombre: { type: String, required: true, trim: true },
  desc: { type: String, default: '' }
}, { versionKey: false });

grupoProductoSchema.index({ nombre: 1 }, { unique: true, collation: { locale: 'es', strength: 2 } });

export const GrupoProducto = mongoose.model('GrupoProducto', grupoProductoSchema);
