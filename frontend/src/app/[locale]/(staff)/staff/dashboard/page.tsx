"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { type Bed } from "@/data/beds";
import { type Booking } from "@/data/bookings";
import { type Service } from "@/data/services";
import { type Therapist } from "@/data/therapists";
import { api } from "@/lib/api";
import { transformBed, transformBooking, transformService, transformTherapist } from "@/lib/transform";

const statusConfig = {
  available: { label: { th: "ว่าง", en: "Available" }, variant: "green" as const },
  reserved: { label: { th: "จองแล้ว", en: "Reserved" }, variant: "blue" as const },
  in_service: { label: { th: "กำลังใช้งาน", en: "In Service" }, variant: "gold" as const },
  cleaning: { label: { th: "ทำความสะอาด", en: "Cleaning" }, variant: "gray" as const },
};

export default function StaffDashboardPage() {
  const t = useTranslations();
  const locale = useLocale();

  const [beds, setBeds] = useState<Bed[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [commissions, setCommissions] = useState<{ date: string; total_sessions: number; total_revenue: number; total_commission: number; status: string }[]>([]);

  useEffect(() => {
    const fetchData = () => {
      Promise.all([
        api.getBeds(),
        api.getBookings(),
        api.getServices(),
        api.getTherapists(),
      ]).then(([rawBeds, rawBookings, rawServices, rawTherapists]) => {
        setBeds(rawBeds.map(transformBed));
        setBookings(rawBookings.map(transformBooking));
        setServices(rawServices.map(transformService));
        setTherapists(rawTherapists.map(transformTherapist));
      }).catch(() => {});

      api.getMyCommissions().then((data: any) => setCommissions(data || [])).catch(() => {});
    };

    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  // Normalize date from API (could be "2026-03-11" or "2026-03-11T00:00:00.000Z")
  const getDateStr = (d: string) => (d || "").substring(0, 10);

  const formatDate = (dateStr: string) => {
    const d = new Date(getDateStr(dateStr) + "T00:00:00");
    return d.toLocaleDateString("th-TH", { weekday: "short", day: "numeric", month: "short" });
  };

  const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
  const todayCommission = commissions.find((c) => getDateStr(c.date) === todayStr);

  return (
    <div>
      {/* Commission Summary */}
      {commissions.length > 0 && (
        <div className="mb-6">
          <h2 className="font-heading text-xl text-white mb-3">
            {locale === "th" ? "ค่าคอมมิชชั่นของฉัน" : "My Commissions"}
          </h2>

          {/* Today highlight */}
          {todayCommission && (
            <Card className="mb-4 border border-emerald-500/30 bg-emerald-500/10">
              <div className="flex items-center justify-between">
                <span className="text-emerald-400 font-heading text-lg">
                  {locale === "th" ? "วันนี้" : "Today"}
                </span>
                <span className="text-emerald-400 font-heading text-2xl">
                  {Number(todayCommission.total_commission).toLocaleString()} ฿
                </span>
              </div>
              <div className="flex justify-between text-sm text-white/50 mt-1">
                <span>{todayCommission.total_sessions} {locale === "th" ? "เคส" : "sessions"}</span>
                <span>{locale === "th" ? "รายได้" : "Revenue"} {Number(todayCommission.total_revenue).toLocaleString()} ฿</span>
              </div>
            </Card>
          )}

          {/* Last 7 days */}
          <div className="grid grid-cols-1 gap-2">
            {commissions.filter((c) => getDateStr(c.date) !== todayStr && c.total_sessions > 0).map((c) => (
              <Card key={c.date} className="!py-3">
                <div className="flex items-center justify-between">
                  <span className="text-white/70 text-sm">{formatDate(c.date)}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-white/50 text-sm">{c.total_sessions} {locale === "th" ? "เคส" : "sessions"}</span>
                    <span className="text-white font-medium">{Number(c.total_commission).toLocaleString()} ฿</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      <h1 className="font-heading text-xl md:text-2xl text-white mb-4 md:mb-6">{t("staff.beds")}</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {beds.map((bed) => {
          // Find active booking for this bed: in_service first, then booked
          const activeBooking = bed.currentBookingId
            ? bookings.find((b) => b.id === bed.currentBookingId)
            : null;
          const bookedBooking = !activeBooking
            ? bookings.find((b) => b.bedId === bed.id && (b.status === "booked" || b.status === "in_service"))
            : null;
          const booking = activeBooking || bookedBooking;

          // Determine effective status: if bed looks available but has a "booked" booking, show as reserved
          let effectiveStatus = bed.status;
          if (bed.status === "available" && booking) {
            effectiveStatus = booking.status === "in_service" ? "in_service" : "reserved";
          }
          const config = statusConfig[effectiveStatus];

          const service = booking
            ? services.find((s) => s.id === booking.serviceId)
            : null;
          const therapist = booking
            ? therapists.find((th) => th.id === booking.therapistId)
            : null;

          return (
            <Card key={bed.id}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-heading text-lg text-white">{bed.name}</h3>
                <Badge variant={config.variant}>
                  {locale === "th" ? config.label.th : config.label.en}
                </Badge>
              </div>
              {booking && (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-white/50">{locale === "th" ? "ลูกค้า" : "Customer"}</span>
                    <span className="text-white">{booking.customerName}</span>
                  </div>
                  {service && (
                    <div className="flex justify-between">
                      <span className="text-white/50">{locale === "th" ? "บริการ" : "Service"}</span>
                      <span className="text-white">{locale === "th" ? service.name.th : service.name.en}</span>
                    </div>
                  )}
                  {therapist && (
                    <div className="flex justify-between">
                      <span className="text-white/50">{locale === "th" ? "หมอนวด" : "Therapist"}</span>
                      <span className="text-white">{locale === "th" ? therapist.name.th : therapist.name.en}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-white/50">{locale === "th" ? "เวลา" : "Time"}</span>
                    <span className="text-white">
                      {new Date(booking.startTime).toLocaleTimeString("th", { hour: "2-digit", minute: "2-digit" })}
                      {" - "}
                      {new Date(booking.endTime).toLocaleTimeString("th", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
