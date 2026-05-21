---
name: offline-first-data-sync
description: Use when adding or modifying data persistence, CRUD, realtime, auth token recovery, IndexedDB cache, offline queue, or frontend/backend sync in this project.
---

# Offline-First Data Sync

## Objetivo

Toda lectura y mutacion de datos debe funcionar con cache local persistente y debe sincronizarse automaticamente cuando vuelva la conexion o se renueve el token.

## Regla Central

- Todas las entidades actuales y futuras deben pasar por `src/public/js/data-store.js`.
- No llamar `fetch('/api/...')` directamente desde componentes para crear, editar, eliminar o leer datos de negocio.
- Usar siempre `this.app.store.put(store, record)` para create/update.
- Usar siempre `this.app.store.delete(store, id)` para delete.
- Usar `this.app.store.getById`, `getPage`, `loadAll` o datos ya cargados en `this.app.store.data` para lecturas.

## Mutaciones Cubiertas

- Create y update son la misma mutacion: `put()` hace `upsert` contra `/api/:store/:id`.
- Delete usa `delete()` contra `/api/:store/:id`.
- Las mutaciones offline deben guardarse en IndexedDB, nunca solo en memoria ni solo en cache HTTP.
- La cola debe conservarse despues de actualizar la web, cerrar pestana o perder conexion.

## Cache Local

- El estado completo de `this.app.store.data` debe persistirse en IndexedDB.
- Si `loadAll()` falla por red, la app debe seguir usando el ultimo cache local valido.
- `reservedStock` no debe persistirse como estado definitivo porque representa reservas realtime temporales.
- La app debe poder cerrar pestana/navegador, reabrir sin conexion y arrancar desde IndexedDB sin exigir login previo.
- El service worker debe cachear todos los modulos JS importados por `app.js`, incluyendo imports con query string.

## Sincronizacion

- Al recuperar conexion, abrir WebSocket o renovar token, procesar la cola offline en orden.
- Despues de sincronizar, llamar `loadAll()` para reconciliar con backend.
- Luego refrescar la seccion activa mediante los handlers existentes de realtime/app.
- No recargar la pagina para resolver expiracion de token o reconexion.
- Si se abre offline con cache local, no bloquear la UI por falta de token; guardar mutaciones en cola y pedir/sincronizar al reconectar.
- Mientras la app este offline, mostrar un aviso persistente en el centro del topbar y no disparar toasts rojos por fallas de red/envio/sincronizacion.

## Login Y Token Vencido

- Si el backend responde `401`, mostrar modal de login sobre la UI actual.
- No reconstruir la pagina ni navegar a otra seccion.
- Despues del login, reintentar la request original y continuar sincronizando la cola offline.

## Nuevas Entidades

Al agregar una entidad nueva:

- Agregarla a `emptyData()` en `src/public/js/data-store.js` si debe precargarse o cachearse.
- Exponerla desde `/api/data` en backend si forma parte del bootstrap.
- En componentes, mantener solo actualizacion optimista de `this.app.store.data.<store>` despues de llamar al store.
- No crear caches paralelos por componente.

## Criterios De Aceptacion

- Crear, editar y eliminar funcionan sin conexion y quedan pendientes en IndexedDB.
- Al refrescar la web offline, los datos locales siguen disponibles.
- Al reconectar, las mutaciones pendientes llegan al backend y se baja el estado reconciliado.
- Si vence el token, el usuario inicia sesion en modal sin perder la pantalla ni la tarea actual.
