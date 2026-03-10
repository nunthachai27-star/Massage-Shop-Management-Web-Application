import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
import { SupabaseModule } from "./supabase/supabase.module";
import { ServicesModule } from "./services/services.module";
import { TherapistsModule } from "./therapists/therapists.module";
import { BedsModule } from "./beds/beds.module";
import { CustomersModule } from "./customers/customers.module";
import { BookingsModule } from "./bookings/bookings.module";
import { PaymentsModule } from "./payments/payments.module";
import { AttendanceModule } from "./attendance/attendance.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { AuthModule } from "./auth/auth.module";
import { CommissionsModule } from "./commissions/commissions.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      { name: "short", ttl: 1000, limit: 5 },   // 5 requests per second
      { name: "medium", ttl: 10000, limit: 30 }, // 30 requests per 10 seconds
      { name: "long", ttl: 60000, limit: 100 },  // 100 requests per minute
    ]),
    SupabaseModule,
    ServicesModule,
    TherapistsModule,
    BedsModule,
    CustomersModule,
    BookingsModule,
    PaymentsModule,
    AttendanceModule,
    DashboardModule,
    AuthModule,
    CommissionsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
