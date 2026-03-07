import { Controller, Get, Patch, Param, Body, ParseIntPipe } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { BedsService } from "./beds.service";

@ApiTags("beds")
@Controller("beds")
export class BedsController {
  constructor(private readonly bedsService: BedsService) {}

  @Get()
  findAll() {
    return this.bedsService.findAll();
  }

  @Patch(":id/status")
  updateStatus(
    @Param("id", ParseIntPipe) id: number,
    @Body("status") status: string,
    @Body("current_booking_id") currentBookingId?: number | null,
  ) {
    return this.bedsService.updateStatus(id, status, currentBookingId);
  }
}
