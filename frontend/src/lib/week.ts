// Monday of the week containing d (local time), with time set to 00:00:00.
export function mondayOf(d: Date): Date {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = r.getDay(); // 0=Sun..6=Sat
  const diff = dow === 0 ? -6 : 1 - dow;
  r.setDate(r.getDate() + diff);
  return r;
}

export function addWeeks(d: Date, n: number): Date {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  r.setDate(r.getDate() + n * 7);
  return r;
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatWeekRange(monday: Date, locale: string): string {
  const end = addWeeks(monday, 0);
  end.setDate(end.getDate() + 6);
  const loc = locale === "th" ? "th-TH" : "en-GB";
  const fmt = (d: Date) =>
    d.toLocaleDateString(loc, { day: "numeric", month: "short" });
  return `${fmt(monday)} - ${fmt(end)}`;
}
