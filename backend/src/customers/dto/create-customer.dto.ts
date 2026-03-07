import { IsString, IsOptional } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateCustomerDto {
  @ApiProperty() @IsString() name: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() phone?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() line_id?: string;
}
