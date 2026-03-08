import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
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
})
export class AppModule {}
