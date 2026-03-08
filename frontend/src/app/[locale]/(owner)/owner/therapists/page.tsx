"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { api } from "@/lib/api";

type ApiRecord = Record<string, unknown>;

interface Commission {
  id: number;
  therapist_id: number;
  date: string;
  total_sessions: number;
  total_revenue: number;
  total_commission: number;
  status: string;
  paid_at: string | null;
  therapists: {
    id: number;
    name_th: string;
    name_en: string;
    rating?: number;
    status?: string;
  };
}

function toCommission(r: ApiRecord): Commission {
  return {
    id: r.id as number,
    therapist_id: r.therapist_id as number,
    date: r.date as string,
    total_sessions: Number(r.total_sessions),
    total_revenue: Number(r.total_revenue),
    total_commission: Number(r.total_commission),
    status: r.status as string,
    paid_at: r.paid_at as string | null,
    therapists: r.therapists as Commission["therapists"],
  };
}

export default function TherapistPerformancePage() {
  const t = useTranslations("owner");
  const locale = useLocale();
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getCommissions(date);
      setCommissions(data.map(toCommission));
    } catch {
      setCommissions([]);
    }
    setLoading(false);
  }, [date]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleToggle = async (commission: Commission) => {
    try {
      if (commission.status === "pending") {
        const updated = await api.markCommissionPaid(commission.id);
        setCommissions((prev) =>
          prev.map((c) => (c.id === commission.id ? toCommission(updated) : c))
        );
      } else {
        const updated = await api.markCommissionUnpaid(commission.id);
        setCommissions((prev) =>
          prev.map((c) => (c.id === commission.id ? toCommission(updated) : c))
        );
      }
    } catch {
      // ignore
    }
  };

  // Totals
  const totalSessions = commissions.reduce((s, c) => s + c.total_sessions, 0);
  const totalRevenue = commissions.reduce((s, c) => s + c.total_revenue, 0);
  const totalCommission = commissions.reduce((s, c) => s + c.total_commission, 0);
  const paidCount = commissions.filter((c) => c.status === "paid").length;
  const pendingCount = commissions.filter((c) => c.status === "pending" && c.total_commission > 0).length;

  const changeDate = (offset: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + offset);
    setDate(d.toISOString().split("T")[0]);
  };

  return (
    <div>
      <h1 className="font-heading text-xl md:text-2xl text-white mb-4 md:mb-6">
        {t("therapistPerformance")}
      </h1>

      {/* Date Picker */}
      <div className="flex items-center justify-center gap-3 mb-4">
        <button
          onClick={() => changeDate(-1)}
          className="w-10 h-10 rounded-lg bg-surface-card border border-white/10 text-white flex items-center justify-center hover:bg-primary-light transition-all cursor-pointer"
        >
          &lt;
        </button>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="bg-surface-card border border-white/10 text-white rounded-lg px-4 py-2 text-center"
        />
        <button
          onClick={() => changeDate(1)}
          className="w-10 h-10 rounded-lg bg-surface-card border border-white/10 text-white flex items-center justify-center hover:bg-primary-light transition-all cursor-pointer"
        >
          &gt;
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 md:gap-3 mb-4 md:mb-6">
        <Card className="text-center !py-3">
          <p className="text-2xl font-bold text-accent-gold">{totalSessions}</p>
          <p className="text-white/40 text-xs mt-1">{locale === "th" ? "รวมงาน" : "Jobs"}</p>
        </Card>
        <Card className="text-center !py-3">
          <p className="text-2xl font-bold text-blue-400">{totalRevenue.toLocaleString()}</p>
          <p className="text-white/40 text-xs mt-1">{locale === "th" ? "รายได้ (฿)" : "Revenue (฿)"}</p>
        </Card>
        <Card className="text-center !py-3">
          <p className="text-2xl font-bold text-emerald-400">{totalCommission.toLocaleString()}</p>
          <p className="text-white/40 text-xs mt-1">{locale === "th" ? "ค่าคอม (฿)" : "Comm. (฿)"}</p>
        </Card>
        <Card className="text-center !py-3">
          <div className="flex items-center justify-center gap-2">
            <span className="text-green-400 font-bold">{paidCount}</span>
            <span className="text-white/30">/</span>
            <span className="text-orange-400 font-bold">{pendingCount}</span>
          </div>
          <p className="text-white/40 text-xs mt-1">{locale === "th" ? "จ่ายแล้ว/รอจ่าย" : "Paid/Pending"}</p>
        </Card>
      </div>

      {/* Therapist List */}
      {loading ? (
        <p className="text-white/50 text-center py-8">{locale === "th" ? "กำลังโหลด..." : "Loading..."}</p>
      ) : commissions.length === 0 ? (
        <Card className="text-center !py-8">
          <p className="text-white/50">{t("noData")}</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {commissions.map((c) => {
            const name = locale === "th" ? c.therapists?.name_th : c.therapists?.name_en;
            const initial = (name || "?").charAt(0);
            const isPaid = c.status === "paid";
            const hasCommission = c.total_commission > 0;
            const therapistStatus = c.therapists?.status || "offline";
            const statusVariant =
              therapistStatus === "available" ? "green"
                : therapistStatus === "busy" ? "gold"
                  : therapistStatus === "break" ? "blue"
                    : "gray";

            return (
              <Card key={c.id}>
                <div className="flex items-start gap-3 md:gap-4">
                  {/* Avatar */}
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-accent-gold to-accent-gold-dark flex items-center justify-center text-primary-dark font-bold text-base md:text-lg shrink-0">
                    {initial}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-white font-semibold text-sm md:text-base truncate">{name}</h3>
                      <Badge variant={statusVariant}>{therapistStatus}</Badge>
                    </div>

                    {/* Rating */}
                    {c.therapists?.rating && (
                      <p className="text-accent-gold text-xs mb-2">⭐ {Number(c.therapists.rating).toFixed(1)}</p>
                    )}

                    {/* Performance Stats */}
                    <div className="grid grid-cols-3 gap-1.5 md:gap-2">
                      <div className="bg-surface-dark rounded-lg p-1.5 md:p-2 text-center">
                        <p className="text-accent-gold text-base md:text-lg font-bold">{c.total_sessions}</p>
                        <p className="text-white/50 text-[10px] md:text-xs">{locale === "th" ? "งาน" : "Jobs"}</p>
                      </div>
                      <div className="bg-surface-dark rounded-lg p-1.5 md:p-2 text-center">
                        <p className="text-blue-400 text-base md:text-lg font-bold">{c.total_revenue.toLocaleString()}</p>
                        <p className="text-white/50 text-[10px] md:text-xs">{locale === "th" ? "รายได้" : "Revenue"}</p>
                      </div>
                      <div className="bg-surface-dark rounded-lg p-1.5 md:p-2 text-center">
                        <p className={`text-base md:text-lg font-bold ${isPaid ? "text-green-400" : "text-emerald-400"}`}>
                          {c.total_commission.toLocaleString()}
                        </p>
                        <p className="text-white/50 text-[10px] md:text-xs">{locale === "th" ? "ค่าคอม" : "Comm."}</p>
                      </div>
                    </div>
                  </div>

                  {/* Commission Status + Action */}
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <Badge variant={isPaid ? "green" : hasCommission ? "gold" : "gray"}>
                      {isPaid ? t("paid") : t("pending")}
                    </Badge>
                    {hasCommission && (
                      <button
                        onClick={() => handleToggle(c)}
                        className={`mt-1 px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                          isPaid
                            ? "bg-white/10 text-white/50 hover:bg-red-500/20 hover:text-red-400"
                            : "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                        }`}
                      >
                        {isPaid ? t("markUnpaid") : t("markPaid")}
                      </button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
