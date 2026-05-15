import mongoose from 'mongoose';
import { baseFields } from './base.js';

const proveedorSchema = new mongoose.Schema({
  ...baseFields,
  nombre: { type: String, required: true, trim: true },
  contacto: { type: String, default: '' },
  telefono: { type: String, default: '' },
  email: { type: String, default: '' },
  notas: { type: String, default: '' }
}, { versionKey: false });

proveedorSchema.index({ nombre: 1 }, { unique: true, collation: { locale: 'es', strength: 2 } });

export const Proveedor = mongoose.model('Proveedor', proveedorSchema);
