import mongoose from 'mongoose';
import { baseFields } from './base.js';

const tipoSchema = new mongoose.Schema({
  ...baseFields,
  nombre: { type: String, required: true, trim: true },
  desc: { type: String, default: '' }
}, { versionKey: false });

export const Tipo = mongoose.model('Tipo', tipoSchema);
