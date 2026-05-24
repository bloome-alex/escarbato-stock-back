# Plan de Remediacion de Seguridad y Bugs Potenciales

## Objetivo

Corregir los riesgos detectados en la revision del refactor multi-empresa, priorizando vulnerabilidades explotables, aislamiento tenant, integridad de datos y endurecimiento operativo.

## Prioridad Media


### 8. Auditoria tenant mutable por API generica

**Problema:** la coleccion `auditoria` esta expuesta como store generico, por lo que un usuario autenticado podria modificar o borrar auditoria tenant.

**Solucion tecnica:**

- Separar stores de solo lectura y stores mutables.
- Permitir `GET /api/auditoria` si la UI lo necesita, pero bloquear `PUT` y `DELETE` para auditoria.
- Centralizar la escritura de auditoria en servicios backend controlados.
- Revisar si otros stores deberian tener restricciones por rol.
- Agregar pruebas de que `PUT /api/auditoria/:id` y `DELETE /api/auditoria/:id` devuelven 403 o 404.

### 9. Edicion de ventas no ajusta stock

**Problema:** crear venta decrementa stock, borrar venta lo restaura, pero editar una venta existente no recalcula diferencias de stock.

**Solucion tecnica:**

- Definir regla funcional para edicion de ventas: prohibir edicion o soportarla con ajuste diferencial.
- Si se soporta edicion, calcular diferencia entre items anteriores y nuevos por producto.
- Aplicar increments/decrements atomicos sobre stock antes de guardar la venta actualizada.
- Validar stock suficiente para incrementos de cantidad o nuevos productos.
- Usar transaccion MongoDB si el despliegue lo permite, o rollback manual consistente si no hay replica set.
- Agregar pruebas para aumentar, reducir, cambiar producto y eliminar items de una venta existente.

### 10. Token WebSocket en query string

**Problema:** el token en query string puede quedar registrado en logs de proxy, navegador o herramientas de monitoreo.

**Solucion tecnica:**

- Evitar tokens largos o bearer tokens en URL.
- Para navegador, considerar cookie segura `HttpOnly`, `Secure`, `SameSite` y validar la sesion en upgrade WebSocket.
- Alternativamente emitir un token efimero de WebSocket de muy corta duracion obtenido por API autenticada.
- Configurar proxy para no loguear query strings mientras se migra.
- Invalidar tokens WebSocket al expirar sesion o cambiar password/tokenVersion.

## Prioridad Baja

### 11. CORS abierto

**Problema:** CORS permite cualquier origen. Con bearer tokens no expone por si solo, pero amplifica impacto si hay XSS o token filtrado.

**Solucion tecnica:**

- Definir lista de dominios permitidos para admin y tenants.
- Resolver origen permitido por tenant/subdominio si aplica.
- Rechazar origins desconocidos en produccion.
- Mantener CORS abierto solo en desarrollo si es necesario.
- Verificar que requests sin `Origin` validos para backend/proxy sigan funcionando si corresponden.

### 12. Falta de headers de seguridad

**Problema:** no hay CSP ni headers defensivos basicos.

**Solucion tecnica:**

- Agregar headers HTTP de seguridad a nivel Express o reverse proxy.
- Incluir al menos: `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `X-Frame-Options` o `frame-ancestors`, y permisos via `Permissions-Policy`.
- Disenar CSP compatible con modulos JS actuales y assets por tenant.
- Empezar con CSP en modo `Report-Only` si hay riesgo de romper frontend.
- Ajustar service worker y recursos estaticos para cumplir la politica.

### 13. Logs de tenant permanentes

**Problema:** los logs de debug de tenant pueden filtrar hosts, paths y nombres internos en produccion.

**Solucion tecnica:**

- Controlar logs de tenant con una variable o flag de debug no habilitado por defecto.
- Usar niveles de log (`debug`, `info`, `warn`, `error`) en vez de `console.log` directo.
- Evitar imprimir tokens, credenciales, query strings completas o datos sensibles.
- Mantener logs utiles para diagnostico de subdominio sin exponer informacion innecesaria.

## Orden recomendado de trabajo

1. Corregir IP admin spoofeable.
2. Eliminar XSS almacenado en UI.
3. Redisenar JWT sin hash de password y agregar versionado de token.
4. Migrar password hashing a Argon2id/bcrypt.
5. Quitar credenciales admin por defecto.
6. Validar `empresaId` en tokens y evitar secretos repetidos.
7. Agregar rate limiting.
8. Bloquear mutaciones directas sobre auditoria.
9. Resolver edicion de ventas y stock.
10. Migrar autenticacion WebSocket fuera de query string.
11. Restringir CORS.
12. Agregar headers de seguridad.
13. Pasar logs tenant a modo debug.

## Criterios de aceptacion generales

- El backend no permite acceder a admin con headers de IP falsificados.
- Ningun dato de negocio renderizado puede ejecutar HTML o JavaScript.
- Los JWT no contienen hashes ni secretos.
- Cambiar password invalida tokens previos.
- Las contrasenas nuevas se almacenan con algoritmo lento y salt.
- No existen credenciales admin por defecto en runtime productivo.
- Un token de una empresa no sirve en otra.
- Login admin y tenant tienen proteccion anti brute force.
- Auditoria no puede modificarse desde endpoints genericos.
- Stock queda consistente al crear, editar y borrar ventas.
- WebSocket no expone bearer tokens en URLs persistentes.
- Produccion usa CORS y headers de seguridad restrictivos.
- Logs de debug no quedan activos por defecto.
