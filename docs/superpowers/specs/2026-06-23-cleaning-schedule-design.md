# Cleaning Schedule Design Spec

> ระบบจัดตารางเวรทำความสะอาดร้าน "ชาลิตานวดเพื่อสุขภาพ"

| รายละเอียด | ข้อมูล |
|---|---|
| **Date** | 2026-06-23 |
| **Feature** | Weekly cleaning duty roster with fair rotation |
| **Scope** | Owner section — new page + backend module + migration |

---

## 1. Goal

ระบบจัดตารางเวรทำความสะอาดร้านแบบรายสัปดาห์ สำหรับหมอนวดหลายคน หมุนเวียนหน้าที่อย่างยุติธรรม
แสดงผลชัดเจน ใช้ง่ายทั้งมือถือและคอมพิวเตอร์ ภาษาไทยทั้งหมด และส่งตารางเข้า LINE ได้

## 2. Decisions (from brainstorming)

| ประเด็น | ข้อสรุป |
|---|---|
| แหล่งรายชื่อพนักงาน | ใช้ตาราง `therapists` เดิม เฉพาะ `is_active = true` (ไม่สร้างตารางพนักงานใหม่) |
| โครงสร้างสัปดาห์ | ปฏิทินจริง — แท็บสัปดาห์ที่ 1–4 = สัปดาห์ปัจจุบัน + อีก 3 สัปดาห์ถัดไป (อิงวันจันทร์) |
| หน่วยมอบหมาย | รายสัปดาห์ (1 คนรับเวรนั้นทั้งสัปดาห์) |
| LINE | ปุ่มกดส่งตารางของสัปดาห์ที่เลือกแบบ manual (ไม่มี cron) |
| ตรรกะหมุนเวียน | กระจายงานทั่วถึง + เลี่ยงเวรเดิมซ้ำสัปดาห์ติดกัน |

## 3. Architecture

แนวทางที่เลือก: **เก็บข้อมูลใน DB เต็มรูปแบบ** (NestJS module + Supabase + pure helper + Jest)
เพื่อให้ใช้ร่วมกันได้ทุกเครื่อง มีประวัติ regenerate ได้ และส่ง LINE จาก server ได้

```
Owner Browser (/owner/cleaning)
        │  (api.ts)
        ▼
NestJS  cleaning.controller  →  cleaning.service  →  Supabase (Postgres)
                                      │
                                      ├── cleaning-roster.ts (pure, fair rotation)
                                      ├── cleaning-notification.ts (pure, LINE message)
                                      ├── TherapistsService (active staff)
                                      └── LineNotifyService (push to LINE group)
```

## 4. Data Model — migration `004_cleaning_schedule.sql`

### Table: `cleaning_duties` — ประเภทงานเวร (เพิ่ม/แก้/ลบได้)

| Column | Type | Note |
|---|---|---|
| `id` | serial PK | |
| `name` | varchar(100) NOT NULL | ชื่อเวร (ภาษาไทย) |
| `required_count` | int NOT NULL DEFAULT 1 | จำนวนคนที่ต้องใช้ |
| `sort_order` | int NOT NULL DEFAULT 0 | ลำดับการแสดง |
| `is_active` | boolean NOT NULL DEFAULT true | soft delete |
| `created_at` | timestamptz DEFAULT now() | |

**Seed 5 เวรเริ่มต้น:**
1. เวรซักผ้า + พับผ้า — required_count 2
2. เวรชั้น 1 กวาด + ถูพื้น — 1
3. เวรชั้น 2 + 3 ดูฝุ่น — 1
4. เวรล้างห้องน้ำทุกห้อง — 1
5. เวรเติมครีมนวด + เช็ดกระจก — 1

### Table: `cleaning_assignments` — ตารางเวรที่สร้างแล้ว

| Column | Type | Note |
|---|---|---|
| `id` | serial PK | |
| `week_start` | date NOT NULL | วันจันทร์ของสัปดาห์ (ISO week anchor) |
| `duty_id` | int NOT NULL → cleaning_duties(id) | |
| `therapist_id` | int NOT NULL → therapists(id) | |
| `created_at` | timestamptz DEFAULT now() | |

- 1 แถว = หมอนวด 1 คน รับ 1 เวร ใน 1 สัปดาห์ (เวรซักผ้า 2 คน = 2 แถว)
- Index: `(week_start)`, unique `(week_start, duty_id, therapist_id)`
- **เวรสำรอง/ตรวจความเรียบร้อย** = คำนวณสด: หมอนวด active ที่ไม่มีแถวในสัปดาห์นั้น (ไม่เก็บลง DB)

## 5. Fair Rotation Algorithm — `cleaning-roster.ts` (pure, testable)

`buildRoster(therapists, duties, weekStarts[], prevAssignments?)` → assignment objects

กฎ:
1. ทำทีละสัปดาห์ตามลำดับ; เก็บตัวนับ `loadCount[therapistId]` (จำนวนเวรสะสม) ข้ามทุกสัปดาห์
2. แต่ละสัปดาห์ ไล่เวรตาม `sort_order`; แต่ละ slot เลือกหมอนวดที่:
   - ยังไม่ถูกมอบหมายในสัปดาห์นั้น (กันคนเดียวได้ 2 เวร/สัปดาห์)
   - มี `loadCount` น้อยที่สุด (กระจายทั่วถึง)
   - tie-break: เลี่ยงคนที่ได้ `duty_id` เดิมในสัปดาห์ก่อนหน้า (ไม่ซ้ำเวรเดิม), แล้วเรียงตาม id เพื่อ determinism
3. ถ้าจำนวนหมอนวด < จำนวน slot รวมในสัปดาห์ → เติมได้เท่าที่มี (ไม่ error), ที่เหลือว่าง
4. หมอนวดที่ไม่ถูกเลือก = เวรสำรองของสัปดาห์นั้น

Deterministic ทั้งหมด (ไม่มี random) → unit test ได้ง่าย

## 6. Backend — NestJS module `cleaning/`

ไฟล์: `cleaning.module.ts`, `cleaning.controller.ts`, `cleaning.service.ts`,
`cleaning-roster.ts` + `.spec.ts`, `cleaning-notification.ts` + `.spec.ts`,
`dto/create-duty.dto.ts`, `dto/update-duty.dto.ts`, `dto/generate-schedule.dto.ts`

| Method/Path | Role | หน้าที่ |
|---|---|---|
| `GET /cleaning/duties` | any auth | รายการประเภทเวร (active, เรียงตาม sort_order) |
| `POST /cleaning/duties` | owner | เพิ่มประเภทเวร |
| `PATCH /cleaning/duties/:id` | owner | แก้ไขประเภทเวร |
| `DELETE /cleaning/duties/:id` | owner | ลบ (soft delete is_active=false) |
| `GET /cleaning/schedule?week=YYYY-MM-DD` | any auth | ตารางเวร 1 สัปดาห์ (join ชื่อหมอ+เวร) + รายชื่อสำรอง |
| `POST /cleaning/generate` | owner | สร้าง 4 สัปดาห์อัตโนมัติ (body: `{ startWeek: "YYYY-MM-DD" }`) — ลบ assignment เดิมของ 4 สัปดาห์นั้นก่อน แล้วเขียนใหม่ |
| `POST /cleaning/notify` | owner | ส่งตารางสัปดาห์ที่เลือกเข้า LINE (body: `{ week: "YYYY-MM-DD" }`) |

- `generate` ดึงหมอนวด active ผ่าน TherapistsService, ดึงเวร active, อ่าน assignment ของสัปดาห์ก่อน startWeek เป็น `prevAssignments` (boundary continuity), เรียก `buildRoster`, บันทึก
- `notify` อ่าน schedule ของสัปดาห์ → `buildCleaningMessage()` → `LineNotifyService.send()`

## 7. Frontend — หน้า `/owner/cleaning`

ไฟล์: `frontend/src/app/[locale]/(owner)/owner/cleaning/page.tsx`

UI:
- หัวข้อ + แท็บ **สัปดาห์ที่ 1 / 2 / 3 / 4** (แสดงช่วงวันที่จริง เช่น "23 มิ.ย. – 29 มิ.ย.")
- ปุ่ม **"สร้างตารางเวรอัตโนมัติ"** (เรียก generate แล้ว reload)
- ปุ่ม **"ส่งเข้า LINE"** (ส่งสัปดาห์ที่เลือก, มี toast/feedback สำเร็จ-ล้มเหลว)
- การ์ดต่อเวร: ชื่อเวร + จำนวนที่ต้องการ + ชื่อหมอนวดที่ได้รับมอบหมาย (ถ้าว่างแสดง "—")
- Section **"เวรสำรอง / ตรวจความเรียบร้อย"** แสดงรายชื่อที่เหลือ
- Panel **"จัดการประเภทเวร"** (collapsible, inline) — เพิ่ม/แก้/ลบ ตาม pattern เดิมของหน้า owner
- Responsive: การ์ด stack บนมือถือ, grid บน desktop; ภาษาไทยเป็นหลัก (รองรับ i18n th/en สำหรับ chrome)

อื่นๆ:
- `frontend/src/lib/api.ts`: เพิ่ม `getCleaningDuties`, `createCleaningDuty`, `updateCleaningDuty`, `deleteCleaningDuty`, `getCleaningSchedule`, `generateCleaningSchedule`, `notifyCleaningSchedule`
- `frontend/src/lib/week.ts` (+ test): helper หา `mondayOf(date)`, `addWeeks`, `formatWeekRange` — pure, testable
- `frontend/src/components/layout/OwnerSidebar.tsx`: เพิ่มเมนู 🧹 "เวรทำความสะอาด" และปรับ mobile grid `grid-cols-6` → `grid-cols-7`
- `frontend/src/messages/th.json` + `en.json`: เพิ่ม namespace `cleaning.*`

## 8. การเพิ่ม/แก้/ลบ พนักงาน

ใช้หน้า **"จัดการพนักงาน"** (`/owner/manage-therapists`) ที่มีอยู่แล้ว — หมอนวด active จะปรากฏในระบบเวรอัตโนมัติ ไม่ต้องทำซ้ำ (มีลิงก์ชี้ไปจากหน้า cleaning)

## 9. Out of Scope (v1 — YAGNI)

- แก้ตารางทีละช่อง/สลับคนรายคน (ถ้าไม่พอใจให้กดสร้างใหม่) — future
- cron ส่ง LINE อัตโนมัติ — future
- ประวัติ/รายงานสถิติว่าใครได้เวรอะไรไปกี่ครั้ง — future

## 10. Testing

- `cleaning-roster.spec.ts`: กระจายงานเท่ากัน, ไม่มีคนได้ 2 เวร/สัปดาห์, เลี่ยงเวรเดิมซ้ำ, รองรับคนน้อยกว่า slot
- `cleaning-notification.spec.ts`: รูปแบบข้อความ LINE ถูกต้อง + fallback เมื่อข้อมูลว่าง
- `frontend/src/lib/week.test.ts`: mondayOf/addWeeks/formatWeekRange
- Manual smoke test: generate → ดู 4 แท็บ → ส่ง LINE → เพิ่ม/ลบเวร
