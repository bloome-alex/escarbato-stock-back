import jwt from 'jsonwebtoken';
import { WebSocketServer } from 'ws';

const HEARTBEAT_INTERVAL_MS = 3000;

export class RealtimeService {
  constructor(config, authMiddleware) {
    this.config = config;
    this.authMiddleware = authMiddleware;
    this.wss = null;
    this.cartReservations = new Map();
  }

  attach(server) {
    this.wss = new WebSocketServer({ server, path: '/ws' });
    this.wss.on('connection', async (socket, req) => {
      if (!await this.authenticate(req)) {
        socket.close(1008, 'Token invalido');
        return;
      }

      const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      socket.clientId = url.searchParams.get('clientId') || '';
      socket.send(JSON.stringify({ type: 'connected', at: new Date().toISOString() }));
      socket.send(JSON.stringify({ type: 'cart-stock-changed', reservations: this.getReservationsSnapshot(), at: new Date().toISOString() }));
      const heartbeatTimer = setInterval(() => {
        if (socket.readyState !== 1) return;
        socket.send(JSON.stringify({ type: 'heartbeat', at: new Date().toISOString() }));
      }, HEARTBEAT_INTERVAL_MS);
      socket.on('message', data => this.handleMessage(socket, data));
      socket.on('close', () => {
        clearInterval(heartbeatTimer);
        this.clearClientReservations(socket.clientId, 'socket:close');
      });
      socket.on('error', () => {});
    });
  }

  authenticate(req) {
    try {
      const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      const token = url.searchParams.get('token');
      if (!token) return false;

      const payload = jwt.verify(token, this.config.jwtSecret);
      return this.authMiddleware.authService.getValidUser(payload.id, payload.credentials);
    } catch {
      return false;
    }
  }

  broadcast(event) {
    if (!this.wss) return;

    const message = JSON.stringify({
      ...event,
      type: event.type || 'data-changed',
      at: new Date().toISOString()
    });

    for (const client of this.wss.clients) {
      if (client.readyState === 1) client.send(message);
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
      this.setClientReservations(socket.clientId, message.items || []);
      return;
    }

    if (message.type === 'cart:clear') this.clearClientReservations(socket.clientId, 'cart:clear');
  }

  setClientReservations(clientId, items) {
    if (!clientId) return;
    const reservations = {};
    for (const item of items) {
      const productId = String(item.productId || '').trim();
      const qty = Number(item.qty || 0);
      if (productId && qty > 0) reservations[productId] = qty;
    }

    const previous = this.cartReservations.get(clientId) || {};
    const affectedProductIds = this.getAffectedProductIds(previous, reservations);

    if (Object.keys(reservations).length) this.cartReservations.set(clientId, reservations);
    else this.cartReservations.delete(clientId);
    this.broadcastCartReservations({ action: 'set', clientId, affectedProductIds });
  }

  clearClientReservations(clientId, action = 'clear') {
    if (!clientId || !this.cartReservations.has(clientId)) return;
    const affectedProductIds = Object.keys(this.cartReservations.get(clientId) || {});
    this.cartReservations.delete(clientId);
    this.broadcastCartReservations({ action, clientId, affectedProductIds });
  }

  getReservationsSnapshot() {
    return Object.fromEntries(this.cartReservations.entries());
  }

  getAffectedProductIds(previous, next) {
    return [...new Set([...Object.keys(previous || {}), ...Object.keys(next || {})])];
  }

  broadcastCartReservations(meta = {}) {
    this.broadcast({
      type: 'cart-stock-changed',
      reservations: this.getReservationsSnapshot(),
      ...meta
    });
  }
}
