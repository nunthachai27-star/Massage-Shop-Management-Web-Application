import { Module } from "@nestjs/common";
import { LineNotifyController } from "./line-notify.controller";
import { LineNotifyService } from "./line-notify.service";

@Module({
  controllers: [LineNotifyController],
  providers: [LineNotifyService],
  exports: [LineNotifyService],
})
export class LineNotifyModule {}
