import mongoose from 'mongoose';
import { baseFields } from './base.js';

const ventaSchema = new mongoose.Schema({
  ...baseFields,
  cliente: { type: String, default: '' },
  items: [{
    _id: false,
    productId: { type: String, required: true },
    productName: { type: String, required: true },
    qty: { type: Number, required: true, min: 0 },
    price: { type: Number, required: true, min: 0 },
    subtotal: { type: Number, required: true, min: 0 }
  }],
  calculatedTotal: { type: Number, required: true, min: 0 },
  finalTotal: { type: Number, required: true, min: 0 },
  createdAt: { type: String, required: true }
}, { versionKey: false });

export const Venta = mongoose.model('Venta', ventaSchema);
