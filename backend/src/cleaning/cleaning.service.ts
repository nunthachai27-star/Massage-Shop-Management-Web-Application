import { Injectable, NotFoundException } from "@nestjs/common";
import { SupabaseService } from "../supabase/supabase.service";
import { LineNotifyService } from "../line-notify/line-notify.service";
import { buildRoster, RosterAssignment } from "./cleaning-roster";
import { buildCleaningMessage, DutyLine } from "./cleaning-notification";
import { CreateDutyDto } from "./dto/create-duty.dto";
import { UpdateDutyDto } from "./dto/update-duty.dto";

export interface DutyRow {
  id: number;
  name: string;
  required_count: number;
  sort_order: number;
}
export interface TherapistRow {
  id: number;
  name_th: string;
  name_en: string;
}
interface AssignmentRow {
  week_start: string;
  duty_id: number;
  therapist_id: number;
}

// Monday (ISO) of the week containing dateStr, as YYYY-MM-DD (UTC-safe).
export function mondayOf(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  const dow = d.getUTCDay(); // 0=Sun..6=Sat
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

export function addWeeks(dateStr: string, n: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n * 7);
  return d.toISOString().slice(0, 10);
}

function weekRangeLabel(monday: string): string {
  const start = new Date(`${monday}T00:00:00Z`);
  const end = new Date(`${monday}T00:00:00Z`);
  end.setUTCDate(end.getUTCDate() + 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString("th-TH", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
  return `${fmt(start)} - ${fmt(end)}`;
}

@Injectable()
export class CleaningService {
  constructor(
    private supabase: SupabaseService,
    private lineNotify: LineNotifyService,
  ) {}

  async listDuties(): Promise<DutyRow[]> {
    const { data, error } = await this.supabase
      .getClient()
      .from("cleaning_duties")
      .select("id, name, required_count, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return (data as DutyRow[]) || [];
  }

  async createDuty(dto: CreateDutyDto): Promise<DutyRow> {
    const { data, error } = await this.supabase
      .getClient()
      .from("cleaning_duties")
      .insert({
        name: dto.name,
        required_count: dto.required_count ?? 1,
        sort_order: dto.sort_order ?? 0,
      })
      .select("id, name, required_count, sort_order")
      .single();
    if (error) throw error;
    return data as DutyRow;
  }

  async updateDuty(id: number, dto: UpdateDutyDto): Promise<DutyRow> {
    const { data, error } = await this.supabase
      .getClient()
      .from("cleaning_duties")
      .update({
        name: dto.name,
        required_count: dto.required_count,
        sort_order: dto.sort_order,
      })
      .eq("id", id)
      .select("id, name, required_count, sort_order")
      .single();
    if (error || !data) throw new NotFoundException("Cleaning duty not found");
    return data as DutyRow;
  }

  async removeDuty(id: number): Promise<{ message: string }> {
    const { error } = await this.supabase
      .getClient()
      .from("cleaning_duties")
      .update({ is_active: false })
      .eq("id", id);
    if (error) throw error;
    return { message: "Cleaning duty deleted" };
  }

  private async activeTherapists(): Promise<TherapistRow[]> {
    const { data, error } = await this.supabase
      .getClient()
      .from("therapists")
      .select("id, name_th, name_en")
      .eq("is_active", true)
      .order("id", { ascending: true });
    if (error) throw error;
    return (data as TherapistRow[]) || [];
  }

  private async assignmentsForWeek(monday: string): Promise<AssignmentRow[]> {
    const { data, error } = await this.supabase
      .getClient()
      .from("cleaning_assignments")
      .select("week_start, duty_id, therapist_id")
      .eq("week_start", monday);
    if (error) throw error;
    return (data as AssignmentRow[]) || [];
  }

  async getSchedule(week: string) {
    const monday = mondayOf(week);
    const [duties, therapists, assignments] = await Promise.all([
      this.listDuties(),
      this.activeTherapists(),
      this.assignmentsForWeek(monday),
    ]);
    const therapistById = new Map(therapists.map((t) => [t.id, t]));

    const dutyView = duties.map((d) => ({
      id: d.id,
      name: d.name,
      required_count: d.required_count,
      therapists: assignments
        .filter((a) => a.duty_id === d.id)
        .map((a) => therapistById.get(a.therapist_id))
        .filter((t): t is TherapistRow => Boolean(t)),
    }));

    const assignedIds = new Set(assignments.map((a) => a.therapist_id));
    const backup = therapists.filter((t) => !assignedIds.has(t.id));

    return { week_start: monday, duties: dutyView, backup };
  }

  async generate(startWeek: string) {
    const monday = mondayOf(startWeek);
    const weeks = [0, 1, 2, 3].map((i) => addWeeks(monday, i));
    const [therapists, duties, prev] = await Promise.all([
      this.activeTherapists(),
      this.listDuties(),
      this.assignmentsForWeek(addWeeks(monday, -1)),
    ]);

    const roster: RosterAssignment[] = buildRoster(
      therapists.map((t) => ({ id: t.id })),
      duties.map((d) => ({
        id: d.id,
        required_count: d.required_count,
        sort_order: d.sort_order,
      })),
      weeks,
      prev,
    );

    const client = this.supabase.getClient();
    await client.from("cleaning_assignments").delete().in("week_start", weeks);
    for (const a of roster) {
      await client.from("cleaning_assignments").insert({
        week_start: a.week_start,
        duty_id: a.duty_id,
        therapist_id: a.therapist_id,
      });
    }

    return { week_starts: weeks, count: roster.length };
  }

  // Manually set the therapists assigned to one duty for one week (owner override).
  // Replaces any existing assignments for that (week, duty). Empty list clears it.
  async setAssignment(week: string, dutyId: number, therapistIds: number[]) {
    const monday = mondayOf(week);
    const client = this.supabase.getClient();
    await client
      .from("cleaning_assignments")
      .delete()
      .eq("week_start", monday)
      .eq("duty_id", dutyId);

    const unique = [...new Set(therapistIds)].filter((id) => Number.isInteger(id));
    for (const tid of unique) {
      await client.from("cleaning_assignments").insert({
        week_start: monday,
        duty_id: dutyId,
        therapist_id: tid,
      });
    }
    return this.getSchedule(monday);
  }

  async notify(week: string) {
    const schedule = await this.getSchedule(week);
    const duties: DutyLine[] = schedule.duties.map((d) => ({
      dutyName: d.name,
      therapistNames: d.therapists.map((t) => t.name_th),
    }));
    const message = buildCleaningMessage({
      weekRangeLabel: weekRangeLabel(schedule.week_start),
      duties,
      backupNames: schedule.backup.map((t) => t.name_th),
    });
    return this.lineNotify.send(message);
  }
}
