import 'dotenv/config';
import mongoose from 'mongoose';
import { Producto } from '../models/index.js';

const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/escarbato_petshop';

try {
  await mongoose.connect(mongoUri);
  const result = await Producto.updateMany({}, { $set: { minStock: 0 } });
  console.log(`Productos encontrados: ${result.matchedCount}`);
  console.log(`Productos actualizados: ${result.modifiedCount}`);
} catch (error) {
  console.error('Error actualizando stock mínimo:', error);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
