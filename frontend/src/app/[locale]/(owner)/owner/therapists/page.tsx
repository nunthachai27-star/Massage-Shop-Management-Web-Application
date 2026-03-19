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
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<"success" | "error" | null>(null);

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

  const handleSendLine = async () => {
    const worked = commissions.filter((c) => c.total_sessions > 0);
    if (worked.length === 0) return;

    const lines = [
      `\n📋 สรุปค่าคอมมิชชั่นวันที่ ${date}`,
      `━━━━━━━━━━━━━━━`,
    ];
    for (const c of worked) {
      const name = c.therapists?.name_th || "ไม่ทราบ";
      lines.push(
        `🧑‍⚕️ ${name}`,
        `   งาน: ${c.total_sessions} | ค่าคอม: ฿${c.total_commission.toLocaleString()}`,
      );
    }
    lines.push(
      `━━━━━━━━━━━━━━━`,
      `💰 รวมค่าคอม: ฿${totalCommission.toLocaleString()}`,
      `👥 รวมงาน: ${totalSessions} งาน`,
    );

    setSending(true);
    setSendResult(null);
    try {
      await api.sendLineMessage(lines.join("\n"));

      // Mark all pending commissions as paid
      const pendingOnes = worked.filter((c) => c.status === "pending" && c.total_commission > 0);
      const updates = await Promise.allSettled(
        pendingOnes.map((c) => api.markCommissionPaid(c.id))
      );
      setCommissions((prev) =>
        prev.map((c) => {
          const idx = pendingOnes.findIndex((p) => p.id === c.id);
          if (idx === -1) return c;
          const result = updates[idx];
          if (result.status === "fulfilled") {
            return toCommission(result.value);
          }
          return c;
        })
      );

      setSendResult("success");
    } catch {
      setSendResult("error");
    }
    setSending(false);
    setTimeout(() => setSendResult(null), 3000);
  };

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

      {/* Commission Hero */}
      <div className="relative mb-4 md:mb-6 rounded-2xl overflow-hidden border-2 border-emerald-400/40 bg-gradient-to-br from-emerald-900/40 via-emerald-800/20 to-surface-card p-5 md:p-6 text-center">
        <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/10 to-transparent pointer-events-none" />
        <div className="relative">
          <p className="text-emerald-300/70 text-sm font-medium tracking-wide uppercase mb-1">
            💰 {locale === "th" ? "ค่าคอมรวมทั้งหมด" : "Total Commission"}
          </p>
          <p className="text-5xl md:text-7xl font-extrabold text-emerald-400 font-mono leading-none drop-shadow-[0_0_20px_rgba(52,211,153,0.3)]">
            ฿{totalCommission.toLocaleString()}
          </p>
          <div className="mt-3 flex items-center justify-center gap-4">
            <span className="inline-flex items-center gap-1 bg-emerald-500/15 px-3 py-1 rounded-full text-emerald-300 text-sm font-medium">
              🧑‍⚕️ {commissions.length} {locale === "th" ? "คน" : "therapist(s)"}
            </span>
            <span className="inline-flex items-center gap-1 bg-green-500/15 px-3 py-1 rounded-full text-green-400 text-sm font-medium">
              ✅ {paidCount} {locale === "th" ? "จ่ายแล้ว" : "paid"}
            </span>
            <span className="inline-flex items-center gap-1 bg-orange-500/15 px-3 py-1 rounded-full text-orange-400 text-sm font-medium">
              ⏳ {pendingCount} {locale === "th" ? "รอจ่าย" : "pending"}
            </span>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-2 md:gap-3 mb-4 md:mb-6">
        <Card className="text-center !py-3">
          <p className="text-2xl font-bold text-accent-gold">{totalSessions}</p>
          <p className="text-white/40 text-xs mt-1">{locale === "th" ? "รวมงาน" : "Jobs"}</p>
        </Card>
        <Card className="text-center !py-3">
          <p className="text-2xl font-bold text-blue-400">฿{totalRevenue.toLocaleString()}</p>
          <p className="text-white/40 text-xs mt-1">{locale === "th" ? "รายได้" : "Revenue"}</p>
        </Card>
        <Card className="text-center !py-3">
          <div className="flex items-center justify-center gap-2">
            <span className="text-green-400 font-bold">{paidCount}</span>
            <span className="text-white/30">/</span>
            <span className="text-orange-400 font-bold">{pendingCount}</span>
          </div>
          <p className="text-white/40 text-xs mt-1">{locale === "th" ? "จ่าย/รอ" : "Paid/Pending"}</p>
        </Card>
      </div>

      {/* Send to Line */}
      {commissions.filter((c) => c.total_sessions > 0).length > 0 && (
        <div className="mb-4 md:mb-6">
          <button
            onClick={handleSendLine}
            disabled={sending}
            className="w-full py-3 rounded-xl font-semibold text-sm md:text-base transition-all cursor-pointer flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? (
              <>{locale === "th" ? "กำลังส่ง..." : "Sending..."}</>
            ) : sendResult === "success" ? (
              <>{locale === "th" ? "✅ ส่งสำเร็จ!" : "✅ Sent!"}</>
            ) : sendResult === "error" ? (
              <>{locale === "th" ? "❌ ส่งไม่สำเร็จ" : "❌ Failed"}</>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/></svg>
                {locale === "th" ? "ส่งสรุปผลงานไป Line" : "Send Summary to Line"}
              </>
            )}
          </button>
        </div>
      )}

      {/* Therapist List — only show therapists with work */}
      {loading ? (
        <p className="text-white/50 text-center py-8">{locale === "th" ? "กำลังโหลด..." : "Loading..."}</p>
      ) : commissions.filter((c) => c.total_sessions > 0).length === 0 ? (
        <Card className="text-center !py-8">
          <p className="text-white/50 text-lg">{locale === "th" ? "วันนี้ยังไม่มีผลงาน" : "No work recorded for this day"}</p>
          <p className="text-white/30 text-sm mt-2">{locale === "th" ? "ข้อมูลจะแสดงเมื่อหมอนวดมีรายการบริการ" : "Data will appear when therapists complete sessions"}</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {commissions.filter((c) => c.total_sessions > 0).map((c) => {
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
                      <div className={`rounded-lg p-1.5 md:p-2 text-center border ${c.total_commission > 0 ? "bg-emerald-500/10 border-emerald-500/30" : "bg-surface-dark border-transparent"}`}>
                        <p className={`text-lg md:text-xl font-extrabold ${isPaid ? "text-green-400" : "text-emerald-400"}`}>
                          ฿{c.total_commission.toLocaleString()}
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
