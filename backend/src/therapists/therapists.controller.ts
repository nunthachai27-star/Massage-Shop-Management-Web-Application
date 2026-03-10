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
import { Public } from "../auth/decorators/public.decorator";
import { Roles } from "../auth/decorators/roles.decorator";

@ApiTags("therapists")
@Controller("therapists")
export class TherapistsController {
  constructor(private readonly therapistsService: TherapistsService) {}

  @Public()
  @Get()
  findAll(@Query("status") status?: string) {
    return this.therapistsService.findAll(status);
  }

  @Roles("owner")
  @Get("all")
  findAllIncludingInactive() {
    return this.therapistsService.findAllIncludingInactive();
  }

  @Public()
  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.therapistsService.findOne(id);
  }

  @Roles("owner")
  @Post()
  create(@Body() dto: CreateTherapistDto) {
    return this.therapistsService.create(dto);
  }

  @Roles("owner")
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

  @Roles("owner")
  @Patch(":id/reactivate")
  reactivate(@Param("id", ParseIntPipe) id: number) {
    return this.therapistsService.reactivate(id);
  }

  @Roles("owner")
  @Delete(":id")
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.therapistsService.remove(id);
  }
}
