const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });
  if (!res.ok) {
    const error = await res.text();
    throw new Error(error);
  }
  return res.json();
}

export const api = {
  // Services
  getServices: () => apiFetch<any[]>("/services"),
  getService: (id: number) => apiFetch<any>(`/services/${id}`),

  // Therapists
  getTherapists: (status?: string) =>
    apiFetch<any[]>(`/therapists${status ? `?status=${status}` : ""}`),

  // Bookings
  getAvailableSlots: (therapistId: number, date: string, duration?: number) =>
    apiFetch<any[]>(
      `/bookings/availability?therapistId=${therapistId}&date=${date}${duration ? `&duration=${duration}` : ""}`
    ),
  createBooking: (data: any) =>
    apiFetch<any>("/bookings", { method: "POST", body: JSON.stringify(data) }),
  getBookings: (status?: string, date?: string) => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (date) params.set("date", date);
    const qs = params.toString();
    return apiFetch<any[]>(`/bookings${qs ? `?${qs}` : ""}`);
  },
  updateBookingStatus: (id: number, status: string) =>
    apiFetch<any>(`/bookings/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  // Payments
  createPayment: (data: any) =>
    apiFetch<any>("/payments", { method: "POST", body: JSON.stringify(data) }),
  confirmPayment: (id: number) =>
    apiFetch<any>(`/payments/${id}/confirm`, { method: "PATCH" }),

  // Beds
  getBeds: () => apiFetch<any[]>("/beds"),

  // Attendance
  getTodayAttendance: () => apiFetch<any[]>("/attendance/today"),
  checkIn: (therapistId: number) =>
    apiFetch<any>("/attendance/check-in", {
      method: "POST",
      body: JSON.stringify({ therapist_id: therapistId }),
    }),
  checkOut: (id: number) =>
    apiFetch<any>(`/attendance/${id}/check-out`, { method: "PATCH" }),

  // Dashboard
  getDailyMetrics: (date?: string) =>
    apiFetch<any>(`/dashboard/daily${date ? `?date=${date}` : ""}`),
  getTherapistPerformance: (date?: string) =>
    apiFetch<any[]>(`/dashboard/therapists${date ? `?date=${date}` : ""}`),

  // Auth
  pinLogin: (pin: string) =>
    apiFetch<any>("/auth/pin-login", {
      method: "POST",
      body: JSON.stringify({ pin }),
    }),
  ownerLogin: (username: string, password: string) =>
    apiFetch<any>("/auth/owner-login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),
};
