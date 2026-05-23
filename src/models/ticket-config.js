import mongoose from 'mongoose';

const ticketConfigSchema = new mongoose.Schema({
  id: { type: String, default: 'ticket-config', unique: true },
  paperSize: { type: String, default: '80mm' },
  customWidthMm: { type: Number, default: 80 },
  template: { type: String, default: 'detailed' },
  brandName: { type: String, default: '' },
  legalName: { type: String, default: '' },
  headerLine1: { type: String, default: '' },
  headerLine2: { type: String, default: '' },
  headerLine3: { type: String, default: '' },
  footerLine1: { type: String, default: '' },
  footerLine2: { type: String, default: '' },
  footerLine3: { type: String, default: '' },
  showBrandName: { type: Boolean, default: true },
  showLegalName: { type: Boolean, default: false },
  showDate: { type: Boolean, default: true },
  showCustomer: { type: Boolean, default: true },
  showPaymentMethod: { type: Boolean, default: true },
  showCalculatedTotal: { type: Boolean, default: true },
  showFinalTotal: { type: Boolean, default: true },
  showTotalsBreakdown: { type: Boolean, default: true },
  showDiscounts: { type: Boolean, default: true },
  showSurcharges: { type: Boolean, default: true },
  showQuantity: { type: Boolean, default: true },
  showUnitPrice: { type: Boolean, default: true },
  showSubtotal: { type: Boolean, default: true },
  showItemDescription: { type: Boolean, default: false },
  showItemIndex: { type: Boolean, default: false },
  showFooter: { type: Boolean, default: true },
  itemLayout: { type: String, default: 'detailed' },
  updatedAt: { type: Date, default: Date.now }
}, { versionKey: false });

ticketConfigSchema.pre('save', function setUpdatedAt() {
  this.updatedAt = new Date();
});

export const TicketConfig = mongoose.model('TicketConfig', ticketConfigSchema);
