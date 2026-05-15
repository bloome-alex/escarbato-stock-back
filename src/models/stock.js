import mongoose from 'mongoose';
import { baseFields } from './base.js';

const stockSchema = new mongoose.Schema({
  ...baseFields,
  qty: { type: Number, required: true, min: 0 }
}, { versionKey: false });

export const Stock = mongoose.model('Stock', stockSchema);
