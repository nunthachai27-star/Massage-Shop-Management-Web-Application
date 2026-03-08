export type BookingStatus = "booked" | "checked_in" | "in_service" | "completed" | "checkout" | "cancelled";

export interface Booking {
  id: number;
  customerId?: number;
  customerName: string;
  phone: string;
  serviceId: number;
  therapistId: number;
  bedId: number;
  startTime: string;
  endTime: string;
  status: BookingStatus;
  createdAt: string;
}

export const bookings: Booking[] = [
  {
    id: 1,
    customerName: "คุณสมชาย",
    phone: "081-234-5678",
    serviceId: 1,
    therapistId: 3,
    bedId: 2,
    startTime: "2026-03-07T10:00:00",
    endTime: "2026-03-07T11:00:00",
    status: "in_service",
    createdAt: "2026-03-07T09:00:00",
  },
  {
    id: 2,
    customerName: "คุณสมหญิง",
    phone: "089-876-5432",
    serviceId: 2,
    therapistId: 1,
    bedId: 0,
    startTime: "2026-03-07T11:00:00",
    endTime: "2026-03-07T12:00:00",
    status: "booked",
    createdAt: "2026-03-07T08:30:00",
  },
  {
    id: 3,
    customerName: "คุณวิชัย",
    phone: "062-111-2222",
    serviceId: 4,
    therapistId: 2,
    bedId: 0,
    startTime: "2026-03-07T13:00:00",
    endTime: "2026-03-07T14:00:00",
    status: "booked",
    createdAt: "2026-03-07T09:15:00",
  },
];
