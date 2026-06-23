"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Card } from "@/components/ui/Card";
import { api } from "@/lib/api";
import { mondayOf, addWeeks, toISODate, formatWeekRange } from "@/lib/week";

interface Therapist {
  id: number;
  name_th: string;
  name_en: string;
}
interface DutyView {
  id: number;
  name: string;
  required_count: number;
  therapists: Therapist[];
}
interface Schedule {
  week_start: string;
  duties: DutyView[];
  backup: Therapist[];
}
interface Duty {
  id: number;
  name: string;
  required_count: number;
  sort_order: number;
}

export default function CleaningPage() {
  const t = useTranslations("cleaning");
  const locale = useLocale();

  // Four consecutive weeks starting this week (Monday-anchored).
  const [weeks] = useState<Date[]>(() => {
    const base = mondayOf(new Date());
    return [0, 1, 2, 3].map((i) => addWeeks(base, i));
  });
  const [activeWeek, setActiveWeek] = useState(0);

  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [duties, setDuties] = useState<Duty[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [sendState, setSendState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [showDuties, setShowDuties] = useState(false);

  // Duty form state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formName, setFormName] = useState("");
  const [formCount, setFormCount] = useState(1);

  const weekIso = toISODate(weeks[activeWeek]);

  const loadSchedule = useCallback(async () => {
    setLoading(true);
    try {
      const data = (await api.getCleaningSchedule(weekIso)) as unknown as Schedule;
      setSchedule(data);
    } catch {
      setSchedule(null);
    }
    setLoading(false);
  }, [weekIso]);

  const loadDuties = useCallback(async () => {
    try {
      const data = await api.getCleaningDuties();
      setDuties(data as unknown as Duty[]);
    } catch {
      setDuties([]);
    }
  }, []);

  useEffect(() => {
    loadSchedule();
  }, [loadSchedule]);
  useEffect(() => {
    loadDuties();
  }, [loadDuties]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await api.generateCleaningSchedule(toISODate(weeks[0]));
      await loadSchedule();
    } catch {
      // ignore
    }
    setGenerating(false);
  };

  const handleSend = async () => {
    setSendState("sending");
    try {
      await api.notifyCleaningSchedule(weekIso);
      setSendState("sent");
      setTimeout(() => setSendState("idle"), 2500);
    } catch {
      setSendState("error");
      setTimeout(() => setSendState("idle"), 2500);
    }
  };

  const resetDutyForm = () => {
    setEditingId(null);
    setFormName("");
    setFormCount(1);
  };

  const submitDuty = async () => {
    if (!formName.trim() || formCount < 1) return;
    try {
      if (editingId) {
        await api.updateCleaningDuty(editingId, { name: formName.trim(), required_count: formCount });
      } else {
        await api.createCleaningDuty({
          name: formName.trim(),
          required_count: formCount,
          sort_order: duties.length + 1,
        });
      }
      resetDutyForm();
      await loadDuties();
    } catch {
      // ignore
    }
  };

  const editDuty = (d: Duty) => {
    setEditingId(d.id);
    setFormName(d.name);
    setFormCount(d.required_count);
    setShowDuties(true);
  };

  const deleteDuty = async (id: number) => {
    try {
      await api.deleteCleaningDuty(id);
      await loadDuties();
    } catch {
      // ignore
    }
  };

  const therapistName = (th: Therapist) => (locale === "th" ? th.name_th : th.name_en);

  return (
    <div className="pb-24 md:pb-6">
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <h1 className="font-heading text-xl md:text-2xl text-white">{t("title")}</h1>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="px-4 py-2 rounded-lg bg-accent-gold text-primary-dark text-sm font-medium hover:bg-accent-gold-dark transition-all cursor-pointer disabled:opacity-50"
        >
          {generating ? t("generating") : t("generate")}
        </button>
      </div>

      {/* Week tabs */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {weeks.map((w, i) => (
          <button
            key={i}
            onClick={() => setActiveWeek(i)}
            className={`px-2 py-2 rounded-lg text-xs transition-all cursor-pointer ${
              activeWeek === i
                ? "bg-accent-gold/15 text-accent-gold border border-accent-gold/30"
                : "bg-white/5 text-white/50 hover:bg-white/10"
            }`}
          >
            <div className="font-medium">
              {t("week")} {i + 1}
            </div>
            <div className="text-[10px] opacity-70">{formatWeekRange(w, locale)}</div>
          </button>
        ))}
      </div>

      {/* Send to LINE */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={handleSend}
          disabled={sendState === "sending"}
          className="px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-400 text-sm font-medium hover:bg-emerald-500/30 transition-all cursor-pointer disabled:opacity-50"
        >
          📤 {sendState === "sending" ? t("sending") : t("sendLine")}
        </button>
        {sendState === "sent" && <span className="text-emerald-400 text-sm">✓ {t("sent")}</span>}
        {sendState === "error" && <span className="text-red-400 text-sm">✗ {t("sendFailed")}</span>}
      </div>

      {/* Schedule */}
      {loading ? (
        <p className="text-white/50 text-center py-8">{locale === "th" ? "กำลังโหลด..." : "Loading..."}</p>
      ) : !schedule || schedule.duties.every((d) => d.therapists.length === 0) ? (
        <Card className="text-center !py-8">
          <p className="text-white/50 text-sm">{t("noSchedule")}</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {schedule.duties.map((d) => (
            <Card key={d.id}>
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-accent-gold/15 flex items-center justify-center text-base shrink-0">
                  🧹
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-semibold text-sm">{d.name}</h3>
                  <p className="text-white/40 text-xs mt-0.5">
                    {d.required_count} {t("people")}
                  </p>
                  <p className="text-accent-gold text-sm mt-1">
                    {d.therapists.length
                      ? d.therapists.map(therapistName).join(", ")
                      : t("empty")}
                  </p>
                </div>
              </div>
            </Card>
          ))}

          {/* Backup */}
          <Card>
            <h3 className="text-white font-semibold text-sm">{t("backup")}</h3>
            <p className="text-white/60 text-sm mt-1">
              {schedule.backup.length ? schedule.backup.map(therapistName).join(", ") : t("empty")}
            </p>
          </Card>
        </div>
      )}

      {/* Manage duties */}
      <div className="mt-6">
        <button
          onClick={() => setShowDuties((s) => !s)}
          className="text-white/60 text-sm hover:text-white transition-colors cursor-pointer"
        >
          ⚙️ {t("manageDuties")} {showDuties ? "▲" : "▼"}
        </button>

        {showDuties && (
          <Card className="mt-3">
            <p className="text-white/40 text-xs mb-3">{t("staffHint")}</p>

            {/* Duty form */}
            <div className="flex flex-col sm:flex-row gap-2 mb-4">
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder={t("dutyName")}
                className="flex-1 bg-surface-dark border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
              />
              <input
                type="number"
                value={formCount}
                min={1}
                onChange={(e) => setFormCount(Number(e.target.value))}
                placeholder={t("requiredCount")}
                className="w-full sm:w-28 bg-surface-dark border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
              />
              <button
                onClick={submitDuty}
                className="px-4 py-2 rounded-lg bg-accent-gold text-primary-dark font-medium text-sm hover:bg-accent-gold-dark transition-all cursor-pointer"
              >
                {editingId ? t("save") : t("addDuty")}
              </button>
              {editingId && (
                <button
                  onClick={resetDutyForm}
                  className="px-4 py-2 rounded-lg bg-white/10 text-white/60 text-sm hover:bg-white/20 transition-all cursor-pointer"
                >
                  {t("cancel")}
                </button>
              )}
            </div>

            {/* Duty list */}
            <div className="space-y-2">
              {duties.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2"
                >
                  <div className="flex-1 min-w-0">
                    <span className="text-white text-sm">{d.name}</span>
                    <span className="text-white/40 text-xs ml-2">
                      {d.required_count} {t("people")}
                    </span>
                  </div>
                  <button
                    onClick={() => editDuty(d)}
                    className="px-3 py-1 rounded-lg text-xs bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 cursor-pointer"
                  >
                    {t("editDuty")}
                  </button>
                  <button
                    onClick={() => deleteDuty(d.id)}
                    className="px-3 py-1 rounded-lg text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 cursor-pointer"
                  >
                    {t("deleteDuty")}
                  </button>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
