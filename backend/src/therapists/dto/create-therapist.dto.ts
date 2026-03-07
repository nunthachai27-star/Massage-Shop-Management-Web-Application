import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  Min,
  Max,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateTherapistDto {
  @ApiProperty() @IsString() name_th: string;
  @ApiProperty() @IsString() name_en: string;
  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];
  @ApiProperty({ required: false }) @IsOptional() @IsNumber() @Min(0) @Max(5) rating?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsString() pin?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() image?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsNumber() @Min(0) experience?: number;
}
