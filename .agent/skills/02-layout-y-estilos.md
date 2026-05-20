# Skill: Layout Y Estilos

## Objetivo

Replicar el lenguaje visual: panel administrativo calido, sidebar, topbar, tarjetas, tablas, modales, tema claro/oscuro y variables CSS centralizadas.

## Layout fijo

- `body` usa fondo con gradientes radiales y patron sutil.
- `.sidebar` es fijo en escritorio, con logo, navegacion agrupada y footer con toggle de tema.
- `.main` ocupa el resto del ancho con margen izquierdo igual a `--sidebar-w`.
- `.topbar` es sticky, translúcido, con blur, titulo y acciones contextuales.
- `.content` contiene `#sectionsRoot`.
- `#modalsRoot` y `#toastContainer` viven fuera del main.

## Tokens CSS obligatorios

Mantener variables en `:root` y version dark en `:root[data-theme="dark"]`:

```css
:root {
  --sage: #7BAE7F;
  --sage-light: #DDEEDB;
  --sage-dark: #4E8055;
  --amber: #F4A535;
  --cream: #FDF8F0;
  --warm-white: #FFFDF9;
  --brown: #5C3D2E;
  --text: #2D2017;
  --text-soft: #7A6355;
  --border: #E8DDD0;
  --card: #FFFFFF;
  --danger: #D94B4B;
  --success: #4E9B69;
  --sidebar-w: 260px;
  --radius: 16px;
  --radius-sm: 10px;
  --shadow: 0 4px 24px rgba(92,61,46,0.10);
  --shadow-lg: 0 8px 40px rgba(92,61,46,0.16);
}
```

## Componentes visuales

- Botones: `.btn`, `.btn-primary`, `.btn-ghost`, `.btn-danger`, `.btn-sm`, `.btn-icon`.
- Formularios: `.form-group`, `.form-row`, inputs de 16px en mobile para evitar zoom.
- Listados: `.toolbar`, `.search-box`, `.filter-control`, `.table-wrap`, `.data-table`.
- Estados: `.empty-state`, `.loading-spinner`, `.chip`, `.toast`.
- Detalles: `.detail-list` o grids especificos por modulo.
- Modales: `.modal-overlay`, `.modal`, `.modal-title`, `.modal-actions`.

## Tema

- El tema se aplica con `document.documentElement.dataset.theme`.
- Persistir en `localStorage` con una key de app, por ejemplo `app-theme`.
- Actualizar `meta[name="theme-color"]` segun tema.
- No duplicar colores hardcodeados en componentes; usar variables CSS.

## Branding configurable

- El backend puede reemplazar nombre de app y assets al servir `index.html`, `manifest.webmanifest` y `sw.js`.
- Usar variables como `APP_NAME` y `APP_ASSETS_PATH`.
- Mantener rutas de imagen relativas a `/assets` para que puedan ser reemplazadas.

## Criterios de aceptacion

- Misma estructura visual en todas las secciones.
- Tema claro/oscuro consistente.
- Acciones primarias siempre en topbar o modal actions, no dispersas.
- Los componentes no introducen estilos inline salvo detalles puntuales ya usados por el proyecto.
