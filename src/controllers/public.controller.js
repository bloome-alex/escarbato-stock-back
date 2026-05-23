import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { Empresa } from '../models/empresa.js';

export class PublicController {
  constructor(config) {
    this.config = config;
  }

  serveConfiguredPublicFile(fileName, contentType) {
    return async (req, res, next) => {
      try {
        if (fileName === 'admin.html') {
          const clientIp = this.getClientIp(req);
          if (clientIp !== this.config.adminDomain) {
            return res.status(403).json({ error: 'Acceso admin denegado' });
          }
        }
        const content = await readFile(path.join(this.config.publicDir, fileName), 'utf8');
        const tenantConfig = await this.getTenantConfig(req);
        if (!tenantConfig) {
          res.status(404).setHeader('Content-Type', 'text/html; charset=utf-8');
          res.setHeader('Cache-Control', 'no-cache');
          return res.send(this.notFoundPage());
        }
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'no-cache');
        res.send(this.configuredPublicContent(content, fileName, tenantConfig));
      } catch (error) {
        next(error);
      }
    };
  }

  getClientIp(req) {
    const ip = String(req.ip || '').replace(/^::ffff:/, '');
    return ip === '::1' ? '127.0.0.1' : ip;
  }

  configuredPublicContent(content, fileName, tenantConfig = this.config) {
    const configuredName = fileName.endsWith('.html')
      ? this.escapeHtml(tenantConfig.appName)
      : JSON.stringify(tenantConfig.appName).slice(1, -1);
    const configuredBusinessType = fileName.endsWith('.html')
      ? this.escapeHtml(tenantConfig.businessType)
      : JSON.stringify(tenantConfig.businessType).slice(1, -1);
    return content
      .replaceAll('Escarbato', configuredName)
      .replaceAll('Petshop', configuredBusinessType)
      .replaceAll('/assets', tenantConfig.appAssetsPath)
      .replace(/(["'])assets\//g, `$1${tenantConfig.appAssetsPath}/`)
      .replace('"__PETSHOP_APP_NAME__"', JSON.stringify(tenantConfig.appName))
      .replace('"__PETSHOP_BUSINESS_TYPE__"', JSON.stringify(tenantConfig.businessType))
      .replace('"__PETSHOP_SECTIONS_CONFIG__"', JSON.stringify(this.config.sections));
  }

  async getTenantConfig(req) {
    const isAdminFile = req.path === '/admin' || req.path === '/admin.html';
    if (isAdminFile) return this.getAdminPublicConfig();

    const slug = this.getSubdomain(req);
    if (!slug) return null;
    const empresa = await Empresa.findOne({ nameSlug: slug, isActive: true }).lean();
    if (!empresa) return null;
    return {
      ...this.config,
      appName: empresa.name,
      businessType: empresa.businessType,
      appAssetsPath: this.config.normalizeAssetsPath(empresa.assetsPath)
    };
  }

  getAdminPublicConfig() {
    return {
      ...this.config,
      appName: 'Admin',
      businessType: 'Multi Empresa',
      appAssetsPath: '/assets'
    };
  }

  getSubdomain(req) {
    const host = String(req.hostname || req.headers.host || '').split(':')[0].toLowerCase();
    if (!host || host === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(host)) return '';
    const parts = host.split('.').filter(Boolean);
    if (parts.length < 3) return '';
    return parts[0] === 'admin' ? '' : parts[0];
  }

  notFoundPage() {
    return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>404 Not Found</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f6f2ea;color:#2d2017;font-family:Inter,system-ui,sans-serif}.card{max-width:520px;margin:20px;padding:32px;border-radius:20px;background:#fff;border:1px solid #e8ddd0;box-shadow:0 12px 36px rgba(92,61,46,.12);text-align:center}h1{margin:0;font-size:64px;line-height:1;color:#4e8055}h2{margin:14px 0 8px;font-size:26px}p{margin:0;color:#7a6355;line-height:1.5}</style></head><body><main class="card"><h1>404</h1><h2>Not Found</h2><p>La empresa solicitada no existe o no está habilitada.</p></main></body></html>`;
  }

  escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
