# Plan de Implementación: Sistema Multi-Empresa con Admin Centralizado

## 1. Contexto

La aplicación actual es un sistema monolítico donde cada empresa/ambiente se despliega como una instancia separada con su propia base de datos MongoDB, configurada mediante variables de entorno individuales.

El objetivo es refactorizar la aplicación para soportar múltiples empresas (tenants) desde una única instancia del servidor, con:

- Un panel de administración accessible solo via VPN (IP configurada)
- Cada empresa identificada por subdominio (empresa1.dominio.com)
- Base de datos MongoDB separada por empresa
- Configuración de cada empresa gestionada desde el admin

## 2. Variables de Entorno

### 2.1 Variables globales del sistema (solo 5)

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `ADMIN_USERNAME` | Usuario administrador del sistema | `admin` |
| `ADMIN_PASSWORD` | Contraseña administrador del sistema | `admin123` |
| `ADMIN_DOMAIN` | IP/VPN desde donde se permite acceso admin | `127.0.0.1` |
| `MONGODB_URI` | URI de conexión MongoDB (misma para todas las empresas) | `mongodb://localhost:27017` |
| `MONGODB_DB_ADMIN_NAME` | Nombre de la base de datos admin | `admin` |

### 2.2 Variables eliminadas (pasarán a configurarse por empresa)

- `APP_NAME`
- `APP_BUSINESS_TYPE`
- `APP_ASSETS_PATH`
- `MONGODB_DB_NAME`
- `JWT_SECRET`
- `AUTH_USERNAME`
- `AUTH_PASSWORD`
- `SUPERVISOR_USERNAME`
- `SUPERVISOR_PASSWORD`

## 3. Arquitectura de Base de Datos

### 3.1 Base de datos "admin"

Colecciones:

```
admin.empresas
{
  _id: ObjectId,
  name: string,                    // APP_NAME de la empresa
  businessType: string,            // APP_BUSINESS_TYPE
  assetsPath: string,              // APP_ASSETS_PATH
  dbName: string,                  // MONGODB_DB_NAME (único por empresa)
  jwtSecret: string,                // JWT_SECRET de la empresa
  authUsername: string,             // AUTH_USERNAME
  authPasswordHash: string,        // AUTH_PASSWORD (SHA256)
  supervisorUsername: string,       // SUPERVISOR_USERNAME
  supervisorPasswordHash: string,  // SUPERVISOR_PASSWORD (SHA256)
  isActive: boolean,               // Habilitada/Deshabilitada
  createdAt: Date,
  updatedAt: Date
}

### 3.2 Base de datos por empresa

Cada empresa tiene su propia base de datos MongoDB con las colecciones existentes:

```
[dbName].usuarios
[dbName].productos
[dbName].stocks
[dbName].ventas
[dbName].cajas
[dbName].metodopagos
[dbName].proveedors
[dbName].tipos
[dbName].auditorias
[dbName].peluqueriatipoperros
[dbName].peluqueriaservicios
[dbName].peluqueriaturnos
[dbName].peluqueriahorarios
```

## 4. Flujo de Autenticación

### 4.1 Admin (acceso desde ADMIN_DOMAIN)

```
POST /api/admin/login
Body: { username: "admin", password: "admin123" }

1. Verifica IP del request == ADMIN_DOMAIN (configurado en env)
2. Valida credenciales contra ADMIN_USERNAME / ADMIN_PASSWORD
3. Genera JWT admin con secret: SHA256(ADMIN_USERNAME + ADMIN_PASSWORD)
4. Returns: { token: "jwt...", user: { username, role: "admin" } }
```

### 4.2 Empresa (acceso por subdominio)

```
POST /api/auth/login
Body: { username: "auth", password: "xxx" }
Host: empresa1.dominio.com

1. subdomain-middleware extrae "empresa1" del Host
2. Busca empresa en admin.empresas donde nameSlug = "empresa1"
3. Si no existe o isActive = false → 404
4. Conecta a MongoDB[dbName]
5. Busca usuario en [dbName].usuarios
6. Valida password contra hash almacenado
7. Genera JWT empresa con secret: empresa.jwtSecret
8. Returns: { token: "jwt...", user: { username, role } }
```

## 5. Middlewares

### 5.1 admin-middleware.js

```javascript
// Verifica que el request venga de ADMIN_DOMAIN Y tenga JWT admin válido
// Se aplica SOLO a rutas /api/admin/*
// Si IP != ADMIN_DOMAIN → 403 Forbidden
// Si JWT inválido → 401 Unauthorized
```

### 5.2 subdomain-middleware.js

```javascript
// Extrae subdominio del Host header
// Busca empresa en DB admin
// Establece connection a la DB de la empresa
// Adjunta empresa config al request (req.empresa)
// Si no hay subdominio (es admin o root) → permite pasar a admin-middleware
```

## 6. API del Admin

### 6.1 Endpoints (solo desde ADMIN_DOMAIN)

| Método | Path | Descripción |
|--------|------|-------------|
| POST | `/api/admin/login` | Login admin |
| GET | `/api/admin/empresas` | Listar todas las empresas |
| GET | `/api/admin/empresas/:id` | Obtener empresa por ID |
| POST | `/api/admin/empresas` | Crear nueva empresa |
| PUT | `/api/admin/empresas/:id` | Actualizar empresa |
| DELETE | `/api/admin/empresas/:id` | Eliminar empresa (soft delete: isActive = false) |
| PUT | `/api/admin/empresas/:id/password` | Cambiar contraseña de usuario auth o supervisor |

### 6.2 Schema de creación de empresa (POST /api/admin/empresas)

```json
{
  "name": "Empresa 1",
  "businessType": "Petshop",
  "assetsPath": "assets/empresa1",
  "dbName": "empresa1",
  "jwtSecret": "secret-unico-empresa1",
  "authUsername": "auth",
  "authPassword": "authpass123",
  "supervisorUsername": "supervisor",
  "supervisorPassword": "superpass123"
}
```

Al crear:
1. Validar que `dbName` no exista previamente
2. Hashear contraseñas con SHA256
3. Crear conexión a la nueva DB
4. Inicializar datos base en la DB (usuarios, etc.)
5. Guardar empresa en admin.empresas

## 7. Connection Manager

### 7.1 Responsabilidades

- Mantener cache de conexiones MongoDB por dbName
- Crear nuevas conexiones bajo demanda
- Cerrar conexiones cuando sea necesario
- Proveer acceso a la conexión activa por request

### 7.2 API

```javascript
ConnectionManager.getConnection(dbName) // Promise<MongooseConnection>
ConnectionManager.setConnection(dbName, connection)
ConnectionManager.clearConnection(dbName)
ConnectionManager.closeAll()
ConnectionManager.getActiveDbName() // Para el request actual
ConnectionManager.setActiveDbName(dbName) // Por request
```

## 9. Inicialización de Empresa Nueva

Al crear una empresa, se debe inicializar:

1. **Colección `usuarios`**: Insertar los usuarios auth y supervisor con contraseñas hasheadas

Esto se implementa en `bootstrap-data.service.js` adaptado.

## 10. JWT

### 10.1 Admin JWT

- Secret: `SHA256(ADMIN_USERNAME + ADMIN_PASSWORD)`
- Payload: `{ username, role: "admin", iat, exp }`
- Expiración: 12h

### 10.2 Empresa JWT

- Secret: `empresa.jwtSecret` (almacenado en DB admin)
- Payload: `{ id, username, role, empresaId, iat, exp }`
- Expiración: 12h

## 11. Consideraciones de Seguridad

### 11.1 Restricción de IP para Admin

- Solo Requests con `REMOTE_ADDR == ADMIN_DOMAIN` pueden acceder a `/api/admin/*`
- El reverse proxy debe enviar el header `X-Forwarded-For` o `X-Real-IP` con la IP real del cliente VPN
- Verificar que la IP sea la VPN, no la del proxy

### 11.2 Base de datos Admin

- No se puede acceder desde ningún subdominio público
- Solo mediante el middleware de subdomain que detecta ausencia de subdominio (o subdominio específico "admin")

### 11.3 Contraseñas

- Todas las contraseñas se almacenan hasheadas con SHA256 (consistente con el sistema actual)
- Las contraseñas de empresa se transmiten en texto plano en el POST de creación (solo interno VPN)

## 12. Orden de Implementación

### Fase 1: Configuración y DB Admin
1. Modificar `src/config/app-config.js` - reducir vars
2. Crear `src/config/db-admin.js` - conexión DB admin
3. Crear `src/config/admin-config.js` - config admin
4. Crear `src/models/empresa.js`
5. Crear `src/models/auditoria.js`

### Fase 2: Connection Manager
6. Crear `src/database/connection-manager.js`
7. Modificar `src/database/mongo-database.js` - soportar DB dinámica

### Fase 3: Middlewares
8. Crear `src/middleware/admin-middleware.js`
9. Crear `src/middleware/subdomain-middleware.js`

### Fase 4: Services
10. Crear `src/services/admin-auth.service.js`
11. Crear `src/services/auditoria.service.js`
12. Crear `src/services/empresa.service.js`
13. Crear `src/services/bootstrap-data.service.js` (adaptar existente)
14. Modificar `src/services/auth.service.js` - usar empresa config
15. Modificar `src/services/model-registry.js` - DB por empresa

### Fase 5: Routes y Server
16. Crear `src/routes/admin.routes.js`
17. Modificar `src/routes/api.routes.js` - agregar /api/admin
18. Modificar `src/app/server-application.js` - registrar middlewares
19. Modificar `src/server.js` - ajustar bootstrap

### Fase 6: Testing y Verificación
20. Verificar login admin
21. Verificar CRUD empresas
22. Verificar login por subdominio
23. Verificar acceso denegado a admin desde IP externa

## 13. Testing Checklist

- [ ] `POST /api/admin/login` con credenciales correctas → 200 + token
- [ ] `POST /api/admin/login` con credenciales incorrectas → 401
- [ ] Request a `/api/admin/empresas` sin token → 401
- [ ] Request a `/api/admin/empresas` desde IP distinta a ADMIN_DOMAIN → 403
- [ ] `POST /api/admin/empresas` → crea empresa + inicializa DB
- [ ] `GET /api/admin/empresas` → lista empresas
- [ ] `PUT /api/admin/empresas/:id` → actualiza empresa
- [ ] `DELETE /api/admin/empresas/:id` → soft delete
- [ ] Login por subdominio a empresa existente → 200 + token empresa
- [ ] Login por subdominio a empresa inexistente → 404
- [ ] Login por subdominio a empresa inactiva → 404
- [ ] Auditoría: todas las acciones quedan registradas en admin.auditoria

## 14. Notas Adicionales

- Los archivos de ecosistema PM2 existentes (`escarbato.ecosystem.config.cjs`, etc.) quedan deprecated
- El sistema puede desplegarse con PM2 usando un único ecosystem config
- Se debe actualizar la documentación del proyecto (README.md) para reflejar los cambios
- Las secciones `APP_SECTION_*_ENABLED` se mantienen como variables globales (no por empresa)