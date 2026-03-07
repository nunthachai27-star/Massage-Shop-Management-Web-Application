export type BedStatus = "available" | "reserved" | "in_service" | "cleaning";

export interface Bed {
  id: number;
  name: string;
  status: BedStatus;
  currentBookingId?: number;
}

export const beds: Bed[] = [
  { id: 1, name: "Bed 1", status: "available" },
  { id: 2, name: "Bed 2", status: "in_service", currentBookingId: 1 },
  { id: 3, name: "Bed 3", status: "reserved", currentBookingId: 2 },
  { id: 4, name: "Bed 4", status: "cleaning" },
];
