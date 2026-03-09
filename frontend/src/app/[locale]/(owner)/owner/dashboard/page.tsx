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
  let bedUtilization = 0;
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
    bedUtilization = (metrics.bedUtilization as number) || 0;
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
    { labelKey: "owner.bedUtilization", value: String(bedUtilization), suffix: "%", icon: "🚪" },
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
    <div>
      <h1 className="font-heading text-2xl text-white mb-6">{t("owner.dashboard")}</h1>

      {/* Daily Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {/* Daily Revenue with breakdown */}
        <Card>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-3xl">💰</span>
            <div>
              <p className="text-accent-gold text-3xl font-bold">{dailyRevenue.toLocaleString()} ฿</p>
              <p className="text-white/50 text-sm">{t("owner.dailyRevenue")}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-white/10">
            <div className="flex items-center gap-2">
              <span className="text-sm">💵</span>
              <div>
                <p className="text-green-400 text-sm font-bold">{dailyCash.toLocaleString()} ฿</p>
                <p className="text-white/30 text-[10px]">{t("owner.cash")}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm">📱</span>
              <div>
                <p className="text-blue-400 text-sm font-bold">{dailyTransfer.toLocaleString()} ฿</p>
                <p className="text-white/30 text-[10px]">{t("owner.transfer")}</p>
              </div>
            </div>
          </div>
        </Card>

        {dailyCards.map((metric) => (
          <Card key={metric.labelKey}>
            <div className="flex items-center gap-3">
              <span className="text-3xl">{metric.icon}</span>
              <div>
                <p className="text-accent-gold text-3xl font-bold">
                  {metric.value}
                  {metric.suffix || ""}
                </p>
                <p className="text-white/50 text-sm">{t(metric.labelKey)}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Weekly & Monthly Revenue */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {/* Weekly */}
        <div className="relative overflow-hidden rounded-xl border border-blue-500/30 bg-gradient-to-br from-blue-900/40 via-blue-800/20 to-primary-dark p-5">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">📅</span>
              <h3 className="text-blue-300 font-heading text-sm">{t("owner.weeklyRevenue")}</h3>
            </div>
            <p className="text-white text-4xl font-bold mb-2">
              {weeklyRevenue.toLocaleString()} <span className="text-xl text-blue-300">฿</span>
            </p>
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
              <div className="flex items-center gap-1.5">
                <span className="text-xs">💵</span>
                <span className="text-green-400 text-xs font-medium">{weeklyCash.toLocaleString()} ฿</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs">📱</span>
                <span className="text-blue-300 text-xs font-medium">{weeklyTransfer.toLocaleString()} ฿</span>
              </div>
            </div>
            <p className="text-white/40 text-xs mt-2">
              {t("owner.weeklyCustomers")}: {weeklyCustomers}
            </p>
          </div>
        </div>

        {/* Monthly */}
        <div className="relative overflow-hidden rounded-xl border border-purple-500/30 bg-gradient-to-br from-purple-900/40 via-purple-800/20 to-primary-dark p-5">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">📆</span>
              <h3 className="text-purple-300 font-heading text-sm">{t("owner.monthlyRevenue")}</h3>
            </div>
            <p className="text-white text-4xl font-bold mb-2">
              {monthlyRevenue.toLocaleString()} <span className="text-xl text-purple-300">฿</span>
            </p>
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
              <div className="flex items-center gap-1.5">
                <span className="text-xs">💵</span>
                <span className="text-green-400 text-xs font-medium">{monthlyCash.toLocaleString()} ฿</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs">📱</span>
                <span className="text-blue-300 text-xs font-medium">{monthlyTransfer.toLocaleString()} ฿</span>
              </div>
            </div>
            <p className="text-white/40 text-xs mt-2">
              {t("owner.monthlyCustomers")}: {monthlyCustomers}
            </p>
          </div>
        </div>
      </div>

      {/* Booking Status Summary */}
      <Card>
        <h2 className="font-heading text-lg text-white mb-4">{t("staff.bookings")}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.entries(statusCounts).map(([status, count]) => (
            <div key={status} className="text-center p-3 bg-surface-dark rounded-lg">
              <p className="text-white text-2xl font-bold">{count}</p>
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
      </Card>
    </div>
  );
}
