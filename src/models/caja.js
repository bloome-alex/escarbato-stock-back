import mongoose from 'mongoose';
import { baseFields } from './base.js';

const cajaAmountSchema = new mongoose.Schema({
  _id: false,
  metodoPagoId: { type: String, required: true },
  metodoPagoNombre: { type: String, required: true },
  monto: { type: Number, required: true, min: 0 }
});

const cajaSchema = new mongoose.Schema({
  ...baseFields,
  status: { type: String, enum: ['abierta', 'cerrada'], required: true, default: 'abierta', index: true },
  openedAt: { type: String, required: true, default: () => new Date().toISOString() },
  closedAt: { type: String, default: '' },
  initialAmounts: { type: [cajaAmountSchema], default: [] },
  createdAt: { type: String, required: true, default: () => new Date().toISOString() }
}, { versionKey: false });

export const Caja = mongoose.model('Caja', cajaSchema);
