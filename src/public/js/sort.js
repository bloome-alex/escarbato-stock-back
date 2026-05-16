export const compareByName = (a, b) => (a.nombre || '').localeCompare(b.nombre || '', 'es', {
  numeric: true,
  sensitivity: 'base'
});
