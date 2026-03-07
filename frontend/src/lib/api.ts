const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

type ApiRecord = Record<string, unknown>;

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
  getServices: () => apiFetch<ApiRecord[]>("/services"),
  getService: (id: number) => apiFetch<ApiRecord>(`/services/${id}`),

  // Therapists
  getTherapists: (status?: string) =>
    apiFetch<ApiRecord[]>(`/therapists${status ? `?status=${status}` : ""}`),

  // Bookings
  getAvailableSlots: (therapistId: number, date: string, duration?: number) =>
    apiFetch<ApiRecord[]>(
      `/bookings/availability?therapistId=${therapistId}&date=${date}${duration ? `&duration=${duration}` : ""}`
    ),
  createBooking: (data: Record<string, unknown>) =>
    apiFetch<ApiRecord>("/bookings", { method: "POST", body: JSON.stringify(data) }),
  getBookings: (status?: string, date?: string) => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (date) params.set("date", date);
    const qs = params.toString();
    return apiFetch<ApiRecord[]>(`/bookings${qs ? `?${qs}` : ""}`);
  },
  updateBookingStatus: (id: number, status: string, bedId?: number) =>
    apiFetch<ApiRecord>(`/bookings/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status, ...(bedId ? { bed_id: bedId } : {}) }),
    }),

  // Payments
  createPayment: (data: Record<string, unknown>) =>
    apiFetch<ApiRecord>("/payments", { method: "POST", body: JSON.stringify(data) }),
  confirmPayment: (id: number) =>
    apiFetch<ApiRecord>(`/payments/${id}/confirm`, { method: "PATCH" }),

  // Beds
  getBeds: () => apiFetch<ApiRecord[]>("/beds"),

  // Attendance
  getTodayAttendance: () => apiFetch<ApiRecord[]>("/attendance/today"),
  checkIn: (therapistId: number) =>
    apiFetch<ApiRecord>("/attendance/check-in", {
      method: "POST",
      body: JSON.stringify({ therapist_id: therapistId }),
    }),
  checkOut: (id: number) =>
    apiFetch<ApiRecord>(`/attendance/${id}/check-out`, { method: "PATCH" }),

  // Dashboard
  getDailyMetrics: (date?: string) =>
    apiFetch<ApiRecord>(`/dashboard/daily${date ? `?date=${date}` : ""}`),
  getTherapistPerformance: (date?: string) =>
    apiFetch<ApiRecord[]>(`/dashboard/therapists${date ? `?date=${date}` : ""}`),

  // Customers
  getCustomers: (search?: string) => {
    const qs = search ? `?search=${encodeURIComponent(search)}` : "";
    return apiFetch<ApiRecord[]>(`/customers${qs}`);
  },
  createCustomer: (data: { name: string; phone?: string }) =>
    apiFetch<ApiRecord>("/customers", { method: "POST", body: JSON.stringify(data) }),
  incrementVisit: (customerId: number) =>
    apiFetch<ApiRecord>(`/customers/${customerId}/visit`, { method: "PATCH" }),

  // Auth
  pinLogin: (pin: string) =>
    apiFetch<ApiRecord>("/auth/pin-login", {
      method: "POST",
      body: JSON.stringify({ pin }),
    }),
  ownerLogin: (username: string, password: string) =>
    apiFetch<ApiRecord>("/auth/owner-login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),
};
