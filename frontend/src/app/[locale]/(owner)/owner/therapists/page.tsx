import { getTranslations, getLocale } from "next-intl/server";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { therapists } from "@/data/therapists";

const performanceData: Record<number, { sessions: number; revenue: number }> = {
  1: { sessions: 4, revenue: 2400 },
  2: { sessions: 3, revenue: 1800 },
  3: { sessions: 5, revenue: 3000 },
  4: { sessions: 2, revenue: 1200 },
};

export default async function TherapistPerformancePage() {
  const t = await getTranslations();
  const locale = await getLocale();

  return (
    <div>
      <h1 className="font-heading text-2xl text-white mb-6">
        {t("owner.therapistPerformance")}
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {therapists.map((therapist) => {
          const perf = performanceData[therapist.id] || { sessions: 0, revenue: 0 };
          const initial = therapist.name.en.charAt(0);
          const statusVariant =
            therapist.status === "available"
              ? "green"
              : therapist.status === "busy"
                ? "gold"
                : therapist.status === "break"
                  ? "blue"
                  : "gray";

          return (
            <Card key={therapist.id}>
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-accent-gold to-accent-gold-dark flex items-center justify-center text-primary-dark font-bold text-lg shrink-0">
                  {initial}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-white font-semibold truncate">
                      {locale === "th" ? therapist.name.th : therapist.name.en}
                    </h3>
                    <Badge variant={statusVariant}>{therapist.status}</Badge>
                  </div>

                  {/* Rating */}
                  <p className="text-accent-gold text-sm mb-3">
                    ⭐ {therapist.rating}
                  </p>

                  {/* Performance Stats */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-surface-dark rounded-lg p-3 text-center">
                      <p className="text-accent-gold text-xl font-bold">{perf.sessions}</p>
                      <p className="text-white/50 text-xs">{t("owner.sessions")}</p>
                    </div>
                    <div className="bg-surface-dark rounded-lg p-3 text-center">
                      <p className="text-accent-gold text-xl font-bold">
                        {perf.revenue.toLocaleString()} ฿
                      </p>
                      <p className="text-white/50 text-xs">{t("owner.revenuePerTherapist")}</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
