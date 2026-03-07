import { IsString, IsNumber, IsOptional, Min } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateServiceDto {
  @ApiProperty() @IsString() name_th: string;
  @ApiProperty() @IsString() name_en: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() description_th?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() description_en?: string;
  @ApiProperty() @IsNumber() @Min(1) duration: number;
  @ApiProperty() @IsNumber() @Min(0) price: number;
  @ApiProperty({ required: false }) @IsOptional() @IsString() image?: string;
}
