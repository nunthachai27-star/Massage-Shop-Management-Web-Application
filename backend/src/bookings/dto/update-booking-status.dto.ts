import { IsString, IsIn, IsOptional, IsNumber } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class UpdateBookingStatusDto {
  @ApiProperty()
  @IsString()
  @IsIn(["booked", "checked_in", "in_service", "completed", "checkout", "cancelled"])
  status: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  bed_id?: number;
}
