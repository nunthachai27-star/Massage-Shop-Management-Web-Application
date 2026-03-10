import { IsString, IsNumber, IsDateString, IsOptional, IsIn } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateBookingDto {
  @ApiProperty() @IsString() customer_name: string;
  @ApiProperty() @IsString() phone: string;
  @ApiProperty() @IsNumber() service_id: number;
  @ApiProperty() @IsNumber() therapist_id: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() bed_id?: number;
  @ApiProperty() @IsDateString() start_time: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @IsIn(["cash", "bank_transfer"]) payment_method?: string;
}
