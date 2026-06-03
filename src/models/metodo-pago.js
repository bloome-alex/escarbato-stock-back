import mongoose from 'mongoose';
import { baseFields } from './base.js';

const metodoPagoSchema = new mongoose.Schema({
  ...baseFields,
  nombre: { type: String, required: true, trim: true },
  descuento: { type: Number, default: 0, min: 0 },
  recargo: { type: Number, default: 0, min: 0 },
  comision: { type: Number, default: 0, min: 0 }
}, { versionKey: false });

metodoPagoSchema.index({ nombre: 1 }, { unique: true, collation: { locale: 'es', strength: 2 } });

export const MetodoPago = mongoose.model('MetodoPago', metodoPagoSchema);
