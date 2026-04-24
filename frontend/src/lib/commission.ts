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

// Self-check: Jest isn't configured in frontend/, so we verify behavior via
// console.assert when this file is executed directly with `npx tsx`.
// Mirrors frontend/src/lib/commission.test.ts cases.
if (typeof require !== "undefined" && require.main === module) {
  const cases: Array<{ name: string; input: CommissionInput; expected: number }> = [
    {
      name: "female customer: 50% of price (any service)",
      input: { price: 800, serviceNameTh: "อโรม่า", customerGender: "female" },
      expected: 400,
    },
    {
      name: "thai massage: 50% of price (male customer)",
      input: { price: 600, serviceNameTh: "นวดไทย 60", customerGender: "male" },
      expected: 300,
    },
    {
      name: "free aroma (price 0 with 'ฟรี' in name): flat 100",
      input: { price: 0, serviceNameTh: "อโรม่าฟรี", customerGender: "male" },
      expected: 100,
    },
    {
      name: "aroma 1000+ (male): 250",
      input: { price: 1000, serviceNameTh: "อโรม่า 90", customerGender: "male" },
      expected: 250,
    },
    {
      name: "aroma 800 (male): 200",
      input: { price: 800, serviceNameTh: "อโรม่า 60", customerGender: "male" },
      expected: 200,
    },
    {
      name: "aroma 600 (male): 100",
      input: { price: 600, serviceNameTh: "อโรม่า 30", customerGender: "male" },
      expected: 100,
    },
    {
      name: "aroma under 600 (male): 0",
      input: { price: 400, serviceNameTh: "อโรม่า", customerGender: "male" },
      expected: 0,
    },
  ];

  let passed = 0;
  let failed = 0;
  for (const c of cases) {
    const actual = calcCommission(c.input);
    if (actual === c.expected) {
      passed++;
      console.log(`PASS: ${c.name} => ${actual}`);
    } else {
      failed++;
      console.error(`FAIL: ${c.name} => expected ${c.expected}, got ${actual}`);
    }
    console.assert(actual === c.expected, `${c.name}: expected ${c.expected}, got ${actual}`);
  }
  console.log(`\n${passed}/${cases.length} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}
