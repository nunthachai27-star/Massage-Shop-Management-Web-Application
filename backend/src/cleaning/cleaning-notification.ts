export interface DutyLine {
  dutyName: string;
  therapistNames: string[];
}

export interface CleaningMessageInput {
  weekRangeLabel: string;
  duties: DutyLine[];
  backupNames: string[];
}

export function buildCleaningMessage(input: CleaningMessageInput): string {
  const header = `🧹 ตารางเวรทำความสะอาด\n📅 ${input.weekRangeLabel}`;
  const dutyLines = input.duties
    .map(
      (d) =>
        `${d.dutyName}: ${d.therapistNames.length ? d.therapistNames.join(", ") : "-"}`,
    )
    .join("\n");
  const backup = `เวรสำรอง / ตรวจความเรียบร้อย: ${
    input.backupNames.length ? input.backupNames.join(", ") : "-"
  }`;
  return `${header}\n\n${dutyLines}\n\n${backup}`;
}
