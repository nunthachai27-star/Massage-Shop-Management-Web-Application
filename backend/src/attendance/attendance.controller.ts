import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  ParseIntPipe,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AttendanceService } from "./attendance.service";
import { CheckInDto } from "./dto/check-in.dto";

@ApiTags("Attendance")
@Controller("attendance")
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get("today")
  getToday() {
    return this.attendanceService.getToday();
  }

  @Post("check-in")
  checkIn(@Body() dto: CheckInDto) {
    return this.attendanceService.checkIn(dto.therapist_id);
  }

  @Patch(":id/check-out")
  checkOut(@Param("id", ParseIntPipe) id: number) {
    return this.attendanceService.checkOut(id);
  }
}
