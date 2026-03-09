import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { bookings as mockBookings, type Booking } from "@/data/bookings";
import { api } from "@/lib/api";
import { transformBooking } from "@/lib/transform";

export default async function OwnerDashboardPage() {
  const t = await getTranslations();

  // Fetch real metrics from API
  let totalCustomers = 0;
  let dailyRevenue = 0;
  let dailyCash = 0;
  let dailyTransfer = 0;
  let weeklyRevenue = 0;
  let weeklyCash = 0;
  let weeklyTransfer = 0;
  let weeklyCustomers = 0;
  let monthlyRevenue = 0;
  let monthlyCash = 0;
  let monthlyTransfer = 0;
  let monthlyCustomers = 0;
  try {
    const [metrics, weekly, monthly] = await Promise.all([
      api.getDailyMetrics(),
      api.getWeeklyRevenue(),
      api.getMonthlyRevenue(),
    ]);
    totalCustomers = (metrics.totalCustomers as number) || 0;
    dailyRevenue = (metrics.dailyRevenue as number) || 0;
    dailyCash = (metrics.dailyCash as number) || 0;
    dailyTransfer = (metrics.dailyTransfer as number) || 0;
    weeklyRevenue = (weekly.weeklyRevenue as number) || 0;
    weeklyCash = (weekly.weeklyCash as number) || 0;
    weeklyTransfer = (weekly.weeklyTransfer as number) || 0;
    weeklyCustomers = (weekly.weeklyCustomers as number) || 0;
    monthlyRevenue = (monthly.monthlyRevenue as number) || 0;
    monthlyCash = (monthly.monthlyCash as number) || 0;
    monthlyTransfer = (monthly.monthlyTransfer as number) || 0;
    monthlyCustomers = (monthly.monthlyCustomers as number) || 0;
  } catch {
    // API unavailable — show zeros
  }

  const dailyCards = [
    { labelKey: "owner.totalCustomers", value: String(totalCustomers), icon: "👥" },
  ];

  let bookings: Booking[];
  try {
    const raw = await api.getBookings();
    bookings = raw.map(transformBooking);
  } catch {
    bookings = mockBookings;
  }

  const statusCounts = bookings.reduce(
    (acc, b) => {
      acc[b.status] = (acc[b.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="md:space-y-6">
      <h1 className="font-heading text-lg md:text-2xl text-white mb-3 md:mb-6">{t("owner.dashboard")}</h1>

      {/* Daily: Revenue + Customers in one row */}
      <div className="grid grid-cols-2 gap-2 md:gap-4 mb-2 md:mb-6">
        <div className="bg-surface-card rounded-xl p-3 md:p-5 border border-white/10">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg md:text-3xl">💰</span>
            <p className="text-white/50 text-[10px] md:text-sm">{t("owner.dailyRevenue")}</p>
          </div>
          <p className="text-accent-gold text-xl md:text-3xl font-bold">{dailyRevenue.toLocaleString()} ฿</p>
          <div className="flex gap-3 mt-1.5 pt-1.5 border-t border-white/10">
            <span className="text-green-400 text-[10px] md:text-xs">💵 {dailyCash.toLocaleString()}</span>
            <span className="text-blue-400 text-[10px] md:text-xs">📱 {dailyTransfer.toLocaleString()}</span>
          </div>
        </div>
        <div className="bg-surface-card rounded-xl p-3 md:p-5 border border-white/10 flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg md:text-3xl">👥</span>
            <p className="text-white/50 text-[10px] md:text-sm">{t("owner.totalCustomers")}</p>
          </div>
          <p className="text-accent-gold text-xl md:text-3xl font-bold">{totalCustomers}</p>
        </div>
      </div>

      {/* Weekly & Monthly: side by side on mobile */}
      <div className="grid grid-cols-2 gap-2 md:gap-4 mb-2 md:mb-8">
        {/* Weekly */}
        <div className="relative overflow-hidden rounded-xl border border-blue-500/30 bg-gradient-to-br from-blue-900/40 via-blue-800/20 to-primary-dark p-3 md:p-5">
          <div className="relative">
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="text-sm md:text-2xl">📅</span>
              <h3 className="text-blue-300 font-heading text-[10px] md:text-sm">{t("owner.weeklyRevenue")}</h3>
            </div>
            <p className="text-white text-lg md:text-4xl font-bold mb-1">
              {weeklyRevenue.toLocaleString()} <span className="text-xs md:text-xl text-blue-300">฿</span>
            </p>
            <div className="flex gap-2 pt-1.5 border-t border-white/10">
              <span className="text-green-400 text-[10px]">💵 {weeklyCash.toLocaleString()}</span>
              <span className="text-blue-300 text-[10px]">📱 {weeklyTransfer.toLocaleString()}</span>
            </div>
            <p className="text-white/40 text-[10px] mt-1">
              👥 {weeklyCustomers}
            </p>
          </div>
        </div>

        {/* Monthly */}
        <div className="relative overflow-hidden rounded-xl border border-purple-500/30 bg-gradient-to-br from-purple-900/40 via-purple-800/20 to-primary-dark p-3 md:p-5">
          <div className="relative">
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="text-sm md:text-2xl">📆</span>
              <h3 className="text-purple-300 font-heading text-[10px] md:text-sm">{t("owner.monthlyRevenue")}</h3>
            </div>
            <p className="text-white text-lg md:text-4xl font-bold mb-1">
              {monthlyRevenue.toLocaleString()} <span className="text-xs md:text-xl text-purple-300">฿</span>
            </p>
            <div className="flex gap-2 pt-1.5 border-t border-white/10">
              <span className="text-green-400 text-[10px]">💵 {monthlyCash.toLocaleString()}</span>
              <span className="text-blue-300 text-[10px]">📱 {monthlyTransfer.toLocaleString()}</span>
            </div>
            <p className="text-white/40 text-[10px] mt-1">
              👥 {monthlyCustomers}
            </p>
          </div>
        </div>
      </div>

      {/* Booking Status Summary - compact */}
      <div className="bg-surface-card rounded-xl p-3 md:p-5 border border-white/10">
        <h2 className="font-heading text-sm md:text-lg text-white mb-2 md:mb-4">{t("staff.bookings")}</h2>
        <div className="grid grid-cols-4 gap-2 md:gap-3">
          {Object.entries(statusCounts).map(([status, count]) => (
            <div key={status} className="text-center p-2 md:p-3 bg-surface-dark rounded-lg">
              <p className="text-white text-lg md:text-2xl font-bold">{count}</p>
              <Badge
                variant={
                  status === "booked"
                    ? "blue"
                    : status === "in_service"
                      ? "gold"
                      : status === "completed"
                        ? "green"
                        : "gray"
                }
              >
                {status.replace("_", " ")}
              </Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
