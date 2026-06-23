import { IsString, Matches } from "class-validator";

export class GenerateScheduleDto {
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: "startWeek must be YYYY-MM-DD" })
  startWeek: string;
}
