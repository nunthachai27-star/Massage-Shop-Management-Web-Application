export interface Customer {
  id: number;
  code: string;
  name: string;
  phone: string;
  visitCount: number;
  createdAt: string;
}

export const customers: Customer[] = [
  {
    id: 1,
    code: "C001",
    name: "คุณสมศรี",
    phone: "081-234-5678",
    visitCount: 4,
    createdAt: "2025-12-01T10:00:00Z",
  },
  {
    id: 2,
    code: "C002",
    name: "คุณวิภา",
    phone: "",
    visitCount: 2,
    createdAt: "2025-12-15T14:00:00Z",
  },
  {
    id: 3,
    code: "C003",
    name: "คุณสมศรี",
    phone: "089-876-5432",
    visitCount: 0,
    createdAt: "2026-01-10T09:00:00Z",
  },
  {
    id: 4,
    code: "C004",
    name: "คุณนภา",
    phone: "",
    visitCount: 3,
    createdAt: "2026-01-20T11:00:00Z",
  },
  {
    id: 5,
    code: "C005",
    name: "คุณประยุทธ์",
    phone: "092-111-2222",
    visitCount: 1,
    createdAt: "2026-02-05T13:00:00Z",
  },
];

let nextId = customers.length + 1;

export function generateCustomerCode(id: number): string {
  return `C${id.toString().padStart(3, "0")}`;
}

export function createCustomer(name: string, phone: string): Customer {
  const id = nextId++;
  return {
    id,
    code: generateCustomerCode(id),
    name,
    phone,
    visitCount: 0,
    createdAt: new Date().toISOString(),
  };
}
