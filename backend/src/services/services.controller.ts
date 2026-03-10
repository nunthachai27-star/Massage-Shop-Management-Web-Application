import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  ParseIntPipe,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { ServicesService } from "./services.service";
import { CreateServiceDto } from "./dto/create-service.dto";
import { UpdateServiceDto } from "./dto/update-service.dto";
import { Public } from "../auth/decorators/public.decorator";
import { Roles } from "../auth/decorators/roles.decorator";

@ApiTags("services")
@Controller("services")
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Public()
  @Get()
  findAll() {
    return this.servicesService.findAll();
  }

  @Public()
  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.servicesService.findOne(id);
  }

  @Roles("owner")
  @Post()
  create(@Body() dto: CreateServiceDto) {
    return this.servicesService.create(dto);
  }

  @Roles("owner")
  @Patch(":id")
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateServiceDto,
  ) {
    return this.servicesService.update(id, dto);
  }

  @Roles("owner")
  @Delete(":id")
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.servicesService.remove(id);
  }
}
