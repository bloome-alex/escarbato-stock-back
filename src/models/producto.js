import mongoose from 'mongoose';
import { baseFields } from './base.js';

const productoSchema = new mongoose.Schema({
  ...baseFields,
  nombre: { type: String, required: true, trim: true },
  tipoId: { type: String, required: true },
  proveedorId: { type: String, default: null },
  costo: { type: Number, required: true, min: 0 },
  porcentaje: { type: Number, required: true, min: 0 },
  precio: { type: Number, required: true, min: 0 },
  precioFinal: { type: Number, required: true, min: 0 },
  minStock: { type: Number, default: 5, min: 0 },
  desc: { type: String, default: '' }
}, { versionKey: false });

productoSchema.index({ proveedorId: 1, nombre: 1 }, { unique: true, collation: { locale: 'es', strength: 2 } });

export const Producto = mongoose.model('Producto', productoSchema);
