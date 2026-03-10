import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  ParseIntPipe,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CommissionsService } from "./commissions.service";
import { Roles } from "../auth/decorators/roles.decorator";

@ApiTags("Commissions")
@Roles("owner")
@Controller("commissions")
export class CommissionsController {
  constructor(private readonly commissionsService: CommissionsService) {}

  @Get()
  getByDate(@Query("date") date?: string) {
    const targetDate = date || new Date().toISOString().split("T")[0];
    return this.commissionsService.getByDate(targetDate);
  }

  @Patch(":id/paid")
  markPaid(@Param("id", ParseIntPipe) id: number) {
    return this.commissionsService.markPaid(id);
  }

  @Patch(":id/unpaid")
  markUnpaid(@Param("id", ParseIntPipe) id: number) {
    return this.commissionsService.markUnpaid(id);
  }
}
