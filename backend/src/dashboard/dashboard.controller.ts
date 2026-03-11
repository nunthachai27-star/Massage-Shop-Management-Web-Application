import { Controller, Get, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { DashboardService } from "./dashboard.service";
import { Roles } from "../auth/decorators/roles.decorator";

@ApiTags("Dashboard")
@Roles("owner")
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

  @Get("report")
  getReport(@Query("from") from: string, @Query("to") to: string) {
    return this.dashboardService.getReport(from, to);
  }

  @Get("therapists")
  getTherapistPerformance(@Query("date") date?: string) {
    return this.dashboardService.getTherapistPerformance(date);
  }
}
