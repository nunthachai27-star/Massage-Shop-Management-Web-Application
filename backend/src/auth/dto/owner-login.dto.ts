import { IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class OwnerLoginDto {
  @ApiProperty({ example: "admin" })
  @IsString()
  username: string;

  @ApiProperty({ example: "admin123" })
  @IsString()
  password: string;
}
