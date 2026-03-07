import { IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class PinLoginDto {
  @ApiProperty({ example: "1234" })
  @IsString()
  pin: string;
}
