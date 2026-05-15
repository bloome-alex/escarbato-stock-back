export const DEFAULT_PAGE_SIZE = 10;

export function getPageItems(list, page, pageSize = DEFAULT_PAGE_SIZE) {
  const totalPages = Math.max(1, Math.ceil(list.length / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const start = (currentPage - 1) * pageSize;
  return {
    items: list.slice(start, start + pageSize),
    page: currentPage,
    pageSize,
    total: list.length,
    totalPages
  };
}

export function loadingTemplate(message = 'Cargando registros...') {
  return `<div class="section-loading"><span class="loading-spinner" aria-hidden="true"></span><span>${message}</span></div>`;
}

export function paginationTemplate(component, state) {
  if (!state || state.totalPages <= 1) return '';

  return `<div class="pagination-bar" data-pagination="${component}"><div class="pagination-info">Mostrando ${state.items.length} de ${state.total} registros</div><div class="pagination-actions"><button class="btn btn-ghost btn-sm" data-page="${state.page - 1}" ${state.page <= 1 ? 'disabled' : ''}>Anterior</button><span>Página ${state.page} de ${state.totalPages}</span><button class="btn btn-ghost btn-sm" data-page="${state.page + 1}" ${state.page >= state.totalPages ? 'disabled' : ''}>Siguiente</button></div></div>`;
}
