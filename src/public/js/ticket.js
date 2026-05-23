const PAPER_SIZES = {
  '58mm': '58mm',
  '80mm': '80mm',
  a4: '210mm',
  custom: null
};

export const defaultTicketConfig = {
  id: 'ticket-config',
  paperSize: '80mm',
  customWidthMm: 80,
  template: 'detailed',
  brandName: '',
  legalName: '',
  headerLine1: '',
  headerLine2: '',
  headerLine3: '',
  footerLine1: 'Gracias por su compra',
  footerLine2: '',
  footerLine3: '',
  showBrandName: true,
  showLegalName: false,
  showDate: true,
  showCustomer: true,
  showPaymentMethod: true,
  showCalculatedTotal: true,
  showFinalTotal: true,
  showTotalsBreakdown: true,
  showDiscounts: true,
  showSurcharges: true,
  showQuantity: true,
  showUnitPrice: true,
  showSubtotal: true,
  showItemDescription: false,
  showItemIndex: false,
  showFooter: true,
  itemLayout: 'detailed'
};

const asBool = value => Boolean(value === true || value === 'true' || value === 1 || value === '1');

export function normalizeTicketConfig(config = {}) {
  const template = ['compact', 'detailed'].includes(config.template) ? config.template : defaultTicketConfig.template;
  return {
    ...defaultTicketConfig,
    ...config,
    paperSize: ['58mm', '80mm', 'a4', 'custom'].includes(config.paperSize) ? config.paperSize : defaultTicketConfig.paperSize,
    customWidthMm: Math.max(40, Number(config.customWidthMm || defaultTicketConfig.customWidthMm)),
    template,
    itemLayout: template === 'compact'
      ? 'compact'
      : (['compact', 'detailed'].includes(config.itemLayout) ? config.itemLayout : defaultTicketConfig.itemLayout),
    showBrandName: asBool(config.showBrandName ?? defaultTicketConfig.showBrandName),
    showLegalName: asBool(config.showLegalName ?? defaultTicketConfig.showLegalName),
    showDate: asBool(config.showDate ?? defaultTicketConfig.showDate),
    showCustomer: asBool(config.showCustomer ?? defaultTicketConfig.showCustomer),
    showPaymentMethod: asBool(config.showPaymentMethod ?? defaultTicketConfig.showPaymentMethod),
    showCalculatedTotal: asBool(config.showCalculatedTotal ?? defaultTicketConfig.showCalculatedTotal),
    showFinalTotal: asBool(config.showFinalTotal ?? defaultTicketConfig.showFinalTotal),
    showTotalsBreakdown: asBool(config.showTotalsBreakdown ?? defaultTicketConfig.showTotalsBreakdown),
    showDiscounts: asBool(config.showDiscounts ?? defaultTicketConfig.showDiscounts),
    showSurcharges: asBool(config.showSurcharges ?? defaultTicketConfig.showSurcharges),
    showQuantity: asBool(config.showQuantity ?? defaultTicketConfig.showQuantity),
    showUnitPrice: asBool(config.showUnitPrice ?? defaultTicketConfig.showUnitPrice),
    showSubtotal: asBool(config.showSubtotal ?? defaultTicketConfig.showSubtotal),
    showItemDescription: asBool(config.showItemDescription ?? defaultTicketConfig.showItemDescription),
    showItemIndex: asBool(config.showItemIndex ?? defaultTicketConfig.showItemIndex),
    showFooter: asBool(config.showFooter ?? defaultTicketConfig.showFooter)
  };
}

export function ticketWidthValue(config) {
  const normalized = normalizeTicketConfig(config);
  return PAPER_SIZES[normalized.paperSize] || `${normalized.customWidthMm}mm`;
}

function fmtLines(...lines) {
  return lines.map(line => String(line || '').trim()).filter(Boolean);
}

export function renderTicketHtml(venta, config, formatters = {}) {
  const ticket = normalizeTicketConfig(config);
  const escapeHtml = formatters.escapeHtml || (value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char])));
  const formatMoney = formatters.formatMoney || (value => value || value === 0 ? '$' + Number(value).toLocaleString('es-AR') : '—');
  const formatDate = formatters.formatDate || (value => new Date(value).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' }));
  const formatPercent = formatters.formatPercent || (value => `${Number(value || 0).toLocaleString('es-AR', { maximumFractionDigits: 2 })}%`);
  const brandName = ticket.brandName || formatters.fallbackBrandName || '';
  const isCompactTemplate = ticket.template === 'compact';
  const isCompactItems = ticket.itemLayout === 'compact';
  const width = ticketWidthValue(ticket);
  const lines = fmtLines(ticket.headerLine1, ticket.headerLine2, ticket.headerLine3);
  const footerLines = fmtLines(ticket.footerLine1, ticket.footerLine2, ticket.footerLine3);
  const method = venta?.metodoPago || {};
  const subtotal = Number(venta?.calculatedTotal ?? venta?.items?.reduce((sum, item) => sum + Number(item.subtotal ?? ((item.qty || 0) * (item.price || 0))), 0) ?? 0);
  const discountAmount = Number((subtotal * Number(method.descuento || 0) / 100).toFixed(2));
  const surchargeRate = Number(method.recargo ?? method.bonificacion ?? 0);
  const surchargeAmount = Number((subtotal * surchargeRate / 100).toFixed(2));
  const finalTotal = Number(venta?.finalTotal ?? (subtotal - discountAmount + surchargeAmount));
  const items = (venta?.items || []).map((item, index) => {
    const itemSubtotal = Number(item.subtotal ?? ((item.qty || 0) * (item.price || 0)));
    const rowHeader = ticket.showItemIndex ? `${index + 1}. ` : '';
    const compactLine = `${rowHeader}${escapeHtml(item.productName)}`;
    const extra = [];
    if (ticket.showQuantity) extra.push(`${Number(item.qty || 0).toLocaleString('es-AR')} u.`);
    if (ticket.showUnitPrice) extra.push(`${formatMoney(item.price)} c/u`);
    if (ticket.showSubtotal) extra.push(`Subtotal ${formatMoney(itemSubtotal)}`);
    const description = ticket.showItemDescription && item.description ? `<div class="ticket-item-note">${escapeHtml(item.description)}</div>` : '';
    if (isCompactItems) {
      return `<div class="ticket-item ticket-item--compact"><div class="ticket-item-row"><strong>${compactLine}</strong><span>${extra.join(' · ')}</span></div>${description}</div>`;
    }
    return `<div class="ticket-item"><div class="ticket-item-title"><strong>${compactLine}</strong></div>${description}<div class="ticket-item-meta">${extra.map(entry => `<span>${escapeHtml(entry)}</span>`).join('')}</div></div>`;
  }).join('');
  const breakdown = [];
  if (ticket.showCalculatedTotal) breakdown.push(`<div><span>Total calculado</span><strong>${formatMoney(subtotal)}</strong></div>`);
  if (ticket.showDiscounts && Number(method.descuento || 0) > 0 && ticket.showTotalsBreakdown) breakdown.push(`<div><span>Descuento ${formatPercent(method.descuento)}</span><strong>- ${formatMoney(discountAmount)}</strong></div>`);
  if (ticket.showSurcharges && surchargeRate > 0 && ticket.showTotalsBreakdown) breakdown.push(`<div><span>Recargo ${formatPercent(surchargeRate)}</span><strong>+ ${formatMoney(surchargeAmount)}</strong></div>`);
  if (ticket.showFinalTotal) breakdown.push(`<div class="ticket-total"><span>Total final</span><strong>${formatMoney(finalTotal)}</strong></div>`);
  const compactBreakdown = [];
  if (!ticket.showTotalsBreakdown) {
    if (ticket.showCalculatedTotal) compactBreakdown.push(`<div><span>Total calculado</span><strong>${formatMoney(subtotal)}</strong></div>`);
    if (ticket.showFinalTotal) compactBreakdown.push(`<div class="ticket-total"><span>Total final</span><strong>${formatMoney(finalTotal)}</strong></div>`);
  }
  const totalsHtml = ticket.showTotalsBreakdown ? breakdown.join('') : compactBreakdown.join('');

  return `<article class="ticket-card ${isCompactTemplate ? 'ticket-card--compact' : 'ticket-card--detailed'}" style="width:${width};max-width:100%;font-family:Inter,system-ui,sans-serif;color:#2D2017;background:#fff;border:1px solid #E8DDD0;border-radius:14px;padding:14px;box-shadow:0 12px 30px rgba(92,61,46,.08)">
    <style>
      .ticket-card * { box-sizing: border-box; }
      .ticket-card--compact { padding: 10px; }
      .ticket-card--compact .ticket-head { padding-bottom: 8px; margin-bottom: 8px; }
      .ticket-card--compact .ticket-head h3 { font-size: .98rem; }
      .ticket-card--compact .ticket-head p { font-size: .72rem; }
      .ticket-card--compact .ticket-meta { gap: 4px; margin-bottom: 8px; }
      .ticket-card--compact .ticket-meta div { font-size: .74rem; }
      .ticket-card--compact .ticket-section-title { margin: 8px 0 4px; }
      .ticket-card--compact .ticket-item { padding: 6px 0; }
      .ticket-card--compact .ticket-item--compact .ticket-item-row { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; font-size: .8rem; }
      .ticket-card--compact .ticket-item--compact .ticket-item-row strong { display: inline; font-size: .85rem; }
      .ticket-card--compact .ticket-item--compact .ticket-item-row span { text-align: right; color: #5C3D2E; font-size: .74rem; }
      .ticket-card--compact .ticket-item-note { font-size: .72rem; }
      .ticket-card--compact .ticket-breakdown { gap: 4px; }
      .ticket-card--compact .ticket-breakdown div { font-size: .76rem; }
      .ticket-card--compact .ticket-total { font-size: .9rem; }
      .ticket-head { text-align: center; border-bottom: 1px dashed #D8CABD; padding-bottom: 10px; margin-bottom: 10px; }
      .ticket-head h3 { margin: 0; font-size: 1.08rem; }
      .ticket-head p, .ticket-foot p { margin: 2px 0 0; font-size: .82rem; color: #7A6355; }
      .ticket-meta, .ticket-breakdown { display: grid; gap: 6px; margin-bottom: 10px; }
      .ticket-meta div, .ticket-breakdown div { display: flex; justify-content: space-between; gap: 10px; font-size: .82rem; }
      .ticket-section-title { font-size: .76rem; text-transform: uppercase; letter-spacing: .08em; color: #7A6355; margin: 10px 0 6px; }
      .ticket-item { padding: 8px 0; border-bottom: 1px dotted #E8DDD0; }
      .ticket-item strong { display: block; font-size: .92rem; }
      .ticket-item-note { font-size: .78rem; color: #7A6355; margin-top: 2px; }
      .ticket-item-meta { display: flex; flex-wrap: wrap; gap: 8px 12px; margin-top: 4px; font-size: .78rem; color: #5C3D2E; }
      .ticket-item-meta span { white-space: nowrap; }
      .ticket-total { font-size: .96rem; border-top: 1px dashed #D8CABD; padding-top: 8px; margin-top: 4px; }
      .ticket-total strong { font-size: 1.05rem; }
      .ticket-foot { text-align: center; border-top: 1px dashed #D8CABD; padding-top: 10px; margin-top: 12px; }
      .ticket-empty { color: #7A6355; font-size: .84rem; text-align: center; padding: 10px 0; }
      @media print { .ticket-card { border: 0; border-radius: 0; box-shadow: none; padding: 0; } }
    </style>
    <header class="ticket-head">
      ${ticket.showBrandName && brandName ? `<h3>${escapeHtml(brandName)}</h3>` : ''}
      ${ticket.showLegalName && ticket.legalName ? `<p>${escapeHtml(ticket.legalName)}</p>` : ''}
      ${lines.map(line => `<p>${escapeHtml(line)}</p>`).join('')}
    </header>
    <div class="ticket-meta">
      ${ticket.showDate ? `<div><span>Fecha</span><strong>${formatDate(venta?.createdAt)}</strong></div>` : ''}
      ${ticket.showCustomer ? `<div><span>Cliente</span><strong>${escapeHtml(venta?.cliente || 'Cliente mostrador')}</strong></div>` : ''}
      ${ticket.showPaymentMethod ? `<div><span>Método</span><strong>${escapeHtml(method.nombre || 'Sin método')}</strong></div>` : ''}
    </div>
    <div class="ticket-section-title">Productos</div>
    ${items || '<div class="ticket-empty">Sin productos</div>'}
    ${totalsHtml ? `<div class="ticket-section-title">Totales</div><div class="ticket-breakdown">${totalsHtml}</div>` : ''}
    ${ticket.showFooter ? `<footer class="ticket-foot">${footerLines.map(line => `<p>${escapeHtml(line)}</p>`).join('') || '<p>Gracias por su compra</p>'}</footer>` : ''}
  </article>`;
}

export function buildTicketDocumentHtml(venta, config, formatters = {}) {
  const printableConfig = { ...normalizeTicketConfig(config), showFooter: false };
  const ticketHtml = renderTicketHtml(venta, printableConfig, formatters);
  const width = ticketWidthValue(printableConfig);
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Ticket</title><style>
    @page { margin: 0; }
    html, body { margin: 0; padding: 0; width: 100%; background: #fff; }
    body { display: block; min-height: 0; }
    .print-shell { width: ${width}; max-width: 100%; margin: 0; padding: 0; }
    .print-shell .ticket-card { width: 100%; margin: 0; border: 0; border-radius: 0; box-shadow: none; padding: 0; }
    .print-shell .ticket-card, .print-shell .ticket-card * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  </style></head><body><div class="print-shell">${ticketHtml}</div></body></html>`;
}
