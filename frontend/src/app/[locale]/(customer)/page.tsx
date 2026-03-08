import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { services as mockServices, type Service } from "@/data/services";
import { api } from "@/lib/api";
import { transformService } from "@/lib/transform";

export default async function HomePage() {
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
    <>
      {/* Hero Section */}
      <section className="relative min-h-[80vh] flex items-center justify-center bg-gradient-to-b from-primary-dark via-primary to-surface-dark">
        <div className="absolute inset-0 opacity-10">
          {/* Decorative pattern */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--color-accent-gold)_1px,_transparent_1px)] bg-[size:40px_40px]" />
        </div>
        <div className="relative text-center px-4 max-w-3xl mx-auto">
          <h1 className="font-heading text-4xl md:text-6xl text-white mb-4 leading-tight">
            {t("home.hero")}
          </h1>
          <p className="text-accent-cream text-lg md:text-xl mb-8 opacity-80">
            {t("home.subtitle")}
          </p>
          <Link href="/login">
            <Button size="lg" variant="primary">
              {t("common.login")}
            </Button>
          </Link>
        </div>
      </section>

      {/* Services Preview */}
      <section className="py-16 px-4 max-w-7xl mx-auto">
        <h2 className="font-heading text-3xl text-white text-center mb-12">
          {t("services.title")}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.slice(0, 3).map((service) => (
            <Card key={service.id} hover>
              <div className="h-48 bg-gradient-to-br from-primary to-primary-light rounded-xl mb-4" />
              <h3 className="font-heading text-xl text-white mb-2">
                {service.name[locale]}
              </h3>
              <p className="text-white/60 text-sm mb-4">
                {service.description[locale]}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-accent-gold font-bold text-lg">
                  {service.price.toLocaleString()} {t("services.baht")}
                </span>
                <span className="text-white/40 text-sm">
                  {service.duration} {t("services.minutes")}
                </span>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Room Feature */}
      <section className="py-12 px-4 max-w-3xl mx-auto">
        <Card>
          <div className="text-center py-4">
            <span className="text-4xl mb-4 block">🚪</span>
            <h2 className="font-heading text-2xl text-white mb-3">
              {locale === "th" ? "ห้องส่วนตัว พร้อมห้องน้ำในตัว" : "Private Room with En-suite Bathroom"}
            </h2>
            <p className="text-white/60">
              {locale === "th"
                ? "สะอาด เป็นส่วนตัว และปลอดภัยทุกคิว"
                : "Clean, private, and safe for every session"}
            </p>
          </div>
        </Card>
      </section>

      {/* Promotion */}
      <section className="py-12 px-4 max-w-3xl mx-auto">
        <div className="bg-gradient-to-r from-accent-gold/20 to-accent-gold-dark/20 border border-accent-gold/30 rounded-2xl p-8 text-center">
          <span className="text-4xl mb-4 block">🎁</span>
          <h2 className="font-heading text-2xl text-accent-gold mb-3">
            {locale === "th" ? "โปรโมชั่นพิเศษ" : "Special Promotion"}
          </h2>
          <p className="text-white text-lg mb-2">
            {locale === "th"
              ? "นวดครบ 5 ครั้ง ฟรี! 1 ครั้ง"
              : "Complete 5 sessions, get 1 FREE!"}
          </p>
          <p className="text-white/50 text-sm">
            {locale === "th"
              ? "สะสมได้ ไม่หมดอายุ"
              : "Accumulate visits, no expiration"}
          </p>
        </div>
      </section>
    </>
  );
}
