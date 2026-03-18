import { Module } from "@nestjs/common";
import { BookingsController } from "./bookings.controller";
import { BookingsService } from "./bookings.service";
import { BookingsCleanupTask } from "./bookings-cleanup.task";
import { LineNotifyModule } from "../line-notify/line-notify.module";

@Module({
  imports: [LineNotifyModule],
  controllers: [BookingsController],
  providers: [BookingsService, BookingsCleanupTask],
  exports: [BookingsService],
})
export class BookingsModule {}
