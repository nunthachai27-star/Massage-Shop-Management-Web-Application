import { useTranslations } from "next-intl";
import { APP_VERSION } from "@/lib/version";

export function Footer() {
  const t = useTranslations("common");

  return (
    <footer className="bg-primary-dark border-t border-accent-gold/20 py-8">
      <div className="max-w-7xl mx-auto px-4 text-center text-white/50 text-sm">
        <p className="font-heading text-accent-gold text-lg mb-2">
          {t("appName")}
        </p>
        <p>&copy; 2026 {t("appName")}. All rights reserved.</p>
        <p className="mt-1 text-white/30 text-xs">v{APP_VERSION}</p>
      </div>
    </footer>
  );
}
