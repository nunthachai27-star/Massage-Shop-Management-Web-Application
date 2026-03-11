"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { api } from "@/lib/api";

export default function OwnerDashboardPage() {
  const t = useTranslations();
  const locale = useLocale();

  const [totalCustomers, setTotalCustomers] = useState(0);
  const [dailyRevenue, setDailyRevenue] = useState(0);
  const [dailyCash, setDailyCash] = useState(0);
  const [dailyTransfer, setDailyTransfer] = useState(0);
  const [weeklyRevenue, setWeeklyRevenue] = useState(0);
  const [weeklyCash, setWeeklyCash] = useState(0);
  const [weeklyTransfer, setWeeklyTransfer] = useState(0);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  const [monthlyCash, setMonthlyCash] = useState(0);
  const [monthlyTransfer, setMonthlyTransfer] = useState(0);

  useEffect(() => {
    const fetchData = () => {
      Promise.all([
        api.getDailyMetrics(),
        api.getWeeklyRevenue(),
        api.getMonthlyRevenue(),
      ]).then(([metrics, weekly, monthly]) => {
        setTotalCustomers((metrics.totalCustomers as number) || 0);
        setDailyRevenue((metrics.dailyRevenue as number) || 0);
        setDailyCash((metrics.dailyCash as number) || 0);
        setDailyTransfer((metrics.dailyTransfer as number) || 0);
        setWeeklyRevenue((weekly.weeklyRevenue as number) || 0);
        setWeeklyCash((weekly.weeklyCash as number) || 0);
        setWeeklyTransfer((weekly.weeklyTransfer as number) || 0);
        setMonthlyRevenue((monthly.monthlyRevenue as number) || 0);
        setMonthlyCash((monthly.monthlyCash as number) || 0);
        setMonthlyTransfer((monthly.monthlyTransfer as number) || 0);
      }).catch(() => {});
    };

    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

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
