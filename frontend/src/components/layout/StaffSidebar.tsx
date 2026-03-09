"use client";

import { useTranslations, useLocale } from "next-intl";
import { Link, usePathname } from "@/i18n/routing";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { APP_VERSION } from "@/lib/version";

const navItems = [
  { href: "/staff/dashboard", labelKey: "staff.beds", shortLabel: { th: "ห้อง", en: "Rooms" }, icon: "🚪" },
  { href: "/staff/session", labelKey: "staff.session", shortLabel: { th: "ทำงาน", en: "Work" }, icon: "⏱️" },
  { href: "/staff/bookings", labelKey: "staff.bookings", shortLabel: { th: "จอง", en: "Book" }, icon: "📋" },
  { href: "/staff/attendance", labelKey: "attendance.checkin", shortLabel: { th: "เข้างาน", en: "Clock" }, icon: "📍" },
];

export function StaffSidebar() {
  const t = useTranslations();
  const pathname = usePathname();
  const locale = useLocale() as "th" | "en";

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-64 bg-primary-dark border-r border-accent-gold/20 min-h-screen fixed left-0 top-0">
        <div className="p-6">
          <h1 className="font-heading text-xl text-accent-gold">{t("common.appName")}</h1>
          <p className="text-white/40 text-xs mt-1">{t("staff.dashboard")}</p>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all ${
                  isActive
                    ? "bg-accent-gold/10 text-accent-gold border border-accent-gold/20"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
              >
                <span>{item.icon}</span>
                <span>{t(item.labelKey)}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-white/10 space-y-3">
          <LanguageSwitcher />
          <Link
            href="/login"
            className="flex items-center gap-2 px-4 py-2 text-red-400 hover:text-red-300 text-sm transition-colors"
          >
            {t("common.logout")}
          </Link>
          <p className="text-white/20 text-xs text-center">v{APP_VERSION}</p>
        </div>
      </aside>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-primary-dark/95 backdrop-blur-sm border-t border-accent-gold/20">
        <div className="grid grid-cols-4 py-1 px-0.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-lg ${
                  isActive ? "text-accent-gold bg-accent-gold/10" : "text-white/40"
                }`}
              >
                <span className="text-lg leading-none">{item.icon}</span>
                <span className="text-[10px] leading-tight truncate w-full text-center px-0.5">
                  {item.shortLabel[locale]}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
