import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { services as mockServices, type Service } from "@/data/services";
import { api } from "@/lib/api";
import { transformService } from "@/lib/transform";

export default async function ServicesPage() {
  const t = await getTranslations();
  const locale = (await getLocale()) as "th" | "en";

  let services: Service[];
  try {
    const raw = await api.getServices();
    services = raw.map(transformService);
  } catch {
    services = mockServices;
  }

  return (
    <section className="py-12 px-4 max-w-7xl mx-auto">
      <div className="mb-8">
        <Link
          href="/"
          className="text-accent-gold hover:text-accent-gold-light transition-colors text-sm"
        >
          &larr; {t("common.back")}
        </Link>
      </div>

      <h1 className="font-heading text-3xl md:text-4xl text-white text-center mb-12">
        {t("services.title")}
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.map((service) => (
          <Card key={service.id} hover>
            <div className="h-40 bg-gradient-to-br from-primary to-primary-light rounded-xl mb-4" />
            <h3 className="font-heading text-xl text-white mb-2">
              {service.name[locale]}
            </h3>
            <p className="text-white/60 text-sm mb-3">
              {service.description[locale]}
            </p>
            <div className="flex items-center gap-2 mb-4">
              <Badge variant="gold">
                {service.duration} {t("services.minutes")}
              </Badge>
            </div>
            <div className="flex items-center justify-between mt-auto">
              <span className="text-accent-gold font-bold text-xl">
                {service.price.toLocaleString()} {t("services.baht")}
              </span>
              <Link href={`/therapists?serviceId=${service.id}`}>
                <Button size="sm">{t("services.select")}</Button>
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
