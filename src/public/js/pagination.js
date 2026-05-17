export const DEFAULT_PAGE_SIZE = 10;
export const MOBILE_LIST_BREAKPOINT = 700;

export function isMobileListView() {
  return window.matchMedia(`(max-width: ${MOBILE_LIST_BREAKPOINT}px)`).matches;
}

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

export function getResponsivePageItems(list, page, pageSize = DEFAULT_PAGE_SIZE) {
  if (!isMobileListView()) return getPageItems(list, page, pageSize);

  const totalPages = Math.max(1, Math.ceil(list.length / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  return {
    items: list.slice(0, currentPage * pageSize),
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

  if (isMobileListView()) {
    const loader = state.page < state.totalPages
      ? '<div class="pagination-actions"><span class="loading-spinner" aria-hidden="true"></span><span>Cargando más registros...</span></div>'
      : '';
    return `<div class="pagination-bar pagination-scroll-status" data-pagination="${component}"><div class="pagination-info">Mostrando ${state.items.length} de ${state.total} registros</div>${loader}</div>`;
  }

  const firstPageButton = state.page > 1
    ? `<button class="btn btn-ghost btn-sm" data-page="1">Inicio</button>`
    : '';
  const lastPageButton = state.page < state.totalPages
    ? `<button class="btn btn-ghost btn-sm" data-page="${state.totalPages}">Final</button>`
    : '';

  return `<div class="pagination-bar" data-pagination="${component}"><div class="pagination-info">Mostrando ${state.items.length} de ${state.total} registros</div><div class="pagination-actions">${firstPageButton}<button class="btn btn-ghost btn-sm" data-page="${state.page - 1}" ${state.page <= 1 ? 'disabled' : ''}>Anterior</button><span>Página ${state.page} de ${state.totalPages}</span><button class="btn btn-ghost btn-sm" data-page="${state.page + 1}" ${state.page >= state.totalPages ? 'disabled' : ''}>Siguiente</button>${lastPageButton}</div></div>`;
}
