import { Injectable, NotFoundException } from "@nestjs/common";
import { SupabaseService } from "../supabase/supabase.service";

// Commission calculation: 600→100, 800→200, 1000→250, Thai massage → half
function getCommission(price: number, isThaiMassage: boolean): number {
  let commission = 0;
  if (price >= 1000) commission = 250;
  else if (price >= 800) commission = 200;
  else if (price >= 600) commission = 100;
  else return 0;
  return isThaiMassage ? Math.round(commission / 2) : commission;
}

@Injectable()
export class CommissionsService {
  constructor(private supabase: SupabaseService) {}

  // Calculate and upsert daily commission for a therapist
  async calculateDaily(therapistId: number, date: string) {
    const client = this.supabase.getClient();

    // Get completed/checkout bookings for this therapist on this date
    // PgClient doesn't have .in(), so exclude statuses we don't want
    const { data: bookings } = await client
      .from("bookings")
      .select("*, services(*)")
      .eq("therapist_id", therapistId)
      .not("status", "in", '("booked","checked_in","cancelled")')
      .gte("start_time", `${date}T00:00:00`)
      .lte("start_time", `${date}T23:59:59`);

    let totalSessions = 0;
    let totalRevenue = 0;
    let totalCommission = 0;

    if (bookings) {
      for (const b of bookings) {
        const service = b.services;
        if (service) {
          totalSessions++;
          const price = Number(service.price);
          totalRevenue += price;
          const isThaiMassage = (service.name_th || "").includes("แผนไทย");
          totalCommission += getCommission(price, isThaiMassage);
        }
      }
    }

    // Upsert commission record
    // Check if record exists first
    const { data: existing } = await client
      .from("commissions")
      .select("*")
      .eq("therapist_id", therapistId)
      .eq("date", date)
      .maybeSingle();

    if (existing) {
      const { data, error } = await client
        .from("commissions")
        .update({
          total_sessions: totalSessions,
          total_revenue: totalRevenue,
          total_commission: totalCommission,
        })
        .eq("id", existing.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      const { data, error } = await client
        .from("commissions")
        .insert({
          therapist_id: therapistId,
          date,
          total_sessions: totalSessions,
          total_revenue: totalRevenue,
          total_commission: totalCommission,
          status: "pending",
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    }
  }

  // Calculate daily commissions for ALL therapists
  async calculateAllDaily(date: string) {
    const client = this.supabase.getClient();
    const { data: therapists } = await client
      .from("therapists")
      .select("id")
      .eq("is_active", true);

    if (!therapists) return [];

    const results: unknown[] = [];
    for (const t of therapists) {
      const commission = await this.calculateDaily(t.id, date);
      results.push(commission);
    }
    return results;
  }

  // Get commissions by date (with therapist info)
  async getByDate(date: string) {
    const client = this.supabase.getClient();

    // First calculate/update all commissions for this date
    await this.calculateAllDaily(date);

    // Then fetch with therapist details
    const { data, error } = await client
      .from("commissions")
      .select("*, therapists(id, name_th, name_en)")
      .eq("date", date)
      .order("therapist_id", { ascending: true });

    if (error) throw error;
    return data || [];
  }

  // Mark commission as paid
  async markPaid(id: number) {
    const client = this.supabase.getClient();
    const { data, error } = await client
      .from("commissions")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("id", id)
      .select("*, therapists(id, name_th, name_en)")
      .single();
    if (error || !data) throw new NotFoundException("Commission not found");
    return data;
  }

  // Mark commission as unpaid (undo)
  async markUnpaid(id: number) {
    const client = this.supabase.getClient();
    const { data, error } = await client
      .from("commissions")
      .update({ status: "pending", paid_at: null })
      .eq("id", id)
      .select("*, therapists(id, name_th, name_en)")
      .single();
    if (error || !data) throw new NotFoundException("Commission not found");
    return data;
  }
}
