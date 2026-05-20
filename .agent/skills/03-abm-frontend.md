# Skill: ABM Frontend Por Clases

## Objetivo

Crear altas, bajas y modificaciones con el mismo patron usado por `ProveedoresComponent`, `TiposComponent`, `ProductosComponent` y `MetodosPagoComponent`.

## Contrato de componente ABM

Cada ABM debe ser una clase exportada:

```js
export class ClientesComponent {
  constructor(app) {
    this.app = app;
    this.page = 1;
    this.totalPages = 1;
    this.loadingTimer = null;
  }

  template() {}
  modalTemplate() {}
  bind() {}
  render() {}
  resetAndRender() {}
  setPage(page) {}
  renderList() {}
  view(id) {}
  openNew() {}
  edit(id) {}
  async save() {}
}
```

## Template de seccion

- El `section` debe tener id `sec-<seccion>`.
- La toolbar debe incluir busqueda y filtros si aportan valor.
- La tabla debe tener `tbody` con id `tbl-<seccion>`.
- El wrapper debe tener id `wrap-<seccion>`.
- El empty state debe tener id `empty-<seccion>`.
- La paginacion debe tener id `pager-<seccion>`.

```js
template() {
  return `<section class="section" id="sec-clientes">
    <div class="toolbar">
      <div class="search-box"><span class="search-icon">🔍</span><input type="text" placeholder="Buscar cliente…" id="searchCliente"></div>
    </div>
    <div class="table-wrap" id="wrap-clientes">
      <table class="data-table"><thead><tr><th>Nombre</th><th>Email</th><th>Acciones</th></tr></thead><tbody id="tbl-clientes"></tbody></table>
      <div id="empty-clientes" class="empty-state" style="display:none"><div class="empty-icon">👥</div><p>Aun no hay clientes registrados</p></div>
    </div>
    <div id="pager-clientes"></div>
  </section>`;
}
```

## Modal

- El modal debe tener id `modal-<singular>`.
- El titulo debe tener id `modal-<singular>-title`.
- El id oculto debe ser `<singular>-id`.
- El boton guardar usa `data-action="save-<singular>"`.
- El boton cerrar usa `data-close-modal="<singular>"`.

## Renderizado

- `render()` muestra `loadingTemplate()` y difiere `renderList()` unos 120ms.
- `renderList()` filtra, ordena si aplica, pagina con `getResponsivePageItems()` y renderiza filas.
- Cada `td` debe tener `data-label` para mobile.
- Acciones de fila: visualizar, editar y eliminar con `data-action`.

## Guardado

- Leer inputs con `form.trim`, `form.value`, `form.set` y `form.clear`.
- Validar requeridos antes de llamar al store.
- Validar duplicados con normalizacion `toLocaleLowerCase('es')` cuando corresponda.
- Crear id con `this.app.store.createId()`.
- Persistir con `await this.app.store.put('<store>', record)`.
- Actualizar `this.app.store.data.<store>` localmente.
- Auditar con `await this.app.audit('Creacion' | 'Edicion', '<Entidad>', detalle)` usando las etiquetas del proyecto si ya existen con acentos.
- Cerrar modal, renderizar y mostrar toast.

## Integracion en `app.js`

Para una nueva seccion ABM agregar:

- Import del componente.
- Nombre en `sectionOrder`.
- Entrada en `sectionMenu`.
- Instancia en `components`.
- Modal en `renderShell()` si la seccion esta habilitada.
- Acciones en `bindEvents()` para `new`, `save`, `view`, `edit`.
- Caso de eliminacion en `deleteEntity()`.

## Criterios de aceptacion

- La seccion funciona igual en desktop y mobile.
- El usuario puede buscar, paginar, crear, ver, editar y eliminar.
- Los estados vacio, loading y toast estan presentes.
- No hay listeners duplicados despues de re-renderizar la seccion.
