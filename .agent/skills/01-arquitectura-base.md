# Skill: Arquitectura Base

## Objetivo

Crear una aplicacion con la misma estructura que este proyecto: backend Express/MongoDB, frontend vanilla modular por clases, almacenamiento local opcional y backend opcional segun configuracion.

## Estructura esperada

```text
src/
  server.js
  models/
    base.js
    index.js
    entidad.js
  public/
    index.html
    manifest.webmanifest
    sw.js
    js/
      app.js
      config.js
      data-store.js
      ui.js
      pagination.js
      sort.js
      components/
        dashboard.js
        entidad.js
```

## Reglas de arquitectura

- Usar `type: module` y sintaxis `import/export`.
- Crear una clase principal similar a `PetshopApp` en `src/public/js/app.js`.
- La clase principal debe construir estos objetos: `DataStore`, `ModalManager`, `ToastManager`, `NavigationManager`, `ThemeManager` y `components`.
- Cada seccion se registra en tres lugares: `sectionOrder`, `sectionMenu` y `components`.
- `renderShell()` debe renderizar templates de secciones habilitadas y modales habilitados.
- `bindEvents()` debe centralizar acciones globales usando `data-action`.
- `renderSection(section)` debe delegar en `this.components[section].render()`.
- Evitar frameworks frontend. La UI se genera con template strings y clases.

## Patron de clase principal

```js
class App {
  constructor() {
    this.store = new DataStore(undefined, this);
    this.modals = new ModalManager();
    this.toasts = new ToastManager();
    this.navigation = new NavigationManager(this);
    this.theme = new ThemeManager();
    this.sectionOrder = ['dashboard', 'clientes'];
    this.sectionMenu = {
      dashboard: { group: 'Principal', icon: '🏠', label: 'Panel' },
      clientes: { group: 'Gestion', icon: '👥', label: 'Clientes' }
    };
    this.sections = appConfig.sections || {};
    this.components = {
      dashboard: new DashboardComponent(this),
      clientes: new ClientesComponent(this)
    };
  }
}
```

## Criterios de aceptacion

- La app inicia desde `app.init()`.
- El menu solo muestra secciones habilitadas.
- Las secciones comparten managers, store y toasts desde `this.app`.
- No hay codigo duplicado de navegacion dentro de cada componente.
