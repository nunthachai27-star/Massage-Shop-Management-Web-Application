import { Controller, Post, Body, Logger } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Roles } from "../auth/decorators/roles.decorator";
import { Public } from "../auth/decorators/public.decorator";
import { LineNotifyService } from "./line-notify.service";

@ApiTags("Line Notify")
@Controller("line-notify")
export class LineNotifyController {
  private readonly logger = new Logger(LineNotifyController.name);

  constructor(private readonly lineNotifyService: LineNotifyService) {}

  @Roles("owner")
  @Post("send")
  send(@Body("message") message: string) {
    return this.lineNotifyService.send(message);
  }

  // Webhook for Line to send events (e.g. bot joined group)
  // Must be public so Line platform can reach it
  @Public()
  @Post("webhook")
  webhook(@Body() body: any) {
    const events = body?.events || [];
    for (const event of events) {
      if (event.source?.groupId) {
        this.logger.log(`=== LINE GROUP ID: ${event.source.groupId} ===`);
      }
      if (event.type === "join") {
        this.logger.log(`Bot joined group: ${event.source?.groupId}`);
      }
      if (event.type === "message" && event.source?.groupId) {
        this.logger.log(`Message in group: ${event.source.groupId}`);
      }
    }
    return { status: "ok" };
  }
}
