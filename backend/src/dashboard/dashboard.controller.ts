import { Controller, Get, Header, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { DashboardService } from "./dashboard.service";
import { Roles } from "../auth/decorators/roles.decorator";

@ApiTags("Dashboard")
@Roles("owner")
@Controller("dashboard")
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get("daily")
  @Header("Cache-Control", "no-store")
  getDailyMetrics(@Query("date") date?: string) {
    return this.dashboardService.getDailyMetrics(date);
  }

  @Get("weekly")
  @Header("Cache-Control", "no-store")
  getWeeklyRevenue() {
    return this.dashboardService.getWeeklyRevenue();
  }

  @Get("monthly")
  @Header("Cache-Control", "no-store")
  getMonthlyRevenue() {
    return this.dashboardService.getMonthlyRevenue();
  }

  @Get("report")
  @Header("Cache-Control", "no-store")
  getReport(@Query("from") from: string, @Query("to") to: string) {
    return this.dashboardService.getReport(from, to);
  }

  @Get("therapists")
  @Header("Cache-Control", "no-store")
  getTherapistPerformance(@Query("date") date?: string) {
    return this.dashboardService.getTherapistPerformance(date);
  }
}
