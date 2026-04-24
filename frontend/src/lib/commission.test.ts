import { calcCommission } from "./commission";

describe("calcCommission", () => {
  it("female customer: 50% of price (any service)", () => {
    expect(calcCommission({ price: 800, serviceNameTh: "อโรม่า", customerGender: "female" })).toBe(400);
  });

  it("thai massage: 50% of price (male customer)", () => {
    expect(calcCommission({ price: 600, serviceNameTh: "นวดไทย 60", customerGender: "male" })).toBe(300);
  });

  it("free aroma (price 0 with 'ฟรี' in name): flat 100", () => {
    expect(calcCommission({ price: 0, serviceNameTh: "อโรม่าฟรี", customerGender: "male" })).toBe(100);
  });

  it("aroma 1000+ (male): 250", () => {
    expect(calcCommission({ price: 1000, serviceNameTh: "อโรม่า 90", customerGender: "male" })).toBe(250);
  });

  it("aroma 800 (male): 200", () => {
    expect(calcCommission({ price: 800, serviceNameTh: "อโรม่า 60", customerGender: "male" })).toBe(200);
  });

  it("aroma 600 (male): 100", () => {
    expect(calcCommission({ price: 600, serviceNameTh: "อโรม่า 30", customerGender: "male" })).toBe(100);
  });

  it("aroma under 600 (male): 0", () => {
    expect(calcCommission({ price: 400, serviceNameTh: "อโรม่า", customerGender: "male" })).toBe(0);
  });
});
