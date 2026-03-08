import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseIntPipe,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { TherapistsService } from "./therapists.service";
import { CreateTherapistDto } from "./dto/create-therapist.dto";
import { UpdateTherapistDto } from "./dto/update-therapist.dto";

@ApiTags("therapists")
@Controller("therapists")
export class TherapistsController {
  constructor(private readonly therapistsService: TherapistsService) {}

  @Get()
  findAll(@Query("status") status?: string, @Query("all") all?: string) {
    if (all === "true") return this.therapistsService.findAllIncludingInactive();
    return this.therapistsService.findAll(status);
  }

  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.therapistsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateTherapistDto) {
    return this.therapistsService.create(dto);
  }

  @Patch(":id")
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateTherapistDto,
  ) {
    return this.therapistsService.update(id, dto);
  }

  @Patch(":id/status")
  updateStatus(
    @Param("id", ParseIntPipe) id: number,
    @Body("status") status: string,
  ) {
    return this.therapistsService.updateStatus(id, status);
  }

  @Patch(":id/reactivate")
  reactivate(@Param("id", ParseIntPipe) id: number) {
    return this.therapistsService.reactivate(id);
  }

  @Delete(":id")
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.therapistsService.remove(id);
  }
}
