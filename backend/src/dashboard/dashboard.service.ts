import { Injectable } from "@nestjs/common";
import { SupabaseService } from "../supabase/supabase.service";

@Injectable()
export class DashboardService {
  constructor(private supabase: SupabaseService) {}

  async getDailyMetrics(date?: string) {
    const client = this.supabase.getClient();
    const targetDate = date || new Date().toISOString().split("T")[0];

    // Total customers today
    const { count: totalCustomers } = await client
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .gte("start_time", `${targetDate}T00:00:00`)
      .lte("start_time", `${targetDate}T23:59:59`)
      .not("status", "eq", "cancelled");

    // Daily revenue (confirmed payments)
    const { data: payments } = await client
      .from("payments")
      .select("amount, booking_id, bookings!inner(start_time)")
      .eq("status", "confirmed")
      .gte("bookings.start_time", `${targetDate}T00:00:00`)
      .lte("bookings.start_time", `${targetDate}T23:59:59`);

    const dailyRevenue =
      payments?.reduce((sum: number, p: any) => sum + Number(p.amount), 0) || 0;

    // Bed utilization
    const { data: beds } = await client.from("beds").select("status");
    const inUse =
      beds?.filter((b: any) => b.status !== "available").length || 0;
    const bedUtilization = beds?.length
      ? Math.round((inUse / beds.length) * 100)
      : 0;

    return {
      totalCustomers: totalCustomers || 0,
      dailyRevenue,
      bedUtilization,
    };
  }

  async getTherapistPerformance(date?: string) {
    const client = this.supabase.getClient();
    const targetDate = date || new Date().toISOString().split("T")[0];

    // Get all active therapists
    const { data: therapists } = await client
      .from("therapists")
      .select("*")
      .eq("is_active", true)
      .order("id");

    // Get today's bookings with payments
    const { data: bookings } = await client
      .from("bookings")
      .select("therapist_id, payments(amount, status)")
      .gte("start_time", `${targetDate}T00:00:00`)
      .lte("start_time", `${targetDate}T23:59:59`)
      .not("status", "eq", "cancelled");

    const performance = therapists?.map((t: any) => {
      const tBookings =
        bookings?.filter((b: any) => b.therapist_id === t.id) || [];
      const sessions = tBookings.length;
      const revenue = tBookings.reduce((sum: number, b: any) => {
        const confirmedPayments =
          b.payments?.filter((p: any) => p.status === "confirmed") || [];
        return (
          sum +
          confirmedPayments.reduce(
            (s: number, p: any) => s + Number(p.amount),
            0,
          )
        );
      }, 0);
      return { ...t, sessions, revenue };
    });

    return performance;
  }
}
