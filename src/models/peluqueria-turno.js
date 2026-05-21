import mongoose from 'mongoose';
import { baseFields } from './base.js';

const ESTADOS_TURNO = ['pendiente', 'en curso', 'completado', 'cancelado'];

const peluqueriaTurnoSchema = new mongoose.Schema({
  ...baseFields,
  fecha: { type: String, required: true, trim: true },
  hora: { type: String, required: true, trim: true },
  servicioId: { type: String, required: true, trim: true },
  servicioNombre: { type: String, default: '' },
  tipoPerroId: { type: String, required: true, trim: true },
  tipoPerroNombre: { type: String, default: '' },
  cliente: { type: String, required: true, trim: true },
  estado: { type: String, enum: ESTADOS_TURNO, default: 'pendiente' },
  precio: { type: Number, default: 0, min: 0 },
  duracionMinutos: { type: Number, default: 60, min: 5 },
  observaciones: { type: String, default: '' },
  createdAt: { type: String, default: () => new Date().toISOString() }
}, { versionKey: false });

peluqueriaTurnoSchema.index({ fecha: 1, hora: 1 });
peluqueriaTurnoSchema.index({ cliente: 1 });

export const PeluqueriaTurno = mongoose.model('PeluqueriaTurno', peluqueriaTurnoSchema);
