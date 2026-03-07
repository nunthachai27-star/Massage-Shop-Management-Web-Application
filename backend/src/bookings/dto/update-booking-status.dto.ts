import { IsString, IsIn } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class UpdateBookingStatusDto {
  @ApiProperty()
  @IsString()
  @IsIn(["booked", "checked_in", "in_service", "completed", "checkout", "cancelled"])
  status: string;
}
