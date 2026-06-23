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

export default function StaffCleaningPage() {
  const t = useTranslations("cleaning");
  const locale = useLocale();

  const [weeks] = useState<Date[]>(() => {
    const base = mondayOf(new Date());
    return [0, 1, 2, 3].map((i) => addWeeks(base, i));
  });
  const [activeWeek, setActiveWeek] = useState(0);
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [myId, setMyId] = useState<number | null>(null);

  const weekIso = toISODate(weeks[activeWeek]);

  useEffect(() => {
    const stored = localStorage.getItem("loggedInTherapist");
    if (stored) {
      try {
        setMyId(JSON.parse(stored).id ?? null);
      } catch {
        setMyId(null);
      }
    }
  }, []);

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

  useEffect(() => {
    loadSchedule();
  }, [loadSchedule]);

  const therapistName = (th: Therapist) => (locale === "th" ? th.name_th : th.name_en);
  const isMe = (th: Therapist) => myId != null && th.id === myId;

  // What is the logged-in therapist's role this week?
  const myDuties = schedule
    ? schedule.duties.filter((d) => d.therapists.some(isMe)).map((d) => d.name)
    : [];
  const iAmBackup = schedule ? schedule.backup.some(isMe) : false;

  const renderNames = (list: Therapist[]) => {
    if (!list.length) return <span className="text-white/40">{t("empty")}</span>;
    return list.map((th, i) => (
      <span key={th.id}>
        {i > 0 && ", "}
        {isMe(th) ? (
          <span className="font-semibold text-accent-gold bg-accent-gold/15 rounded px-1.5 py-0.5">
            {therapistName(th)} ({t("you")})
          </span>
        ) : (
          <span className="text-white/80">{therapistName(th)}</span>
        )}
      </span>
    ));
  };

  return (
    <div className="pb-24 md:pb-6">
      <h1 className="font-heading text-xl md:text-2xl text-white mb-4 md:mb-6">{t("myTitle")}</h1>

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

      {loading ? (
        <p className="text-white/50 text-center py-8">{locale === "th" ? "กำลังโหลด..." : "Loading..."}</p>
      ) : !schedule || schedule.duties.every((d) => d.therapists.length === 0) ? (
        <Card className="text-center !py-8">
          <p className="text-white/50 text-sm">{t("noScheduleStaff")}</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {/* My duty summary */}
          <Card className="!py-3 border border-accent-gold/30 bg-accent-gold/5">
            {myDuties.length ? (
              <p className="text-sm text-white">
                <span className="text-white/50">{t("myDutyThisWeek")}: </span>
                <span className="font-semibold text-accent-gold">{myDuties.join(", ")}</span>
              </p>
            ) : iAmBackup ? (
              <p className="text-sm text-accent-gold font-medium">⭐ {t("youAreBackup")}</p>
            ) : (
              <p className="text-sm text-white/60">{t("notAssignedThisWeek")}</p>
            )}
          </Card>

          {/* Full schedule */}
          {schedule.duties.map((d) => (
            <Card key={d.id} className={d.therapists.some(isMe) ? "border border-accent-gold/30" : ""}>
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-accent-gold/15 flex items-center justify-center text-base shrink-0">
                  🧹
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-semibold text-sm">{d.name}</h3>
                  <p className="text-white/40 text-xs mt-0.5">
                    {d.required_count} {t("people")}
                  </p>
                  <p className="text-sm mt-1">{renderNames(d.therapists)}</p>
                </div>
              </div>
            </Card>
          ))}

          {/* Backup */}
          <Card className={iAmBackup ? "border border-accent-gold/30" : ""}>
            <h3 className="text-white font-semibold text-sm">{t("backup")}</h3>
            <p className="text-sm mt-1">{renderNames(schedule.backup)}</p>
          </Card>
        </div>
      )}
    </div>
  );
}
