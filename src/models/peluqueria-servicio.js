import mongoose from 'mongoose';
import { baseFields } from './base.js';

const precioPorTipoSchema = new mongoose.Schema({
  tipoPerroId: { type: String, required: true, trim: true },
  tipoPerroNombre: { type: String, default: '' },
  precio: { type: Number, default: 0, min: 0 },
  duracionMinutos: { type: Number, default: 60, min: 5 }
}, { _id: false });

const peluqueriaServicioSchema = new mongoose.Schema({
  ...baseFields,
  nombre: { type: String, required: true, trim: true },
  desc: { type: String, default: '' },
  preciosPorTipo: { type: [precioPorTipoSchema], default: [] }
}, { versionKey: false });

peluqueriaServicioSchema.index({ nombre: 1 }, { unique: true, collation: { locale: 'es', strength: 2 } });

export const PeluqueriaServicio = mongoose.model('PeluqueriaServicio', peluqueriaServicioSchema);
