# Skills Para Replicar La Aplicacion

Esta carpeta documenta las skills que debe seguir un agente para crear una aplicacion con el mismo estilo, arquitectura y forma de trabajo que este proyecto, cambiando solo dominio, entidades y secciones..

## Orden recomendado

1. `skills/01-arquitectura-base.md`
2. `skills/02-layout-y-estilos.md`
3. `skills/03-abm-frontend.md`
4. `skills/04-backend-modelos-api.md`
5. `skills/05-mobile-desktop.md`
6. `skills/06-feature-flags-env.md`
7. `skills/07-verificacion.md`
8. `skills/08-backend-modular-oop.md`

## Principios fijos

- Mantener frontend vanilla con ES Modules, clases y objetos.
- Mantener una clase principal de aplicacion que orquesta store, navegacion, modales, toasts, tema y componentes.
- Mantener cada seccion como una clase componente con `template`, `modalTemplate`, `bind`, `render`, `view`, `openNew`, `edit` y `save` cuando aplique.
- Mantener layout responsive unico: sidebar fijo en escritorio, drawer en mobile, topbar persistente, cards mobile para tablas y modales tipo bottom sheet.
- Mantener habilitacion/deshabilitacion de secciones desde variables de entorno del backend y configuracion inyectada al frontend.
- Mantener backend modular orientado a clases cuando el servidor tenga multiples responsabilidades.
- No crear frameworks de UI ni abstracciones grandes si el patron actual resuelve el caso.
