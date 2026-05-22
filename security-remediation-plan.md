# Plan de Remediacion de Seguridad y Bugs Potenciales

## Objetivo

Corregir los riesgos detectados en la revision del refactor multi-empresa, priorizando vulnerabilidades explotables, aislamiento tenant, integridad de datos y endurecimiento operativo.

## Prioridad Alta

### 1. Restriccion admin por IP spoofeable

**Problema:** el backend confia directamente en `X-Forwarded-For` y `X-Real-IP`. Si el servicio queda accesible sin pasar por un reverse proxy confiable, un cliente puede falsificar esos headers y simular la IP VPN/admin.

**Solucion tecnica:**

- Definir explicitamente si Express corre detras de proxy y configurar `trust proxy` solo para IPs/rangos confiables del reverse proxy.
- Rechazar headers `X-Forwarded-For` y `X-Real-IP` si el request no proviene de un proxy confiable.
- Usar `req.ip` como fuente canonica despues de configurar correctamente `trust proxy`.
- Documentar que el backend no debe exponerse directamente a internet si la proteccion admin depende del proxy/VPN.
- Agregar una prueba HTTP que verifique que un `X-Forwarded-For` falsificado no habilita admin cuando el origen no es confiable.

### 2. XSS almacenado por render con `innerHTML`

**Problema:** varios componentes renderizan datos de negocio con `innerHTML` sin escapar. Un valor malicioso almacenado en MongoDB podria ejecutar JavaScript en el navegador y robar tokens o manipular la UI.

**Solucion tecnica:**

- Introducir una politica unica de render seguro para la UI.
- Escapar todo dato proveniente de backend antes de insertarlo en strings HTML.
- Preferir `textContent`, `createElement` o helpers de template seguro para valores dinamicos.
- Revisar todos los componentes que construyen tablas, modales y detalles con datos de negocio.
- Cubrir al menos entidades principales: proveedores, tipos, productos, metodos de pago, ventas, cajas, peluqueria y usuarios.
- Agregar casos de prueba manuales o automatizados con valores como `<img src=x onerror=alert(1)>` para confirmar que se muestran como texto.

### 3. JWT de empresa contiene hash de password

**Problema:** el payload del JWT incluye `credentials` con el hash de password. Si el token se filtra, tambien se filtra material reutilizable para cracking offline y validacion de sesion.

**Solucion tecnica:**

- Quitar el hash de password del JWT.
- Incorporar un campo de version de credenciales o `tokenVersion` en el usuario tenant.
- Incluir en el JWT solo identificadores y metadatos no sensibles: `id`, `username`, `role`, `empresaId`, `tokenVersion`.
- Al cambiar password, incrementar `tokenVersion` para invalidar tokens anteriores.
- En middleware auth, validar usuario activo y coincidencia de `tokenVersion`.
- Considerar expiraciones cortas y refresh controlado si se requiere UX prolongada.

### 4. Password hashing debil con SHA-256 sin salt

**Problema:** SHA-256 rapido y sin salt facilita ataques offline si se filtra la base de datos.

**Solucion tecnica:**

- Migrar contraseñas a un algoritmo lento con salt, preferentemente Argon2id o bcrypt.
- Guardar hashes en formato autocontenido que incluya algoritmo, parametros y salt.
- Mantener una estrategia de migracion: al login, si el hash viejo SHA-256 valida, rehashear con el algoritmo nuevo.
- Aplicar lo mismo a usuarios tenant y credenciales almacenadas en `admin.empresas`.
- Definir parametros de costo adecuados al entorno de produccion.
- Agregar pruebas para login con hash nuevo y migracion desde hash legacy.

### 5. Credenciales admin por defecto

**Problema:** si no se configuran envs, el admin queda con `admin/admin123`.

**Solucion tecnica:**

- Hacer obligatorias `ADMIN_USERNAME` y `ADMIN_PASSWORD` en arranque.
- Fallar el proceso si faltan o si coinciden con valores inseguros conocidos.
- Exigir longitud minima y complejidad razonable para `ADMIN_PASSWORD`.
- Documentar configuracion requerida en `.env.example` sin dejar password real reutilizable.
- Opcionalmente aceptar un hash de password admin en vez de password plano en env.

## Prioridad Media

### 6. Token cross-tenant si se comparte `jwtSecret`

**Problema:** el middleware valida firma con `req.empresa.jwtSecret`, pero no verifica que `payload.empresaId` coincida con la empresa resuelta por subdominio. Si dos tenants comparten secreto y credenciales equivalentes, podria haber uso cruzado de token.

**Solucion tecnica:**

- Validar obligatoriamente `payload.empresaId === req.empresa.id`.
- Validar tambien `payload.role` contra roles permitidos.
- Rechazar tokens sin `empresaId`.
- Impedir desde admin que dos empresas tengan el mismo `jwtSecret`, o generar secretos automaticamente para evitar reutilizacion.
- Agregar prueba con dos tenants y secretos iguales/distintos para confirmar aislamiento.

### 7. Falta de rate limiting en login

**Problema:** login admin y login tenant no tienen proteccion contra brute force.

**Solucion tecnica:**

- Agregar rate limiting por IP y por usuario/subdominio.
- Definir limites separados para `/api/admin/login` y `/api/auth/login`.
- Usar ventanas cortas con bloqueo temporal progresivo.
- Registrar intentos fallidos admin en auditoria admin.
- Asegurar que errores de login no permitan enumerar usuarios.
- Si hay proxy, usar la IP canonica definida por la configuracion segura de `trust proxy`.

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
