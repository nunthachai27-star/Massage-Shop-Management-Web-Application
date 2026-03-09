import { Controller, Get, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { DashboardService } from "./dashboard.service";

@ApiTags("Dashboard")
@Controller("dashboard")
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get("daily")
  getDailyMetrics(@Query("date") date?: string) {
    return this.dashboardService.getDailyMetrics(date);
  }

  @Get("weekly")
  getWeeklyRevenue() {
    return this.dashboardService.getWeeklyRevenue();
  }

  @Get("monthly")
  getMonthlyRevenue() {
    return this.dashboardService.getMonthlyRevenue();
  }

  @Get("therapists")
  getTherapistPerformance(@Query("date") date?: string) {
    return this.dashboardService.getTherapistPerformance(date);
  }
}
