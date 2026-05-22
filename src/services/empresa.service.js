import { Empresa } from '../models/empresa.js';
import { HttpError } from '../utils/http-error.js';
import { Sanitizer } from '../utils/sanitize.js';

export class EmpresaService {
  constructor(connectionManager, auditoriaService) {
    this.connectionManager = connectionManager;
    this.auditoriaService = auditoriaService;
  }

  async list() {
    return Sanitizer.list(await Empresa.find().sort({ createdAt: -1 }).lean()).map(this.safeEmpresa);
  }

  async getById(id) {
    const empresa = await Empresa.findById(id).lean();
    if (!empresa) throw new HttpError('Empresa no encontrada', 404);
    return this.safeEmpresa(Sanitizer.record(empresa));
  }

  async create(body, adminUsername) {
    const payload = this.buildPayload(body, true);
    await this.assertUniqueEmpresa(payload);

    const empresa = await Empresa.create(payload);
    try {
      await this.initializeTenantUsers(empresa);
      await this.auditoriaService.admin('Creación', 'Empresa', `Empresa creada: ${empresa.name}`, adminUsername);
      return this.safeEmpresa(Sanitizer.record(empresa));
    } catch (error) {
      await Empresa.deleteOne({ _id: empresa._id });
      await this.connectionManager.clearConnection(empresa.dbName).catch(() => {});
      throw error;
    }
  }

  async update(id, body, adminUsername) {
    const current = await Empresa.findById(id).lean();
    if (!current) throw new HttpError('Empresa no encontrada', 404);
    const payload = this.buildPayload({ ...body, jwtSecret: body.jwtSecret || current.jwtSecret }, false);
    if (payload.dbName !== current.dbName) throw new HttpError('No se puede cambiar la base de datos de una empresa existente');
    await this.assertUniqueEmpresa(payload, id);

    const empresa = await Empresa.findByIdAndUpdate(id, { ...payload, updatedAt: new Date() }, { new: true, runValidators: true });
    if (!empresa) throw new HttpError('Empresa no encontrada', 404);
    await this.initializeTenantUsers(empresa);
    await this.auditoriaService.admin('Edición', 'Empresa', `Empresa actualizada: ${empresa.name}`, adminUsername);
    return this.safeEmpresa(Sanitizer.record(empresa));
  }

  async remove(id, adminUsername) {
    const empresa = await Empresa.findByIdAndUpdate(id, { isActive: false, updatedAt: new Date() }, { new: true });
    if (!empresa) throw new HttpError('Empresa no encontrada', 404);
    await this.auditoriaService.admin('Baja', 'Empresa', `Empresa deshabilitada: ${empresa.name}`, adminUsername);
    return this.safeEmpresa(Sanitizer.record(empresa));
  }

  async updatePassword(id, body, adminUsername) {
    const role = body.role === 'supervisor' ? 'supervisor' : 'auth';
    const password = String(body.password || '');
    if (!password) throw new HttpError('La contraseña es obligatoria');
    const field = role === 'supervisor' ? 'supervisorPasswordHash' : 'authPasswordHash';
    const empresa = await Empresa.findByIdAndUpdate(id, { [field]: Empresa.hashPassword(password), updatedAt: new Date() }, { new: true });
    if (!empresa) throw new HttpError('Empresa no encontrada', 404);
    await this.initializeTenantUsers(empresa);
    await this.auditoriaService.admin('Edición', 'Empresa', `Contraseña actualizada: ${empresa.name} (${role})`, adminUsername);
    return this.safeEmpresa(Sanitizer.record(empresa));
  }

  buildPayload(body = {}, requirePasswords) {
    const payload = {
      name: String(body.name || '').trim(),
      businessType: String(body.businessType || '').trim(),
      assetsPath: String(body.assetsPath || '').trim().replace(/^\/+|\/+$/g, ''),
      dbName: String(body.dbName || '').trim(),
      jwtSecret: String(body.jwtSecret || '').trim(),
      authUsername: String(body.authUsername || '').trim(),
      supervisorUsername: String(body.supervisorUsername || '').trim(),
      isActive: body.isActive !== false
    };
    payload.nameSlug = Empresa.slugify(body.nameSlug || payload.name);
    if (!payload.name || !payload.businessType || !payload.assetsPath || !payload.dbName || !payload.jwtSecret || !payload.authUsername || !payload.supervisorUsername) {
      throw new HttpError('Faltan datos obligatorios');
    }
    if (requirePasswords) {
      if (!body.authPassword || !body.supervisorPassword) throw new HttpError('Las contraseñas son obligatorias');
      payload.authPasswordHash = Empresa.hashPassword(body.authPassword);
      payload.supervisorPasswordHash = Empresa.hashPassword(body.supervisorPassword);
    }
    return payload;
  }

  async assertUniqueEmpresa(payload, excludeId = null) {
    const query = { $or: [{ dbName: payload.dbName }, { nameSlug: payload.nameSlug }] };
    if (excludeId) query._id = { $ne: excludeId };
    const duplicate = await Empresa.findOne(query).lean();
    if (duplicate) throw new HttpError('Ya existe una empresa con ese nombre o base de datos');
  }

  async initializeTenantUsers(empresa) {
    const Usuario = await this.connectionManager.getModel('usuarios', empresa.dbName);
    await Usuario.deleteMany({ id: { $nin: ['auth', 'supervisor'] } });
    await Usuario.findOneAndUpdate(
      { id: 'auth' },
      { id: 'auth', role: 'auth', username: empresa.authUsername, passwordHash: empresa.authPasswordHash },
      { upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
    await Usuario.findOneAndUpdate(
      { id: 'supervisor' },
      { id: 'supervisor', role: 'supervisor', username: empresa.supervisorUsername, passwordHash: empresa.supervisorPasswordHash },
      { upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
  }

  safeEmpresa(empresa) {
    const { authPasswordHash, supervisorPasswordHash, jwtSecret, ...safe } = empresa;
    return safe;
  }
}
