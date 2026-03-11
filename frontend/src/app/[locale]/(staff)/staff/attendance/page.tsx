"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { type Therapist } from "@/data/therapists";
import { api } from "@/lib/api";
import { transformTherapist } from "@/lib/transform";

interface AttendanceRecord {
  id?: number;
  status: "not_checked_in" | "checked_in" | "checked_out";
  checkInTime?: string;
  checkOutTime?: string;
}

function calcWorkHours(checkIn?: string, checkOut?: string): string {
  if (!checkIn) return "0:00";
  const now = new Date();
  const [inH, inM] = checkIn.split(":").map(Number);
  let endH: number, endM: number;
  if (checkOut) {
    [endH, endM] = checkOut.split(":").map(Number);
  } else {
    endH = now.getHours();
    endM = now.getMinutes();
  }
  let diffMin = (endH * 60 + endM) - (inH * 60 + inM);
  if (diffMin < 0) diffMin = 0;
  const hours = Math.floor(diffMin / 60);
  const mins = diffMin % 60;
  return `${hours}:${mins.toString().padStart(2, "0")}`;
}

export default function AttendancePage() {
  const t = useTranslations();
  const locale = useLocale();
  const [therapist, setTherapist] = useState<Therapist | null>(null);
  const [allTherapists, setAllTherapists] = useState<Therapist[]>([]);
  const [mounted, setMounted] = useState(false);
  const [record, setRecord] = useState<AttendanceRecord>({ status: "not_checked_in" });
  const [currentTime, setCurrentTime] = useState(new Date());
  const [allRecords, setAllRecords] = useState<Record<number, AttendanceRecord>>({});
  const [showPinModal, setShowPinModal] = useState(false);
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [pinSuccess, setPinSuccess] = useState(false);

  const handleChangePin = async () => {
    setPinError("");
    if (!currentPin || currentPin.length !== 4) {
      setPinError(locale === "th" ? "กรุณาใส่ PIN ปัจจุบัน 4 หลัก" : "Enter current 4-digit PIN");
      return;
    }
    if (!newPin || newPin.length !== 4) {
      setPinError(locale === "th" ? "PIN ใหม่ต้อง 4 หลัก" : "New PIN must be 4 digits");
      return;
    }
    if (newPin !== confirmPin) {
      setPinError(locale === "th" ? "PIN ใหม่ไม่ตรงกัน" : "New PINs don't match");
      return;
    }
    if (currentPin === newPin) {
      setPinError(locale === "th" ? "PIN ใหม่ต้องไม่เหมือนเดิม" : "New PIN must be different");
      return;
    }
    try {
      await api.changePin(therapist!.id, currentPin, newPin);
      setPinSuccess(true);
      setTimeout(() => {
        setShowPinModal(false);
        setPinSuccess(false);
        setCurrentPin("");
        setNewPin("");
        setConfirmPin("");
      }, 1500);
    } catch {
      setPinError(locale === "th" ? "PIN ปัจจุบันไม่ถูกต้อง หรือ PIN ใหม่ซ้ำกับคนอื่น" : "Current PIN incorrect or new PIN already in use");
    }
  };

  const closePinModal = () => {
    setShowPinModal(false);
    setCurrentPin("");
    setNewPin("");
    setConfirmPin("");
    setPinError("");
    setPinSuccess(false);
  };

  useEffect(() => {
    const stored = localStorage.getItem("loggedInTherapist");
    if (stored) setTherapist(JSON.parse(stored));
    setMounted(true);
    api.getTherapists().then((data) => {
      setAllTherapists(data.map(transformTherapist));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!therapist) return;
    api.getTodayAttendance().then((records) => {
      if (Array.isArray(records)) {
        const mapped: Record<number, AttendanceRecord> = {};
        records.forEach((r: Record<string, unknown>) => {
          const tid = (r.therapist_id || r.therapistId) as number;
          mapped[tid] = {
            id: r.id as number,
            status: (r.check_out || r.check_out_time) ? "checked_out" : "checked_in",
            checkInTime: (r.check_in || r.check_in_time) ? new Date(String(r.check_in || r.check_in_time)).toLocaleTimeString("th", { hour: "2-digit", minute: "2-digit" }) : undefined,
            checkOutTime: (r.check_out || r.check_out_time) ? new Date(String(r.check_out || r.check_out_time)).toLocaleTimeString("th", { hour: "2-digit", minute: "2-digit" }) : undefined,
          };
        });
        setAllRecords(mapped);
        if (mapped[therapist.id]) {
          setRecord(mapped[therapist.id]);
        }
      }
    }).catch(() => {
      // Mock: some therapists already checked in
      const mockAll: Record<number, AttendanceRecord> = {
        2: { status: "checked_in", checkInTime: "08:45" },
        3: { status: "checked_in", checkInTime: "09:00" },
        5: { status: "checked_in", checkInTime: "08:30" },
        6: { status: "checked_out", checkInTime: "08:00", checkOutTime: "17:00" },
      };
      setAllRecords(mockAll);
      if (mockAll[therapist.id]) {
        setRecord(mockAll[therapist.id]);
      }
    });
  }, [therapist]);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const handleCheckIn = async () => {
    if (!therapist) return;
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
    try {
      const result = await api.checkIn(therapist.id);
      const newRec: AttendanceRecord = { id: result.id as number, status: "checked_in", checkInTime: timeStr };
      setRecord(newRec);
      setAllRecords((prev) => ({ ...prev, [therapist.id]: newRec }));
    } catch {
      const newRec: AttendanceRecord = { status: "checked_in", checkInTime: timeStr };
      setRecord(newRec);
      setAllRecords((prev) => ({ ...prev, [therapist.id]: newRec }));
    }
  };

  const handleCheckOut = async () => {
    if (!therapist) return;
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
    try {
      if (record.id) await api.checkOut(record.id);
    } catch {
      // fallback
    }
    setRecord((prev) => {
      const updated = { ...prev, status: "checked_out" as const, checkOutTime: timeStr };
      setAllRecords((p) => ({ ...p, [therapist.id]: updated }));
      return updated;
    });
  };

  if (!mounted || !therapist) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        {mounted && (
          <Card>
            <p className="text-white/50 text-center py-8">
              {locale === "th" ? "กรุณาเข้าสู่ระบบก่อน" : "Please login first"}
            </p>
          </Card>
        )}
      </div>
    );
  }

  const workHours = calcWorkHours(record.checkInTime, record.checkOutTime);
  const displayName = locale === "th" ? therapist.name.th : therapist.name.en;

  return (
    <div>
      <h1 className="font-heading text-xl md:text-2xl text-white mb-4 md:mb-6">{t("attendance.checkin")}</h1>

      {/* Profile Card */}
      <Card className="mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowPinModal(true)}
            className="w-16 h-16 rounded-full bg-gradient-to-br from-accent-gold to-accent-gold-dark flex items-center justify-center text-primary-dark font-bold text-2xl shrink-0 cursor-pointer hover:ring-2 hover:ring-accent-gold/50 transition-all relative group"
            title={locale === "th" ? "เปลี่ยน PIN" : "Change PIN"}
          >
            {therapist.name.th.charAt(0)}
            <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-surface-card rounded-full flex items-center justify-center text-[10px] border border-white/20 group-hover:bg-accent-gold/20">
              🔑
            </span>
          </button>
          <div>
            <h2 className="text-white text-xl font-medium">{displayName}</h2>
            <div className="flex items-center gap-2 mt-1">
              {record.status === "checked_in" ? (
                <Badge variant="green">{t("attendance.checkin")}</Badge>
              ) : record.status === "checked_out" ? (
                <Badge variant="gray">{t("attendance.checkout")}</Badge>
              ) : (
                <Badge variant="red">{locale === "th" ? "ยังไม่ลงเวลา" : "Not checked in"}</Badge>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Change PIN Modal */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={closePinModal}>
          <div className="bg-surface-card border border-white/10 rounded-2xl p-6 w-full max-w-sm mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-white font-heading text-lg mb-4 text-center">
              {locale === "th" ? "เปลี่ยน PIN" : "Change PIN"}
            </h3>
            {pinSuccess ? (
              <div className="text-center py-6">
                <p className="text-green-400 text-lg font-medium">
                  {locale === "th" ? "เปลี่ยน PIN สำเร็จ!" : "PIN changed!"}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="text-white/50 text-xs mb-1 block">
                    {locale === "th" ? "PIN ปัจจุบัน" : "Current PIN"}
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={currentPin}
                    onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    className="w-full bg-surface-dark border border-white/10 rounded-lg px-4 py-3 text-white text-center text-xl tracking-[0.5em] font-mono"
                    placeholder="••••"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-white/50 text-xs mb-1 block">
                    {locale === "th" ? "PIN ใหม่" : "New PIN"}
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    className="w-full bg-surface-dark border border-white/10 rounded-lg px-4 py-3 text-white text-center text-xl tracking-[0.5em] font-mono"
                    placeholder="••••"
                  />
                </div>
                <div>
                  <label className="text-white/50 text-xs mb-1 block">
                    {locale === "th" ? "ยืนยัน PIN ใหม่" : "Confirm New PIN"}
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    className="w-full bg-surface-dark border border-white/10 rounded-lg px-4 py-3 text-white text-center text-xl tracking-[0.5em] font-mono"
                    placeholder="••••"
                  />
                </div>
                {pinError && (
                  <p className="text-red-400 text-xs text-center">{pinError}</p>
                )}
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleChangePin}
                    className="flex-1 px-4 py-2.5 rounded-lg bg-accent-gold text-primary-dark font-medium text-sm hover:bg-accent-gold-dark transition-all cursor-pointer"
                  >
                    {locale === "th" ? "ยืนยัน" : "Confirm"}
                  </button>
                  <button
                    onClick={closePinModal}
                    className="flex-1 px-4 py-2.5 rounded-lg bg-white/10 text-white/60 text-sm hover:bg-white/20 transition-all cursor-pointer"
                  >
                    {locale === "th" ? "ยกเลิก" : "Cancel"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Clock Display */}
      <Card className="mb-6">
        <div className="text-center py-4">
          <p className="text-white/40 text-sm mb-2">{locale === "th" ? "เวลาปัจจุบัน" : "Current Time"}</p>
          <p className="text-accent-gold text-5xl font-bold font-mono tracking-wider">
            {currentTime.toLocaleTimeString("th", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </p>
        </div>
      </Card>

      {/* Action Button */}
      <div className="mb-6">
        {record.status === "not_checked_in" && (
          <Button variant="primary" size="lg" className="w-full py-4 text-lg" onClick={handleCheckIn}>
            {t("attendance.checkin")}
          </Button>
        )}
        {record.status === "checked_in" && (
          <Button variant="danger" size="lg" className="w-full py-4 text-lg" onClick={handleCheckOut}>
            {t("attendance.checkout")}
          </Button>
        )}
        {record.status === "checked_out" && (
          <div className="text-center py-4">
            <p className="text-white/40">{locale === "th" ? "ลงเวลาออกแล้ว" : "Already checked out"}</p>
          </div>
        )}
      </div>

      {/* My Time Summary */}
      <Card className="mb-6">
        <h2 className="font-heading text-lg text-white mb-4">
          {locale === "th" ? "สรุปเวลาของฉัน" : "My Summary"}
        </h2>
        <div className="space-y-3">
          <div className="flex justify-between items-center py-2 border-b border-white/10">
            <span className="text-white/50">{locale === "th" ? "เวลาเข้างาน" : "Check In"}</span>
            <span className="text-white font-medium text-lg">
              {record.checkInTime ? `${record.checkInTime} น.` : "---"}
            </span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-white/10">
            <span className="text-white/50">{locale === "th" ? "เวลาออกงาน" : "Check Out"}</span>
            <span className="text-white font-medium text-lg">
              {record.checkOutTime ? `${record.checkOutTime} น.` : "---"}
            </span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-white/50">{locale === "th" ? "ชั่วโมงทำงาน" : "Work Hours"}</span>
            <span className="text-accent-gold font-bold text-2xl">
              {record.checkInTime ? `${workHours} ${locale === "th" ? "ชม." : "hrs"}` : "---"}
            </span>
          </div>
        </div>
      </Card>

      {/* All Staff Summary */}
      <Card>
        <h2 className="font-heading text-lg text-white mb-4">
          {locale === "th" ? "สรุปเวลาทั้งร้าน" : "All Staff Attendance"}
        </h2>
        <div className="space-y-2">
          {allTherapists.map((th) => {
            const rec = allRecords[th.id];
            const name = locale === "th" ? th.name.th : th.name.en;
            const isMe = therapist && th.id === therapist.id;
            return (
              <div
                key={th.id}
                className={`flex items-center justify-between py-3 px-3 rounded-lg ${isMe ? "bg-accent-gold/10 border border-accent-gold/20" : "border-b border-white/5"}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-gold to-accent-gold-dark flex items-center justify-center text-primary-dark font-bold text-xs shrink-0">
                    {th.name.th.charAt(0)}
                  </div>
                  <span className={`text-sm ${isMe ? "text-accent-gold font-medium" : "text-white/70"}`}>
                    {name} {isMe ? (locale === "th" ? "(ฉัน)" : "(me)") : ""}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  {rec && rec.status !== "not_checked_in" ? (
                    <>
                      <span className="text-white/50">
                        {rec.checkInTime} - {rec.checkOutTime || (locale === "th" ? "ยังอยู่" : "active")}
                      </span>
                      <span className="text-accent-gold font-medium">
                        {calcWorkHours(rec.checkInTime, rec.checkOutTime)} {locale === "th" ? "ชม." : "hrs"}
                      </span>
                      {rec.status === "checked_in" ? (
                        <Badge variant="green">{locale === "th" ? "อยู่" : "In"}</Badge>
                      ) : (
                        <Badge variant="gray">{locale === "th" ? "ออก" : "Out"}</Badge>
                      )}
                    </>
                  ) : (
                    <Badge variant="red">{locale === "th" ? "ยังไม่มา" : "Absent"}</Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
