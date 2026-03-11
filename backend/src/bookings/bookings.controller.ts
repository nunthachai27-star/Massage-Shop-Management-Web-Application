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
import { Public } from "../auth/decorators/public.decorator";

@ApiTags("Bookings")
@Controller("bookings")
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Get()
  findAll(@Query("status") status?: string, @Query("date") date?: string) {
    return this.bookingsService.findAll(status, date);
  }

  @Public()
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

  @Patch(":id/details")
  updateDetails(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: { therapist_id?: number; service_id?: number; bed_id?: number; customer_gender?: string },
  ) {
    return this.bookingsService.updateDetails(id, dto);
  }
}
