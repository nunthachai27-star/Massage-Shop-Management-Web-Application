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
      .select("amount, method, booking_id, bookings!inner(start_time)")
      .eq("status", "confirmed")
      .gte("bookings.start_time", `${targetDate}T00:00:00`)
      .lte("bookings.start_time", `${targetDate}T23:59:59`);

    const dailyRevenue =
      payments?.reduce((sum: number, p: any) => sum + Number(p.amount), 0) || 0;
    const dailyCash =
      payments?.filter((p: any) => p.method === "cash").reduce((sum: number, p: any) => sum + Number(p.amount), 0) || 0;
    const dailyTransfer =
      payments?.filter((p: any) => p.method === "bank_transfer").reduce((sum: number, p: any) => sum + Number(p.amount), 0) || 0;

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
      dailyCash,
      dailyTransfer,
      bedUtilization,
    };
  }

  async getWeeklyRevenue() {
    const client = this.supabase.getClient();
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Monday
    const startDate = startOfWeek.toISOString().split("T")[0];
    const endDate = today.toISOString().split("T")[0];

    const { data: payments } = await client
      .from("payments")
      .select("amount, method, booking_id, bookings!inner(start_time)")
      .eq("status", "confirmed")
      .gte("bookings.start_time", `${startDate}T00:00:00`)
      .lte("bookings.start_time", `${endDate}T23:59:59`);

    const weeklyRevenue =
      payments?.reduce((sum: number, p: any) => sum + Number(p.amount), 0) || 0;
    const weeklyCash =
      payments?.filter((p: any) => p.method === "cash").reduce((sum: number, p: any) => sum + Number(p.amount), 0) || 0;
    const weeklyTransfer =
      payments?.filter((p: any) => p.method === "bank_transfer").reduce((sum: number, p: any) => sum + Number(p.amount), 0) || 0;

    const { count: weeklyCustomers } = await client
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .gte("start_time", `${startDate}T00:00:00`)
      .lte("start_time", `${endDate}T23:59:59`)
      .not("status", "eq", "cancelled");

    return {
      weeklyRevenue,
      weeklyCash,
      weeklyTransfer,
      weeklyCustomers: weeklyCustomers || 0,
      startDate,
      endDate,
    };
  }

  async getMonthlyRevenue() {
    const client = this.supabase.getClient();
    const today = new Date();
    const startDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
    const endDate = today.toISOString().split("T")[0];

    const { data: payments } = await client
      .from("payments")
      .select("amount, method, booking_id, bookings!inner(start_time)")
      .eq("status", "confirmed")
      .gte("bookings.start_time", `${startDate}T00:00:00`)
      .lte("bookings.start_time", `${endDate}T23:59:59`);

    const monthlyRevenue =
      payments?.reduce((sum: number, p: any) => sum + Number(p.amount), 0) || 0;
    const monthlyCash =
      payments?.filter((p: any) => p.method === "cash").reduce((sum: number, p: any) => sum + Number(p.amount), 0) || 0;
    const monthlyTransfer =
      payments?.filter((p: any) => p.method === "bank_transfer").reduce((sum: number, p: any) => sum + Number(p.amount), 0) || 0;

    const { count: monthlyCustomers } = await client
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .gte("start_time", `${startDate}T00:00:00`)
      .lte("start_time", `${endDate}T23:59:59`)
      .not("status", "eq", "cancelled");

    return {
      monthlyRevenue,
      monthlyCash,
      monthlyTransfer,
      monthlyCustomers: monthlyCustomers || 0,
      startDate,
      endDate,
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
