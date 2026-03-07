import { IsString, IsNumber, IsDateString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateBookingDto {
  @ApiProperty() @IsString() customer_name: string;
  @ApiProperty() @IsString() phone: string;
  @ApiProperty() @IsNumber() service_id: number;
  @ApiProperty() @IsNumber() therapist_id: number;
  @ApiProperty() @IsDateString() start_time: string;
}
