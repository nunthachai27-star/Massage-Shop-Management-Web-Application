import { IsNumber } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CheckInDto {
  @ApiProperty() @IsNumber() therapist_id: number;
}
