"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { type Booking } from "@/data/bookings";
import { type Service } from "@/data/services";
import { type Therapist } from "@/data/therapists";
import { type Bed } from "@/data/beds";
import { api } from "@/lib/api";
import { transformBooking, transformService, transformTherapist, transformBed } from "@/lib/transform";

// Commission calculation
// Thai massage: 50% of price (400→200, 600→300, 800→400, 1000→500)
// Aroma/other: 600→100, 800→200, 1000→250
function getCommission(price: number, isThaiMassage: boolean): number {
  if (isThaiMassage) {
    return Math.round(price / 2);
  }
  if (price >= 1000) return 250;
  if (price >= 800) return 200;
  if (price >= 600) return 100;
  return 0;
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

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [beds, setBeds] = useState<Bed[]>([]);
  const [now, setNow] = useState<Date | null>(null);
  const [mounted, setMounted] = useState(false);

  // Get logged-in therapist ID from JWT
  const [myTherapistId, setMyTherapistId] = useState<number | null>(null);
  useEffect(() => {
    try {
      const token = localStorage.getItem("token");
      if (token) {
        const payload = JSON.parse(atob(token.split(".")[1]));
        if (payload.role === "therapist") setMyTherapistId(payload.id);
      }
    } catch {}
  }, []);

  // Check-in state
  const [checkinLoading, setCheckinLoading] = useState<number | null>(null);

  // Commission data from API (last 7 days)
  const [accumulatedCommission, setAccumulatedCommission] = useState(0);
  const [todayCommissionFromApi, setTodayCommissionFromApi] = useState(0);
  const [todaySessionsFromApi, setTodaySessionsFromApi] = useState(0);
  useEffect(() => {
    api.getMyCommissions().then((data: any) => {
      const records = data || [];
      const total = records.reduce((sum: number, c: any) => sum + (Number(c.total_commission) || 0), 0);
      setAccumulatedCommission(total);
      // Find today's record (Thai timezone) — API returns date as ISO "2026-03-11T00:00:00.000Z"
      const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
      const todayRecord = records.find((c: any) => (c.date || "").substring(0, 10) === todayStr);
      setTodayCommissionFromApi(Number(todayRecord?.total_commission) || 0);
      setTodaySessionsFromApi(Number(todayRecord?.total_sessions) || 0);
    }).catch(() => {});
  }, []);

  // Quick start state
  const [showQuickStart, setShowQuickStart] = useState(false);
  const [qsTherapistId, setQsTherapistId] = useState(0);
  const [qsServiceId, setQsServiceId] = useState(0);
  const [qsBedId, setQsBedId] = useState(0);
  const [qsPaymentMethod, setQsPaymentMethod] = useState<"cash" | "bank_transfer">("cash");
  const [qsLoading, setQsLoading] = useState(false);

  useEffect(() => {
    setNow(new Date());
    setMounted(true);
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Auto-complete: end service automatically if overtime > 30 minutes
  useEffect(() => {
    const autoCompleteCheck = () => {
      const currentTime = new Date();
      setBookings((prev) => {
        const toComplete: number[] = [];
        const updated = prev.map((b) => {
          if (b.status !== "in_service") return b;
          const endTime = new Date(b.endTime);
          const overtimeMs = currentTime.getTime() - endTime.getTime();
          if (overtimeMs > 30 * 60 * 1000) {
            toComplete.push(b.id);
            return { ...b, status: "completed" as const };
          }
          return b;
        });
        // Fire API calls outside of setState
        if (toComplete.length > 0) {
          setTimeout(() => {
            for (const id of toComplete) {
              const booking = prev.find((b) => b.id === id);
              api.updateBookingStatus(id, "completed").catch(() => {});
              if (booking?.bedId) {
                setBeds((beds) =>
                  beds.map((bed) =>
                    bed.id === booking.bedId
                      ? { ...bed, status: "available" as const, currentBookingId: undefined }
                      : bed
                  )
                );
              }
            }
          }, 0);
        }
        return updated;
      });
    };
    const interval = setInterval(autoCompleteCheck, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    Promise.all([
      api.getBookings(), api.getServices(), api.getTherapists(), api.getBeds(),
    ]).then(([rawB, rawS, rawT, rawBd]) => {
      setBookings(rawB.map(transformBooking));
      setServices(rawS.map(transformService));
      setTherapists(rawT.map(transformTherapist));
      setBeds(rawBd.map(transformBed));
    }).catch(() => {});
  }, []);

  // All today's bookings, exclude checkout and cancelled
  const todayBookings = bookings
    .filter((b) => {
      const today = new Date();
      const bd = new Date(b.startTime);
      return bd.getFullYear() === today.getFullYear() &&
        bd.getMonth() === today.getMonth() &&
        bd.getDate() === today.getDate() &&
        b.status !== "checkout" && b.status !== "cancelled";
    })
    .sort((a, b) => {
      const order = { in_service: 0, booked: 1, completed: 2 };
      const oa = order[a.status as keyof typeof order] ?? 3;
      const ob = order[b.status as keyof typeof order] ?? 3;
      if (oa !== ob) return oa - ob;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  // Check-in — room is already assigned from booking, just start service
  const handleCheckin = (bookingId: number) => {
    const booking = bookings.find((b) => b.id === bookingId);
    if (!booking) return;
    setCheckinLoading(bookingId);
    setBookings((prev) =>
      prev.map((b) =>
        b.id === bookingId
          ? { ...b, status: "in_service" as const, startTime: new Date().toISOString() }
          : b
      )
    );
    if (booking.bedId) {
      setBeds((prev) =>
        prev.map((bed) =>
          bed.id === booking.bedId
            ? { ...bed, status: "in_service" as const, currentBookingId: bookingId }
            : bed
        )
      );
    }
    api.updateBookingStatus(bookingId, "in_service", booking.bedId).catch(() => {});
    setCheckinLoading(null);
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

  // Cancel booking (to edit/re-create)
  const handleCancelBooking = (bookingId: number) => {
    const booking = bookings.find((b) => b.id === bookingId);
    setBookings((prev) =>
      prev.map((b) =>
        b.id === bookingId ? { ...b, status: "cancelled" as const } : b
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
    api.updateBookingStatus(bookingId, "cancelled").catch(() => {});
  };

  // Quick start
  const handleQuickStart = async () => {
    if (!qsServiceId || !qsBedId || !qsTherapistId) return;
    setQsLoading(true);
    const service = services.find(s => s.id === qsServiceId);
    if (!service) return;

    const now2 = new Date();
    const endTime = new Date(now2.getTime() + service.duration * 60000);

    const bookingData = {
      customer_name: locale === "th" ? "ลูกค้า Walk-in" : "Walk-in Customer",
      phone: "-",
      service_id: qsServiceId,
      therapist_id: qsTherapistId,
      bed_id: qsBedId,
      start_time: now2.toISOString(),
      end_time: endTime.toISOString(),
      status: "in_service",
      payment_method: qsPaymentMethod,
    };

    try {
      const result = await api.createBooking(bookingData);
      const newBooking = transformBooking(result as Record<string, unknown>);
      setBookings(prev => [...prev, newBooking]);
      setBeds(prev => prev.map(b => b.id === qsBedId ? { ...b, status: "in_service" as const, currentBookingId: newBooking.id } : b));
    } catch {
      const fakeId = Date.now();
      const newBooking: Booking = {
        id: fakeId,
        customerName: locale === "th" ? "ลูกค้า Walk-in" : "Walk-in Customer",
        phone: "-",
        serviceId: qsServiceId,
        therapistId: qsTherapistId,
        bedId: qsBedId,
        startTime: now2.toISOString(),
        endTime: endTime.toISOString(),
        status: "in_service",
        createdAt: now2.toISOString(),
      };
      setBookings(prev => [...prev, newBooking]);
      setBeds(prev => prev.map(b => b.id === qsBedId ? { ...b, status: "in_service" as const, currentBookingId: fakeId } : b));
    }
    setShowQuickStart(false);
    setQsTherapistId(0);
    setQsServiceId(0);
    setQsBedId(0);
    setQsPaymentMethod("cash");
    setQsLoading(false);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <div>
          <h1 className="font-heading text-xl md:text-2xl text-white">{t("staff.session")}</h1>
          <p className="text-white/50 text-xs md:text-sm mt-1">
            {todayBookings.length} {locale === "th" ? "รายการวันนี้" : "booking(s) today"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-accent-gold text-lg md:text-2xl font-bold font-mono">
            {mounted && now ? now.toLocaleTimeString("th", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "--:--:--"}
          </p>
        </div>
      </div>

      {/* Commission Summary - 2 boxes */}
      <div className="grid grid-cols-2 gap-3 mb-4 md:mb-6">
        {/* Accumulated commission box */}
        <div className="relative rounded-2xl overflow-hidden border-2 border-amber-400/30 bg-gradient-to-br from-amber-900/40 via-amber-800/20 to-surface-card p-4 md:p-5 text-center">
          <div className="absolute inset-0 bg-gradient-to-t from-amber-500/10 to-transparent pointer-events-none" />
          <div className="relative">
            <p className="text-amber-300/70 text-xs font-medium tracking-wide mb-1">
              💰 {locale === "th" ? "ค่าคอมรวม" : "Total Commission"}
            </p>
            <p className="text-2xl md:text-4xl font-extrabold text-amber-400 font-mono leading-none">
              ฿{accumulatedCommission.toLocaleString()}
            </p>
            <p className="text-amber-300/50 text-xs mt-2">
              {locale === "th" ? "7 วันล่าสุด" : "Last 7 days"}
            </p>
          </div>
        </div>

        {/* Commission box */}
        <div className="relative rounded-2xl overflow-hidden border-2 border-emerald-400/30 bg-gradient-to-br from-emerald-900/40 via-emerald-800/20 to-surface-card p-4 md:p-5 text-center">
          <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/10 to-transparent pointer-events-none" />
          <div className="relative">
            <p className="text-emerald-300/70 text-xs font-medium tracking-wide mb-1">
              💰 {locale === "th" ? "ค่าคอมวันนี้" : "Commission Today"}
            </p>
            <p className="text-2xl md:text-4xl font-extrabold text-emerald-400 font-mono leading-none drop-shadow-[0_0_20px_rgba(52,211,153,0.3)]">
              ฿{todayCommissionFromApi.toLocaleString()}
            </p>
            <p className="text-emerald-300/50 text-xs mt-2">
              {todaySessionsFromApi} {locale === "th" ? "รายการ" : "sessions"}
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 md:gap-3 mb-4 md:mb-6">
        <Card className="text-center !py-3">
          <p className="text-2xl font-bold text-blue-400">
            {todayBookings.filter((b) => b.status === "booked").length}
          </p>
          <p className="text-white/40 text-xs mt-1">{locale === "th" ? "รอเช็คอิน" : "Waiting"}</p>
        </Card>
        <Card className="text-center !py-3">
          <p className="text-2xl font-bold text-green-400">
            {todayBookings.filter((b) => b.status === "in_service").length}
          </p>
          <p className="text-white/40 text-xs mt-1">{locale === "th" ? "กำลังทำ" : "Active"}</p>
        </Card>
        <Card className="text-center !py-3">
          <p className="text-2xl font-bold text-accent-gold">
            {todayBookings.filter((b) => b.status === "completed").length}
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

          {/* Therapist Selection — Purple theme */}
          <div className="mb-5 p-3 rounded-xl bg-purple-500/5 border border-purple-500/10">
            <p className="text-purple-300 text-sm font-medium mb-2 flex items-center gap-1.5">
              <span className="text-base">👤</span>
              {locale === "th" ? "เลือกหมอนวด" : "Select Therapist"}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {therapists.map(th => (
                <button
                  key={th.id}
                  onClick={() => setQsTherapistId(th.id)}
                  className={`p-3 rounded-lg border-2 text-center transition-all cursor-pointer ${
                    qsTherapistId === th.id
                      ? "border-purple-400 bg-purple-500/20 text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.15)]"
                      : "border-white/10 text-white/70 hover:border-purple-400/40 hover:bg-purple-500/5"
                  }`}
                >
                  <p className="font-medium text-sm">{locale === "th" ? th.name.th : th.name.en}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Service Selection — Amber/Gold theme */}
          <div className="mb-5 p-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
            <p className="text-amber-300 text-sm font-medium mb-2 flex items-center gap-1.5">
              <span className="text-base">💆</span>
              {locale === "th" ? "เลือกบริการ" : "Select Service"}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {services.map(s => (
                <button
                  key={s.id}
                  onClick={() => setQsServiceId(s.id)}
                  className={`p-3 rounded-lg border-2 text-left transition-all cursor-pointer ${
                    qsServiceId === s.id
                      ? "border-amber-400 bg-amber-500/20 shadow-[0_0_12px_rgba(245,158,11,0.15)]"
                      : "border-white/10 hover:border-amber-400/40 hover:bg-amber-500/5"
                  }`}
                >
                  <p className={`text-sm font-medium ${qsServiceId === s.id ? "text-amber-300" : "text-white"}`}>
                    {locale === "th" ? s.name.th : s.name.en}
                  </p>
                  <p className="text-white/40 text-xs mt-1">
                    {s.duration} {locale === "th" ? "นาที" : "min"} — ฿{s.price.toLocaleString()}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Room Selection — Cyan/Teal theme */}
          <div className="mb-5 p-3 rounded-xl bg-cyan-500/5 border border-cyan-500/10">
            <p className="text-cyan-300 text-sm font-medium mb-2 flex items-center gap-1.5">
              <span className="text-base">🚪</span>
              {locale === "th" ? "เลือกห้อง" : "Select Room"}
            </p>
            <div className="grid grid-cols-4 gap-2">
              {beds.map(b => {
                const isAvailable = b.status === "available";
                return (
                  <button
                    key={b.id}
                    onClick={() => isAvailable && setQsBedId(b.id)}
                    disabled={!isAvailable}
                    className={`p-3 rounded-lg border-2 text-center transition-all ${
                      !isAvailable
                        ? "border-white/5 text-white/20 cursor-not-allowed bg-white/[0.02]"
                        : qsBedId === b.id
                          ? "border-cyan-400 bg-cyan-500/20 text-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.15)] cursor-pointer"
                          : "border-white/10 text-white/70 hover:border-cyan-400/40 hover:bg-cyan-500/5 cursor-pointer"
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
          </div>

          {/* Payment Method — Green/Blue theme */}
          <div className="mb-5 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
            <p className="text-emerald-300 text-sm font-medium mb-2 flex items-center gap-1.5">
              <span className="text-base">💰</span>
              {locale === "th" ? "ประเภทการรับเงิน" : "Payment Method"}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setQsPaymentMethod("cash")}
                className={`p-3 rounded-lg border-2 text-center transition-all cursor-pointer ${
                  qsPaymentMethod === "cash"
                    ? "border-green-400 bg-green-500/20 shadow-[0_0_12px_rgba(74,222,128,0.15)]"
                    : "border-white/10 hover:border-green-400/40 hover:bg-green-500/5"
                }`}
              >
                <span className="text-2xl">💵</span>
                <p className={`text-sm font-medium mt-1 ${qsPaymentMethod === "cash" ? "text-green-400" : "text-white/70"}`}>
                  {locale === "th" ? "เงินสด" : "Cash"}
                </p>
              </button>
              <button
                onClick={() => setQsPaymentMethod("bank_transfer")}
                className={`p-3 rounded-lg border-2 text-center transition-all cursor-pointer ${
                  qsPaymentMethod === "bank_transfer"
                    ? "border-blue-400 bg-blue-500/20 shadow-[0_0_12px_rgba(96,165,250,0.15)]"
                    : "border-white/10 hover:border-blue-400/40 hover:bg-blue-500/5"
                }`}
              >
                <span className="text-2xl">📱</span>
                <p className={`text-sm font-medium mt-1 ${qsPaymentMethod === "bank_transfer" ? "text-blue-400" : "text-white/70"}`}>
                  {locale === "th" ? "เงินโอน" : "Transfer"}
                </p>
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              variant="primary"
              className="flex-1"
              onClick={handleQuickStart}
              disabled={!qsTherapistId || !qsServiceId || !qsBedId || qsLoading}
            >
              {qsLoading ? "..." : locale === "th" ? "เริ่มงาน" : "Start"}
            </Button>
            <Button
              variant="danger"
              onClick={() => { setShowQuickStart(false); setQsTherapistId(0); setQsServiceId(0); setQsBedId(0); setQsPaymentMethod("cash"); }}
            >
              {locale === "th" ? "ยกเลิก" : "Cancel"}
            </Button>
          </div>
        </Card>
      )}

      {/* Booking Cards - All therapists */}
      {todayBookings.length === 0 && !showQuickStart ? (
        <Card>
          <div className="text-center py-8">
            <p className="text-white/40 text-lg">{locale === "th" ? "ไม่มีรายการ" : "No bookings"}</p>
            <p className="text-white/20 text-sm mt-2">
              {locale === "th" ? "กดปุ่ม เริ่มงานใหม่ เพื่อเริ่มบริการ" : "Press Start New Session to begin"}
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {todayBookings.map((booking) => {
            const config = statusConfig[booking.status] || statusConfig.booked;
            const service = services.find((s) => s.id === booking.serviceId);
            const therapist = therapists.find((th) => th.id === booking.therapistId);
            const bed = booking.bedId ? beds.find((b) => b.id === booking.bedId) : null;
            const isThaiMassage = service ? service.name.th.includes("นวดไทย") : false;
            const bookingCommission = service ? getCommission(service.price, isThaiMassage) : 0;

            // Progress calculation for in_service
            const startTime = new Date(booking.startTime);
            const endTime = new Date(booking.endTime);
            const currentTime = now || new Date();
            const totalDuration = endTime.getTime() - startTime.getTime();
            const elapsed = Math.max(0, currentTime.getTime() - startTime.getTime());
            const remaining = Math.max(0, endTime.getTime() - currentTime.getTime());
            const progress = totalDuration > 0 ? Math.min(100, (elapsed / totalDuration) * 100) : 0;
            const elapsedMin = Math.floor(elapsed / 60000);
            const remainingMin = Math.ceil(remaining / 60000);

            return (
              <Card key={booking.id}>
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    {therapist && (
                      <span className="text-accent-gold font-medium text-sm bg-accent-gold/10 px-2 py-0.5 rounded-lg">
                        {locale === "th" ? therapist.name.th : therapist.name.en}
                      </span>
                    )}
                    <h3 className="font-heading text-base text-white">{booking.customerName}</h3>
                    <Badge variant={config.variant}>
                      {locale === "th" ? config.label.th : config.label.en}
                    </Badge>
                  </div>
                  {bed && (
                    <span className="text-white/70 font-medium text-xs bg-white/10 px-2 py-1 rounded-lg">
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
                  {bookingCommission > 0 && (
                    <div>
                      <span className="text-white/50">{locale === "th" ? "ค่าคอม: " : "Commission: "}</span>
                      <span className="text-emerald-400 font-medium">฿{bookingCommission}</span>
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
                  {booking.status === "booked" && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="primary" className="flex-1" onClick={() => handleCheckin(booking.id)} disabled={checkinLoading === booking.id}>
                        {checkinLoading === booking.id ? "..." : locale === "th" ? "เช็คอิน + เริ่มบริการ" : "Check-in + Start Service"}
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => handleCancelBooking(booking.id)}>
                        {locale === "th" ? "ยกเลิก" : "Cancel"}
                      </Button>
                    </div>
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

              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
