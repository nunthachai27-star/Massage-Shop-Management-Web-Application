const VOID_NOTIFY_STATUSES = new Set(["in_service", "completed", "checkout"]);

export function shouldNotifyVoid(priorStatus: string | null | undefined): boolean {
  return priorStatus ? VOID_NOTIFY_STATUSES.has(priorStatus) : false;
}

export interface VoidMessageFields {
  therapistName: string | null;
  serviceName: string | null;
  startTime: string | null;
  endTime: string | null;
}

function fmtTime(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Bangkok",
  });
}

function fmtDate(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Bangkok",
  });
}

export function buildVoidMessage(fields: VoidMessageFields): string {
  const therapist = fields.therapistName || "-";
  const service = fields.serviceName || "-";
  const start = fmtTime(fields.startTime);
  const end = fmtTime(fields.endTime);
  const date = fmtDate(fields.startTime);
  return (
    `❌ ยกเลิกรายการ\n` +
    `👩‍⚕️ ${therapist}\n` +
    `💆 ${service}\n` +
    `⏰ ${start} - ${end} น.\n` +
    `📅 ${date}`
  );
}
