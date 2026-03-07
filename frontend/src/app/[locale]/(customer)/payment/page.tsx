"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { services as mockServices } from "@/data/services";
import { therapists as mockTherapists } from "@/data/therapists";
import { api } from "@/lib/api";
import { transformService, transformTherapist } from "@/lib/transform";

type PaymentMethod = "promptpay" | "cash" | "transfer";

export default function PaymentPage() {
  const t = useTranslations();
  const locale = useLocale() as "th" | "en";
  const searchParams = useSearchParams();

  const serviceId = Number(searchParams.get("serviceId"));
  const therapistId = Number(searchParams.get("therapistId"));
  const time = searchParams.get("time") || "";
  const customerName = searchParams.get("name") || "";
  const phone = searchParams.get("phone") || "";

  const [services, setServices] = useState(mockServices);
  const [therapists, setTherapists] = useState(mockTherapists);

  useEffect(() => {
    api.getServices().then((raw) => setServices(raw.map(transformService))).catch(() => {});
    api.getTherapists().then((raw) => setTherapists(raw.map(transformTherapist))).catch(() => {});
  }, []);

  const service = services.find((s) => s.id === serviceId);
  const therapist = therapists.find((th) => th.id === therapistId);

  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(
    null
  );
  const [confirmed, setConfirmed] = useState(false);

  const paymentMethods: {
    key: PaymentMethod;
    label: string;
    icon: string;
  }[] = [
    { key: "promptpay", label: t("payment.promptpay"), icon: "\u25A3" },
    { key: "cash", label: t("payment.cash"), icon: "\uD83D\uDCB5" },
    { key: "transfer", label: t("payment.transfer"), icon: "\uD83C\uDFE6" },
  ];

  if (confirmed) {
    return (
      <section className="py-12 px-4 max-w-3xl mx-auto flex flex-col items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md text-center">
          <div className="text-6xl mb-6 text-green-400">&#10003;</div>
          <h1 className="font-heading text-2xl text-white mb-3">
            {t("booking.confirmed")}
          </h1>
          <p className="text-white/60 mb-2">
            {service?.name[locale]} — {therapist?.name[locale]}
          </p>
          <p className="text-white/60 mb-6">{time}</p>
          <p className="text-accent-gold font-bold text-xl mb-8">
            {service?.price.toLocaleString()} {t("services.baht")}
          </p>
          <Link href="/">
            <Button size="lg" className="w-full">
              {locale === "th" ? "กลับหน้าแรก" : "Back to Home"}
            </Button>
          </Link>
        </Card>
      </section>
    );
  }

  return (
    <section className="py-12 px-4 max-w-3xl mx-auto">
      {/* Back link */}
      <div className="mb-8">
        <Link
          href={`/booking?serviceId=${serviceId}&therapistId=${therapistId}`}
          className="text-accent-gold hover:text-accent-gold-light transition-colors text-sm"
        >
          &larr; {t("common.back")}
        </Link>
      </div>

      <h1 className="font-heading text-3xl text-white text-center mb-10">
        {t("payment.title")}
      </h1>

      {/* Section 1: Booking Summary */}
      <Card className="mb-10">
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
          <div className="flex justify-between">
            <span className="text-white/60">{t("booking.selectTime")}</span>
            <span className="text-white">{time}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/60">{t("booking.customerName")}</span>
            <span className="text-white">{customerName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/60">{t("booking.phone")}</span>
            <span className="text-white">{phone}</span>
          </div>
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
      </Card>

      {/* Section 2: Payment Method Selection */}
      <div className="mb-10">
        <h2 className="text-white text-lg font-medium mb-4">
          {t("payment.method")}
        </h2>
        <div className="grid grid-cols-3 gap-4">
          {paymentMethods.map((method) => (
            <button
              key={method.key}
              onClick={() => setSelectedMethod(method.key)}
              className={`flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all duration-300 cursor-pointer
                ${
                  selectedMethod === method.key
                    ? "border-accent-gold bg-accent-gold/10 shadow-lg shadow-accent-gold/10"
                    : "border-white/10 bg-surface-card hover:border-white/30"
                }`}
            >
              <span className="text-3xl">{method.icon}</span>
              <span
                className={`text-sm font-medium ${
                  selectedMethod === method.key
                    ? "text-accent-gold"
                    : "text-white"
                }`}
              >
                {method.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Section 3: Payment Details (conditional) */}
      {selectedMethod && (
        <Card className="mb-10">
          {selectedMethod === "promptpay" && (
            <div className="flex flex-col items-center">
              <h3 className="text-white font-medium mb-4">
                {t("payment.promptpay")}
              </h3>
              <div className="w-48 h-48 bg-white rounded-xl flex items-center justify-center mb-4">
                <span className="text-primary-dark font-bold text-lg">
                  QR Code
                </span>
              </div>
              <p className="text-white/60 text-sm text-center">
                {locale === "th"
                  ? "สแกน QR Code เพื่อชำระเงิน"
                  : "Scan QR Code to pay"}
              </p>
            </div>
          )}

          {selectedMethod === "cash" && (
            <div className="flex flex-col items-center py-4">
              <span className="text-5xl mb-4">&#128181;</span>
              <p className="text-white text-center font-medium">
                {locale === "th"
                  ? "กรุณาชำระเงินที่เคาน์เตอร์"
                  : "Please pay at the counter"}
              </p>
            </div>
          )}

          {selectedMethod === "transfer" && (
            <div className="space-y-3">
              <h3 className="text-white font-medium mb-4">
                {t("payment.transfer")}
              </h3>
              <div className="flex justify-between">
                <span className="text-white/60">
                  {locale === "th" ? "ธนาคาร" : "Bank"}
                </span>
                <span className="text-white">
                  {locale === "th" ? "ธนาคารกสิกรไทย" : "Kasikorn Bank"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">
                  {locale === "th" ? "เลขที่บัญชี" : "Account No."}
                </span>
                <span className="text-white font-mono">XXX-X-XXXXX-X</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">
                  {locale === "th" ? "ชื่อบัญชี" : "Account Name"}
                </span>
                <span className="text-white">Massage & Spa Co., Ltd.</span>
              </div>
              <div className="border-t border-white/10 pt-3 flex justify-between">
                <span className="text-white/60">
                  {locale === "th" ? "ยอดโอน" : "Amount"}
                </span>
                <span className="text-accent-gold font-bold">
                  {service?.price.toLocaleString()} {t("services.baht")}
                </span>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Section 4: Confirm Button */}
      <Button
        size="lg"
        className="w-full"
        disabled={!selectedMethod}
        onClick={async () => {
          try {
            const booking = await api.createBooking({
              customer_name: customerName,
              phone,
              service_id: serviceId,
              therapist_id: therapistId,
              start_time: time,
            });
            if (service && selectedMethod) {
              const payment = await api.createPayment({
                booking_id: booking.id,
                amount: service.price,
                method: selectedMethod,
              });
              await api.confirmPayment(payment.id);
            }
          } catch {
            // API unavailable — proceed with mock flow
          }
          setConfirmed(true);
        }}
      >
        {t("payment.confirm")}
      </Button>
    </section>
  );
}
