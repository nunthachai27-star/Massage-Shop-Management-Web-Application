import { buildCleaningMessage } from "./cleaning-notification";

describe("buildCleaningMessage", () => {
  it("builds a full schedule message", () => {
    const msg = buildCleaningMessage({
      weekRangeLabel: "23 มิ.ย. - 29 มิ.ย. 2569",
      duties: [
        { dutyName: "เวรซักผ้า + พับผ้า", therapistNames: ["แอน", "บี"] },
        { dutyName: "เวรล้างห้องน้ำทุกห้อง", therapistNames: ["ซี"] },
      ],
      backupNames: ["ดี", "อี"],
    });
    expect(msg).toBe(
      "🧹 ตารางเวรทำความสะอาด\n" +
        "📅 23 มิ.ย. - 29 มิ.ย. 2569\n\n" +
        "เวรซักผ้า + พับผ้า: แอน, บี\n" +
        "เวรล้างห้องน้ำทุกห้อง: ซี\n\n" +
        "เวรสำรอง / ตรวจความเรียบร้อย: ดี, อี",
    );
  });

  it("uses '-' for empty duty assignees and empty backup", () => {
    const msg = buildCleaningMessage({
      weekRangeLabel: "1 ก.ค. - 7 ก.ค. 2569",
      duties: [{ dutyName: "เวรชั้น 1 กวาด + ถูพื้น", therapistNames: [] }],
      backupNames: [],
    });
    expect(msg).toBe(
      "🧹 ตารางเวรทำความสะอาด\n" +
        "📅 1 ก.ค. - 7 ก.ค. 2569\n\n" +
        "เวรชั้น 1 กวาด + ถูพื้น: -\n\n" +
        "เวรสำรอง / ตรวจความเรียบร้อย: -",
    );
  });
});
