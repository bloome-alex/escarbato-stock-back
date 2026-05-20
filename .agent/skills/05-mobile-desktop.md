# Skill: Mobile Y Desktop

## Objetivo

Mantener una sola implementacion de seccion que se adapte a escritorio y mobile con CSS y paginacion responsive.

## Breakpoints

- Desktop: mayor a `700px`.
- Mobile: `@media (max-width: 700px)`.
- Ajustes pequeños: `@media (max-width: 420px)`.

## Desktop

- Sidebar fijo visible.
- Topbar sticky con acciones contextuales.
- Tablas reales con `thead`, `tbody`, columnas y acciones a la derecha.
- Paginacion con botones `Inicio`, `Anterior`, `Siguiente`, `Final`.

## Mobile

- Sidebar se transforma en drawer lateral con overlay.
- Topbar mantiene hamburger, logo y titulo.
- Toolbar pasa a una columna.
- Tablas se renderizan como cards mediante CSS: `table`, `thead`, `tbody`, `tr`, `td` pasan a `display: block/grid`.
- `thead` se oculta.
- Cada `td` debe tener `data-label` para mostrar la etiqueta con `td::before`.
- Acciones de fila se estiran a columnas iguales dentro de `.td-actions`.
- Modales se comportan como bottom sheet con `align-items: flex-end`, borde superior redondeado y `.modal-actions` sticky abajo.
- Inputs y selects usan `font-size: 16px` y `min-height` tactil.

## Paginacion responsive

Usar `getResponsivePageItems(list, this.page, DEFAULT_PAGE_SIZE)`.

- En desktop devuelve solo la pagina actual.
- En mobile devuelve acumulado hasta la pagina actual para scroll infinito suave.
- `paginationTemplate()` en mobile muestra estado de carga y cantidad visible.

## Scroll mobile

La app principal debe escuchar scroll y llamar `component.setPage(component.page + 1)` cuando el usuario se acerca al final, excepto en secciones que tengan su propia experiencia tipo mostrador.

## Reglas para nuevas secciones

- Nunca crear dos componentes separados para mobile y desktop.
- No duplicar markup completo por dispositivo.
- Agregar `data-label` en todos los `td`.
- Evitar tablas con columnas imposibles de convertir en card; agrupar informacion secundaria en chips o texto.
- Mantener botones con areas tactiles de al menos 42px en mobile.

## Criterios de aceptacion

- En desktop se ve como tabla administrativa.
- En mobile se ve como lista de cards clara y operable con dedos.
- Los modales no quedan fuera del viewport mobile.
- La paginacion no obliga a tocar botones en mobile si hay mas registros.
