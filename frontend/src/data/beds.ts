export type BedStatus = "available" | "reserved" | "in_service" | "cleaning";

export interface Bed {
  id: number;
  name: string;
  status: BedStatus;
  currentBookingId?: number;
}

export const beds: Bed[] = [
  { id: 1, name: "ห้อง 6", status: "available" },
  { id: 2, name: "ห้อง 7", status: "in_service", currentBookingId: 1 },
  { id: 3, name: "ห้อง 8", status: "reserved", currentBookingId: 2 },
  { id: 4, name: "ห้อง 9", status: "cleaning" },
];
