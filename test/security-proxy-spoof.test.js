import assert from 'node:assert/strict';
import http from 'node:http';
import { ServerApplication } from '../src/app/server-application.js';
import { AppConfig } from '../src/config/app-config.js';

const config = new AppConfig({
  ADMIN_USERNAME: 'admin-operator',
  ADMIN_PASSWORD: 'Str0ng-passphrase!',
  ADMIN_DOMAIN: '203.0.113.10',
  TRUSTED_PROXY_IPS: ''
});
const app = new ServerApplication(config).build();
const server = http.createServer(app);

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

try {
  const { port } = server.address();
  const response = await request(port, {
    path: '/admin',
    headers: {
      'X-Forwarded-For': config.adminDomain,
      'X-Real-IP': config.adminDomain
    }
  });

  assert.notEqual(response.statusCode, 200, 'un X-Forwarded-For falsificado no debe habilitar admin');
  assert.equal(response.statusCode, 400, 'headers de proxy desde origen no confiable deben rechazarse');
} finally {
  await new Promise((resolve) => server.close(resolve));
}

function request(port, options) {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: '127.0.0.1', port, method: 'GET', ...options }, (res) => {
      res.resume();
      res.on('end', () => resolve({ statusCode: res.statusCode }));
    });
    req.on('error', reject);
    req.end();
  });
}
