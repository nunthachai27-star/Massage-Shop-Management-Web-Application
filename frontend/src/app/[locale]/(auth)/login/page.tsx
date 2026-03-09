"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { Card } from "@/components/ui/Card";
import { PinInput } from "@/components/auth/PinInput";
import { api } from "@/lib/api";
import { transformTherapist } from "@/lib/transform";
import { APP_VERSION } from "@/lib/version";

export default function LoginPage() {
  const t = useTranslations();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"staff" | "owner">("staff");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [pinKey, setPinKey] = useState(0);

  const handlePinComplete = async (pin: string) => {
    setError(null);
    setIsLoading(true);
    try {
      if (activeTab === "owner") {
        const result = await api.ownerPinLogin(pin);
        if (result?.access_token) {
          localStorage.setItem("authToken", result.access_token as string);
        }
        if (result?.user) {
          localStorage.setItem("ownerUser", JSON.stringify(result.user));
        }
        router.push("/owner/dashboard");
      } else {
        const result = await api.pinLogin(pin);
        if (result?.access_token) {
          localStorage.setItem("authToken", result.access_token as string);
        }
        if (result?.user) {
          const therapist = transformTherapist(result.user as Record<string, unknown>);
          localStorage.setItem("loggedInTherapist", JSON.stringify(therapist));
        }
        router.push("/staff/session");
      }
    } catch {
      setError(t("auth.invalidPin"));
      setIsLoading(false);
      setPinKey(k => k + 1);
    }
  };

  return (
    <div className="min-h-screen bg-surface-dark flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* App name */}
        <h1 className="font-heading text-3xl text-accent-gold text-center mb-8">
          {t("common.appName")}
        </h1>

        {/* Tabs */}
        <div className="flex mb-8 bg-surface-card rounded-xl p-1">
          <button
            onClick={() => setActiveTab("staff")}
            className={`flex-1 py-3 rounded-lg text-sm font-medium transition-all cursor-pointer ${
              activeTab === "staff"
                ? "bg-accent-gold text-primary-dark"
                : "text-white/60 hover:text-white"
            }`}
          >
            {t("auth.staffLogin")}
          </button>
          <button
            onClick={() => setActiveTab("owner")}
            className={`flex-1 py-3 rounded-lg text-sm font-medium transition-all cursor-pointer ${
              activeTab === "owner"
                ? "bg-accent-gold text-primary-dark"
                : "text-white/60 hover:text-white"
            }`}
          >
            {t("auth.ownerLogin")}
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        {/* PIN Login (both staff and owner) */}
        <Card className="text-center">
          <h2 className="text-white text-lg mb-6">{t("auth.enterPin")}</h2>
          <PinInput key={pinKey} onComplete={handlePinComplete} disabled={isLoading} />
        </Card>

        <p className="text-white/20 text-xs text-center mt-6">v{APP_VERSION}</p>
      </div>
    </div>
  );
}
