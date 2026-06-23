import { Module } from "@nestjs/common";
import { CleaningController } from "./cleaning.controller";
import { CleaningService } from "./cleaning.service";
import { LineNotifyModule } from "../line-notify/line-notify.module";

@Module({
  imports: [LineNotifyModule],
  controllers: [CleaningController],
  providers: [CleaningService],
})
export class CleaningModule {}
