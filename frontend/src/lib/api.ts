const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api";

type ApiRecord = Record<string, unknown>;

function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("authToken");
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
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
  createService: (data: Record<string, unknown>) =>
    apiFetch<ApiRecord>("/services", { method: "POST", body: JSON.stringify(data) }),
  updateService: (id: number, data: Record<string, unknown>) =>
    apiFetch<ApiRecord>(`/services/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteService: (id: number) =>
    apiFetch<ApiRecord>(`/services/${id}`, { method: "DELETE" }),

  // Therapists
  getTherapists: (status?: string) =>
    apiFetch<ApiRecord[]>(`/therapists${status ? `?status=${status}` : ""}`),
  getAllTherapists: () =>
    apiFetch<ApiRecord[]>("/therapists/all"),
  createTherapist: (data: Record<string, unknown>) =>
    apiFetch<ApiRecord>("/therapists", { method: "POST", body: JSON.stringify(data) }),
  updateTherapist: (id: number, data: Record<string, unknown>) =>
    apiFetch<ApiRecord>(`/therapists/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deactivateTherapist: (id: number) =>
    apiFetch<ApiRecord>(`/therapists/${id}`, { method: "DELETE" }),
  reactivateTherapist: (id: number) =>
    apiFetch<ApiRecord>(`/therapists/${id}/reactivate`, { method: "PATCH" }),

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
  getWeeklyRevenue: () => apiFetch<ApiRecord>("/dashboard/weekly"),
  getMonthlyRevenue: () => apiFetch<ApiRecord>("/dashboard/monthly"),
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

  // Commissions
  getCommissions: (date?: string) => {
    const qs = date ? `?date=${date}` : "";
    return apiFetch<ApiRecord[]>(`/commissions${qs}`);
  },
  markCommissionPaid: (id: number) =>
    apiFetch<ApiRecord>(`/commissions/${id}/paid`, { method: "PATCH" }),
  markCommissionUnpaid: (id: number) =>
    apiFetch<ApiRecord>(`/commissions/${id}/unpaid`, { method: "PATCH" }),

  // Line Messaging
  sendLineMessage: (message: string) =>
    apiFetch<ApiRecord>("/line-notify/send", {
      method: "POST",
      body: JSON.stringify({ message }),
    }),

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
  ownerPinLogin: (pin: string) =>
    apiFetch<ApiRecord>("/auth/owner-pin-login", {
      method: "POST",
      body: JSON.stringify({ pin }),
    }),
  changePin: (therapistId: number, currentPin: string, newPin: string) =>
    apiFetch<ApiRecord>("/auth/change-pin", {
      method: "PATCH",
      body: JSON.stringify({ therapist_id: therapistId, current_pin: currentPin, new_pin: newPin }),
    }),
};
