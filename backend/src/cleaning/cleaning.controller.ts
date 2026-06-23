import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Param,
  Body,
  Query,
  ParseIntPipe,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Roles } from "../auth/decorators/roles.decorator";
import { CleaningService } from "./cleaning.service";
import { CreateDutyDto } from "./dto/create-duty.dto";
import { UpdateDutyDto } from "./dto/update-duty.dto";
import { GenerateScheduleDto } from "./dto/generate-schedule.dto";
import { NotifyScheduleDto } from "./dto/notify-schedule.dto";
import { SetAssignmentDto } from "./dto/set-assignment.dto";

@ApiTags("cleaning")
@Roles("owner")
@Controller("cleaning")
export class CleaningController {
  constructor(private readonly cleaning: CleaningService) {}

  @Get("duties")
  listDuties() {
    return this.cleaning.listDuties();
  }

  @Post("duties")
  createDuty(@Body() dto: CreateDutyDto) {
    return this.cleaning.createDuty(dto);
  }

  @Patch("duties/:id")
  updateDuty(@Param("id", ParseIntPipe) id: number, @Body() dto: UpdateDutyDto) {
    return this.cleaning.updateDuty(id, dto);
  }

  @Delete("duties/:id")
  removeDuty(@Param("id", ParseIntPipe) id: number) {
    return this.cleaning.removeDuty(id);
  }

  @Get("schedule")
  getSchedule(@Query("week") week: string) {
    return this.cleaning.getSchedule(week);
  }

  @Post("generate")
  generate(@Body() dto: GenerateScheduleDto) {
    return this.cleaning.generate(dto.startWeek);
  }

  @Put("assignment")
  setAssignment(@Body() dto: SetAssignmentDto) {
    return this.cleaning.setAssignment(dto.week, dto.duty_id, dto.therapist_ids);
  }

  @Post("notify")
  notify(@Body() dto: NotifyScheduleDto) {
    return this.cleaning.notify(dto.week);
  }
}
