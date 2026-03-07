"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PinInput } from "@/components/auth/PinInput";
import { api } from "@/lib/api";

export default function LoginPage() {
  const t = useTranslations();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"staff" | "owner">("staff");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const handlePinComplete = async (pin: string) => {
    try {
      const result = await api.pinLogin(pin);
      if (result?.therapist) {
        localStorage.setItem("loggedInTherapist", JSON.stringify(result.therapist));
      }
    } catch {
      // API unavailable — match PIN to mock therapist
      const mockPins: Record<string, number> = { "1234": 1, "5678": 2, "9012": 3, "3456": 4, "1111": 5, "2222": 6, "3333": 7 };
      const therapistId = mockPins[pin];
      if (therapistId) {
        const { therapists } = await import("@/data/therapists");
        const therapist = therapists.find((t) => t.id === therapistId);
        if (therapist) {
          localStorage.setItem("loggedInTherapist", JSON.stringify(therapist));
        }
      }
    }
    router.push("/staff/dashboard");
  };

  const handleOwnerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.ownerLogin(username, password);
    } catch {
      // API unavailable — proceed with mock flow
    }
    router.push("/owner/dashboard");
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

        {/* Staff PIN Login */}
        {activeTab === "staff" && (
          <Card className="text-center">
            <h2 className="text-white text-lg mb-6">{t("auth.enterPin")}</h2>
            <PinInput onComplete={handlePinComplete} />
          </Card>
        )}

        {/* Owner Login */}
        {activeTab === "owner" && (
          <Card>
            <form onSubmit={handleOwnerLogin} className="space-y-4">
              <div>
                <label className="block text-white/70 text-sm mb-1.5">
                  {t("auth.username")}
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-surface-dark border border-white/10 rounded-lg px-4 py-3 text-white focus:border-accent-gold focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-white/70 text-sm mb-1.5">
                  {t("auth.password")}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-surface-dark border border-white/10 rounded-lg px-4 py-3 text-white focus:border-accent-gold focus:outline-none transition-colors"
                />
              </div>
              <Button type="submit" size="lg" className="w-full mt-2">
                {t("common.login")}
              </Button>
            </form>
          </Card>
        )}
      </div>
    </div>
  );
}
