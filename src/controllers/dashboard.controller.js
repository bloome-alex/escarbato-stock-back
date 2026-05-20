export class DashboardController {
  constructor(dashboardService) {
    this.dashboardService = dashboardService;
    this.getDashboard = this.getDashboard.bind(this);
  }

  async getDashboard(req, res, next) {
    try {
      res.json(await this.dashboardService.getDashboard());
    } catch (error) {
      next(error);
    }
  }
}
