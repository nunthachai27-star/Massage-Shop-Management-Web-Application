import { getTranslations } from "next-intl/server";
import { api } from "@/lib/api";

export default async function OwnerDashboardPage() {
  const t = await getTranslations();

  let totalCustomers = 0;
  let dailyRevenue = 0;
  let dailyCash = 0;
  let dailyTransfer = 0;
  let weeklyRevenue = 0;
  let weeklyCash = 0;
  let weeklyTransfer = 0;
  let monthlyRevenue = 0;
  let monthlyCash = 0;
  let monthlyTransfer = 0;
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
    monthlyRevenue = (monthly.monthlyRevenue as number) || 0;
    monthlyCash = (monthly.monthlyCash as number) || 0;
    monthlyTransfer = (monthly.monthlyTransfer as number) || 0;
  } catch {
    // API unavailable — show zeros
  }

  return (
    <div>
      <h1 className="font-heading text-xl md:text-3xl text-white mb-4 md:mb-6">{t("owner.dashboard")}</h1>

      <div className="grid grid-cols-1 gap-3 md:gap-4">
        {/* Customers Today */}
        <div className="bg-surface-card rounded-xl p-4 md:p-6 border border-white/10">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl md:text-3xl">👥</span>
            <p className="text-white/50 text-sm md:text-base">{t("owner.totalCustomers")}</p>
          </div>
          <p className="text-accent-gold text-3xl md:text-5xl font-bold">{totalCustomers}</p>
        </div>

        {/* Daily Revenue */}
        <div className="bg-surface-card rounded-xl p-4 md:p-6 border border-white/10">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl md:text-3xl">💰</span>
            <p className="text-white/50 text-sm md:text-base">{t("owner.dailyRevenue")}</p>
          </div>
          <p className="text-accent-gold text-3xl md:text-5xl font-bold">{dailyRevenue.toLocaleString()} <span className="text-sm md:text-lg">฿</span></p>
          <div className="flex gap-3 mt-2 pt-2 border-t border-white/10">
            <span className="text-green-400 text-xs md:text-sm">💵 {dailyCash.toLocaleString()}</span>
            <span className="text-blue-400 text-xs md:text-sm">📱 {dailyTransfer.toLocaleString()}</span>
          </div>
        </div>

        {/* Weekly Revenue */}
        <div className="relative overflow-hidden rounded-xl border border-blue-500/30 bg-gradient-to-br from-blue-900/40 via-blue-800/20 to-primary-dark p-4 md:p-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl md:text-3xl">📅</span>
            <p className="text-blue-300 text-sm md:text-base">{t("owner.weeklyRevenue")}</p>
          </div>
          <p className="text-white text-3xl md:text-5xl font-bold">{weeklyRevenue.toLocaleString()} <span className="text-sm md:text-lg text-blue-300">฿</span></p>
          <div className="flex gap-3 mt-2 pt-2 border-t border-white/10">
            <span className="text-green-400 text-xs md:text-sm">💵 {weeklyCash.toLocaleString()}</span>
            <span className="text-blue-300 text-xs md:text-sm">📱 {weeklyTransfer.toLocaleString()}</span>
          </div>
        </div>

        {/* Monthly Revenue */}
        <div className="relative overflow-hidden rounded-xl border border-purple-500/30 bg-gradient-to-br from-purple-900/40 via-purple-800/20 to-primary-dark p-4 md:p-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl md:text-3xl">📆</span>
            <p className="text-purple-300 text-sm md:text-base">{t("owner.monthlyRevenue")}</p>
          </div>
          <p className="text-white text-3xl md:text-5xl font-bold">{monthlyRevenue.toLocaleString()} <span className="text-sm md:text-lg text-purple-300">฿</span></p>
          <div className="flex gap-3 mt-2 pt-2 border-t border-white/10">
            <span className="text-green-400 text-xs md:text-sm">💵 {monthlyCash.toLocaleString()}</span>
            <span className="text-blue-300 text-xs md:text-sm">📱 {monthlyTransfer.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
