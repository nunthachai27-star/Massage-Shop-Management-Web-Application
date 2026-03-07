// Transform API response (flat fields like name_th, name_en)
// to frontend format (nested locale objects like name.th, name.en)

export function transformService(s: any) {
  // If already in frontend format (has nested name object), return as-is
  if (s.name && typeof s.name === "object") return s;

  return {
    id: s.id,
    name: { th: s.name_th, en: s.name_en },
    description: { th: s.description_th || "", en: s.description_en || "" },
    duration: s.duration,
    price: Number(s.price),
    image: s.image || "/images/placeholder.jpg",
  };
}

export function transformTherapist(t: any) {
  // If already in frontend format (has nested name object), return as-is
  if (t.name && typeof t.name === "object") return t;

  return {
    id: t.id,
    name: { th: t.name_th, en: t.name_en },
    skill: t.skills || [],
    rating: Number(t.rating),
    status: t.status,
    image: t.image || "/images/placeholder.jpg",
    experience: t.experience || 0,
  };
}

export function transformBooking(b: any) {
  // If already in frontend format (has camelCase fields), return as-is
  if (b.customerName !== undefined) return b;

  return {
    id: b.id,
    customerName: b.customer_name,
    phone: b.phone,
    serviceId: b.service_id,
    therapistId: b.therapist_id,
    bedId: b.bed_id,
    startTime: b.start_time,
    endTime: b.end_time,
    status: b.status,
    createdAt: b.created_at,
  };
}

export function transformBed(b: any) {
  // If already in frontend format, return as-is
  if (b.currentBookingId !== undefined || !b.current_booking_id) return b;

  return {
    id: b.id,
    name: b.name,
    status: b.status,
    currentBookingId: b.current_booking_id,
  };
}
