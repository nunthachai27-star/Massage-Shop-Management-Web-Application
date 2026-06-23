import { IsString, Matches } from "class-validator";

export class NotifyScheduleDto {
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: "week must be YYYY-MM-DD" })
  week: string;
}
