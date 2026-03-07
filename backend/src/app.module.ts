import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { SupabaseModule } from "./supabase/supabase.module";
import { ServicesModule } from "./services/services.module";
import { TherapistsModule } from "./therapists/therapists.module";
import { BedsModule } from "./beds/beds.module";
import { CustomersModule } from "./customers/customers.module";

@Module({
  imports: [
    ConfigModule.forRoot(),
    SupabaseModule,
    ServicesModule,
    TherapistsModule,
    BedsModule,
    CustomersModule,
  ],
})
export class AppModule {}
