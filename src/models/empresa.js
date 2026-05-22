import crypto from 'node:crypto';
import mongoose from 'mongoose';

const empresaSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  nameSlug: { type: String, required: true, trim: true, lowercase: true, unique: true },
  businessType: { type: String, required: true, trim: true },
  assetsPath: { type: String, required: true, trim: true },
  dbName: { type: String, required: true, trim: true, unique: true },
  jwtSecret: { type: String, required: true },
  authUsername: { type: String, required: true, trim: true },
  authPasswordHash: { type: String, required: true },
  supervisorUsername: { type: String, required: true, trim: true },
  supervisorPasswordHash: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { versionKey: false });

empresaSchema.pre('validate', function setSlug() {
  if (!this.nameSlug) this.nameSlug = Empresa.slugify(this.name);
});

empresaSchema.pre('save', function setUpdatedAt() {
  this.updatedAt = new Date();
});

empresaSchema.statics.hashPassword = function hashPassword(password) {
  return crypto.createHash('sha256').update(String(password || '')).digest('hex');
};

empresaSchema.statics.slugify = function slugify(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

export const Empresa = mongoose.model('Empresa', empresaSchema);
