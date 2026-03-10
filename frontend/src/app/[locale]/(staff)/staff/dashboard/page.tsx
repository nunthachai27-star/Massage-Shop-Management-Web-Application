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
    };

    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
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
