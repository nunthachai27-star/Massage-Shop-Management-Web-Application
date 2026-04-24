export interface CommissionInput {
  price: number;
  serviceNameTh: string;
  customerGender?: string | null;
}

// Mirrors backend/src/commissions/commissions.service.ts:getCommission.
// Keep in sync when the backend formula changes.
export function calcCommission({
  price,
  serviceNameTh,
  customerGender,
}: CommissionInput): number {
  if (customerGender === "female") {
    return Math.round(price / 2);
  }
  if (serviceNameTh.includes("นวดไทย")) {
    return Math.round(price / 2);
  }
  if (price === 0 && serviceNameTh.includes("ฟรี")) {
    return 100;
  }
  if (price >= 1000) return 250;
  if (price >= 800) return 200;
  if (price >= 600) return 100;
  return 0;
}
