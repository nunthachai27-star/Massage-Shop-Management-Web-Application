"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { therapists as mockTherapists } from "@/data/therapists";
import { api } from "@/lib/api";
import { transformTherapist } from "@/lib/transform";

interface AttendanceRecord {
  id?: number;
  therapistId: number;
  status: "checked_in" | "checked_out" | "not_checked_in";
  checkInTime?: string;
  checkOutTime?: string;
}

const initialAttendance: AttendanceRecord[] = [
  { therapistId: 1, status: "checked_in", checkInTime: "08:30" },
  { therapistId: 2, status: "checked_in", checkInTime: "08:45" },
  { therapistId: 3, status: "not_checked_in" },
  { therapistId: 4, status: "not_checked_in" },
];

export default function AttendancePage() {
  const t = useTranslations();
  const locale = useLocale();
  const [therapists, setTherapists] = useState(mockTherapists);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(initialAttendance);

  useEffect(() => {
    api.getTherapists().then((raw) => setTherapists(raw.map(transformTherapist))).catch(() => {});
    api.getTodayAttendance().then((records) => {
      if (Array.isArray(records) && records.length > 0) {
        setAttendance(records.map((r: any) => ({
          id: r.id,
          therapistId: r.therapist_id || r.therapistId,
          status: r.check_out_time ? "checked_out" : "checked_in",
          checkInTime: r.check_in_time ? new Date(r.check_in_time).toLocaleTimeString("th", { hour: "2-digit", minute: "2-digit" }) : undefined,
          checkOutTime: r.check_out_time ? new Date(r.check_out_time).toLocaleTimeString("th", { hour: "2-digit", minute: "2-digit" }) : undefined,
        })));
      }
    }).catch(() => {});
  }, []);

  const handleCheckIn = async (therapistId: number) => {
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
    try {
      const result = await api.checkIn(therapistId);
      setAttendance((prev) => {
        const exists = prev.find((r) => r.therapistId === therapistId);
        if (exists) {
          return prev.map((record) =>
            record.therapistId === therapistId
              ? { ...record, id: result.id, status: "checked_in" as const, checkInTime: timeStr }
              : record
          );
        }
        return [...prev, { id: result.id, therapistId, status: "checked_in" as const, checkInTime: timeStr }];
      });
    } catch {
      setAttendance((prev) =>
        prev.map((record) =>
          record.therapistId === therapistId
            ? { ...record, status: "checked_in" as const, checkInTime: timeStr }
            : record
        )
      );
    }
  };

  const handleCheckOut = async (therapistId: number) => {
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
    const record = attendance.find((a) => a.therapistId === therapistId);
    try {
      if (record?.id) {
        await api.checkOut(record.id);
      }
    } catch {
      // fallback to local state
    }
    setAttendance((prev) =>
      prev.map((r) =>
        r.therapistId === therapistId
          ? { ...r, status: "checked_out" as const, checkOutTime: timeStr }
          : r
      )
    );
  };

  return (
    <div>
      <h1 className="font-heading text-2xl text-white mb-6">{t("attendance.checkin")}</h1>

      <div className="space-y-3">
        {therapists.map((therapist) => {
          const record = attendance.find((a) => a.therapistId === therapist.id);
          const status = record?.status || "not_checked_in";

          const statusBadge =
            status === "checked_in" ? (
              <Badge variant="green">{t("attendance.checkin")}</Badge>
            ) : status === "checked_out" ? (
              <Badge variant="gray">{t("attendance.checkout")}</Badge>
            ) : (
              <Badge variant="red">{t("attendance.status")}</Badge>
            );

          return (
            <Card key={therapist.id}>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent-gold to-accent-gold-dark flex items-center justify-center text-primary-dark font-bold shrink-0">
                    {therapist.name.en.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-white font-medium truncate">
                      {locale === "th" ? therapist.name.th : therapist.name.en}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {statusBadge}
                      {record?.checkInTime && (
                        <span className="text-white/40 text-xs">
                          In: {record.checkInTime}
                        </span>
                      )}
                      {record?.checkOutTime && (
                        <span className="text-white/40 text-xs">
                          Out: {record.checkOutTime}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 shrink-0">
                  {status !== "checked_in" && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleCheckIn(therapist.id)}
                    >
                      {t("attendance.checkin")}
                    </Button>
                  )}
                  {status === "checked_in" && (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleCheckOut(therapist.id)}
                    >
                      {t("attendance.checkout")}
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Today's Log */}
      <Card className="mt-6">
        <h2 className="font-heading text-lg text-white mb-4">{t("attendance.status")}</h2>
        <div className="space-y-2">
          {attendance
            .filter((a) => a.checkInTime)
            .map((record) => {
              const therapist = therapists.find((t) => t.id === record.therapistId);
              if (!therapist) return null;
              return (
                <div
                  key={record.therapistId}
                  className="flex items-center justify-between py-2 border-b border-white/5 last:border-0"
                >
                  <span className="text-white/70 text-sm">
                    {locale === "th" ? therapist.name.th : therapist.name.en}
                  </span>
                  <div className="flex items-center gap-3 text-xs text-white/40">
                    {record.checkInTime && <span>In: {record.checkInTime}</span>}
                    {record.checkOutTime && <span>Out: {record.checkOutTime}</span>}
                  </div>
                </div>
              );
            })}
        </div>
      </Card>
    </div>
  );
}
