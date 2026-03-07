import { Controller, Get, Post, Patch, Param, Body, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CustomersService } from "./customers.service";
import { CreateCustomerDto } from "./dto/create-customer.dto";

@ApiTags("customers")
@Controller("customers")
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  findAll(@Query("search") search?: string) {
    if (search) return this.customersService.search(search);
    return this.customersService.findAll();
  }

  @Post()
  findOrCreate(@Body() dto: CreateCustomerDto) {
    return this.customersService.findOrCreate(dto.name, dto.phone);
  }

  @Patch(":id/visit")
  incrementVisit(@Param("id") id: string) {
    return this.customersService.incrementVisit(+id);
  }
}
