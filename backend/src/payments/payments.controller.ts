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
import { PaymentsService } from "./payments.service";
import { CreatePaymentDto } from "./dto/create-payment.dto";

@ApiTags("Payments")
@Controller("payments")
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get("booking/:bookingId")
  getByBooking(@Param("bookingId", ParseIntPipe) bookingId: number) {
    return this.paymentsService.getByBooking(bookingId);
  }

  @Post()
  create(@Body() dto: CreatePaymentDto) {
    return this.paymentsService.create(dto);
  }

  @Patch(":id/confirm")
  confirm(@Param("id", ParseIntPipe) id: number) {
    return this.paymentsService.confirm(id);
  }
}
