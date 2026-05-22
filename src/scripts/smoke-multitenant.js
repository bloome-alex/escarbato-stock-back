import 'dotenv/config';
import assert from 'node:assert/strict';
import { AppConfig } from '../config/app-config.js';
import { MongoDatabase } from '../database/mongo-database.js';
import { ConnectionManager } from '../database/connection-manager.js';
import { Empresa } from '../models/empresa.js';
import { AuditoriaService } from '../services/auditoria.service.js';
import { AuthService } from '../services/auth.service.js';
import { EmpresaService } from '../services/empresa.service.js';
import { ModelRegistry } from '../services/model-registry.js';

const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const dbName = `smoke_tenant_${suffix.replace(/[^a-z0-9_]/gi, '_')}`;
const name = `Smoke Tenant ${suffix}`;

const config = new AppConfig();
const database = new MongoDatabase(config);
const connectionManager = new ConnectionManager(config);
const empresaService = new EmpresaService(connectionManager, new AuditoriaService());

try {
  await database.connect();

  const empresa = await empresaService.create({
    name,
    nameSlug: `smoke-${suffix}`,
    businessType: 'Smoke Test',
    assetsPath: 'assets/smoke',
    dbName,
    jwtSecret: `secret-${suffix}`,
    authUsername: 'auth-smoke',
    authPassword: 'auth-pass',
    supervisorUsername: 'supervisor-smoke',
    supervisorPassword: 'supervisor-pass'
  }, 'smoke');

  assert.equal(empresa.dbName, dbName);
  assert.equal(empresa.nameSlug, `smoke-${suffix}`);
  assert.equal(empresa.jwtSecret, undefined);

  const storedEmpresa = await Empresa.findOne({ dbName }).lean();
  assert.ok(storedEmpresa, 'La empresa debe existir en la DB admin');

  const authService = new AuthService(config, new ModelRegistry(connectionManager));
  const tenant = { id: String(storedEmpresa._id), dbName, jwtSecret: storedEmpresa.jwtSecret };
  const authUser = await connectionManager.runWithTenant(tenant, () => authService.authenticate('auth-smoke', 'auth-pass'));
  const supervisorUser = await connectionManager.runWithTenant(tenant, () => authService.authenticate('supervisor-smoke', 'supervisor-pass'));
  assert.equal(authUser?.role, 'auth');
  assert.equal(supervisorUser?.role, 'supervisor');

  await assert.rejects(
    () => empresaService.create({
      name: `${name} duplicate`,
      businessType: 'Smoke Test',
      assetsPath: 'assets/smoke',
      dbName,
      jwtSecret: `secret-duplicate-${suffix}`,
      authUsername: 'auth-smoke-2',
      authPassword: 'auth-pass',
      supervisorUsername: 'supervisor-smoke-2',
      supervisorPassword: 'supervisor-pass'
    }, 'smoke'),
    /Ya existe una empresa/
  );

  await empresaService.updatePassword(storedEmpresa._id, { role: 'auth', password: 'new-auth-pass' }, 'smoke');
  const oldAuth = await connectionManager.runWithTenant(tenant, () => authService.authenticate('auth-smoke', 'auth-pass'));
  const newAuth = await connectionManager.runWithTenant(tenant, () => authService.authenticate('auth-smoke', 'new-auth-pass'));
  assert.equal(oldAuth, null);
  assert.equal(newAuth?.role, 'auth');

  console.log('Smoke multi-tenant OK');
} finally {
  await Empresa.deleteMany({ dbName });
  const connection = await connectionManager.getConnection(dbName).catch(() => null);
  if (connection) await connection.dropDatabase().catch(() => {});
  await connectionManager.closeAll().catch(() => {});
  const mongoose = await import('mongoose');
  await mongoose.default.disconnect().catch(() => {});
}
