import { readFile } from 'node:fs/promises';
import path from 'node:path';

export class PublicController {
  constructor(config) {
    this.config = config;
  }

  serveConfiguredPublicFile(fileName, contentType) {
    return async (req, res, next) => {
      try {
        const content = await readFile(path.join(this.config.publicDir, fileName), 'utf8');
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'no-cache');
        res.send(this.configuredPublicContent(content, fileName));
      } catch (error) {
        next(error);
      }
    };
  }

  configuredPublicContent(content, fileName) {
    const configuredName = fileName.endsWith('.html')
      ? this.escapeHtml(this.config.appName)
      : JSON.stringify(this.config.appName).slice(1, -1);
    return content
      .replaceAll('Escarbato', configuredName)
      .replaceAll('/assets', this.config.appAssetsPath)
      .replace(/(["'])assets\//g, `$1${this.config.appAssetsPath}/`)
      .replace('"__PETSHOP_SECTIONS_CONFIG__"', JSON.stringify(this.config.sections));
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
