"use client";

import { useState, useEffect, useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { bookings as mockBookings, type Booking } from "@/data/bookings";
import { services as mockServices, type Service } from "@/data/services";
import { therapists as mockTherapists, type Therapist } from "@/data/therapists";
import { beds as mockBeds, type Bed } from "@/data/beds";
import { customers as mockCustomers, createCustomer, type Customer } from "@/data/customers";
import { api } from "@/lib/api";
import { transformBooking, transformService, transformTherapist, transformBed } from "@/lib/transform";

const statusConfig: Record<string, { label: { th: string; en: string }; variant: "blue" | "gold" | "green" | "gray" }> = {
  booked: { label: { th: "จองแล้ว", en: "Booked" }, variant: "blue" },
  checked_in: { label: { th: "เช็คอินแล้ว", en: "Checked In" }, variant: "gold" },
  in_service: { label: { th: "กำลังให้บริการ", en: "In Service" }, variant: "green" },
  completed: { label: { th: "เสร็จแล้ว", en: "Completed" }, variant: "gray" },
  checkout: { label: { th: "เช็คเอาท์แล้ว", en: "Checked Out" }, variant: "gray" },
};

const timeSlots = [
  "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00",
];

function LoyaltyBadge({ visitCount, locale }: { visitCount: number; locale: string }) {
  const current = visitCount % 5;
  const isFree = current === 0 && visitCount > 0;

  if (isFree) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-xs font-medium">
        {locale === "th" ? "ฟรี! 1 ครั้ง" : "FREE! 1 session"}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent-gold/15 text-accent-gold text-xs font-medium">
      {current}/5 {locale === "th" ? "ครั้ง" : "visits"}
    </span>
  );
}

function LoyaltyProgress({ visitCount, locale }: { visitCount: number; locale: string }) {
  const current = visitCount % 5;
  const isFree = current === 0 && visitCount > 0;

  return (
    <div className="mt-3 p-3 rounded-lg bg-surface-dark/50 border border-white/5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-white/50 text-xs">
          {locale === "th" ? "สะสมแต้ม" : "Loyalty Progress"}
        </span>
        {isFree ? (
          <span className="text-green-400 text-xs font-bold">
            {locale === "th" ? "ได้ฟรี 1 ครั้ง!" : "Earned FREE session!"}
          </span>
        ) : (
          <span className="text-accent-gold text-xs">
            {locale === "th" ? `อีก ${5 - current} ครั้ง ได้ฟรี` : `${5 - current} more for FREE`}
          </span>
        )}
      </div>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`h-2 flex-1 rounded-full transition-all ${
              isFree
                ? "bg-green-400"
                : i <= current
                  ? "bg-accent-gold"
                  : "bg-white/10"
            }`}
          />
        ))}
      </div>
      <p className="text-white/30 text-xs mt-1.5">
        {locale === "th"
          ? `ใช้บริการทั้งหมด ${visitCount} ครั้ง`
          : `Total visits: ${visitCount}`}
      </p>
    </div>
  );
}

export default function StaffBookingsPage() {
  const t = useTranslations();
  const locale = useLocale();
  const [bookings, setBookings] = useState<Booking[]>(mockBookings);
  const [services, setServices] = useState<Service[]>(mockServices);
  const [therapists, setTherapists] = useState<Therapist[]>(mockTherapists);
  const [beds, setBeds] = useState<Bed[]>(mockBeds);
  const [customerList, setCustomerList] = useState<Customer[]>(mockCustomers);
  const [showForm, setShowForm] = useState(false);

  // Customer selection state
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");

  // Booking form state (no room - room is selected at check-in)
  const [serviceId, setServiceId] = useState(0);
  const [therapistId, setTherapistId] = useState(0);
  const [startTime, setStartTime] = useState("");

  // Check-in state: which booking is being checked in, and which room is selected
  const [checkinBookingId, setCheckinBookingId] = useState<number | null>(null);
  const [checkinBedId, setCheckinBedId] = useState(0);

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

  const searchResults = useMemo(() => {
    if (!customerSearch.trim()) return [];
    const q = customerSearch.toLowerCase();
    return customerList.filter(
      (c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q) || c.phone.includes(q)
    );
  }, [customerSearch, customerList]);

  const resetForm = () => {
    setCustomerSearch("");
    setSelectedCustomer(null);
    setIsNewCustomer(false);
    setNewCustomerName("");
    setNewCustomerPhone("");
    setServiceId(0);
    setTherapistId(0);
    setStartTime("");
    setShowForm(false);
  };

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setCustomerSearch("");
    setIsNewCustomer(false);
  };

  const handleCreateNewCustomer = () => {
    setIsNewCustomer(true);
    setSelectedCustomer(null);
  };

  // Create booking (no room yet)
  const handleSubmit = async () => {
    let customer: Customer;

    if (isNewCustomer) {
      if (!newCustomerName) return;
      customer = createCustomer(newCustomerName, newCustomerPhone);
      setCustomerList((prev) => [...prev, customer]);
    } else if (selectedCustomer) {
      customer = selectedCustomer;
    } else {
      return;
    }

    if (!serviceId || !therapistId || !startTime) return;

    const service = services.find((s) => s.id === serviceId);
    const duration = service?.duration || 60;
    const [h, m] = startTime.split(":").map(Number);
    const start = new Date();
    start.setHours(h, m, 0, 0);
    const end = new Date(start.getTime() + duration * 60000);

    // Increment visit count
    const newVisitCount = customer.visitCount + 1;
    const isFreeVisit = newVisitCount % 5 === 0;

    setCustomerList((prev) =>
      prev.map((c) =>
        c.id === customer.id
          ? { ...c, visitCount: isFreeVisit ? 0 : newVisitCount }
          : c
      )
    );

    const newBooking: Booking = {
      id: bookings.length + 1,
      customerId: customer.id,
      customerName: customer.name,
      phone: customer.phone,
      serviceId,
      therapistId,
      bedId: 0,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      status: "booked",
      createdAt: new Date().toISOString(),
    };

    try {
      const result = await api.createBooking({
        customer_name: customer.name,
        phone: customer.phone,
        service_id: serviceId,
        therapist_id: therapistId,
        bed_id: 0,
        start_time: start.toISOString(),
      });
      if (result?.id) newBooking.id = result.id as number;
    } catch {
      // use local state
    }

    if (isFreeVisit) {
      alert(locale === "th"
        ? `${customer.name} ครบ 5 ครั้ง! ได้รับบริการฟรี 1 ครั้ง`
        : `${customer.name} completed 5 visits! Earned 1 FREE session`
      );
    }

    setBookings((prev) => [newBooking, ...prev]);
    resetForm();
  };

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
          ? { ...b, bedId: checkinBedId, status: "in_service" as const }
          : b
      )
    );

    // Mark room as in_service
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

  const hasCustomer = selectedCustomer || (isNewCustomer && newCustomerName);
  const isFormValid = hasCustomer && serviceId && therapistId && startTime;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-2xl text-white">{t("staff.bookings")}</h1>
        <Button
          variant={showForm ? "danger" : "primary"}
          size="sm"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm
            ? (locale === "th" ? "ยกเลิก" : "Cancel")
            : (locale === "th" ? "+ เพิ่มการจอง" : "+ New Booking")}
        </Button>
      </div>

      {/* Add Booking Form */}
      {showForm && (
        <Card className="mb-6">
          <h2 className="font-heading text-lg text-white mb-4">
            {locale === "th" ? "เพิ่มการจองใหม่" : "New Booking"}
          </h2>
          <div className="space-y-4">
            {/* Customer Selection */}
            <div>
              <label className="block text-white/50 text-sm mb-2">
                {locale === "th" ? "ลูกค้า" : "Customer"}
              </label>

              {!selectedCustomer && !isNewCustomer ? (
                <div>
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    placeholder={locale === "th" ? "ค้นหาชื่อ, รหัส, หรือเบอร์โทร..." : "Search name, code, or phone..."}
                    className="w-full bg-surface-dark border border-white/10 rounded-lg px-4 py-3 text-white focus:border-accent-gold focus:outline-none"
                  />

                  {customerSearch.trim() && (
                    <div className="mt-2 space-y-1">
                      {searchResults.length > 0 ? (
                        searchResults.map((c) => (
                          <button
                            key={c.id}
                            onClick={() => handleSelectCustomer(c)}
                            className="w-full flex items-center justify-between p-3 rounded-lg border border-white/10 hover:border-accent-gold/50 hover:bg-accent-gold/5 transition-all cursor-pointer text-left"
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-accent-gold font-mono text-xs bg-accent-gold/10 px-2 py-1 rounded">
                                {c.code}
                              </span>
                              <div>
                                <p className="text-white text-sm font-medium">{c.name}</p>
                                {c.phone && <p className="text-white/40 text-xs">{c.phone}</p>}
                              </div>
                            </div>
                            <LoyaltyBadge visitCount={c.visitCount} locale={locale} />
                          </button>
                        ))
                      ) : (
                        <p className="text-white/30 text-sm py-2 px-1">
                          {locale === "th" ? "ไม่พบลูกค้า" : "No customers found"}
                        </p>
                      )}
                      <button
                        onClick={handleCreateNewCustomer}
                        className="w-full p-3 rounded-lg border border-dashed border-accent-gold/30 hover:border-accent-gold hover:bg-accent-gold/5 transition-all cursor-pointer text-center"
                      >
                        <span className="text-accent-gold text-sm">
                          {locale === "th" ? "+ สร้างลูกค้าใหม่" : "+ Create New Customer"}
                        </span>
                      </button>
                    </div>
                  )}

                  {!customerSearch.trim() && (
                    <button
                      onClick={handleCreateNewCustomer}
                      className="w-full mt-2 p-3 rounded-lg border border-dashed border-accent-gold/30 hover:border-accent-gold hover:bg-accent-gold/5 transition-all cursor-pointer text-center"
                    >
                      <span className="text-accent-gold text-sm">
                        {locale === "th" ? "+ สร้างลูกค้าใหม่" : "+ Create New Customer"}
                      </span>
                    </button>
                  )}
                </div>
              ) : selectedCustomer ? (
                <div className="p-4 rounded-lg border border-accent-gold/30 bg-accent-gold/5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-accent-gold font-mono text-sm bg-accent-gold/10 px-2 py-1 rounded">
                        {selectedCustomer.code}
                      </span>
                      <div>
                        <p className="text-white font-medium">{selectedCustomer.name}</p>
                        {selectedCustomer.phone && (
                          <p className="text-white/40 text-xs">{selectedCustomer.phone}</p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => { setSelectedCustomer(null); setCustomerSearch(""); }}
                      className="text-white/40 hover:text-white text-sm cursor-pointer"
                    >
                      {locale === "th" ? "เปลี่ยน" : "Change"}
                    </button>
                  </div>
                  <LoyaltyProgress visitCount={selectedCustomer.visitCount} locale={locale} />
                </div>
              ) : (
                <div className="p-4 rounded-lg border border-accent-gold/30 bg-accent-gold/5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-accent-gold text-sm font-medium">
                      {locale === "th" ? "ลูกค้าใหม่" : "New Customer"}
                    </h3>
                    <button
                      onClick={() => { setIsNewCustomer(false); setCustomerSearch(""); }}
                      className="text-white/40 hover:text-white text-sm cursor-pointer"
                    >
                      {locale === "th" ? "ยกเลิก" : "Cancel"}
                    </button>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-white/50 text-xs mb-1">
                        {locale === "th" ? "ชื่อลูกค้า *" : "Customer Name *"}
                      </label>
                      <input
                        type="text"
                        value={newCustomerName}
                        onChange={(e) => setNewCustomerName(e.target.value)}
                        placeholder={locale === "th" ? "กรอกชื่อลูกค้า" : "Enter name"}
                        className="w-full bg-surface-dark border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:border-accent-gold focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-white/50 text-xs mb-1">
                        {locale === "th" ? "เบอร์โทร (ไม่บังคับ)" : "Phone (optional)"}
                      </label>
                      <input
                        type="tel"
                        value={newCustomerPhone}
                        onChange={(e) => setNewCustomerPhone(e.target.value)}
                        placeholder="08X-XXX-XXXX"
                        className="w-full bg-surface-dark border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:border-accent-gold focus:outline-none"
                      />
                    </div>
                    <p className="text-white/30 text-xs">
                      {locale === "th"
                        ? "ระบบจะสร้างรหัสลูกค้าอัตโนมัติ"
                        : "A customer code will be generated automatically"}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Service Selection */}
            <div>
              <label className="block text-white/50 text-sm mb-2">
                {locale === "th" ? "เลือกบริการ" : "Service"}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {services.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setServiceId(s.id)}
                    className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                      serviceId === s.id
                        ? "border-accent-gold bg-accent-gold/10 text-accent-gold"
                        : "border-white/10 text-white/70 hover:border-white/30"
                    }`}
                  >
                    <p className="font-medium text-sm">{locale === "th" ? s.name.th : s.name.en}</p>
                    <p className="text-xs mt-1 opacity-60">{s.price} {locale === "th" ? "บาท" : "THB"} / {s.duration} {locale === "th" ? "นาที" : "min"}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Therapist Selection */}
            <div>
              <label className="block text-white/50 text-sm mb-2">
                {locale === "th" ? "เลือกหมอนวด" : "Therapist"}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {therapists.map((th) => (
                  <button
                    key={th.id}
                    onClick={() => setTherapistId(th.id)}
                    className={`p-3 rounded-lg border text-center transition-all cursor-pointer ${
                      therapistId === th.id
                        ? "border-accent-gold bg-accent-gold/10 text-accent-gold"
                        : "border-white/10 text-white/70 hover:border-white/30"
                    }`}
                  >
                    <p className="font-medium text-sm">{locale === "th" ? th.name.th : th.name.en}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Time Selection */}
            <div>
              <label className="block text-white/50 text-sm mb-2">
                {locale === "th" ? "เลือกเวลา" : "Time"}
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {timeSlots.map((slot) => (
                  <button
                    key={slot}
                    onClick={() => setStartTime(slot)}
                    className={`py-2 px-3 rounded-lg border text-center text-sm transition-all cursor-pointer ${
                      startTime === slot
                        ? "border-accent-gold bg-accent-gold/10 text-accent-gold"
                        : "border-white/10 text-white/70 hover:border-white/30"
                    }`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>

            {/* Free visit notice */}
            {selectedCustomer && selectedCustomer.visitCount % 5 === 0 && selectedCustomer.visitCount > 0 && (
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-center">
                <p className="text-green-400 font-medium">
                  {locale === "th"
                    ? "ลูกค้าท่านนี้ได้รับบริการฟรี 1 ครั้ง!"
                    : "This customer has earned a FREE session!"}
                </p>
              </div>
            )}

            {/* Submit */}
            <Button
              variant="primary"
              size="lg"
              className="w-full mt-2"
              onClick={handleSubmit}
              disabled={!isFormValid}
            >
              {locale === "th" ? "บันทึกการจอง" : "Save Booking"}
            </Button>
          </div>
        </Card>
      )}

      {/* Booking List */}
      <div className="space-y-4">
        {bookings.map((booking) => {
          const config = statusConfig[booking.status] || statusConfig.booked;
          const service = services.find((s) => s.id === booking.serviceId);
          const therapist = therapists.find((th) => th.id === booking.therapistId);
          const bed = booking.bedId ? beds.find((b) => b.id === booking.bedId) : null;
          const customer = booking.customerId
            ? customerList.find((c) => c.id === booking.customerId)
            : null;
          const isCheckinOpen = checkinBookingId === booking.id;

          return (
            <Card key={booking.id}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="font-heading text-lg text-white">{booking.customerName}</h3>
                    {customer && (
                      <span className="text-accent-gold/60 font-mono text-xs">{customer.code}</span>
                    )}
                    <Badge variant={config.variant}>{locale === "th" ? config.label.th : config.label.en}</Badge>
                    {customer && (
                      <LoyaltyBadge visitCount={customer.visitCount} locale={locale} />
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {service && (
                      <div>
                        <span className="text-white/50">{locale === "th" ? "บริการ: " : "Service: "}</span>
                        <span className="text-white">{locale === "th" ? service.name.th : service.name.en}</span>
                      </div>
                    )}
                    {therapist && (
                      <div>
                        <span className="text-white/50">{locale === "th" ? "หมอนวด: " : "Therapist: "}</span>
                        <span className="text-white">{locale === "th" ? therapist.name.th : therapist.name.en}</span>
                      </div>
                    )}
                    {bed && (
                      <div>
                        <span className="text-white/50">{locale === "th" ? "ห้อง: " : "Room: "}</span>
                        <span className="text-white">{bed.name}</span>
                      </div>
                    )}
                    {!bed && booking.status === "booked" && (
                      <div>
                        <span className="text-white/50">{locale === "th" ? "ห้อง: " : "Room: "}</span>
                        <span className="text-white/30 italic">{locale === "th" ? "รอเช็คอิน" : "Pending check-in"}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-white/50">{locale === "th" ? "เวลา: " : "Time: "}</span>
                      <span className="text-white">
                        {new Date(booking.startTime).toLocaleTimeString("th", { hour: "2-digit", minute: "2-digit" })}
                        {" - "}
                        {new Date(booking.endTime).toLocaleTimeString("th", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  {booking.status === "booked" && !isCheckinOpen && (
                    <Button size="sm" variant="outline" onClick={() => handleCheckin(booking.id)}>
                      {t("staff.checkin")}
                    </Button>
                  )}
                  {booking.status === "in_service" && (
                    <Button size="sm" variant="primary" onClick={() => handleEndService(booking.id)}>
                      {t("staff.endService")}
                    </Button>
                  )}
                  {booking.status === "completed" && (
                    <Button size="sm" variant="secondary" onClick={() => handleCheckout(booking.id)}>
                      {t("staff.checkout")}
                    </Button>
                  )}
                </div>
              </div>

              {/* Check-in: Room Selection Panel */}
              {isCheckinOpen && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <p className="text-white/50 text-sm mb-3">
                    {locale === "th" ? "เลือกห้องแล้วกดเริ่มบริการ" : "Select a room and start service"}
                  </p>
                  <div className="grid grid-cols-4 gap-2 mb-3">
                    {beds.map((bed) => {
                      const isAvailable = bed.status === "available";
                      return (
                        <button
                          key={bed.id}
                          onClick={() => isAvailable && setCheckinBedId(bed.id)}
                          disabled={!isAvailable}
                          className={`p-3 rounded-lg border text-center transition-all ${
                            !isAvailable
                              ? "border-white/5 text-white/20 cursor-not-allowed"
                              : checkinBedId === bed.id
                                ? "border-accent-gold bg-accent-gold/10 text-accent-gold cursor-pointer"
                                : "border-white/10 text-white/70 hover:border-white/30 cursor-pointer"
                          }`}
                        >
                          <p className="font-medium text-sm">{bed.name}</p>
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
    </div>
  );
}
