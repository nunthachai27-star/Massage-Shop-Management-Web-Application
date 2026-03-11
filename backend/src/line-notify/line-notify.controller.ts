import { Controller, Post, Body } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Roles } from "../auth/decorators/roles.decorator";
import { LineNotifyService } from "./line-notify.service";

@ApiTags("Line Notify")
@Roles("owner")
@Controller("line-notify")
export class LineNotifyController {
  constructor(private readonly lineNotifyService: LineNotifyService) {}

  @Post("send")
  send(@Body("message") message: string) {
    return this.lineNotifyService.send(message);
  }
}
