"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { bookings as mockBookings, type Booking } from "@/data/bookings";
import { services as mockServices, type Service } from "@/data/services";
import { type Therapist } from "@/data/therapists";
import { beds as mockBeds, type Bed } from "@/data/beds";
import { api } from "@/lib/api";
import { transformBooking, transformService, transformBed } from "@/lib/transform";

// Commission calculation: 600→100, 800→150, 1000→200, Thai massage → half
function getCommission(price: number, isThaiMassage: boolean): number {
  let commission = 0;
  if (price >= 1000) commission = 250;
  else if (price >= 800) commission = 200;
  else if (price >= 600) commission = 100;
  else return 0;
  return isThaiMassage ? Math.round(commission / 2) : commission;
}

const statusConfig: Record<string, { label: { th: string; en: string }; variant: "blue" | "gold" | "green" | "gray" }> = {
  booked: { label: { th: "รอเช็คอิน", en: "Waiting" }, variant: "blue" },
  in_service: { label: { th: "กำลังให้บริการ", en: "In Service" }, variant: "green" },
  completed: { label: { th: "เสร็จแล้ว", en: "Completed" }, variant: "gold" },
  checkout: { label: { th: "เช็คเอาท์แล้ว", en: "Checked Out" }, variant: "gray" },
};

export default function StaffSessionPage() {
  const t = useTranslations();
  const locale = useLocale();

  const [therapist, setTherapist] = useState<Therapist | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("loggedInTherapist");
    if (stored) setTherapist(JSON.parse(stored));
    setMounted(true);
  }, []);

  const [bookings, setBookings] = useState<Booking[]>(mockBookings);
  const [services, setServices] = useState<Service[]>(mockServices);
  const [beds, setBeds] = useState<Bed[]>(mockBeds);
  const [now, setNow] = useState(new Date());

  // Check-in state
  const [checkinBookingId, setCheckinBookingId] = useState<number | null>(null);
  const [checkinBedId, setCheckinBedId] = useState(0);

  // Quick start (walk-in) state
  const [showQuickStart, setShowQuickStart] = useState(false);
  const [qsServiceId, setQsServiceId] = useState(0);
  const [qsBedId, setQsBedId] = useState(0);
  const [qsLoading, setQsLoading] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    Promise.all([
      api.getBookings(), api.getServices(), api.getBeds(),
    ]).then(([rawB, rawS, rawBd]) => {
      setBookings(rawB.map(transformBooking));
      setServices(rawS.map(transformService));
      setBeds(rawBd.map(transformBed));
    }).catch(() => {});
  }, []);

  // Filter bookings for this therapist only, exclude checkout
  const myBookings = therapist
    ? bookings
        .filter((b) => b.therapistId === therapist.id && b.status !== "checkout")
        .sort((a, b) => {
          const order = { booked: 1, in_service: 0, completed: 2 };
          const oa = order[a.status as keyof typeof order] ?? 3;
          const ob = order[b.status as keyof typeof order] ?? 3;
          return oa - ob;
        })
    : [];

  // Commission summary: count from in_service + completed bookings
  const commissionBookings = therapist
    ? bookings.filter((b) => b.therapistId === therapist.id && (b.status === "in_service" || b.status === "completed" || b.status === "checkout"))
    : [];
  const totalCommission = commissionBookings.reduce((sum, b) => {
    const service = services.find((s) => s.id === b.serviceId);
    if (!service) return sum;
    const isThaiMassage = service.name.th.includes("แผนไทย");
    return sum + getCommission(service.price, isThaiMassage);
  }, 0);

  // Check-in: assign room and start service
  const handleCheckin = (bookingId: number) => {
    setCheckinBookingId(bookingId);
    setCheckinBedId(0);
  };

  const confirmCheckin = () => {
    if (!checkinBookingId || !checkinBedId) return;

    setBookings((prev) =>
      prev.map((b) =>
        b.id === checkinBookingId
          ? { ...b, bedId: checkinBedId, status: "in_service" as const, startTime: new Date().toISOString() }
          : b
      )
    );

    setBeds((prev) =>
      prev.map((bed) =>
        bed.id === checkinBedId
          ? { ...bed, status: "in_service" as const, currentBookingId: checkinBookingId }
          : bed
      )
    );

    api.updateBookingStatus(checkinBookingId, "in_service", checkinBedId).catch(() => {});

    setCheckinBookingId(null);
    setCheckinBedId(0);
  };

  // End service
  const handleEndService = (bookingId: number) => {
    const booking = bookings.find((b) => b.id === bookingId);
    setBookings((prev) =>
      prev.map((b) =>
        b.id === bookingId ? { ...b, status: "completed" as const } : b
      )
    );
    if (booking?.bedId) {
      setBeds((prev) =>
        prev.map((bed) =>
          bed.id === booking.bedId
            ? { ...bed, status: "available" as const, currentBookingId: undefined }
            : bed
        )
      );
    }
    api.updateBookingStatus(bookingId, "completed").catch(() => {});
  };

  // Checkout
  const handleCheckout = (bookingId: number) => {
    const booking = bookings.find((b) => b.id === bookingId);
    setBookings((prev) =>
      prev.map((b) =>
        b.id === bookingId ? { ...b, status: "checkout" as const } : b
      )
    );
    if (booking?.bedId) {
      setBeds((prev) =>
        prev.map((bed) =>
          bed.id === booking.bedId
            ? { ...bed, status: "available" as const, currentBookingId: undefined }
            : bed
        )
      );
    }
    api.updateBookingStatus(bookingId, "checkout").catch(() => {});
  };

  // Quick start: create booking + start service immediately
  const handleQuickStart = async () => {
    if (!qsServiceId || !qsBedId || !therapist) return;
    setQsLoading(true);
    const service = services.find(s => s.id === qsServiceId);
    if (!service) return;

    const now2 = new Date();
    const endTime = new Date(now2.getTime() + service.duration * 60000);

    const bookingData = {
      customer_name: locale === "th" ? "ลูกค้า Walk-in" : "Walk-in Customer",
      phone: "-",
      service_id: qsServiceId,
      therapist_id: therapist.id,
      bed_id: qsBedId,
      start_time: now2.toISOString(),
      end_time: endTime.toISOString(),
      status: "in_service",
    };

    try {
      const result = await api.createBooking(bookingData);
      const newBooking = transformBooking(result as Record<string, unknown>);
      setBookings(prev => [...prev, newBooking]);
      setBeds(prev => prev.map(b => b.id === qsBedId ? { ...b, status: "in_service" as const, currentBookingId: newBooking.id } : b));
      setShowQuickStart(false);
      setQsServiceId(0);
      setQsBedId(0);
    } catch {
      // fallback: add locally
      const fakeId = Date.now();
      const newBooking: Booking = {
        id: fakeId,
        customerName: locale === "th" ? "ลูกค้า Walk-in" : "Walk-in Customer",
        phone: "-",
        serviceId: qsServiceId,
        therapistId: therapist.id,
        bedId: qsBedId,
        startTime: now2.toISOString(),
        endTime: endTime.toISOString(),
        status: "in_service",
        createdAt: now2.toISOString(),
      };
      setBookings(prev => [...prev, newBooking]);
      setBeds(prev => prev.map(b => b.id === qsBedId ? { ...b, status: "in_service" as const, currentBookingId: fakeId } : b));
      setShowQuickStart(false);
      setQsServiceId(0);
      setQsBedId(0);
    }
    setQsLoading(false);
  };

  const availableBeds = beds.filter(b => b.status === "available");

  if (!mounted || !therapist) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        {mounted && (
          <Card>
            <p className="text-white/50 text-center py-8">
              {locale === "th" ? "กรุณาเข้าสู่ระบบก่อน" : "Please login first"}
            </p>
          </Card>
        )}
      </div>
    );
  }

  const displayName = locale === "th" ? therapist.name.th : therapist.name.en;

  return (
    <div>
      {/* Header with therapist info */}
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <div>
          <h1 className="font-heading text-xl md:text-2xl text-white">{t("staff.session")}</h1>
          <p className="text-white/50 text-xs md:text-sm mt-1">
            {displayName} — {myBookings.length} {locale === "th" ? "รายการ" : "booking(s)"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-accent-gold text-lg md:text-2xl font-bold font-mono">
            {now.toLocaleTimeString("th", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </p>
        </div>
      </div>

      {/* Commission - Hero Display */}
      <div className="relative mb-4 md:mb-6 rounded-2xl overflow-hidden border-2 border-emerald-400/40 bg-gradient-to-br from-emerald-900/40 via-emerald-800/20 to-surface-card p-6 md:p-8 text-center">
        {/* Glow effect */}
        <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/10 to-transparent pointer-events-none" />
        <div className="relative">
          <p className="text-emerald-300/70 text-sm md:text-base font-medium tracking-wide uppercase mb-2">
            💰 {locale === "th" ? "ค่าคอมมิชชั่นวันนี้" : "Today's Commission"}
          </p>
          <p className="text-5xl md:text-7xl font-extrabold text-emerald-400 font-mono leading-none drop-shadow-[0_0_20px_rgba(52,211,153,0.3)]">
            ฿{totalCommission.toLocaleString()}
          </p>
          <div className="mt-3 inline-flex items-center gap-2 bg-emerald-500/15 px-4 py-1.5 rounded-full">
            <span className="text-emerald-300 text-sm font-medium">
              {commissionBookings.length} {locale === "th" ? "รายการ" : "session(s)"}
            </span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 md:gap-3 mb-4 md:mb-6">
        <Card className="text-center !py-3">
          <p className="text-2xl font-bold text-blue-400">
            {myBookings.filter((b) => b.status === "booked").length}
          </p>
          <p className="text-white/40 text-xs mt-1">{locale === "th" ? "รอเช็คอิน" : "Waiting"}</p>
        </Card>
        <Card className="text-center !py-3">
          <p className="text-2xl font-bold text-green-400">
            {myBookings.filter((b) => b.status === "in_service").length}
          </p>
          <p className="text-white/40 text-xs mt-1">{locale === "th" ? "กำลังทำ" : "Active"}</p>
        </Card>
        <Card className="text-center !py-3">
          <p className="text-2xl font-bold text-accent-gold">
            {myBookings.filter((b) => b.status === "completed").length}
          </p>
          <p className="text-white/40 text-xs mt-1">{locale === "th" ? "เสร็จแล้ว" : "Done"}</p>
        </Card>
      </div>

      {/* Quick Start Button */}
      {!showQuickStart && (
        <Button
          variant="primary"
          className="w-full mb-4"
          onClick={() => setShowQuickStart(true)}
        >
          {locale === "th" ? "➕ เริ่มงานใหม่" : "➕ Start New Session"}
        </Button>
      )}

      {/* Quick Start Panel */}
      {showQuickStart && (
        <Card className="mb-4">
          <h3 className="text-white font-heading text-lg mb-4">
            {locale === "th" ? "เริ่มงานใหม่" : "Start New Session"}
          </h3>

          {/* Service Selection - 2 step */}
          <p className="text-white/50 text-sm mb-2">
            {locale === "th" ? "เลือกบริการ" : "Select Service"}
          </p>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {services.map(s => (
              <button
                key={s.id}
                onClick={() => setQsServiceId(s.id)}
                className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                  qsServiceId === s.id
                    ? "border-accent-gold bg-accent-gold/10"
                    : "border-white/10 hover:border-white/30"
                }`}
              >
                <p className={`text-sm font-medium ${qsServiceId === s.id ? "text-accent-gold" : "text-white"}`}>
                  {locale === "th" ? s.name.th : s.name.en}
                </p>
                <p className="text-white/40 text-xs mt-1">
                  {s.duration} {locale === "th" ? "นาที" : "min"} — ฿{s.price.toLocaleString()}
                </p>
              </button>
            ))}
          </div>

          {/* Room Selection */}
          <p className="text-white/50 text-sm mb-2">
            {locale === "th" ? "เลือกห้อง" : "Select Room"}
          </p>
          <div className="grid grid-cols-4 gap-2 mb-4">
            {beds.map(b => {
              const isAvailable = b.status === "available";
              return (
                <button
                  key={b.id}
                  onClick={() => isAvailable && setQsBedId(b.id)}
                  disabled={!isAvailable}
                  className={`p-3 rounded-lg border text-center transition-all ${
                    !isAvailable
                      ? "border-white/5 text-white/20 cursor-not-allowed"
                      : qsBedId === b.id
                        ? "border-accent-gold bg-accent-gold/10 text-accent-gold cursor-pointer"
                        : "border-white/10 text-white/70 hover:border-white/30 cursor-pointer"
                  }`}
                >
                  <p className="font-medium text-sm">{b.name}</p>
                  {!isAvailable && (
                    <p className="text-xs mt-1 opacity-40">{locale === "th" ? "ไม่ว่าง" : "Busy"}</p>
                  )}
                </button>
              );
            })}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              variant="primary"
              className="flex-1"
              onClick={handleQuickStart}
              disabled={!qsServiceId || !qsBedId || qsLoading}
            >
              {qsLoading
                ? "..."
                : locale === "th"
                  ? "เริ่มงาน"
                  : "Start"}
            </Button>
            <Button
              variant="danger"
              onClick={() => { setShowQuickStart(false); setQsServiceId(0); setQsBedId(0); }}
            >
              {locale === "th" ? "ยกเลิก" : "Cancel"}
            </Button>
          </div>
        </Card>
      )}

      {/* Booking Cards */}
      {myBookings.length === 0 && !showQuickStart ? (
        <Card>
          <div className="text-center py-8">
            <p className="text-white/40 text-lg">{locale === "th" ? "ไม่มีรายการ" : "No bookings"}</p>
            <p className="text-white/20 text-sm mt-2">
              {locale === "th" ? "รายการจองของคุณจะแสดงที่นี่" : "Your bookings will appear here"}
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {myBookings.map((booking) => {
            const config = statusConfig[booking.status] || statusConfig.booked;
            const service = services.find((s) => s.id === booking.serviceId);
            const bed = booking.bedId ? beds.find((b) => b.id === booking.bedId) : null;
            const isCheckinOpen = checkinBookingId === booking.id;
            const isThaiMassage = service ? service.name.th.includes("แผนไทย") : false;
            const bookingCommission = service ? getCommission(service.price, isThaiMassage) : 0;

            // Progress calculation for in_service
            const startTime = new Date(booking.startTime);
            const endTime = new Date(booking.endTime);
            const totalDuration = endTime.getTime() - startTime.getTime();
            const elapsed = Math.max(0, now.getTime() - startTime.getTime());
            const remaining = Math.max(0, endTime.getTime() - now.getTime());
            const progress = totalDuration > 0 ? Math.min(100, (elapsed / totalDuration) * 100) : 0;
            const elapsedMin = Math.floor(elapsed / 60000);
            const remainingMin = Math.ceil(remaining / 60000);

            return (
              <Card key={booking.id}>
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="font-heading text-lg text-white">{booking.customerName}</h3>
                    <Badge variant={config.variant}>
                      {locale === "th" ? config.label.th : config.label.en}
                    </Badge>
                  </div>
                  {bed && (
                    <span className="text-accent-gold font-medium text-sm bg-accent-gold/10 px-3 py-1 rounded-lg">
                      {bed.name}
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                  {service && (
                    <div>
                      <span className="text-white/50">{locale === "th" ? "บริการ: " : "Service: "}</span>
                      <span className="text-white">{locale === "th" ? service.name.th : service.name.en}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-white/50">{locale === "th" ? "เวลา: " : "Time: "}</span>
                    <span className="text-white">
                      {startTime.toLocaleTimeString("th", { hour: "2-digit", minute: "2-digit" })}
                      {" - "}
                      {endTime.toLocaleTimeString("th", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  {!bed && booking.status === "booked" && (
                    <div>
                      <span className="text-white/50">{locale === "th" ? "ห้อง: " : "Room: "}</span>
                      <span className="text-white/30 italic">{locale === "th" ? "รอเช็คอิน" : "Pending"}</span>
                    </div>
                  )}
                  {booking.phone && (
                    <div>
                      <span className="text-white/50">{locale === "th" ? "โทร: " : "Phone: "}</span>
                      <span className="text-white">{booking.phone}</span>
                    </div>
                  )}
                  {bookingCommission > 0 && (
                    <div>
                      <span className="text-white/50">{locale === "th" ? "ค่าคอม: " : "Commission: "}</span>
                      <span className="text-emerald-400 font-medium">฿{bookingCommission}{isThaiMassage ? <span className="text-white/30 text-xs ml-1">({locale === "th" ? "นวดไทย ½" : "Thai ½"})</span> : null}</span>
                    </div>
                  )}
                </div>

                {/* Progress bar for in_service */}
                {booking.status === "in_service" && (
                  <div className="mb-4 p-3 rounded-lg bg-surface-dark/50 border border-white/5">
                    <div className="flex justify-between text-xs mb-2">
                      <span className="text-white/50">
                        {locale === "th" ? `ผ่านไป ${elapsedMin} นาที` : `${elapsedMin} min elapsed`}
                      </span>
                      <span className={`font-medium ${remainingMin <= 5 ? "text-red-400" : "text-accent-gold"}`}>
                        {locale === "th" ? `เหลือ ${remainingMin} นาที` : `${remainingMin} min left`}
                      </span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-1000 ${
                          progress >= 100
                            ? "bg-red-400"
                            : progress >= 80
                              ? "bg-gradient-to-r from-accent-gold to-red-400"
                              : "bg-gradient-to-r from-accent-gold-dark to-accent-gold"
                        }`}
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      />
                    </div>
                    <p className="text-white/30 text-xs mt-1 text-right">
                      {Math.round(progress)}%
                      {progress >= 100 && (
                        <span className="text-red-400 ml-2">
                          {locale === "th" ? "เลยเวลาแล้ว!" : "Overtime!"}
                        </span>
                      )}
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div>
                  {booking.status === "booked" && !isCheckinOpen && (
                    <Button size="sm" variant="primary" className="w-full" onClick={() => handleCheckin(booking.id)}>
                      {locale === "th" ? "เช็คอินลูกค้า + เลือกห้อง" : "Check-in + Select Room"}
                    </Button>
                  )}
                  {booking.status === "in_service" && (
                    <Button size="sm" variant="danger" className="w-full" onClick={() => handleEndService(booking.id)}>
                      {t("staff.endService")}
                    </Button>
                  )}
                  {booking.status === "completed" && (
                    <Button size="sm" variant="secondary" className="w-full" onClick={() => handleCheckout(booking.id)}>
                      {t("staff.checkout")}
                    </Button>
                  )}
                </div>

                {/* Check-in: Room Selection Panel */}
                {isCheckinOpen && (
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <p className="text-white/50 text-sm mb-3">
                      {locale === "th" ? "เลือกห้องแล้วกดเริ่มบริการ" : "Select a room and start service"}
                    </p>
                    <div className="grid grid-cols-4 gap-2 mb-3">
                      {beds.map((b) => {
                        const isAvailable = b.status === "available";
                        return (
                          <button
                            key={b.id}
                            onClick={() => isAvailable && setCheckinBedId(b.id)}
                            disabled={!isAvailable}
                            className={`p-3 rounded-lg border text-center transition-all ${
                              !isAvailable
                                ? "border-white/5 text-white/20 cursor-not-allowed"
                                : checkinBedId === b.id
                                  ? "border-accent-gold bg-accent-gold/10 text-accent-gold cursor-pointer"
                                  : "border-white/10 text-white/70 hover:border-white/30 cursor-pointer"
                            }`}
                          >
                            <p className="font-medium text-sm">{b.name}</p>
                            {!isAvailable && (
                              <p className="text-xs mt-1 opacity-40">
                                {locale === "th" ? "ไม่ว่าง" : "Occupied"}
                              </p>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="primary"
                        className="flex-1"
                        onClick={confirmCheckin}
                        disabled={!checkinBedId}
                      >
                        {locale === "th" ? "เช็คอิน + เริ่มบริการ" : "Check-in + Start Service"}
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => { setCheckinBookingId(null); setCheckinBedId(0); }}
                      >
                        {locale === "th" ? "ยกเลิก" : "Cancel"}
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
