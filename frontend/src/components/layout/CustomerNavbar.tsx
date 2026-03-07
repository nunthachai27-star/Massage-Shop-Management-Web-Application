"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";

export function CustomerNavbar() {
  const t = useTranslations("common");

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-primary-dark/95 backdrop-blur-md border-b border-accent-gold/20">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="font-heading text-xl text-accent-gold tracking-wide">
          {t("appName")}
        </Link>
        <div className="flex items-center gap-4">
          <LanguageSwitcher />
        </div>
      </div>
    </nav>
  );
}
