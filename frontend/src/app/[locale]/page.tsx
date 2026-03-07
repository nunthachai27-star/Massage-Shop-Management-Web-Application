import { useTranslations } from "next-intl";

export default function HomePage() {
  const t = useTranslations("home");

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-light">
      <main className="flex flex-col items-center gap-6 text-center px-8">
        <h1 className="text-4xl font-bold text-primary">{t("hero")}</h1>
        <p className="text-lg text-primary-light">{t("subtitle")}</p>
        <a
          href="#"
          className="rounded-full bg-accent-gold px-8 py-3 text-primary-dark font-semibold hover:bg-accent-gold-light transition-colors"
        >
          {t("cta")}
        </a>
      </main>
    </div>
  );
}
