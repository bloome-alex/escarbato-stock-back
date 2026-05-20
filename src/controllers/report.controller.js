export class ReportController {
  constructor(productReportService) {
    this.productReportService = productReportService;
    this.productsPdf = this.productsPdf.bind(this);
    this.productsXlsx = this.productsXlsx.bind(this);
  }

  async productsPdf(req, res, next) {
    try {
      await this.productReportService.writePdf(res);
    } catch (error) {
      next(error);
    }
  }

  async productsXlsx(req, res, next) {
    try {
      await this.productReportService.writeXlsx(res);
    } catch (error) {
      next(error);
    }
  }
}
