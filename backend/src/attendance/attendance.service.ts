import { Injectable, NotFoundException } from "@nestjs/common";
import { SupabaseService } from "../supabase/supabase.service";

@Injectable()
export class AttendanceService {
  constructor(private supabase: SupabaseService) {}

  async getToday() {
    const today = new Date().toISOString().split("T")[0];
    const { data, error } = await this.supabase
      .getClient()
      .from("attendance")
      .select("*, therapists(*)")
      .eq("date", today)
      .order("check_in", { ascending: true });
    if (error) throw error;
    return data;
  }

  async checkIn(therapistId: number) {
    const client = this.supabase.getClient();
    const now = new Date().toISOString();
    const today = now.split("T")[0];

    const { data, error } = await client
      .from("attendance")
      .insert({ therapist_id: therapistId, check_in: now, date: today })
      .select("*, therapists(*)")
      .single();
    if (error) throw error;

    await client
      .from("therapists")
      .update({ status: "available" })
      .eq("id", therapistId);

    return data;
  }

  async checkOut(id: number) {
    const client = this.supabase.getClient();

    const { data: record } = await client
      .from("attendance")
      .select("*")
      .eq("id", id)
      .single();
    if (!record) throw new NotFoundException("Attendance record not found");

    const { data, error } = await client
      .from("attendance")
      .update({ check_out: new Date().toISOString() })
      .eq("id", id)
      .select("*, therapists(*)")
      .single();
    if (error) throw error;

    await client
      .from("therapists")
      .update({ status: "offline" })
      .eq("id", record.therapist_id);

    return data;
  }
}
