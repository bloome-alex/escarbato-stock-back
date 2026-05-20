# Skill: Feature Flags Por Variables De Entorno

## Objetivo

Habilitar o deshabilitar secciones desde variables de entorno, con backend como fuente de verdad y fallback frontend.

## Backend

Usar una funcion `envFlag(name, defaultValue = true)`:

```js
function envFlag(name, defaultValue = true) {
  const value = process.env[name];
  if (value === undefined || value === '') return defaultValue;
  return !['0', 'false', 'no', 'off', 'disabled'].includes(String(value).trim().toLowerCase());
}
```

Crear `getSectionConfig()` con una variable por seccion:

```js
function getSectionConfig() {
  return {
    dashboard: envFlag('APP_SECTION_DASHBOARD_ENABLED'),
    clientes: envFlag('APP_SECTION_CLIENTES_ENABLED')
  };
}
```

Exponer configuracion publica sin auth:

```js
app.get('/api/config', (req, res) => {
  res.json({ sections: sectionConfig });
});
```

## Inyeccion en HTML

Al servir `index.html`, reemplazar el placeholder por JSON:

```js
.replace('"__APP_SECTIONS_CONFIG__"', JSON.stringify(sectionConfig));
```

En el HTML:

```html
<script>
  window.APP_CONFIG = {
    dataProvider: 'backend',
    backendUrl: '',
    username: '',
    password: '',
    sections: "__APP_SECTIONS_CONFIG__"
  };
</script>
```

## Frontend config

En `config.js` definir defaults y mezclar con configuracion inyectada:

```js
const defaultSections = {
  dashboard: true,
  clientes: true
};

const configuredSections = window.APP_CONFIG?.sections;

export const appConfig = {
  dataProvider: window.APP_CONFIG?.dataProvider || 'local',
  backendUrl: window.APP_CONFIG?.backendUrl || '',
  username: window.APP_CONFIG?.username || '',
  password: window.APP_CONFIG?.password || '',
  sections: {
    ...defaultSections,
    ...(configuredSections && typeof configuredSections === 'object' ? configuredSections : {})
  }
};
```

## Uso en app principal

- `this.sections = appConfig.sections || {}`.
- `isSectionEnabled(section)` devuelve `this.sections[section] !== false`.
- `enabledSections()` filtra `sectionOrder`.
- `renderMenu()`, `renderShell()` y `renderSection()` deben respetar `enabledSections()`.
- Si todas las secciones quedan apagadas, forzar `dashboard = true`.
- `loadBackendConfig()` debe pedir `/api/config` y mezclar flags remotos.

## Convencion de variables

Usar nombres consistentes:

```text
APP_SECTION_<SECCION_EN_SNAKE_CASE>_ENABLED=true|false
```

Valores que deshabilitan: `0`, `false`, `no`, `off`, `disabled`.

## Criterios de aceptacion

- Una seccion deshabilitada no aparece en menu.
- No se renderiza su template ni modal.
- Navegar manualmente a la seccion muestra error o no hace nada.
- La app sigue iniciando si `/api/config` no responde.
