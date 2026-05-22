import jwt from 'jsonwebtoken';
import { WebSocketServer } from 'ws';
import { Empresa } from '../models/empresa.js';

const HEARTBEAT_INTERVAL_MS = 3000;
const WS_HEARTBEAT_INTERVAL_MS = 30000;

export class RealtimeService {
  constructor(config, authMiddleware, connectionManager) {
    this.config = config;
    this.authMiddleware = authMiddleware;
    this.connectionManager = connectionManager;
    this.wss = null;
    this.wsHeartbeatTimer = null;
    this.cartReservations = new Map();
  }

  attach(server) {
    this.wss = new WebSocketServer({ server, path: '/ws' });
    this.wsHeartbeatTimer = setInterval(() => {
      for (const socket of this.wss.clients) {
        if (socket.readyState !== 1) {
          socket.terminate();
          continue;
        }

        if (!socket.isAlive) {
          socket.terminate();
          continue;
        }

        socket.isAlive = false;
        socket.ping();
      }
    }, WS_HEARTBEAT_INTERVAL_MS);
    this.wss.on('close', () => {
      clearInterval(this.wsHeartbeatTimer);
      this.wsHeartbeatTimer = null;
    });
    this.wss.on('connection', async (socket, req) => {
      const tenant = await this.authenticate(req);
      if (!tenant) {
        socket.close(1008, 'Token invalido');
        return;
      }

      socket.tenantDbName = tenant.dbName || null;
      socket.isAlive = true;
      socket.on('pong', () => {
        socket.isAlive = true;
      });

      const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      socket.clientId = url.searchParams.get('clientId') || '';
      socket.send(JSON.stringify({ type: 'connected', at: new Date().toISOString() }));
      socket.send(JSON.stringify({ type: 'cart-stock-changed', reservations: this.getReservationsSnapshot(socket.tenantDbName), at: new Date().toISOString() }));
      const heartbeatTimer = setInterval(() => {
        if (socket.readyState !== 1) return;
        socket.send(JSON.stringify({ type: 'heartbeat', at: new Date().toISOString() }));
      }, HEARTBEAT_INTERVAL_MS);
      socket.on('message', data => this.handleMessage(socket, data));
      socket.on('close', () => {
        clearInterval(heartbeatTimer);
        this.clearClientReservations(socket.tenantDbName, socket.clientId, 'socket:close');
      });
      socket.on('error', () => {});
    });
  }

  async authenticate(req) {
    try {
      const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      const token = url.searchParams.get('token');
      if (!token) return false;

      const tenant = await this.getTenant(req);
      if (!tenant) return false;
      const payload = jwt.verify(token, tenant.jwtSecret);
      return this.connectionManager.runWithTenant(tenant, async () => {
        const user = await this.authMiddleware.authService.getValidUser(payload.id, payload.tokenVersion);
        return user ? tenant : false;
      });
    } catch {
      return false;
    }
  }

  async getTenant(req) {
    const host = String(req.headers.host || '').split(':')[0].toLowerCase();
    const parts = host.split('.').filter(Boolean);
    const slug = host !== 'localhost' && parts.length >= 3 ? parts[0] : '';
    if (slug && slug !== 'admin') {
      const empresa = await Empresa.findOne({ nameSlug: slug, isActive: true }).lean();
      if (!empresa) return null;
      return { id: String(empresa._id), dbName: empresa.dbName, jwtSecret: empresa.jwtSecret };
    }
    return null;
  }

  broadcast(event) {
    if (!this.wss) return;

    const message = JSON.stringify({
      ...event,
      type: event.type || 'data-changed',
      at: new Date().toISOString()
    });

    for (const client of this.wss.clients) {
      if (client.readyState !== 1) continue;
      if (event.tenantDbName !== undefined && client.tenantDbName !== event.tenantDbName) continue;
      client.send(message);
    }
  }

  handleMessage(socket, data) {
    let message;
    try {
      message = JSON.parse(data.toString());
    } catch {
      return;
    }

    if (message.type === 'ping') {
      if (socket.readyState === 1) socket.send(JSON.stringify({ type: 'pong', at: new Date().toISOString() }));
      return;
    }

    if (message.type === 'cart:set') {
      this.setClientReservations(socket.tenantDbName, socket.clientId, message.items || []);
      return;
    }

    if (message.type === 'cart:clear') this.clearClientReservations(socket.tenantDbName, socket.clientId, 'cart:clear');
  }

  setClientReservations(tenantDbName, clientId, items) {
    if (!clientId) return;
    const tenantReservations = this.getTenantReservations(tenantDbName);
    const reservations = {};
    for (const item of items) {
      const productId = String(item.productId || '').trim();
      const qty = Number(item.qty || 0);
      if (productId && qty > 0) reservations[productId] = qty;
    }

    const previous = tenantReservations.get(clientId) || {};
    const affectedProductIds = this.getAffectedProductIds(previous, reservations);

    if (Object.keys(reservations).length) tenantReservations.set(clientId, reservations);
    else tenantReservations.delete(clientId);
    this.broadcastCartReservations(tenantDbName, { action: 'set', clientId, affectedProductIds });
  }

  clearClientReservations(tenantDbName, clientId, action = 'clear') {
    const tenantReservations = this.getTenantReservations(tenantDbName);
    if (!clientId || !tenantReservations.has(clientId)) return;
    const affectedProductIds = Object.keys(tenantReservations.get(clientId) || {});
    tenantReservations.delete(clientId);
    this.broadcastCartReservations(tenantDbName, { action, clientId, affectedProductIds });
  }

  getTenantReservations(tenantDbName) {
    const key = tenantDbName || '';
    if (!this.cartReservations.has(key)) this.cartReservations.set(key, new Map());
    return this.cartReservations.get(key);
  }

  getReservationsSnapshot(tenantDbName) {
    return Object.fromEntries(this.getTenantReservations(tenantDbName).entries());
  }

  getAffectedProductIds(previous, next) {
    return [...new Set([...Object.keys(previous || {}), ...Object.keys(next || {})])];
  }

  broadcastCartReservations(tenantDbName, meta = {}) {
    this.broadcast({
      type: 'cart-stock-changed',
      reservations: this.getReservationsSnapshot(tenantDbName),
      tenantDbName,
      ...meta
    });
  }
}
