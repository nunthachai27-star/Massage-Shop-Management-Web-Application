"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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

const statusConfig: Record<string, { label: { th: string; en: string }; variant: "blue" | "gold" | "green" | "gray" | "red" }> = {
  booked: { label: { th: "จองแล้ว", en: "Booked" }, variant: "blue" },
  checked_in: { label: { th: "เช็คอินแล้ว", en: "Checked In" }, variant: "gold" },
  in_service: { label: { th: "กำลังให้บริการ", en: "In Service" }, variant: "green" },
  completed: { label: { th: "เสร็จแล้ว", en: "Completed" }, variant: "gray" },
  checkout: { label: { th: "เช็คเอาท์แล้ว", en: "Checked Out" }, variant: "gray" },
  cancelled: { label: { th: "ยกเลิกแล้ว", en: "Cancelled" }, variant: "red" },
};

// Generate time slots from 10:30 to 22:00 every 30 minutes
const timeSlots: string[] = [];
for (let h = 10; h <= 22; h++) {
  for (const m of [0, 30]) {
    if (h === 10 && m === 0) continue; // start at 10:30
    if (h === 22 && m === 30) continue; // end at 22:00
    timeSlots.push(`${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`);
  }
}

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
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [beds, setBeds] = useState<Bed[]>([]);
  const [customerList, setCustomerList] = useState<Customer[]>([]);
  const [showForm, setShowForm] = useState(false);

  // Customer selection state
  const [customerSearch, setCustomerSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Customer[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Booking form state (no room - room is selected at check-in)
  const [serviceId, setServiceId] = useState(0);
  const [therapistId, setTherapistId] = useState(0);
  const [startTime, setStartTime] = useState("");
  const [bookingGender, setBookingGender] = useState<"male" | "female">("male");

  // Check-in state: which booking is being checked in, and which room is selected
  const [checkinBookingId, setCheckinBookingId] = useState<number | null>(null);
  const [checkinBedId, setCheckinBedId] = useState(0);

  // Edit booking state
  const [editBookingId, setEditBookingId] = useState<number | null>(null);
  const [editTherapistId, setEditTherapistId] = useState(0);
  const [editServiceId, setEditServiceId] = useState(0);
  const [editBedId, setEditBedId] = useState(0);
  const [editGender, setEditGender] = useState<"male" | "female">("male");
  const [editSaving, setEditSaving] = useState(false);

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

  const localSearch = useCallback((query: string) => {
    const q = query.toLowerCase();
    return customerList.filter(
      (c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q) || c.phone.includes(q)
    );
  }, [customerList]);

  const doSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    try {
      const data = await api.getCustomers(query);
      const apiResults = data.map((r: Record<string, unknown>) => ({
        id: r.id as number,
        code: (r.customer_code || r.code || "") as string,
        name: (r.name || "") as string,
        phone: (r.phone || "") as string,
        visitCount: (r.visit_count ?? r.visitCount ?? 0) as number,
        createdAt: (r.created_at || r.createdAt || "") as string,
      }));
      // Merge with local results (avoid duplicates by id)
      const localResults = localSearch(query);
      const apiIds = new Set(apiResults.map((r: Customer) => r.id));
      const merged = [...apiResults, ...localResults.filter(c => !apiIds.has(c.id))];
      setSearchResults(merged);
    } catch {
      setSearchResults(localSearch(query));
    }
    setSearchLoading(false);
  }, [localSearch]);

  const handleSearchChange = (value: string) => {
    setCustomerSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    debounceRef.current = setTimeout(() => doSearch(value), 300);
  };

  const resetForm = () => {
    setCustomerSearch("");
    setSelectedCustomer(null);
    setIsNewCustomer(false);
    setNewCustomerName("");
    setNewCustomerPhone("");
    setServiceId(0);
    setTherapistId(0);
    setStartTime("");
    setBookingGender("male");
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
      customerGender: bookingGender,
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
        customer_gender: bookingGender,
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

  // Open edit panel
  const openEdit = (bookingId: number) => {
    const booking = bookings.find((b) => b.id === bookingId);
    if (!booking) return;
    setEditBookingId(bookingId);
    setEditTherapistId(booking.therapistId);
    setEditServiceId(booking.serviceId);
    setEditBedId(booking.bedId || 0);
    setEditGender(booking.customerGender || "male");
  };

  // Save edit
  const saveEdit = async () => {
    if (!editBookingId) return;
    setEditSaving(true);
    const booking = bookings.find((b) => b.id === editBookingId);
    if (!booking) return;

    const changes: { therapist_id?: number; service_id?: number; bed_id?: number; customer_gender?: string } = {};
    if (editTherapistId !== booking.therapistId) changes.therapist_id = editTherapistId;
    if (editServiceId !== booking.serviceId) changes.service_id = editServiceId;
    if (editBedId !== (booking.bedId || 0)) changes.bed_id = editBedId;
    if (editGender !== (booking.customerGender || "male")) changes.customer_gender = editGender;

    if (Object.keys(changes).length > 0) {
      // Update frontend state
      const newService = services.find((s) => s.id === editServiceId);
      const newEndTime = newService
        ? new Date(new Date(booking.startTime).getTime() + newService.duration * 60000).toISOString()
        : booking.endTime;

      // Release old bed if changed
      if (changes.bed_id && booking.bedId && booking.bedId !== changes.bed_id) {
        setBeds((prev) =>
          prev.map((bed) =>
            bed.id === booking.bedId
              ? { ...bed, status: "available" as const, currentBookingId: undefined }
              : bed
          )
        );
      }
      // Assign new bed
      if (changes.bed_id) {
        setBeds((prev) =>
          prev.map((bed) =>
            bed.id === changes.bed_id
              ? { ...bed, status: booking.status === "in_service" ? "in_service" as const : "reserved" as const, currentBookingId: editBookingId }
              : bed
          )
        );
      }

      setBookings((prev) =>
        prev.map((b) =>
          b.id === editBookingId
            ? {
                ...b,
                ...(changes.therapist_id ? { therapistId: changes.therapist_id } : {}),
                ...(changes.service_id ? { serviceId: changes.service_id, endTime: newEndTime } : {}),
                ...(changes.bed_id ? { bedId: changes.bed_id } : {}),
                ...(changes.customer_gender ? { customerGender: changes.customer_gender as "male" | "female" } : {}),
              }
            : b
        )
      );

      api.updateBookingDetails(editBookingId, changes).catch(() => {});
    }

    setEditBookingId(null);
    setEditSaving(false);
  };

  // Cancel booking
  const handleCancel = (bookingId: number) => {
    const booking = bookings.find((b) => b.id === bookingId);
    setBookings((prev) =>
      prev.map((b) =>
        b.id === bookingId ? { ...b, status: "cancelled" as Booking["status"] } : b
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

  const hasCustomer = selectedCustomer || (isNewCustomer && newCustomerName);
  const isFormValid = hasCustomer && serviceId && therapistId && startTime;

  return (
    <div>
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <h1 className="font-heading text-xl md:text-2xl text-white">{t("staff.bookings")}</h1>
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
                    onChange={(e) => handleSearchChange(e.target.value)}
                    placeholder={locale === "th" ? "พิมพ์ชื่อ, รหัส, หรือเบอร์โทร..." : "Type name, code, or phone..."}
                    className="w-full bg-surface-dark border border-white/10 rounded-lg px-4 py-3 text-white focus:border-accent-gold focus:outline-none"
                  />

                  {customerSearch.trim() && (
                    <div className="mt-2 space-y-1">
                      {searchLoading ? (
                        <p className="text-white/30 text-sm py-2 px-1 text-center">
                          {locale === "th" ? "กำลังค้นหา..." : "Searching..."}
                        </p>
                      ) : searchResults.length > 0 ? (
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

            {/* Service Selection — 2-step: type → duration */}
            <div>
              <label className="block text-white/50 text-sm mb-2">
                {locale === "th" ? "เลือกบริการ" : "Service"}
              </label>

              {/* Step 1: Type */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                {[
                  { key: "thai", label: { th: "นวดไทย", en: "Thai" }, icon: "🤲" },
                  { key: "aroma", label: { th: "อโรม่า", en: "Aroma" }, icon: "🌿" },
                ].map((type) => {
                  const typeServices = services.filter((s) => (s.category || (s.id <= 3 ? "thai" : "aroma")) === type.key);
                  const isSelected = typeServices.some((s) => s.id === serviceId);
                  return (
                    <button
                      key={type.key}
                      onClick={() => {
                        // Select first service of this type if none selected in this category
                        if (!isSelected) setServiceId(typeServices[0]?.id || 0);
                      }}
                      className={`p-3 rounded-lg border text-center transition-all cursor-pointer ${
                        isSelected
                          ? "border-accent-gold bg-accent-gold/10 text-accent-gold"
                          : "border-white/10 text-white/70 hover:border-white/30"
                      }`}
                    >
                      <span className="text-2xl block mb-1">{type.icon}</span>
                      <p className="font-medium text-sm">{locale === "th" ? type.label.th : type.label.en}</p>
                    </button>
                  );
                })}
              </div>

              {/* Step 2: Duration — show only when a type is selected */}
              {serviceId > 0 && (() => {
                const selectedService = services.find((s) => s.id === serviceId);
                const selectedCategory = selectedService?.category || (serviceId <= 3 ? "thai" : "aroma");
                const categoryServices = services.filter((s) => (s.category || (s.id <= 3 ? "thai" : "aroma")) === selectedCategory);
                return (
                  <div className="grid grid-cols-3 gap-2">
                    {categoryServices.map((s) => {
                      const hrs = s.duration / 60;
                      const durationLabel = hrs === 1 ? "1" : hrs === 1.5 ? "1.5" : "2";
                      return (
                        <button
                          key={s.id}
                          onClick={() => setServiceId(s.id)}
                          className={`p-3 rounded-lg border text-center transition-all cursor-pointer ${
                            serviceId === s.id
                              ? "border-accent-gold bg-accent-gold/15 text-accent-gold ring-1 ring-accent-gold/30"
                              : "border-white/10 text-white/70 hover:border-white/30"
                          }`}
                        >
                          <p className="text-lg font-bold">{durationLabel}</p>
                          <p className="text-[10px] text-white/40 mb-1">{locale === "th" ? "ชั่วโมง" : "hour"}</p>
                          <p className={`text-sm font-semibold ${serviceId === s.id ? "text-accent-gold" : "text-white/60"}`}>
                            {s.price}฿
                          </p>
                        </button>
                      );
                    })}
                  </div>
                );
              })()}
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
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
                {timeSlots.map((slot) => {
                  const isHour = slot.endsWith(":00");
                  return (
                    <button
                      key={slot}
                      onClick={() => setStartTime(slot)}
                      className={`py-2 px-1 rounded-lg border text-center transition-all cursor-pointer ${
                        startTime === slot
                          ? "border-accent-gold bg-accent-gold/10 text-accent-gold ring-1 ring-accent-gold/30"
                          : isHour
                            ? "border-white/15 text-white/70 hover:border-white/30 bg-surface-dark/30"
                            : "border-white/10 text-white/50 hover:border-white/30"
                      }`}
                    >
                      <span className={`${isHour ? "text-sm font-semibold" : "text-xs"}`}>{slot}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Customer Gender */}
            <div>
              <label className="block text-white/50 text-sm mb-2">
                {locale === "th" ? "เพศลูกค้า" : "Customer Gender"}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setBookingGender("male")}
                  className={`p-3 rounded-lg border-2 text-center transition-all cursor-pointer ${
                    bookingGender === "male"
                      ? "border-blue-400 bg-blue-500/20 text-blue-400"
                      : "border-white/10 text-white/60 hover:border-white/30"
                  }`}
                >
                  👨 {locale === "th" ? "ชาย" : "Male"}
                </button>
                <button
                  onClick={() => setBookingGender("female")}
                  className={`p-3 rounded-lg border-2 text-center transition-all cursor-pointer ${
                    bookingGender === "female"
                      ? "border-pink-400 bg-pink-500/20 text-pink-400"
                      : "border-white/10 text-white/60 hover:border-white/30"
                  }`}
                >
                  👩 {locale === "th" ? "หญิง" : "Female"}
                </button>
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

      {/* Booking List — today only */}
      <div className="space-y-4">
        {[...bookings]
          .filter((b) => {
            const today = new Date();
            const bookingDate = new Date(b.startTime);
            return (
              bookingDate.getFullYear() === today.getFullYear() &&
              bookingDate.getMonth() === today.getMonth() &&
              bookingDate.getDate() === today.getDate()
            );
          })
          .sort((a, b) => {
            // Active statuses first, completed/checkout last
            const statusOrder: Record<string, number> = {
              in_service: 0,
              checked_in: 1,
              booked: 2,
              completed: 3,
              checkout: 4,
              cancelled: 5,
            };
            const orderA = statusOrder[a.status] ?? 2;
            const orderB = statusOrder[b.status] ?? 2;
            if (orderA !== orderB) return orderA - orderB;
            // Within same status group, newest first
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          })
          .map((booking) => {
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2 text-sm">
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
                <div className="flex-shrink-0 flex flex-col gap-1.5">
                  {booking.status === "booked" && !isCheckinOpen && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => handleCheckin(booking.id)}>
                        {t("staff.checkin")}
                      </Button>
                      <button
                        onClick={() => openEdit(booking.id)}
                        className="px-3 py-1 rounded-lg text-xs bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 transition-all cursor-pointer"
                      >
                        {locale === "th" ? "แก้ไข" : "Edit"}
                      </button>
                      <button
                        onClick={() => handleCancel(booking.id)}
                        className="px-3 py-1 rounded-lg text-xs bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-all cursor-pointer"
                      >
                        {locale === "th" ? "ยกเลิก" : "Cancel"}
                      </button>
                    </>
                  )}
                  {booking.status === "in_service" && (
                    <>
                      <Button size="sm" variant="primary" onClick={() => handleEndService(booking.id)}>
                        {t("staff.endService")}
                      </Button>
                      <button
                        onClick={() => openEdit(booking.id)}
                        className="px-3 py-1 rounded-lg text-xs bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 transition-all cursor-pointer"
                      >
                        {locale === "th" ? "แก้ไข" : "Edit"}
                      </button>
                    </>
                  )}
                  {booking.status === "completed" && (
                    <Button size="sm" variant="secondary" onClick={() => handleCheckout(booking.id)}>
                      {t("staff.checkout")}
                    </Button>
                  )}
                </div>
              </div>

              {/* Edit Booking Panel */}
              {editBookingId === booking.id && (
                <div className="mt-4 pt-4 border-t border-amber-400/20">
                  <p className="text-amber-400 text-sm font-medium mb-3">
                    {locale === "th" ? "แก้ไขรายการ" : "Edit Booking"}
                  </p>

                  {/* Therapist */}
                  <p className="text-white/50 text-xs mb-2">{locale === "th" ? "หมอนวด" : "Therapist"}</p>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-4">
                    {therapists.map((th) => (
                      <button
                        key={th.id}
                        onClick={() => setEditTherapistId(th.id)}
                        className={`p-2 rounded-lg border text-center transition-all cursor-pointer text-xs ${
                          editTherapistId === th.id
                            ? "border-amber-400 bg-amber-500/15 text-amber-400"
                            : "border-white/10 text-white/60 hover:border-white/30"
                        }`}
                      >
                        {locale === "th" ? th.name.th : th.name.en}
                      </button>
                    ))}
                  </div>

                  {/* Service */}
                  <p className="text-white/50 text-xs mb-2">{locale === "th" ? "บริการ" : "Service"}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
                    {services.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => setEditServiceId(s.id)}
                        className={`p-2 rounded-lg border text-center transition-all cursor-pointer text-xs ${
                          editServiceId === s.id
                            ? "border-amber-400 bg-amber-500/15 text-amber-400"
                            : "border-white/10 text-white/60 hover:border-white/30"
                        }`}
                      >
                        <p className="font-medium">{locale === "th" ? s.name.th : s.name.en}</p>
                        <p className="text-white/40 mt-0.5">{s.price}฿</p>
                      </button>
                    ))}
                  </div>

                  {/* Room */}
                  <p className="text-white/50 text-xs mb-2">{locale === "th" ? "ห้อง" : "Room"}</p>
                  <div className="grid grid-cols-4 gap-2 mb-4">
                    {beds.map((b) => {
                      const isAvailable = b.status === "available" || b.id === (booking.bedId || 0);
                      return (
                        <button
                          key={b.id}
                          onClick={() => isAvailable && setEditBedId(b.id)}
                          disabled={!isAvailable}
                          className={`p-2 rounded-lg border text-center transition-all text-xs ${
                            !isAvailable
                              ? "border-white/5 text-white/20 cursor-not-allowed"
                              : editBedId === b.id
                                ? "border-amber-400 bg-amber-500/15 text-amber-400 cursor-pointer"
                                : "border-white/10 text-white/60 hover:border-white/30 cursor-pointer"
                          }`}
                        >
                          {b.name}
                        </button>
                      );
                    })}
                  </div>

                  {/* Customer Gender */}
                  <p className="text-white/50 text-xs mb-2">{locale === "th" ? "เพศลูกค้า" : "Customer Gender"}</p>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <button
                      onClick={() => setEditGender("male")}
                      className={`p-2 rounded-lg border text-center transition-all cursor-pointer text-xs ${
                        editGender === "male"
                          ? "border-blue-400 bg-blue-500/15 text-blue-400"
                          : "border-white/10 text-white/60 hover:border-white/30"
                      }`}
                    >
                      👨 {locale === "th" ? "ชาย" : "Male"}
                    </button>
                    <button
                      onClick={() => setEditGender("female")}
                      className={`p-2 rounded-lg border text-center transition-all cursor-pointer text-xs ${
                        editGender === "female"
                          ? "border-pink-400 bg-pink-500/15 text-pink-400"
                          : "border-white/10 text-white/60 hover:border-white/30"
                      }`}
                    >
                      👩 {locale === "th" ? "หญิง" : "Female"}
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="primary"
                      className="flex-1"
                      onClick={saveEdit}
                      disabled={editSaving}
                    >
                      {editSaving ? "..." : locale === "th" ? "บันทึก" : "Save"}
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => setEditBookingId(null)}
                    >
                      {locale === "th" ? "ยกเลิก" : "Cancel"}
                    </Button>
                  </div>
                </div>
              )}

              {/* Check-in: Room Selection Panel */}
              {isCheckinOpen && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <p className="text-white/50 text-sm mb-3">
                    {locale === "th" ? "เลือกห้องแล้วกดเริ่มบริการ" : "Select a room and start service"}
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
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
