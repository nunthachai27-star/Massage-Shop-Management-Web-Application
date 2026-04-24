import { buildVoidMessage, shouldNotifyVoid } from "./void-notification";

describe("shouldNotifyVoid", () => {
  it("returns true when prior status is in_service", () => {
    expect(shouldNotifyVoid("in_service")).toBe(true);
  });
  it("returns true when prior status is completed", () => {
    expect(shouldNotifyVoid("completed")).toBe(true);
  });
  it("returns true when prior status is checkout", () => {
    expect(shouldNotifyVoid("checkout")).toBe(true);
  });
  it("returns false when prior status is booked", () => {
    expect(shouldNotifyVoid("booked")).toBe(false);
  });
  it("returns false when prior status is checked_in", () => {
    expect(shouldNotifyVoid("checked_in")).toBe(false);
  });
  it("returns false when prior status is cancelled", () => {
    expect(shouldNotifyVoid("cancelled")).toBe(false);
  });
});

describe("buildVoidMessage", () => {
  it("builds a message with all fields", () => {
    const msg = buildVoidMessage({
      therapistName: "แอน",
      serviceName: "นวดไทย 60 นาที",
      startTime: "2026-04-24T03:00:00.000Z", // 10:00 Bangkok
      endTime: "2026-04-24T04:00:00.000Z",   // 11:00 Bangkok
    });
    expect(msg).toBe(
      "❌ ยกเลิกรายการ\n👩‍⚕️ แอน\n💆 นวดไทย 60 นาที\n⏰ 10:00 - 11:00 น.\n📅 24/04/2026",
    );
  });

  it("falls back to '-' for missing fields", () => {
    const msg = buildVoidMessage({
      therapistName: null,
      serviceName: null,
      startTime: null,
      endTime: null,
    });
    expect(msg).toBe(
      "❌ ยกเลิกรายการ\n👩‍⚕️ -\n💆 -\n⏰ - - - น.\n📅 -",
    );
  });
});
