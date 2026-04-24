# Void Completed Booking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the shop owner void a booking that is `in_service`, `completed`, or `checkout` when the therapist did not actually perform the work — removing the booking from commission totals, freeing the bed/therapist, deleting the payment record, and notifying the therapist via Line.

**Architecture:** Reuse the existing `PATCH /bookings/:id/status` endpoint (which already handles bed/therapist release on `cancelled`). Extend the backend `case "cancelled"` block to delete the associated payment row and — only when the booking's prior status was `in_service`/`completed`/`checkout` — send a Line notification. On the frontend, add a new inline confirmation panel to the owner bookings page, matching the existing edit-panel pattern, with a "paid commission" recovery warning when applicable.

**Tech Stack:** NestJS (backend), Supabase/PostgreSQL, Jest, Next.js + React (frontend), Tailwind CSS.

**Spec:** [docs/superpowers/specs/2026-04-24-void-completed-booking-design.md](../specs/2026-04-24-void-completed-booking-design.md)

---

## Task 1: Backend — Extract void-Line-message builder as a pure helper

**Why extract:** The line-building logic depends only on booking fields (therapist name, service name, start/end time, date). Pulling it out of the service makes it trivially unit-testable without mocking Supabase.

**Files:**
- Create: `backend/src/bookings/void-notification.ts`
- Create: `backend/src/bookings/void-notification.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `backend/src/bookings/void-notification.spec.ts`:

```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npx jest void-notification.spec.ts`
Expected: FAIL with "Cannot find module './void-notification'"

- [ ] **Step 3: Write the implementation**

Create `backend/src/bookings/void-notification.ts`:

```typescript
const VOID_NOTIFY_STATUSES = new Set(["in_service", "completed", "checkout"]);

export function shouldNotifyVoid(priorStatus: string | null | undefined): boolean {
  return priorStatus ? VOID_NOTIFY_STATUSES.has(priorStatus) : false;
}

export interface VoidMessageFields {
  therapistName: string | null;
  serviceName: string | null;
  startTime: string | null;
  endTime: string | null;
}

function fmtTime(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Bangkok",
  });
}

function fmtDate(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Bangkok",
  });
}

export function buildVoidMessage(fields: VoidMessageFields): string {
  const therapist = fields.therapistName || "-";
  const service = fields.serviceName || "-";
  const start = fmtTime(fields.startTime);
  const end = fmtTime(fields.endTime);
  const date = fmtDate(fields.startTime);
  return (
    `❌ ยกเลิกรายการ\n` +
    `👩‍⚕️ ${therapist}\n` +
    `💆 ${service}\n` +
    `⏰ ${start} - ${end} น.\n` +
    `📅 ${date}`
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && npx jest void-notification.spec.ts`
Expected: PASS — 8 tests, 0 failures

- [ ] **Step 5: Commit**

```bash
git add backend/src/bookings/void-notification.ts backend/src/bookings/void-notification.spec.ts
git commit -m "feat(bookings): add pure helpers for void notification"
```

---

## Task 2: Backend — Wire helpers into updateStatus cancelled branch

**Files:**
- Modify: `backend/src/bookings/bookings.service.ts`

- [ ] **Step 1: Add the import**

At the top of `backend/src/bookings/bookings.service.ts`, after the existing `LineNotifyService` import (line 9), add:

```typescript
import { buildVoidMessage, shouldNotifyVoid } from "./void-notification";
```

- [ ] **Step 2: Capture prior status before the update**

The existing code at [bookings.service.ts:168-172](backend/src/bookings/bookings.service.ts#L168-L172) already reads the booking before the update into `booking`. No new read needed — `booking.status` is the prior status.

No code change in this step. Verify by reading the file.

- [ ] **Step 3: Extend `case "cancelled"` to send Line notification**

Replace the existing `case "cancelled"` block at [bookings.service.ts:274-287](backend/src/bookings/bookings.service.ts#L274-L287):

```typescript
      case "cancelled":
        if (effectiveBedId) {
          await client
            .from("beds")
            .update({ status: "available", current_booking_id: null })
            .eq("id", effectiveBedId);
        }
        if (booking.therapist_id) {
          await client
            .from("therapists")
            .update({ status: "available" })
            .eq("id", booking.therapist_id);
        }
        // Delete associated payment (if any) — voiding erases the payment trace
        await client.from("payments").delete().eq("booking_id", id);

        // Notify therapist only when voiding a booking that was in_service / completed / checkout.
        // Normal "cancel before service" (booked → cancelled) stays silent.
        if (shouldNotifyVoid(booking.status)) {
          try {
            const therapistName =
              updated.therapists?.name_th || updated.therapists?.name_en || null;
            const serviceName =
              updated.services?.name_th || updated.services?.name_en || null;
            await this.lineNotify.send(
              buildVoidMessage({
                therapistName,
                serviceName,
                startTime: updated.start_time ?? null,
                endTime: updated.end_time ?? null,
              }),
            );
          } catch (e) {
            this.logger.warn(`Failed to send Line void notification: ${e.message}`);
          }
        }
        break;
```

- [ ] **Step 4: Build the project to catch type errors**

Run: `cd backend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Run the pure-helper tests again to confirm nothing broke**

Run: `cd backend && npx jest void-notification.spec.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/src/bookings/bookings.service.ts
git commit -m "feat(bookings): delete payment and notify on void"
```

---

## Task 3: Frontend — Pure commission helper (port of backend formula)

**Why:** The confirmation panel needs to display the commission amount the therapist would lose. The backend formula lives in [commissions.service.ts:14-30](backend/src/commissions/commissions.service.ts#L14-L30) and must be mirrored on the frontend. Keeping it as a pure function makes it easy to unit-test.

**Files:**
- Create: `frontend/src/lib/commission.ts`
- Create: `frontend/src/lib/commission.test.ts`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/lib/commission.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx jest commission.test.ts`
Expected: FAIL with "Cannot find module './commission'"

> **If Jest is not installed in `frontend/`:** the project uses Next.js without Jest set up for src. In that case, skip the test file and run the types-only verification at step 4 instead; add a `console.assert` block at the bottom of `commission.ts` and execute with `npx tsx frontend/src/lib/commission.ts` to verify outputs. Note this deviation in the commit message.

- [ ] **Step 3: Write the implementation**

Create `frontend/src/lib/commission.ts`:

```typescript
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx jest commission.test.ts`
Expected: PASS — 7 tests.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/commission.ts frontend/src/lib/commission.test.ts
git commit -m "feat(frontend): add commission calculator helper"
```

---

## Task 4: Frontend — Add void state and handler on owner bookings page

**Files:**
- Modify: `frontend/src/app/[locale]/(owner)/owner/bookings/page.tsx`

- [ ] **Step 1: Add state for the void panel**

Locate the "Edit booking state" block at [bookings/page.tsx:134-140](frontend/src/app/%5Blocale%5D/(owner)/owner/bookings/page.tsx#L134-L140). Add immediately after it:

```tsx
  // Void booking state (post-service cancellation)
  const [voidBookingId, setVoidBookingId] = useState<number | null>(null);
  const [voidCommissionPaid, setVoidCommissionPaid] = useState(false);
  const [voidCommissionAmount, setVoidCommissionAmount] = useState(0);
```

- [ ] **Step 2: Add the import for the commission helper**

At the top of the file, alongside the existing `lib/api` import, add:

```tsx
import { calcCommission } from "@/lib/commission";
```

Verify the alias works by checking that other files in the project use `@/lib/*` style imports. If they use relative paths instead, use `../../../../lib/commission` instead.

- [ ] **Step 3: Add the `openVoid` handler**

Place this right after the existing `handleCancel` function (ends at [bookings/page.tsx:495](frontend/src/app/%5Blocale%5D/(owner)/owner/bookings/page.tsx#L495)):

```tsx
  // Open void confirmation panel — look up today's commission status for the therapist
  const openVoid = async (bookingId: number) => {
    const booking = bookings.find((b) => b.id === bookingId);
    if (!booking) return;
    const service = services.find((s) => s.id === booking.serviceId);
    const amount = service
      ? calcCommission({
          price: service.price,
          serviceNameTh: service.name.th,
          customerGender: booking.customerGender,
        })
      : 0;
    setVoidCommissionAmount(amount);

    // Check whether the therapist's commission for the booking's date is already paid
    const bookingDate = new Date(booking.startTime).toLocaleDateString("en-CA");
    try {
      const rows = await api.getCommissions(bookingDate);
      const row = rows.find(
        (r) => (r.therapist_id as number) === booking.therapistId,
      );
      setVoidCommissionPaid(row?.status === "paid");
    } catch {
      setVoidCommissionPaid(false);
    }
    setVoidBookingId(bookingId);
  };

  const cancelVoid = () => {
    setVoidBookingId(null);
    setVoidCommissionPaid(false);
    setVoidCommissionAmount(0);
  };

  const confirmVoid = () => {
    if (!voidBookingId) return;
    const booking = bookings.find((b) => b.id === voidBookingId);
    setBookings((prev) =>
      prev.map((b) =>
        b.id === voidBookingId
          ? { ...b, status: "cancelled" as Booking["status"] }
          : b,
      ),
    );
    if (booking?.bedId) {
      setBeds((prev) =>
        prev.map((bed) =>
          bed.id === booking.bedId
            ? { ...bed, status: "available" as const, currentBookingId: undefined }
            : bed,
        ),
      );
    }
    api.updateBookingStatus(voidBookingId, "cancelled").catch(() => {});
    cancelVoid();
  };
```

- [ ] **Step 4: Type-check**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors. If `booking.customerGender` is not on the `Booking` type, locate it (the edit panel at line 411 already uses `booking.customerGender`, so it exists).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/*/\(owner\)/owner/bookings/page.tsx
git commit -m "feat(frontend): add void booking state and handlers"
```

---

## Task 5: Frontend — Add void button and inline confirmation panel

**Files:**
- Modify: `frontend/src/app/[locale]/(owner)/owner/bookings/page.tsx`

- [ ] **Step 1: Add the void button to `in_service` bookings**

Locate the `in_service` action block at [bookings/page.tsx:972-998](frontend/src/app/%5Blocale%5D/(owner)/owner/bookings/page.tsx#L972-L998). Inside the outer `<>` fragment, after the existing "🔔 แจ้งเตือน" button (ends around line 996), add:

```tsx
                      <button
                        onClick={() => openVoid(booking.id)}
                        className="px-3 py-1 rounded-lg text-xs bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-all cursor-pointer"
                      >
                        {locale === "th" ? "ยกเลิกรายการ" : "Void"}
                      </button>
```

- [ ] **Step 2: Replace the `completed` action block with button + void button**

Replace the `completed` block at [bookings/page.tsx:999-1003](frontend/src/app/%5Blocale%5D/(owner)/owner/bookings/page.tsx#L999-L1003):

```tsx
                  {booking.status === "completed" && (
                    <>
                      <Button size="sm" variant="secondary" onClick={() => handleCheckout(booking.id)}>
                        {t("staff.checkout")}
                      </Button>
                      <button
                        onClick={() => openVoid(booking.id)}
                        className="px-3 py-1 rounded-lg text-xs bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-all cursor-pointer"
                      >
                        {locale === "th" ? "ยกเลิกรายการ" : "Void"}
                      </button>
                    </>
                  )}
```

- [ ] **Step 3: Add a `checkout` action block (currently has none)**

Immediately after the `completed` block added in step 2, add a new block:

```tsx
                  {booking.status === "checkout" && (
                    <button
                      onClick={() => openVoid(booking.id)}
                      className="px-3 py-1 rounded-lg text-xs bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-all cursor-pointer"
                    >
                      {locale === "th" ? "ยกเลิกรายการ" : "Void"}
                    </button>
                  )}
```

- [ ] **Step 4: Add the inline confirmation panel**

The existing edit panel is at [bookings/page.tsx:1007-1135](frontend/src/app/%5Blocale%5D/(owner)/owner/bookings/page.tsx#L1007-L1135) and is rendered inside the card when `editBookingId === booking.id`. Right after that closing block (before the card's closing tag), add the void panel:

```tsx
              {/* Void confirmation panel */}
              {voidBookingId === booking.id && (
                <div className="mt-4 pt-4 border-t border-red-400/20">
                  <p className="text-red-400 text-sm font-medium mb-2">
                    {locale === "th"
                      ? `ยกเลิกรายการของ ${booking.customerName} ?`
                      : `Void booking for ${booking.customerName}?`}
                  </p>
                  <p className="text-white/70 text-xs mb-2">
                    {locale === "th"
                      ? `หมอ ${booking.therapistName} จะไม่ได้รับค่าคอม ฿${voidCommissionAmount} ของรายการนี้`
                      : `Therapist ${booking.therapistName} will lose ฿${voidCommissionAmount} commission for this booking`}
                  </p>
                  {voidCommissionPaid && (
                    <p className="text-amber-400 text-xs mb-3">
                      {locale === "th"
                        ? `⚠️ ค่าคอมของวันนี้จ่ายไปแล้ว — ต้องเรียกคืน ฿${voidCommissionAmount} จากหมอเอง`
                        : `⚠️ Today's commission is already paid — you must recover ฿${voidCommissionAmount} from the therapist manually`}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={cancelVoid}
                      className="px-4 py-1.5 rounded-lg text-xs border border-white/20 text-white/70 hover:border-white/40 cursor-pointer"
                    >
                      {locale === "th" ? "ไม่ยกเลิก" : "Keep"}
                    </button>
                    <button
                      onClick={confirmVoid}
                      className="px-4 py-1.5 rounded-lg text-xs bg-red-500 text-white hover:bg-red-600 cursor-pointer"
                    >
                      {locale === "th" ? "ยืนยันการยกเลิก" : "Confirm void"}
                    </button>
                  </div>
                </div>
              )}
```

Verify the field names (`booking.customerName`, `booking.therapistName`) match the `Booking` type — they are already used in nearby code at [bookings/page.tsx:886-898](frontend/src/app/%5Blocale%5D/(owner)/owner/bookings/page.tsx#L886-L898) so they exist.

- [ ] **Step 5: Type-check**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/*/\(owner\)/owner/bookings/page.tsx
git commit -m "feat(frontend): add void button and confirmation panel"
```

---

## Task 6: Manual smoke test

**Purpose:** Verify the feature end-to-end with a real browser and database. The backend integration (Supabase side-effects, Line send) is not covered by the unit tests above — this step is where we catch wiring bugs.

- [ ] **Step 1: Start the dev servers**

In one terminal:
```bash
cd backend && npm run start:dev
```

In another terminal:
```bash
cd frontend && npm run dev
```

Wait for both to report "ready".

- [ ] **Step 2: Prepare test bookings**

In the owner bookings page, create three test bookings and drive them to each target state:

1. Booking A → `in_service` (check-in with a room)
2. Booking B → `completed` (start service, then tap "จบบริการ")
3. Booking C → `checkout` (go all the way to checkout, which confirms payment)

Note the therapist used for each — ideally different therapists (or note the ID if same).

- [ ] **Step 3: Void booking A (in_service)**

Click "ยกเลิกรายการ" on booking A. Panel expands under the card.

Verify:
- Commission amount displayed matches the service formula.
- "Today's commission already paid" warning is NOT shown (commissions for today are `pending` by default).
- Click "ยืนยันการยกเลิก".

Check:
- Booking card status becomes `cancelled` (row should drop to the bottom of the list or change color).
- The bed/room used by booking A shows as `available` in the Rooms section.
- In the therapists section, that therapist's status is `available`.
- Line group receives: `❌ ยกเลิกรายการ` with the right therapist and service names.
- In the backend DB (or via `/owner/commissions` page for today), the therapist's `total_sessions` dropped by 1 and `total_commission` dropped by the expected amount.

- [ ] **Step 4: Void booking B (completed)**

Repeat step 3 on booking B. Same expected outcomes.

- [ ] **Step 5: Void booking C (checkout) — payment deletion check**

Before voiding, open the database console and confirm the `payments` row for booking C exists with `status='confirmed'`.

Click "ยกเลิกรายการ" → confirm.

Check all the same things from step 3, plus:
- The `payments` row for booking C is **gone** from the database.

- [ ] **Step 6: Verify "already paid commission" warning**

In the DB, find any `commissions` row for today for one of your test therapists and manually set `status='paid'`.

Now create and complete one more booking for that therapist, then click "ยกเลิกรายการ". Verify the amber warning line "⚠️ ค่าคอมของวันนี้จ่ายไปแล้ว — ต้องเรียกคืน ฿XXX จากหมอเอง" appears in the panel. Cancel the panel (don't confirm) — the row should be unchanged.

Reset the commission row back to `pending` when done testing.

- [ ] **Step 7: Verify `booked` cancel still silent**

Create one more booking but don't check it in. Click the pre-existing "ยกเลิก" button (not the new one — the `booked` status button is still labeled just "ยกเลิก"). Confirm:
- Booking is cancelled normally.
- **No** Line message is sent (checking the Line group — should see nothing new).

- [ ] **Step 8: Commit a short notes file capturing what was verified**

If anything was off and you fixed it inline, commit those fixes. Otherwise:

```bash
git commit --allow-empty -m "test: manual smoke test of void booking feature passed"
```

---

## Self-review summary

- **Spec coverage:**
  - Scope (`in_service`/`completed`/`checkout`) → Tasks 5 (UI buttons) + 2 (backend gate).
  - No audit trail → no task for logging; not added.
  - No paid-commission block → Task 4 surfaces warning; Task 2 does nothing to gate.
  - Line notification → Tasks 1 (helper) + 2 (wiring).
  - Delete payment → Task 2 step 3.
  - Commission auto-recalculates → no task (existing code already excludes `cancelled`).
  - UI warning for paid → Tasks 4 step 3 + 5 step 4.

- **Placeholder scan:** none found.

- **Type consistency:** `openVoid`/`cancelVoid`/`confirmVoid` used in Task 5 match definitions in Task 4; `calcCommission`/`buildVoidMessage`/`shouldNotifyVoid` exports match imports.
