import assert from 'node:assert/strict';
import { escapeHtml } from '../src/public/js/ui.js';
import { ProveedoresComponent } from '../src/public/js/components/proveedores.js';
import { TiposComponent } from '../src/public/js/components/tipos.js';
import { ProductosComponent } from '../src/public/js/components/productos.js';
import { MetodosPagoComponent } from '../src/public/js/components/metodos-pago.js';
import { VentasComponent } from '../src/public/js/components/ventas.js';

const payload = '<img src=x onerror=alert(1)>';
const escapedPayload = '&lt;img src=x onerror=alert(1)&gt;';

assert.equal(escapeHtml(payload), escapedPayload);
assert.equal(escapeHtml('"x" & \'y\''), '&quot;x&quot; &amp; &#39;y&#39;');

assertSafeDetail(new ProveedoresComponent(fakeApp({
  proveedores: [{ id: 'prov-1', nombre: payload, contacto: payload, telefono: payload, email: payload, notas: payload }],
  productos: []
})), 'prov-1');

assertSafeDetail(new TiposComponent(fakeApp({
  tipos: [{ id: 'tipo-1', nombre: payload, desc: payload }],
  productos: []
})), 'tipo-1');

assertSafeDetail(new ProductosComponent(fakeApp({
  productos: [{ id: 'prod-1', nombre: payload, tipoId: 'tipo-1', proveedorId: 'prov-1', desc: payload, precio: 10, precioFinal: 10 }],
  tipos: [{ id: 'tipo-1', nombre: payload }],
  proveedores: [{ id: 'prov-1', nombre: payload }]
})), 'prod-1');

assertSafeDetail(new MetodosPagoComponent(fakeApp({
  metodosPago: [{ id: 'mp-1', nombre: payload }]
})), 'mp-1');

assertSafeDetail(new VentasComponent(fakeApp({
  ventas: [{
    id: 'venta-1',
    cliente: payload,
    metodoPago: { id: 'mp-1', nombre: payload },
    items: [{ productName: payload, qty: 1, price: 10 }],
    calculatedTotal: 10,
    finalTotal: 10,
    createdAt: new Date().toISOString()
  }]
})), 'venta-1');

function fakeApp(data) {
  return {
    store: { data },
    toasts: { show() {} },
    showDetail(_title, content) {
      this.lastDetail = content;
    }
  };
}

function assertSafeDetail(component, id) {
  component.view(id);
  assert.ok(component.app.lastDetail.includes(escapedPayload), 'el payload debe mostrarse escapado');
  assert.ok(!component.app.lastDetail.includes(payload), 'el payload crudo no debe quedar en innerHTML');
}
