"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Link, useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { services } from "@/data/services";
import { therapists } from "@/data/therapists";

const timeSlots = [
  { time: "09:00", available: true },
  { time: "10:00", available: false },
  { time: "11:00", available: true },
  { time: "13:00", available: true },
  { time: "14:00", available: false },
  { time: "15:00", available: true },
  { time: "16:00", available: true },
  { time: "17:00", available: true },
];

export default function BookingPage() {
  const t = useTranslations();
  const locale = useLocale() as "th" | "en";
  const searchParams = useSearchParams();
  const router = useRouter();

  const serviceId = Number(searchParams.get("serviceId"));
  const therapistId = Number(searchParams.get("therapistId"));
  const service = services.find((s) => s.id === serviceId);
  const therapist = therapists.find((th) => th.id === therapistId);

  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");

  const canConfirm = selectedTime && customerName.trim() && phone.trim();

  const handleConfirm = () => {
    if (!canConfirm) return;
    router.push(
      `/payment?serviceId=${serviceId}&therapistId=${therapistId}&time=${selectedTime}&name=${encodeURIComponent(customerName)}&phone=${encodeURIComponent(phone)}`
    );
  };

  return (
    <section className="py-12 px-4 max-w-3xl mx-auto">
      <div className="mb-8">
        <Link
          href={`/therapists?serviceId=${serviceId}`}
          className="text-accent-gold hover:text-accent-gold-light transition-colors text-sm"
        >
          &larr; {t("common.back")}
        </Link>
      </div>

      <h1 className="font-heading text-3xl text-white text-center mb-10">
        {t("booking.title")}
      </h1>

      {/* Time Slots */}
      <div className="mb-10">
        <h2 className="text-white text-lg font-medium mb-4">
          {t("booking.selectTime")}
        </h2>
        <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
          {timeSlots.map((slot) => (
            <button
              key={slot.time}
              onClick={() => slot.available && setSelectedTime(slot.time)}
              disabled={!slot.available}
              className={`py-3 rounded-lg text-sm font-medium transition-all cursor-pointer
                ${
                  selectedTime === slot.time
                    ? "bg-accent-gold text-primary-dark shadow-lg shadow-accent-gold/20"
                    : slot.available
                      ? "border border-white/20 text-white hover:border-accent-gold/50"
                      : "border border-white/5 text-white/20 cursor-not-allowed line-through"
                }`}
            >
              {slot.time}
            </button>
          ))}
        </div>
      </div>

      {/* Customer Info */}
      <div className="mb-10 space-y-4">
        <div>
          <label className="block text-white/70 text-sm mb-1.5">
            {t("booking.customerName")}
          </label>
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="w-full bg-surface-card border border-white/10 rounded-lg px-4 py-3 text-white focus:border-accent-gold focus:outline-none transition-colors"
            placeholder={t("booking.customerName")}
          />
        </div>
        <div>
          <label className="block text-white/70 text-sm mb-1.5">
            {t("booking.phone")}
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full bg-surface-card border border-white/10 rounded-lg px-4 py-3 text-white focus:border-accent-gold focus:outline-none transition-colors"
            placeholder="08X-XXX-XXXX"
          />
        </div>
      </div>

      {/* Booking Summary */}
      <Card>
        <h2 className="font-heading text-xl text-white mb-4">
          {t("booking.summary")}
        </h2>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-white/60">{t("common.services")}</span>
            <span className="text-white">{service?.name[locale]}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/60">{t("common.therapists")}</span>
            <span className="text-white">{therapist?.name[locale]}</span>
          </div>
          {selectedTime && (
            <div className="flex justify-between">
              <span className="text-white/60">{t("booking.selectTime")}</span>
              <span className="text-white">{selectedTime}</span>
            </div>
          )}
          {service && (
            <div className="border-t border-white/10 pt-3 flex justify-between">
              <span className="text-white font-medium">
                {t("payment.total")}
              </span>
              <span className="text-accent-gold font-bold text-lg">
                {service.price.toLocaleString()} {t("services.baht")}
              </span>
            </div>
          )}
        </div>
        <div className="mt-6">
          <Button
            size="lg"
            className="w-full"
            disabled={!canConfirm}
            onClick={handleConfirm}
          >
            {t("common.confirm")}
          </Button>
        </div>
      </Card>
    </section>
  );
}
