# Skill: Backend, Modelos Y API

## Objetivo

Agregar entidades al backend manteniendo el patron Express + Mongoose + API generica por store.

## Modelo Mongoose

- Crear un archivo en `src/models/<entidad>.js`.
- Importar `baseFields` desde `./base.js`.
- Usar `versionKey: false`.
- Definir `id` como string unico desde `baseFields`.
- Usar `trim`, `default`, `required`, `min` y validaciones simples en schema.
- Crear indices unicos con collation en español cuando el nombre deba ser unico.

```js
import mongoose from 'mongoose';
import { baseFields } from './base.js';

const clienteSchema = new mongoose.Schema({
  ...baseFields,
  nombre: { type: String, required: true, trim: true },
  email: { type: String, default: '' },
  telefono: { type: String, default: '' },
  notas: { type: String, default: '' }
}, { versionKey: false });

clienteSchema.index({ nombre: 1 }, { unique: true, collation: { locale: 'es', strength: 2 } });

export const Cliente = mongoose.model('Cliente', clienteSchema);
```

## Export e import

- Exportar el modelo en `src/models/index.js`.
- Importarlo en `src/server.js` dentro del import agrupado de modelos.

## Registro en API generica

Agregar el store en `models`:

```js
const models = {
  clientes: Cliente
};
```

Agregar campos buscables en `searchableFields`:

```js
const searchableFields = {
  clientes: ['nombre', 'email', 'telefono']
};
```

## Endpoints existentes

La API generica cubre:

- `GET /api/:store?page=&limit=&q=`
- `GET /api/:store/:id`
- `PUT /api/:store/:id`
- `DELETE /api/:store/:id`

La autenticacion JWT se aplica despues de `/api/config`, `/api/health` y `/api/auth/login` con `app.use('/api', requireAuth)`.

## Carga completa

Si la entidad debe estar disponible offline o para relaciones:

- Agregarla a `emptyData()` en `data-store.js`.
- Crear object store IndexedDB en `openDB()`.
- Cargarla en `IndexedDbStore.loadAll()`.
- Agregarla a `BackendStore` solo si requiere metodos especiales; si no, `put`, `delete` y `getPage` ya funcionan.
- Agregarla en `/api/data` en `server.js`.

## Validaciones especiales

- Mantener validaciones especificas como funciones pequeñas (`validateClientePayload`) solo si la entidad lo necesita.
- Reusar `validateUniqueName` si la entidad tiene `nombre` unico.
- Ajustar `buildUpdatePayload` cuando haya campos calculados o fechas de actualizacion.

## Criterios de aceptacion

- El store existe en MongoDB, IndexedDB si corresponde y `DataStore.data`.
- La API generica responde para listar, crear/editar y eliminar.
- Los errores de duplicado devuelven 400 con mensaje entendible.
- La entidad puede ser precargada con `store.loadAll()`.
