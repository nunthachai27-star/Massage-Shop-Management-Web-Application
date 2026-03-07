import { IsNumber, IsString, IsIn } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreatePaymentDto {
  @ApiProperty() @IsNumber() booking_id: number;
  @ApiProperty() @IsNumber() amount: number;
  @ApiProperty() @IsString() @IsIn(["promptpay_qr", "cash", "bank_transfer"]) method: string;
}
