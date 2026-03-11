import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Req,
  ParseIntPipe,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CommissionsService } from "./commissions.service";
import { Roles } from "../auth/decorators/roles.decorator";

@ApiTags("Commissions")
@Controller("commissions")
export class CommissionsController {
  constructor(private readonly commissionsService: CommissionsService) {}

  @Roles("owner")
  @Get()
  getByDate(@Query("date") date?: string) {
    const targetDate = date || new Date().toISOString().split("T")[0];
    return this.commissionsService.getByDate(targetDate);
  }

  // Therapist views their own commissions (last 7 days)
  @Roles("therapist")
  @Get("my")
  getMyCommissions(@Req() req: any) {
    const therapistId = req.user?.id;
    return this.commissionsService.getByTherapist(therapistId);
  }

  @Roles("owner")
  @Patch(":id/paid")
  markPaid(@Param("id", ParseIntPipe) id: number) {
    return this.commissionsService.markPaid(id);
  }

  @Roles("owner")
  @Patch(":id/unpaid")
  markUnpaid(@Param("id", ParseIntPipe) id: number) {
    return this.commissionsService.markUnpaid(id);
  }
}
