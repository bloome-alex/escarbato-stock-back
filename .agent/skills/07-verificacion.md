# Skill: Verificacion

## Objetivo

Verificar que una nueva aplicacion o seccion respeta la arquitectura, estilos, ABM, responsive y feature flags.

## Checks automaticos

Ejecutar cuando existan scripts equivalentes:

```bash
npm run check
npm run dev
```

Si no hay tests, usar al menos `node --check` para archivos backend modificados.

## Checklist funcional

- La app carga sin errores de consola.
- Login backend funciona si `dataProvider` es `backend`.
- Menu muestra solo secciones habilitadas.
- Dashboard queda disponible aunque otras secciones esten apagadas.
- Cada ABM permite crear, ver, editar y eliminar.
- Los duplicados muestran error antes o desde backend.
- La auditoria registra creacion, edicion y eliminacion.
- Los listados muestran loading, empty state y paginacion.
- La busqueda y filtros reinician `page` a 1.

## Checklist responsive

- En ancho mayor a 700px se ve sidebar fijo y tablas.
- En ancho menor o igual a 700px se ve hamburger, sidebar drawer y cards.
- Los `td` tienen `data-label` visible en mobile.
- Los modales abren como bottom sheet y las acciones quedan sticky abajo.
- Los inputs no hacen zoom en mobile porque tienen `font-size: 16px`.
- La paginacion mobile acumula registros al scrollear.

## Checklist de feature flags

- `APP_SECTION_<SECCION>_ENABLED=false` oculta menu, template y modal.
- `/api/config` devuelve el estado real.
- `window.APP_CONFIG.sections` funciona como fallback inicial.
- Si todas las secciones estan apagadas, `dashboard` queda activo.

## Checklist de codigo

- La seccion esta en `sectionOrder`, `sectionMenu`, `components`, `renderShell`, `bindEvents` y `deleteEntity` si aplica.
- El store existe en `emptyData`, IndexedDB, `/api/data` y `models` si usa backend.
- Los nombres de stores son consistentes entre frontend, backend y modelos.
- No hay logica de layout duplicada por componente.
- No se agregaron dependencias innecesarias.
