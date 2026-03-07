"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/routing";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";

const navItems = [
  { href: "/staff/dashboard", labelKey: "staff.beds", icon: "🚪" },
  { href: "/staff/bookings", labelKey: "staff.bookings", icon: "📋" },
  { href: "/staff/session", labelKey: "staff.session", icon: "⏱️" },
  { href: "/staff/customers", labelKey: "staff.customers", icon: "⭐" },
  { href: "/staff/attendance", labelKey: "attendance.checkin", icon: "📍" },
];

export function StaffSidebar() {
  const t = useTranslations();
  const pathname = usePathname();

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
        </div>
      </aside>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-primary-dark border-t border-accent-gold/20">
        <div className="flex justify-around py-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 px-3 py-1 text-xs ${
                  isActive ? "text-accent-gold" : "text-white/50"
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span>{t(item.labelKey)}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
