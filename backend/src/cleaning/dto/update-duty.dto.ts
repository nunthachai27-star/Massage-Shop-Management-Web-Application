import { IsString, IsNotEmpty, IsInt, IsOptional, Min } from "class-validator";

export class UpdateDutyDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  required_count?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  sort_order?: number;
}
