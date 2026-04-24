# Void Completed Booking — Design

**Date:** 2026-04-24
**Status:** Approved

## Problem

Owner finds a booking marked `completed` / `checkout` / `in_service` where the therapist did not actually do the work. No UI currently allows the owner to undo this — the only buttons for `completed` bookings are "Checkout", and `checkout` bookings have no edit actions at all. The therapist still earns commission for a job they never performed.

## Goals

- Let the owner void a booking with status `in_service`, `completed`, or `checkout` directly from the `/owner/bookings` page.
- Remove the therapist's commission for that booking (automatically, via existing commission recalculation).
- Release the bed and therapist back to `available`.
- Remove the associated payment record if it exists.
- Notify the therapist via Line so they know a booking was voided.

## Non-goals

- Audit trail (who voided, when, reason) — out of scope.
- Blocking void when commission for the day is already `paid` — owner handles payment reconciliation manually.
- Refund workflow (issuing money back to customer) — out of scope. "Void payment" here means deleting the payment record from the system; any physical refund is handled outside the app.
- Distinct `voided` status — reuse existing `cancelled`.

## User flow

1. Owner opens `/owner/bookings` and sees a booking with status `in_service`, `completed`, or `checkout`.
2. Owner clicks a new red button labeled **"ยกเลิกรายการ"** on the booking card.
3. Confirmation dialog appears:
   > **ยกเลิกรายการของ [ชื่อลูกค้า] ?**
   > หมอ [ชื่อหมอ] จะไม่ได้รับค่าคอมของรายการนี้
   > *(ถ้าค่าคอมของวันนี้จ่ายไปแล้ว ต้องเรียกคืน ฿XXX เอง)*
   >
   > [ยกเลิก] [ยืนยันการยกเลิก]
4. The "เรียกคืน ฿XXX" line only renders when the commission row for (therapist, booking-date) has `status = 'paid'`. Commission amount shown is the per-service value (50% rule for Thai/female, tiered for aroma).
5. Owner confirms. Booking becomes `cancelled`, bed frees up, therapist becomes `available`, payment record (if any) is deleted, Line message goes out, commission recalculates on next view.

## Architecture

### Frontend

**File:** [frontend/src/app/[locale]/(owner)/owner/bookings/page.tsx](frontend/src/app/%5Blocale%5D/(owner)/owner/bookings/page.tsx)

- Add "ยกเลิกรายการ" button to the action column for bookings where `status ∈ {in_service, completed, checkout}`. Existing buttons (Checkout, Remind, Edit) stay in place.
- Button styling: match existing cancel button on `booked` rows — red background with low opacity, red text.
- On click, expand an inline confirmation panel under the booking card (same state-driven pattern as the existing edit panel at [bookings/page.tsx:1008](frontend/src/app/%5Blocale%5D/(owner)/owner/bookings/page.tsx#L1008) — `voidBookingId` state toggled per card, no separate modal component).
- The panel shows the commission amount owed, and — when commission status is `paid` — a warning line about needing to recover that amount manually.
- On confirm, call `api.updateBookingStatus(bookingId, "cancelled")` (the existing helper); the backend handles everything else.
- Existing `handleCancel` (for `booked` → `cancelled`) keeps its no-confirm behavior and stays untouched. The new void flow is a separate handler (`handleVoid`) with its own panel.
- After success, update local state: booking row → `status: cancelled`, bed → `available`, currentBookingId cleared (same pattern as the existing `booked` cancel at [bookings/page.tsx:481](frontend/src/app/%5Blocale%5D/(owner)/owner/bookings/page.tsx#L481)).

### Backend

**File:** [backend/src/bookings/bookings.service.ts](backend/src/bookings/bookings.service.ts) — extend `updateStatus`'s `case "cancelled"` block ([line 274](backend/src/bookings/bookings.service.ts#L274)).

Current behavior (kept as-is):
- Free the bed.
- Set therapist to `available`.

New behavior (added in `case "cancelled"`):
1. **Delete associated payment record.** Run `DELETE FROM payments WHERE booking_id = :id`. Safe regardless of the payment's prior state (pending/confirmed/none).
2. **Line notification — only when previous status was `in_service`, `completed`, or `checkout`.** Do not send on `booked → cancelled` (that is pre-service cancellation and doesn't need a notification).

Why gate on the previous status: the existing cancel flow for `booked` bookings (triggered from the same page) should not start spamming the Line group now. The `booking.status` read at the top of `updateStatus` already captures the previous status before the update.

Line message format (matches existing notifications at [bookings.service.ts:226](backend/src/bookings/bookings.service.ts#L226)):

```
❌ ยกเลิกรายการ
👩‍⚕️ [therapist name]
💆 [service name]
⏰ [start time] - [end time] น.
📅 [date]
```

Wrap the Line send in `try/catch` with `this.logger.warn(...)` — consistent with existing notification error handling in the file. Voiding must succeed even if Line fails.

### Commission

No code change. [commissions.service.ts:46](backend/src/commissions/commissions.service.ts#L46) already excludes `cancelled` bookings from `calculateDaily`. Next call to `getByDate` or `getByTherapist` will automatically drop the voided booking from the aggregate totals.

**Known inconsistency (accepted):** if `commissions.status = 'paid'` for (therapist, date), recalculation reduces `total_commission` but keeps `status = 'paid'`. Owner is responsible for recovering the overpaid amount from the therapist. The confirmation dialog surfaces this before the action.

## Data flow

```
Owner clicks "ยกเลิกรายการ"
  → Frontend: confirmation modal (reads commission status via API or local state)
  → User confirms
  → Frontend: api.updateBookingStatus(id, "cancelled")
  → Backend PATCH /bookings/:id/status
    → Read current booking (captures previous status)
    → UPDATE bookings SET status='cancelled'
    → UPDATE beds SET status='available', current_booking_id=null
    → UPDATE therapists SET status='available'
    → DELETE FROM payments WHERE booking_id=:id
    → If previous status ∈ {in_service, completed, checkout}: Line.send("❌ ยกเลิกรายการ ...")
  → Response: updated booking
  → Frontend: update local state (booking.status, bed.status)
  → Next commission view: calculateDaily runs, voided booking excluded, totals drop
```

## Testing

- Unit / integration: call `updateStatus(id, "cancelled")` on a booking with each prior status (`booked`, `in_service`, `completed`, `checkout`). Verify:
  - Booking row status is `cancelled`.
  - Bed row is `available`, `current_booking_id` is null.
  - Therapist row is `available`.
  - Payment row is gone (if one existed).
  - Line sent only when prior status was `in_service`/`completed`/`checkout`.
- Commission recalculation: create a `completed` booking, trigger commission calc (totals include it), void the booking, re-trigger calc — totals drop by the expected amount.
- Paid-commission case: seed a `commissions` row with `status='paid'`, void a booking contributing to that day, confirm UI surfaces the recovery warning and action still succeeds (no block).

## Risks

- **Payment deletion is destructive.** Once deleted, there is no record the customer ever paid. If the owner later needs proof, it's gone. Accepted per design: the owner chose minimal audit over history.
- **Commission paid-but-reduced inconsistency.** Described above. Users must be trained to check the recovery warning in the modal.
- **Line notification spam** if owner voids many bookings in quick succession. Low risk given manual per-booking action.
