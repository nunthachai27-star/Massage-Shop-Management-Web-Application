"use client";

import { useState, useEffect } from "react";
import { useLocale } from "next-intl";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PinInput } from "@/components/auth/PinInput";
import { api } from "@/lib/api";

type Step = "current" | "new" | "confirm";

export default function StaffSettingsPage() {
  const locale = useLocale();
  const [therapistId, setTherapistId] = useState<number | null>(null);
  const [therapistName, setTherapistName] = useState("");
  const [step, setStep] = useState<Step>("current");
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("loggedInTherapist");
    if (stored) {
      const t = JSON.parse(stored);
      setTherapistId(t.id);
      setTherapistName(locale === "th" ? t.name?.th : t.name?.en || t.name?.th);
    }
  }, [locale]);

  const handleCurrentPin = (pin: string) => {
    setCurrentPin(pin);
    setError(null);
    setStep("new");
  };

  const handleNewPin = (pin: string) => {
    setNewPin(pin);
    setError(null);
    setStep("confirm");
  };

  const handleConfirmPin = async (pin: string) => {
    if (pin !== newPin) {
      setError(locale === "th" ? "PIN ไม่ตรงกัน กรุณาลองใหม่" : "PINs do not match. Try again.");
      setStep("new");
      setNewPin("");
      return;
    }

    if (!therapistId) return;
    setIsLoading(true);
    setError(null);

    try {
      await api.changePin(therapistId, currentPin, newPin);
      setSuccess(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      if (msg.includes("incorrect")) {
        setError(locale === "th" ? "PIN เดิมไม่ถูกต้อง" : "Current PIN is incorrect");
        setStep("current");
        setCurrentPin("");
        setNewPin("");
      } else if (msg.includes("already in use")) {
        setError(locale === "th" ? "PIN นี้ถูกใช้แล้ว กรุณาเลือก PIN อื่น" : "This PIN is already in use");
        setStep("new");
        setNewPin("");
      } else {
        setError(locale === "th" ? `เปลี่ยน PIN ไม่สำเร็จ: ${msg}` : `Failed to change PIN: ${msg}`);
        setStep("current");
        setCurrentPin("");
        setNewPin("");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setStep("current");
    setCurrentPin("");
    setNewPin("");
    setError(null);
    setSuccess(false);
  };

  if (!therapistId) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-white/50">
          {locale === "th" ? "กรุณาเข้าสู่ระบบก่อน" : "Please log in first"}
        </p>
      </div>
    );
  }

  if (success) {
    return (
      <div>
        <h1 className="font-heading text-2xl text-white mb-6">
          {locale === "th" ? "ตั้งค่า" : "Settings"}
        </h1>
        <Card className="max-w-md mx-auto text-center">
          <div className="text-6xl mb-6 text-green-400">&#10003;</div>
          <h2 className="font-heading text-xl text-white mb-3">
            {locale === "th" ? "เปลี่ยน PIN สำเร็จ!" : "PIN Changed Successfully!"}
          </h2>
          <p className="text-white/60 mb-6">
            {locale === "th"
              ? "ครั้งหน้าใช้ PIN ใหม่ในการเข้าสู่ระบบ"
              : "Use your new PIN to log in next time"}
          </p>
          <Button onClick={handleReset} variant="outline" size="md">
            {locale === "th" ? "ตกลง" : "OK"}
          </Button>
        </Card>
      </div>
    );
  }

  const stepLabels = {
    current: locale === "th" ? "กรอก PIN เดิม" : "Enter Current PIN",
    new: locale === "th" ? "กรอก PIN ใหม่" : "Enter New PIN",
    confirm: locale === "th" ? "ยืนยัน PIN ใหม่" : "Confirm New PIN",
  };

  return (
    <div>
      <h1 className="font-heading text-2xl text-white mb-6">
        {locale === "th" ? "ตั้งค่า" : "Settings"}
      </h1>

      <Card className="max-w-md mx-auto">
        <div className="text-center mb-6">
          <p className="text-white/50 text-sm mb-1">
            {locale === "th" ? "พนักงาน" : "Staff"}
          </p>
          <p className="text-white font-medium text-lg">{therapistName}</p>
        </div>

        <h2 className="font-heading text-lg text-white text-center mb-2">
          {locale === "th" ? "เปลี่ยน PIN" : "Change PIN"}
        </h2>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {(["current", "new", "confirm"] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                step === s
                  ? "bg-accent-gold text-primary-dark"
                  : i < ["current", "new", "confirm"].indexOf(step)
                    ? "bg-green-500 text-white"
                    : "bg-white/10 text-white/30"
              }`}>
                {i < ["current", "new", "confirm"].indexOf(step) ? "✓" : i + 1}
              </div>
              {i < 2 && <div className="w-8 h-0.5 bg-white/10" />}
            </div>
          ))}
        </div>

        <p className="text-accent-gold text-center font-medium mb-4">
          {stepLabels[step]}
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        <PinInput
          key={step}
          onComplete={
            step === "current" ? handleCurrentPin
            : step === "new" ? handleNewPin
            : handleConfirmPin
          }
          disabled={isLoading}
        />

        {step !== "current" && (
          <div className="mt-4 text-center">
            <button
              onClick={handleReset}
              className="text-white/40 hover:text-white text-sm cursor-pointer"
            >
              {locale === "th" ? "เริ่มใหม่" : "Start over"}
            </button>
          </div>
        )}
      </Card>
    </div>
  );
}
