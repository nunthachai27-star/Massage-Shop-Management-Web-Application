"use client";

import { useState, useEffect } from "react";
import { useLocale } from "next-intl";
import { api } from "@/lib/api";

function getThaiDate(d: Date = new Date()): string {
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
}

function formatDate(dateStr: string, locale: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString(locale === "th" ? "th-TH" : "en-US", {
    day: "numeric",
    month: "short",
    timeZone: "Asia/Bangkok",
  });
}

type ReportData = {
  summary: {
    totalRevenue: number;
    totalCash: number;
    totalTransfer: number;
    totalCommission: number;
    totalCustomers: number;
    netProfit: number;
  };
  serviceBreakdown: { name_th: string; name_en: string; count: number; revenue: number; duration: number }[];
  therapistBreakdown: { name_th: string; name_en: string; sessions: number; revenue: number; commission: number }[];
  dailyBreakdown: { date: string; revenue: number; customers: number; cash: number; transfer: number }[];
};

export default function OwnerReportsPage() {
  const locale = useLocale();
  const today = getThaiDate();

  // Date range mode: "day" | "week" | "month" | "custom"
  const [mode, setMode] = useState<"day" | "week" | "month" | "custom">("day");
  const [selectedDate, setSelectedDate] = useState(today);
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);

  // Calculate from/to based on mode
  useEffect(() => {
    if (mode === "day") {
      setFromDate(selectedDate);
      setToDate(selectedDate);
    } else if (mode === "week") {
      const d = new Date(selectedDate + "T00:00:00");
      const day = d.getDay();
      const monday = new Date(d);
      monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      setFromDate(getThaiDate(monday));
      setToDate(getThaiDate(sunday));
    } else if (mode === "month") {
      const monthStart = selectedDate.substring(0, 8) + "01";
      const d = new Date(selectedDate + "T00:00:00");
      const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      setFromDate(monthStart);
      setToDate(getThaiDate(lastDay));
    }
  }, [mode, selectedDate]);

  // Fetch report data
  useEffect(() => {
    if (!fromDate || !toDate) return;
    setLoading(true);
    api.getReport(fromDate, toDate)
      .then((data) => setReport(data as unknown as ReportData))
      .catch(() => setReport(null))
      .finally(() => setLoading(false));
  }, [fromDate, toDate]);

  const s = report?.summary;

  return (
    <div>
      <h1 className="font-heading text-xl md:text-3xl text-white mb-4 md:mb-6">
        {locale === "th" ? "รายงานสรุปยอด" : "Sales Report"}
      </h1>

      {/* Mode Selector */}
      <div className="flex gap-2 mb-4">
        {(["day", "week", "month", "custom"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              mode === m
                ? "bg-accent-gold text-primary-dark"
                : "bg-white/5 text-white/60 hover:bg-white/10"
            }`}
          >
            {m === "day" ? (locale === "th" ? "รายวัน" : "Daily")
              : m === "week" ? (locale === "th" ? "รายสัปดาห์" : "Weekly")
              : m === "month" ? (locale === "th" ? "รายเดือน" : "Monthly")
              : (locale === "th" ? "กำหนดเอง" : "Custom")}
          </button>
        ))}
      </div>

      {/* Date Picker */}
      <div className="mb-6 flex flex-wrap gap-3 items-center">
        {mode !== "custom" ? (
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-surface-card border border-white/20 rounded-lg px-4 py-2 text-white text-sm focus:border-accent-gold outline-none"
          />
        ) : (
          <>
            <div className="flex items-center gap-2">
              <span className="text-white/50 text-sm">{locale === "th" ? "จาก" : "From"}</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="bg-surface-card border border-white/20 rounded-lg px-4 py-2 text-white text-sm focus:border-accent-gold outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-white/50 text-sm">{locale === "th" ? "ถึง" : "To"}</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="bg-surface-card border border-white/20 rounded-lg px-4 py-2 text-white text-sm focus:border-accent-gold outline-none"
              />
            </div>
          </>
        )}
        <span className="text-white/30 text-xs">
          {fromDate === toDate
            ? formatDate(fromDate, locale)
            : `${formatDate(fromDate, locale)} - ${formatDate(toDate, locale)}`}
        </span>
      </div>

      {loading && (
        <div className="text-center py-12 text-white/40">
          {locale === "th" ? "กำลังโหลด..." : "Loading..."}
        </div>
      )}

      {!loading && report && s && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
            {/* Revenue */}
            <div className="bg-gradient-to-br from-amber-900/40 to-surface-card rounded-xl p-4 border border-amber-400/20">
              <p className="text-amber-300/70 text-xs mb-1">{locale === "th" ? "รายได้รวม" : "Total Revenue"}</p>
              <p className="text-amber-400 text-2xl md:text-3xl font-bold font-mono">{s.totalRevenue.toLocaleString()}<span className="text-sm ml-1">฿</span></p>
            </div>
            {/* Net Profit */}
            <div className="bg-gradient-to-br from-emerald-900/40 to-surface-card rounded-xl p-4 border border-emerald-400/20">
              <p className="text-emerald-300/70 text-xs mb-1">{locale === "th" ? "กำไรสุทธิ" : "Net Profit"}</p>
              <p className="text-emerald-400 text-2xl md:text-3xl font-bold font-mono">{s.netProfit.toLocaleString()}<span className="text-sm ml-1">฿</span></p>
            </div>
            {/* Commission */}
            <div className="bg-gradient-to-br from-red-900/40 to-surface-card rounded-xl p-4 border border-red-400/20">
              <p className="text-red-300/70 text-xs mb-1">{locale === "th" ? "ค่าคอมรวม" : "Total Commission"}</p>
              <p className="text-red-400 text-2xl md:text-3xl font-bold font-mono">{s.totalCommission.toLocaleString()}<span className="text-sm ml-1">฿</span></p>
            </div>
            {/* Cash */}
            <div className="bg-surface-card rounded-xl p-4 border border-white/10">
              <p className="text-green-300/70 text-xs mb-1">{locale === "th" ? "เงินสด" : "Cash"}</p>
              <p className="text-green-400 text-xl md:text-2xl font-bold font-mono">{s.totalCash.toLocaleString()}<span className="text-sm ml-1">฿</span></p>
            </div>
            {/* Transfer */}
            <div className="bg-surface-card rounded-xl p-4 border border-white/10">
              <p className="text-blue-300/70 text-xs mb-1">{locale === "th" ? "เงินโอน" : "Transfer"}</p>
              <p className="text-blue-400 text-xl md:text-2xl font-bold font-mono">{s.totalTransfer.toLocaleString()}<span className="text-sm ml-1">฿</span></p>
            </div>
            {/* Customers */}
            <div className="bg-surface-card rounded-xl p-4 border border-white/10">
              <p className="text-purple-300/70 text-xs mb-1">{locale === "th" ? "ลูกค้าทั้งหมด" : "Customers"}</p>
              <p className="text-purple-400 text-xl md:text-2xl font-bold font-mono">{s.totalCustomers}<span className="text-sm ml-1 text-white/30">{locale === "th" ? "คน" : ""}</span></p>
            </div>
          </div>

          {/* Service Breakdown */}
          {report.serviceBreakdown.length > 0 && (
            <div className="bg-surface-card rounded-xl border border-white/10 mb-6 overflow-hidden">
              <div className="px-4 py-3 border-b border-white/10">
                <h2 className="text-white font-heading text-base">
                  {locale === "th" ? "สรุปตามบริการ" : "Service Breakdown"}
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-white/40 text-xs border-b border-white/5">
                      <th className="text-left px-4 py-2">{locale === "th" ? "บริการ" : "Service"}</th>
                      <th className="text-right px-4 py-2">{locale === "th" ? "จำนวน" : "Count"}</th>
                      <th className="text-right px-4 py-2">{locale === "th" ? "รายได้" : "Revenue"}</th>
                      <th className="text-right px-4 py-2 hidden md:table-cell">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.serviceBreakdown.map((svc, i) => (
                      <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                        <td className="px-4 py-3 text-white">{locale === "th" ? svc.name_th : svc.name_en}</td>
                        <td className="px-4 py-3 text-right text-white/70">{svc.count} {locale === "th" ? "รอบ" : ""}</td>
                        <td className="px-4 py-3 text-right text-amber-400 font-mono">{svc.revenue.toLocaleString()} ฿</td>
                        <td className="px-4 py-3 text-right text-white/40 hidden md:table-cell">
                          {s.totalRevenue > 0 ? Math.round((svc.revenue / s.totalRevenue) * 100) : 0}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Therapist Breakdown */}
          {report.therapistBreakdown.length > 0 && (
            <div className="bg-surface-card rounded-xl border border-white/10 mb-6 overflow-hidden">
              <div className="px-4 py-3 border-b border-white/10">
                <h2 className="text-white font-heading text-base">
                  {locale === "th" ? "สรุปตามพนักงาน" : "Therapist Breakdown"}
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-white/40 text-xs border-b border-white/5">
                      <th className="text-left px-4 py-2">{locale === "th" ? "พนักงาน" : "Therapist"}</th>
                      <th className="text-right px-4 py-2">{locale === "th" ? "รอบ" : "Sessions"}</th>
                      <th className="text-right px-4 py-2">{locale === "th" ? "รายได้" : "Revenue"}</th>
                      <th className="text-right px-4 py-2">{locale === "th" ? "ค่าคอม" : "Commission"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.therapistBreakdown.map((th, i) => (
                      <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                        <td className="px-4 py-3 text-white">{locale === "th" ? th.name_th : th.name_en}</td>
                        <td className="px-4 py-3 text-right text-white/70">{th.sessions}</td>
                        <td className="px-4 py-3 text-right text-amber-400 font-mono">{th.revenue.toLocaleString()} ฿</td>
                        <td className="px-4 py-3 text-right text-emerald-400 font-mono">{th.commission.toLocaleString()} ฿</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Daily Breakdown (only for multi-day ranges) */}
          {report.dailyBreakdown.length > 1 && (
            <div className="bg-surface-card rounded-xl border border-white/10 mb-6 overflow-hidden">
              <div className="px-4 py-3 border-b border-white/10">
                <h2 className="text-white font-heading text-base">
                  {locale === "th" ? "สรุปรายวัน" : "Daily Breakdown"}
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-white/40 text-xs border-b border-white/5">
                      <th className="text-left px-4 py-2">{locale === "th" ? "วันที่" : "Date"}</th>
                      <th className="text-right px-4 py-2">{locale === "th" ? "ลูกค้า" : "Customers"}</th>
                      <th className="text-right px-4 py-2">{locale === "th" ? "รายได้" : "Revenue"}</th>
                      <th className="text-right px-4 py-2 hidden md:table-cell">{locale === "th" ? "เงินสด" : "Cash"}</th>
                      <th className="text-right px-4 py-2 hidden md:table-cell">{locale === "th" ? "โอน" : "Transfer"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.dailyBreakdown.map((day, i) => (
                      <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                        <td className="px-4 py-3 text-white">{formatDate(day.date, locale)}</td>
                        <td className="px-4 py-3 text-right text-white/70">{day.customers}</td>
                        <td className="px-4 py-3 text-right text-amber-400 font-mono">{day.revenue.toLocaleString()} ฿</td>
                        <td className="px-4 py-3 text-right text-green-400 font-mono hidden md:table-cell">{day.cash.toLocaleString()} ฿</td>
                        <td className="px-4 py-3 text-right text-blue-400 font-mono hidden md:table-cell">{day.transfer.toLocaleString()} ฿</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Empty state */}
          {s.totalCustomers === 0 && (
            <div className="bg-surface-card rounded-xl border border-white/10 p-8 text-center">
              <p className="text-white/40 text-lg">{locale === "th" ? "ไม่มีข้อมูล" : "No data"}</p>
              <p className="text-white/20 text-sm mt-2">
                {locale === "th" ? "ไม่มีรายการในช่วงเวลาที่เลือก" : "No bookings in selected period"}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
