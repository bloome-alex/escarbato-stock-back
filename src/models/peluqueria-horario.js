import mongoose from 'mongoose';
import { baseFields } from './base.js';

const rangoHorarioSchema = new mongoose.Schema({
  desde: { type: String, required: true, trim: true },
  hasta: { type: String, required: true, trim: true },
  turnosSimultaneos: { type: Number, default: 1, min: 1 }
}, { _id: false });

const peluqueriaHorarioSchema = new mongoose.Schema({
  ...baseFields,
  diaSemana: { type: Number, required: true, min: 1, max: 7 },
  nombreDia: { type: String, required: true, trim: true },
  rangos: { type: [rangoHorarioSchema], default: [] }
}, { versionKey: false });

peluqueriaHorarioSchema.index({ diaSemana: 1 }, { unique: true });

export const PeluqueriaHorario = mongoose.model('PeluqueriaHorario', peluqueriaHorarioSchema);
