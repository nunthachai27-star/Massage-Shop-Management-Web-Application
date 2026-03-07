// Transform API response (flat fields like name_th, name_en)
// to frontend format (nested locale objects like name.th, name.en)

import type { Service } from "@/data/services";
import type { Therapist } from "@/data/therapists";
import type { Booking } from "@/data/bookings";
import type { Customer } from "@/data/customers";
import type { Bed } from "@/data/beds";

type ApiRecord = Record<string, unknown>;

export function transformService(s: ApiRecord): Service {
  // If already in frontend format (has nested name object), return as-is
  if (s.name && typeof s.name === "object") return s as unknown as Service;

  return {
    id: s.id as number,
    name: { th: s.name_th as string, en: s.name_en as string },
    description: { th: (s.description_th || "") as string, en: (s.description_en || "") as string },
    duration: s.duration as number,
    price: Number(s.price),
    image: (s.image || "/images/placeholder.jpg") as string,
  };
}

export function transformTherapist(t: ApiRecord): Therapist {
  // If already in frontend format (has nested name object), return as-is
  if (t.name && typeof t.name === "object") return t as unknown as Therapist;

  return {
    id: t.id as number,
    name: { th: t.name_th as string, en: t.name_en as string },
    skill: (t.skills as string[]) || [],
    rating: Number(t.rating),
    status: t.status as Therapist["status"],
    image: (t.image || "/images/placeholder.jpg") as string,
    experience: (t.experience || 0) as number,
  };
}

export function transformBooking(b: ApiRecord): Booking {
  // If already in frontend format (has camelCase fields), return as-is
  if (b.customerName !== undefined) return b as unknown as Booking;

  return {
    id: b.id as number,
    customerName: b.customer_name as string,
    phone: b.phone as string,
    serviceId: b.service_id as number,
    therapistId: b.therapist_id as number,
    bedId: (b.bed_id || 0) as number,
    startTime: b.start_time as string,
    endTime: b.end_time as string,
    status: b.status as Booking["status"],
    createdAt: b.created_at as string,
  };
}

export function transformCustomer(c: ApiRecord): Customer {
  if (c.visitCount !== undefined) return c as unknown as Customer;

  return {
    id: c.id as number,
    code: (c.customer_code || `C${String(c.id).padStart(3, "0")}`) as string,
    name: c.name as string,
    phone: (c.phone || "") as string,
    visitCount: (c.visit_count || 0) as number,
    createdAt: c.created_at as string,
  };
}

export function transformBed(b: ApiRecord): Bed {
  // If already in frontend format, return as-is
  if (b.currentBookingId !== undefined || !b.current_booking_id) return b as unknown as Bed;

  return {
    id: b.id as number,
    name: b.name as string,
    status: b.status as Bed["status"],
    currentBookingId: b.current_booking_id as number,
  };
}
