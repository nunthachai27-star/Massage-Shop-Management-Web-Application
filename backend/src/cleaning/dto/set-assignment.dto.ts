import { IsString, Matches, IsArray, IsInt } from "class-validator";

export class SetAssignmentDto {
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: "week must be YYYY-MM-DD" })
  week: string;

  @IsInt()
  duty_id: number;

  @IsArray()
  @IsInt({ each: true })
  therapist_ids: number[];
}
