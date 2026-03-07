"use client";

import { useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/routing";

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const toggleLocale = () => {
    const newLocale = locale === "th" ? "en" : "th";
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <button
      onClick={toggleLocale}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-accent-gold/30 text-accent-gold hover:bg-accent-gold/10 transition-colors text-sm cursor-pointer"
    >
      <span>{locale === "th" ? "EN" : "TH"}</span>
    </button>
  );
}
