import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  ParseIntPipe,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { BookingsService } from "./bookings.service";
import { CreateBookingDto } from "./dto/create-booking.dto";
import { UpdateBookingStatusDto } from "./dto/update-booking-status.dto";

@ApiTags("Bookings")
@Controller("bookings")
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Get()
  findAll(@Query("status") status?: string, @Query("date") date?: string) {
    return this.bookingsService.findAll(status, date);
  }

  @Get("availability")
  getAvailableSlots(
    @Query("therapistId", ParseIntPipe) therapistId: number,
    @Query("date") date: string,
    @Query("duration") duration?: string,
  ) {
    return this.bookingsService.getAvailableSlots(
      therapistId,
      date,
      duration ? parseInt(duration) : 60,
    );
  }

  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.bookingsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateBookingDto) {
    return this.bookingsService.create(dto);
  }

  @Patch(":id/status")
  updateStatus(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateBookingStatusDto,
  ) {
    return this.bookingsService.updateStatus(id, dto.status, dto.bed_id);
  }
}
