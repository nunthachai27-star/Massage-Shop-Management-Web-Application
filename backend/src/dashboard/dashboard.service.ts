import { Injectable } from "@nestjs/common";
import { SupabaseService } from "../supabase/supabase.service";

// Get date in Thailand timezone (UTC+7)
function getThaiDate(d: Date = new Date()): string {
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" }); // YYYY-MM-DD
}

@Injectable()
export class DashboardService {
  constructor(private supabase: SupabaseService) {}

  async getDailyMetrics(date?: string) {
    const client = this.supabase.getClient();
    const targetDate = date || getThaiDate();

    // Total customers today
    const { count: totalCustomers } = await client
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .gte("start_time", `${targetDate}T00:00:00+07:00`)
      .lte("start_time", `${targetDate}T23:59:59+07:00`)
      .not("status", "eq", "cancelled");

    // Daily revenue (all payments for non-cancelled bookings)
    const { data: payments } = await client
      .from("payments")
      .select("amount, method, booking_id, bookings!inner(start_time, status)")
      .gte("bookings.start_time", `${targetDate}T00:00:00+07:00`)
      .lte("bookings.start_time", `${targetDate}T23:59:59+07:00`)
      .not("bookings.status", "eq", "cancelled");

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

    // Daily commissions
    const { data: commissions } = await client
      .from("commissions")
      .select("total_commission")
      .eq("date", targetDate);
    const dailyCommission =
      commissions?.reduce((sum: number, c: any) => sum + Number(c.total_commission), 0) || 0;

    return {
      totalCustomers: totalCustomers || 0,
      dailyRevenue,
      dailyCash,
      dailyTransfer,
      dailyCommission,
      bedUtilization,
    };
  }

  async getWeeklyRevenue() {
    const client = this.supabase.getClient();
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Monday
    const startDate = getThaiDate(startOfWeek);
    const endDate = getThaiDate();

    const { data: payments } = await client
      .from("payments")
      .select("amount, method, booking_id, bookings!inner(start_time, status)")
      .gte("bookings.start_time", `${startDate}T00:00:00+07:00`)
      .lte("bookings.start_time", `${endDate}T23:59:59+07:00`)
      .not("bookings.status", "eq", "cancelled");

    const weeklyRevenue =
      payments?.reduce((sum: number, p: any) => sum + Number(p.amount), 0) || 0;
    const weeklyCash =
      payments?.filter((p: any) => p.method === "cash").reduce((sum: number, p: any) => sum + Number(p.amount), 0) || 0;
    const weeklyTransfer =
      payments?.filter((p: any) => p.method === "bank_transfer").reduce((sum: number, p: any) => sum + Number(p.amount), 0) || 0;

    const { count: weeklyCustomers } = await client
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .gte("start_time", `${startDate}T00:00:00+07:00`)
      .lte("start_time", `${endDate}T23:59:59+07:00`)
      .not("status", "eq", "cancelled");

    // Weekly commissions
    const { data: weeklyCommissions } = await client
      .from("commissions")
      .select("total_commission")
      .gte("date", startDate)
      .lte("date", endDate);
    const weeklyCommission =
      weeklyCommissions?.reduce((sum: number, c: any) => sum + Number(c.total_commission), 0) || 0;

    return {
      weeklyRevenue,
      weeklyCash,
      weeklyTransfer,
      weeklyCommission,
      weeklyCustomers: weeklyCustomers || 0,
      startDate,
      endDate,
    };
  }

  async getMonthlyRevenue() {
    const client = this.supabase.getClient();
    const endDate = getThaiDate();
    const startDate = endDate.substring(0, 8) + "01"; // first day of month

    const { data: payments } = await client
      .from("payments")
      .select("amount, method, booking_id, bookings!inner(start_time, status)")
      .gte("bookings.start_time", `${startDate}T00:00:00+07:00`)
      .lte("bookings.start_time", `${endDate}T23:59:59+07:00`)
      .not("bookings.status", "eq", "cancelled");

    const monthlyRevenue =
      payments?.reduce((sum: number, p: any) => sum + Number(p.amount), 0) || 0;
    const monthlyCash =
      payments?.filter((p: any) => p.method === "cash").reduce((sum: number, p: any) => sum + Number(p.amount), 0) || 0;
    const monthlyTransfer =
      payments?.filter((p: any) => p.method === "bank_transfer").reduce((sum: number, p: any) => sum + Number(p.amount), 0) || 0;

    const { count: monthlyCustomers } = await client
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .gte("start_time", `${startDate}T00:00:00+07:00`)
      .lte("start_time", `${endDate}T23:59:59+07:00`)
      .not("status", "eq", "cancelled");

    // Monthly commissions
    const { data: monthlyCommissions } = await client
      .from("commissions")
      .select("total_commission")
      .gte("date", startDate)
      .lte("date", endDate);
    const monthlyCommission =
      monthlyCommissions?.reduce((sum: number, c: any) => sum + Number(c.total_commission), 0) || 0;

    return {
      monthlyRevenue,
      monthlyCash,
      monthlyTransfer,
      monthlyCommission,
      monthlyCustomers: monthlyCustomers || 0,
      startDate,
      endDate,
    };
  }

  async getReport(from: string, to: string) {
    const client = this.supabase.getClient();

    // 1. Get all bookings in date range with service, therapist, payment data
    const { data: bookings } = await client
      .from("bookings")
      .select("*, services(*), therapists(id, name_th, name_en), payments(amount, method, status)")
      .gte("start_time", `${from}T00:00:00+07:00`)
      .lte("start_time", `${to}T23:59:59+07:00`)
      .not("status", "eq", "cancelled")
      .order("start_time", { ascending: true });

    // Pre-fetch therapists by id for breakdown — bypasses any issue with the relation join
    // returning null on booking.therapists (seen on some rows in production)
    const { data: allTherapists } = await client
      .from("therapists")
      .select("id, name_th, name_en");
    const therapistById = new Map<number, { id: number; name_th: string; name_en: string }>();
    for (const t of (allTherapists as { id: number; name_th: string; name_en: string }[]) || []) {
      therapistById.set(t.id, t);
    }
    console.log(`[getReport ${from}] allTherapists=${(allTherapists as unknown[])?.length || 0}, bookings=${bookings?.length || 0}`);
    for (const b of (bookings as { id: number; therapist_id: number | null }[]) || []) {
      console.log(`  booking ${b.id}: therapist_id=${b.therapist_id} -> tInfo=${b.therapist_id ? JSON.stringify(therapistById.get(b.therapist_id) || null) : "skip"}`);
    }

    // 2. Summary
    let totalRevenue = 0;
    let totalCash = 0;
    let totalTransfer = 0;
    let totalCustomers = bookings?.length || 0;

    // 3. Service breakdown map
    const serviceMap = new Map<number, { name_th: string; name_en: string; count: number; revenue: number; duration: number }>();
    // 4. Therapist breakdown map
    const therapistMap = new Map<number, { name_th: string; name_en: string; sessions: number; revenue: number; commission: number }>();
    // 5. Daily breakdown map
    const dailyMap = new Map<string, { date: string; revenue: number; customers: number; cash: number; transfer: number }>();

    // Commission helper (same logic as commissions.service.ts)
    const calcCommission = (price: number, isThaiMassage: boolean, serviceName: string, customerGender?: string): number => {
      if (customerGender === "female") return Math.round(price / 2);
      if (isThaiMassage) return Math.round(price / 2);
      if (price === 0 && serviceName.includes("ฟรี")) return 100;
      if (price >= 1000) return 250;
      if (price >= 800) return 200;
      if (price >= 600) return 100;
      return 0;
    };

    let totalCommission = 0;

    for (const b of bookings || []) {
      const service = b.services;
      const payment = b.payments?.[0];
      const amount = payment ? Number(payment.amount) : 0;
      const method = payment?.method || "cash";

      totalRevenue += amount;
      if (method === "cash") totalCash += amount;
      if (method === "bank_transfer") totalTransfer += amount;

      // Commission
      const price = service ? Number(service.price) : 0;
      const nameTh = service?.name_th || "";
      const isThaiMassage = nameTh.includes("นวดไทย");
      const commission = calcCommission(price, isThaiMassage, nameTh, b.customer_gender);
      totalCommission += commission;

      // Service breakdown
      if (service) {
        const existing = serviceMap.get(service.id) || {
          name_th: service.name_th,
          name_en: service.name_en,
          count: 0,
          revenue: 0,
          duration: service.duration,
        };
        existing.count++;
        existing.revenue += amount;
        serviceMap.set(service.id, existing);
      }

      // Therapist breakdown — use therapist_id from the booking row to avoid
      // missing entries when the joined `therapists` relation is unexpectedly null
      const tid = b.therapist_id;
      const tInfo = tid ? therapistById.get(tid) : undefined;
      if (tInfo) {
        const existing = therapistMap.get(tInfo.id) || {
          name_th: tInfo.name_th,
          name_en: tInfo.name_en,
          sessions: 0,
          revenue: 0,
          commission: 0,
        };
        existing.sessions++;
        existing.revenue += amount;
        existing.commission += commission;
        therapistMap.set(tInfo.id, existing);
      }

      // Daily breakdown
      const bookingDate = new Date(b.start_time).toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
      const dayExisting = dailyMap.get(bookingDate) || {
        date: bookingDate,
        revenue: 0,
        customers: 0,
        cash: 0,
        transfer: 0,
      };
      dayExisting.revenue += amount;
      dayExisting.customers++;
      if (method === "cash") dayExisting.cash += amount;
      if (method === "bank_transfer") dayExisting.transfer += amount;
      dailyMap.set(bookingDate, dayExisting);
    }

    return {
      summary: {
        totalRevenue,
        totalCash,
        totalTransfer,
        totalCommission,
        totalCustomers,
        netProfit: totalRevenue - totalCommission,
      },
      serviceBreakdown: Array.from(serviceMap.values()).sort((a, b) => b.revenue - a.revenue),
      therapistBreakdown: Array.from(therapistMap.values()).sort((a, b) => b.revenue - a.revenue),
      dailyBreakdown: Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date)),
    };
  }

  async getTherapistPerformance(date?: string) {
    const client = this.supabase.getClient();
    const targetDate = date || getThaiDate();

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
      .gte("start_time", `${targetDate}T00:00:00+07:00`)
      .lte("start_time", `${targetDate}T23:59:59+07:00`)
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
