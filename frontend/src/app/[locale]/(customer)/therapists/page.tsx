import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { therapists as mockTherapists, type Therapist } from "@/data/therapists";
import { api } from "@/lib/api";
import { transformTherapist } from "@/lib/transform";

export default async function TherapistsPage({
  searchParams,
}: {
  searchParams: Promise<{ serviceId?: string }>;
}) {
  const t = await getTranslations();
  const locale = (await getLocale()) as "th" | "en";
  const { serviceId } = await searchParams;

  let therapists: Therapist[];
  try {
    const raw = await api.getTherapists();
    therapists = raw.map(transformTherapist);
  } catch {
    therapists = mockTherapists;
  }

  return (
    <section className="py-12 px-4 max-w-5xl mx-auto">
      <div className="mb-8">
        <Link
          href="/services"
          className="text-accent-gold hover:text-accent-gold-light transition-colors text-sm"
        >
          &larr; {t("common.back")}
        </Link>
      </div>

      <h1 className="font-heading text-3xl md:text-4xl text-white text-center mb-12">
        {t("therapists.title")}
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {therapists.map((therapist) => {
          const isAvailable = therapist.status === "available";
          return (
            <Card
              key={therapist.id}
              hover={isAvailable}
              className={!isAvailable ? "opacity-50" : ""}
            >
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-accent-gold to-accent-gold-dark flex-shrink-0 flex items-center justify-center text-primary-dark text-2xl font-bold">
                  {therapist.name[locale].charAt(0)}
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-heading text-lg text-white">
                      {therapist.name[locale]}
                    </h3>
                    <Badge variant={isAvailable ? "green" : "gray"}>
                      {isAvailable
                        ? t("therapists.available")
                        : t("therapists.busy")}
                    </Badge>
                  </div>

                  {/* Rating */}
                  <div className="flex items-center gap-1 mb-2">
                    <span className="text-accent-gold">★</span>
                    <span className="text-white text-sm">
                      {therapist.rating}
                    </span>
                    <span className="text-white/40 text-sm ml-2">
                      {therapist.experience}{" "}
                      {locale === "th" ? "ปี" : "yrs"}
                    </span>
                  </div>

                  {/* Skills */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {therapist.skill.map((s) => (
                      <Badge key={s} variant="gold">
                        {s}
                      </Badge>
                    ))}
                  </div>

                  {/* Select Button */}
                  <Link
                    href={`/booking?serviceId=${serviceId || ""}&therapistId=${therapist.id}`}
                  >
                    <Button size="sm" disabled={!isAvailable}>
                      {t("therapists.select")}
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
