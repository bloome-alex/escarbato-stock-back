# Skill: Backend Modular Orientado A Clases

## Objetivo

Construir o refactorizar el backend separando responsabilidades en modulos y clases, evitando concentrar configuracion, rutas, validaciones, servicios y arranque en `src/server.js`.

## Estructura recomendada

Usar esta organizacion cuando el servidor tenga mas de unas pocas rutas o responsabilidades:

```txt
src/
  app/
    server-application.js
  config/
    app-config.js
  controllers/
    <feature>.controller.js
  database/
    mongo-database.js
  middleware/
    auth-middleware.js
    error-handler.js
  routes/
    api.routes.js
    public.routes.js
  services/
    <feature>.service.js
    model-registry.js
  utils/
    http-error.js
    sanitize.js
  models/
    *.js
  server.js
```

## Punto de entrada

Mantener `src/server.js` minimo. Solo debe cargar variables de entorno, crear configuracion, conectar la base de datos, construir la app y escuchar el puerto.

```js
import 'dotenv/config';
import { ServerApplication } from './app/server-application.js';
import { AppConfig } from './config/app-config.js';
import { MongoDatabase } from './database/mongo-database.js';

const config = new AppConfig();
const database = new MongoDatabase(config);
const server = new ServerApplication(config);

await database.connect();
server.build();
server.listen();
```

## Clases principales

- `AppConfig`: lee `process.env`, normaliza paths, define puerto, MongoDB, JWT, CORS, nombre de app y feature flags.
- `MongoDatabase`: encapsula `mongoose.connect` y opciones de base de datos.
- `ServerApplication`: crea Express, registra middleware, rutas publicas, rutas API, archivos estaticos y error handler.
- `ApiRoutes` y `PublicRoutes`: declaran rutas, no contienen logica de negocio.
- `Controllers`: reciben `req`, `res`, `next` y delegan en servicios.
- `Services`: contienen reglas de negocio, consultas Mongoose, validaciones y armado de respuestas.
- `Middleware`: encapsula autenticacion, manejo de errores y cross-cutting concerns.
- `Utils`: helpers puros como sanitizacion, errores HTTP o formato.

## Reglas de separacion

- No poner consultas Mongoose complejas dentro de rutas.
- No poner reglas de negocio en `ServerApplication`.
- No usar controladores para validar reglas de dominio salvo validaciones triviales del request.
- No importar Express dentro de servicios.
- No importar `req` o `res` dentro de servicios.
- Inyectar dependencias por constructor cuando una clase necesita config, servicios o middleware.
- Mantener clases pequenas y con una responsabilidad clara.
- Evitar abstracciones grandes si el backend todavia es simple.

## API generica por store

Cuando exista CRUD generico por store:

- Crear `ModelRegistry` para mapear `store -> Modelo`.
- Crear `DataStoreService` para `list`, `getById`, `upsert` y `delete`.
- Mantener `searchableFields`, paginacion, orden, collation, validaciones y mensajes de duplicado dentro del service.
- Crear `DataStoreController` como adaptador HTTP del service.
- Registrar endpoints genericos en `ApiRoutes`.

Ejemplo de responsabilidades:

```js
export class DataStoreController {
  constructor(dataStoreService) {
    this.dataStoreService = dataStoreService;
    this.list = this.list.bind(this);
  }

  async list(req, res, next) {
    try {
      res.json(await this.dataStoreService.list(req.params.store, req.query));
    } catch (error) {
      next(error);
    }
  }
}
```

## Reportes y procesos especiales

- Separar reportes PDF/XLSX en services especificos, por ejemplo `ProductReportService`.
- El controller de reportes solo debe setear el flujo HTTP delegando en el service.
- Mantener helpers de formato, agrupacion y generacion del documento dentro del service si solo se usan ahi.

## Rutas

Las rutas deben registrar handlers ya construidos:

```js
export class ApiRoutes {
  constructor(app, dependencies) {
    this.app = app;
    this.authMiddleware = dependencies.authMiddleware;
    this.dataStoreController = dependencies.dataStoreController;
  }

  register() {
    this.app.use('/api', this.authMiddleware.requireAuth);
    this.app.get('/api/:store', this.dataStoreController.list);
    this.app.put('/api/:store/:id', this.dataStoreController.upsert);
  }
}
```

## Manejo de errores

- Usar una clase `HttpError` para errores esperados con status code.
- Centralizar respuestas de error en `ErrorHandler`.
- Mantener soporte para `ValidationError` de Mongoose y duplicados `11000`.
- No repetir `res.status(400)` con mensajes de dominio en muchos controllers.

## Criterios de aceptacion

- `src/server.js` no contiene rutas ni reglas de negocio.
- Cada endpoint queda registrado desde una clase de rutas.
- Cada handler HTTP vive en una clase controller.
- La logica de negocio y Mongoose vive en services.
- Configuracion, base de datos, middleware y utilidades estan separados.
- Los endpoints existentes conservan contrato y comportamiento.
- `npm run check` y `node --check` de los archivos modificados pasan sin errores.
