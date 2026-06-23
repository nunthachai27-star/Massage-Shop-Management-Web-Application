# Cleaning Schedule Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a weekly cleaning-duty roster for the massage shop with fair auto-rotation, configurable duty types, a 4-week calendar view, and one-click LINE push — all in Thai, mobile + desktop friendly.

**Architecture:** New NestJS `cleaning` module backed by two Postgres tables (`cleaning_duties`, `cleaning_assignments`). Staff are the existing active `therapists`. Rotation and the LINE message are pure, unit-tested helpers. A new owner page `/owner/cleaning` renders week tabs, the schedule, a backup list, and an inline duty manager.

**Tech Stack:** NestJS, Supabase/PgClient (Postgres), Jest (backend), Next.js 16 + React 19, next-intl, Tailwind CSS v4.

## Global Constraints

- Backend data access goes through `this.supabase.getClient()` (Supabase-compatible builder; works in both `pg` and `supabase` modes). Never import `pg` directly in feature code.
- `SupabaseModule` is `@Global` — do NOT import it in feature modules.
- All API routes are under global prefix `/api`; frontend calls go through `frontend/src/lib/api.ts` via `apiFetch`.
- Global `ValidationPipe({ whitelist: true, transform: true })` is active — every DTO field MUST have a class-validator decorator or it is stripped.
- Auth: `JwtAuthGuard` + `RolesGuard` are global. Use `@Roles("owner")` for the cleaning controller (owner-only feature). `@Public()` is NOT used here.
- Frontend has NO jest runner (devDependencies have no jest). Frontend pure helpers are verified with `npx tsc --noEmit`, not jest. Backend DOES have jest.
- UI primary language is Thai; keep existing i18n pattern (`useTranslations` + inline `locale === "th"` fallbacks).
- Dates: a week is anchored to its **Monday** as a `YYYY-MM-DD` string. Compute Monday/▲weeks in UTC to avoid timezone rollover.
- App name / shop: "ชาลิตา นวดเพื่อสุขภาพ".

---

## Task 1: Database — tables, seed, and apply to running DB

**Files:**
- Create: `backend/supabase/migrations/004_cleaning_schedule.sql`
- Modify: `docker/init.sql` (append, after the `commissions` table block near line 89–120 and its seed inserts)

**Interfaces:**
- Produces: tables `cleaning_duties(id, name, required_count, sort_order, is_active, created_at)` and `cleaning_assignments(id, week_start, duty_id, therapist_id, created_at)`; 5 seeded duties.

- [ ] **Step 1: Write the migration SQL**

Create `backend/supabase/migrations/004_cleaning_schedule.sql`:

```sql
-- Cleaning schedule: configurable duty types + weekly assignments
CREATE TABLE IF NOT EXISTS cleaning_duties (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  required_count INT NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cleaning_assignments (
  id SERIAL PRIMARY KEY,
  week_start DATE NOT NULL,
  duty_id INT NOT NULL REFERENCES cleaning_duties(id),
  therapist_id INT NOT NULL REFERENCES therapists(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (week_start, duty_id, therapist_id)
);

CREATE INDEX IF NOT EXISTS idx_cleaning_assignments_week ON cleaning_assignments(week_start);

-- Seed the 5 default duty types (only if table is empty)
INSERT INTO cleaning_duties (name, required_count, sort_order)
SELECT * FROM (VALUES
  ('เวรซักผ้า + พับผ้า', 2, 1),
  ('เวรชั้น 1 กวาด + ถูพื้น', 1, 2),
  ('เวรชั้น 2 + 3 ดูฝุ่น', 1, 3),
  ('เวรล้างห้องน้ำทุกห้อง', 1, 4),
  ('เวรเติมครีมนวด + เช็ดกระจก', 1, 5)
) AS d(name, required_count, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM cleaning_duties);
```

- [ ] **Step 2: Append identical DDL + seed to `docker/init.sql`**

Append the exact same SQL (both `CREATE TABLE` blocks, the index, and the seeded `INSERT ... WHERE NOT EXISTS`) to the end of `docker/init.sql` so fresh docker volumes get the tables.

- [ ] **Step 3: Apply the migration to the running DB**

The docker volume already exists, so `init.sql` will not re-run. Apply manually:

Run: `docker compose exec -T db psql -U postgres -d massage_shop < backend/supabase/migrations/004_cleaning_schedule.sql`
Expected: `CREATE TABLE` / `CREATE INDEX` / `INSERT 0 5` (or `INSERT 0 0` if already seeded), no errors.

- [ ] **Step 4: Verify tables exist**

Run: `docker compose exec -T db psql -U postgres -d massage_shop -c "SELECT name, required_count FROM cleaning_duties ORDER BY sort_order;"`
Expected: the 5 Thai duty names with counts 2,1,1,1,1.

- [ ] **Step 5: Commit**

```bash
git add backend/supabase/migrations/004_cleaning_schedule.sql docker/init.sql
git commit -m "feat(cleaning): add cleaning_duties and cleaning_assignments tables"
```

---

## Task 2: Backend — fair-rotation pure helper (TDD)

**Files:**
- Create: `backend/src/cleaning/cleaning-roster.ts`
- Create: `backend/src/cleaning/cleaning-roster.spec.ts`

**Interfaces:**
- Produces:
  - `interface RosterTherapist { id: number }`
  - `interface RosterDuty { id: number; required_count: number; sort_order: number }`
  - `interface RosterAssignment { week_start: string; duty_id: number; therapist_id: number }`
  - `function buildRoster(therapists: RosterTherapist[], duties: RosterDuty[], weekStarts: string[], prevAssignments?: RosterAssignment[]): RosterAssignment[]`

- [ ] **Step 1: Write the failing test**

Create `backend/src/cleaning/cleaning-roster.spec.ts`:

```typescript
import { buildRoster, RosterDuty, RosterTherapist } from "./cleaning-roster";

const T = (...ids: number[]): RosterTherapist[] => ids.map((id) => ({ id }));
const duty = (id: number, required_count: number, sort_order: number): RosterDuty => ({
  id,
  required_count,
  sort_order,
});

describe("buildRoster", () => {
  it("distributes one duty evenly across weeks (each therapist once over 5 weeks)", () => {
    const weeks = ["2026-06-22", "2026-06-29", "2026-07-06", "2026-07-13", "2026-07-20"];
    const result = buildRoster(T(1, 2, 3, 4, 5), [duty(10, 1, 1)], weeks);
    expect(result).toHaveLength(5);
    const counts = new Map<number, number>();
    for (const a of result) counts.set(a.therapist_id, (counts.get(a.therapist_id) || 0) + 1);
    expect([...counts.values()]).toEqual([1, 1, 1, 1, 1]);
  });

  it("never assigns the same therapist two duties in one week", () => {
    const result = buildRoster(T(1, 2, 3), [duty(10, 2, 1), duty(20, 1, 2)], ["2026-06-22"]);
    const ids = result.map((a) => a.therapist_id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(result).toHaveLength(3);
  });

  it("avoids giving a therapist the same duty on consecutive weeks", () => {
    const result = buildRoster(T(1, 2), [duty(10, 1, 1), duty(20, 1, 2)], ["2026-06-22", "2026-06-29"]);
    // Week 1: dutyA(10)->t1, dutyB(20)->t2. Week 2: dutyA should go to t2 (t1 had it last week).
    const wk2 = result.filter((a) => a.week_start === "2026-06-29");
    const a10 = wk2.find((a) => a.duty_id === 10);
    const a20 = wk2.find((a) => a.duty_id === 20);
    expect(a10?.therapist_id).toBe(2);
    expect(a20?.therapist_id).toBe(1);
  });

  it("fills only what it can when therapists are fewer than slots", () => {
    const result = buildRoster(T(1), [duty(10, 2, 1)], ["2026-06-22"]);
    expect(result).toHaveLength(1);
  });

  it("respects prevAssignments at the boundary week", () => {
    const prev = [{ week_start: "2026-06-15", duty_id: 10, therapist_id: 1 }];
    const result = buildRoster(T(1, 2), [duty(10, 1, 1)], ["2026-06-22"], prev);
    // t1 had duty 10 last week, so t2 should get it this week.
    expect(result[0].therapist_id).toBe(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npx jest cleaning-roster.spec.ts`
Expected: FAIL with "Cannot find module './cleaning-roster'"

- [ ] **Step 3: Write the implementation**

Create `backend/src/cleaning/cleaning-roster.ts`:

```typescript
export interface RosterTherapist {
  id: number;
}

export interface RosterDuty {
  id: number;
  required_count: number;
  sort_order: number;
}

export interface RosterAssignment {
  week_start: string;
  duty_id: number;
  therapist_id: number;
}

// Deterministic, fair rotation:
//  - spread total load evenly (pick least-loaded therapist first)
//  - never give one therapist two duties in the same week
//  - avoid repeating the same duty a therapist had the previous week
//  - stable tie-break by therapist id (no randomness → testable)
export function buildRoster(
  therapists: RosterTherapist[],
  duties: RosterDuty[],
  weekStarts: string[],
  prevAssignments: RosterAssignment[] = [],
): RosterAssignment[] {
  const sortedDuties = [...duties].sort(
    (a, b) => a.sort_order - b.sort_order || a.id - b.id,
  );
  const load = new Map<number, number>();
  for (const t of therapists) load.set(t.id, 0);

  // Seed "duty done last week" from the most recent previous week, if any.
  let prevWeekDuty = lastWeekDutyMap(prevAssignments);

  const result: RosterAssignment[] = [];

  for (const week of weekStarts) {
    const assignedThisWeek = new Set<number>();
    const thisWeekDuty = new Map<number, Set<number>>();

    for (const d of sortedDuties) {
      for (let slot = 0; slot < d.required_count; slot++) {
        const candidates = therapists.filter((t) => !assignedThisWeek.has(t.id));
        if (candidates.length === 0) break;

        candidates.sort((a, b) => {
          const la = load.get(a.id) ?? 0;
          const lb = load.get(b.id) ?? 0;
          if (la !== lb) return la - lb; // fairness: least loaded first
          const ra = prevWeekDuty.get(a.id)?.has(d.id) ? 1 : 0;
          const rb = prevWeekDuty.get(b.id)?.has(d.id) ? 1 : 0;
          if (ra !== rb) return ra - rb; // avoid repeating same duty
          return a.id - b.id; // deterministic tie-break
        });

        const chosen = candidates[0];
        result.push({ week_start: week, duty_id: d.id, therapist_id: chosen.id });
        load.set(chosen.id, (load.get(chosen.id) ?? 0) + 1);
        assignedThisWeek.add(chosen.id);
        if (!thisWeekDuty.has(chosen.id)) thisWeekDuty.set(chosen.id, new Set());
        thisWeekDuty.get(chosen.id)!.add(d.id);
      }
    }

    prevWeekDuty = thisWeekDuty;
  }

  return result;
}

function lastWeekDutyMap(prev: RosterAssignment[]): Map<number, Set<number>> {
  const map = new Map<number, Set<number>>();
  if (prev.length === 0) return map;
  const latest = prev.reduce((m, a) => (a.week_start > m ? a.week_start : m), prev[0].week_start);
  for (const a of prev) {
    if (a.week_start !== latest) continue;
    if (!map.has(a.therapist_id)) map.set(a.therapist_id, new Set());
    map.get(a.therapist_id)!.add(a.duty_id);
  }
  return map;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && npx jest cleaning-roster.spec.ts`
Expected: PASS — 5 tests.

- [ ] **Step 5: Commit**

```bash
git add backend/src/cleaning/cleaning-roster.ts backend/src/cleaning/cleaning-roster.spec.ts
git commit -m "feat(cleaning): add fair rotation roster helper"
```

---

## Task 3: Backend — LINE message builder pure helper (TDD)

**Files:**
- Create: `backend/src/cleaning/cleaning-notification.ts`
- Create: `backend/src/cleaning/cleaning-notification.spec.ts`

**Interfaces:**
- Produces:
  - `interface DutyLine { dutyName: string; therapistNames: string[] }`
  - `interface CleaningMessageInput { weekRangeLabel: string; duties: DutyLine[]; backupNames: string[] }`
  - `function buildCleaningMessage(input: CleaningMessageInput): string`

- [ ] **Step 1: Write the failing test**

Create `backend/src/cleaning/cleaning-notification.spec.ts`:

```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npx jest cleaning-notification.spec.ts`
Expected: FAIL with "Cannot find module './cleaning-notification'"

- [ ] **Step 3: Write the implementation**

Create `backend/src/cleaning/cleaning-notification.ts`:

```typescript
export interface DutyLine {
  dutyName: string;
  therapistNames: string[];
}

export interface CleaningMessageInput {
  weekRangeLabel: string;
  duties: DutyLine[];
  backupNames: string[];
}

export function buildCleaningMessage(input: CleaningMessageInput): string {
  const header = `🧹 ตารางเวรทำความสะอาด\n📅 ${input.weekRangeLabel}`;
  const dutyLines = input.duties
    .map((d) => `${d.dutyName}: ${d.therapistNames.length ? d.therapistNames.join(", ") : "-"}`)
    .join("\n");
  const backup = `เวรสำรอง / ตรวจความเรียบร้อย: ${
    input.backupNames.length ? input.backupNames.join(", ") : "-"
  }`;
  return `${header}\n\n${dutyLines}\n\n${backup}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && npx jest cleaning-notification.spec.ts`
Expected: PASS — 2 tests.

- [ ] **Step 5: Commit**

```bash
git add backend/src/cleaning/cleaning-notification.ts backend/src/cleaning/cleaning-notification.spec.ts
git commit -m "feat(cleaning): add LINE message builder helper"
```

---

## Task 4: Backend — cleaning module (DTOs, service, controller, registration)

**Files:**
- Create: `backend/src/cleaning/dto/create-duty.dto.ts`
- Create: `backend/src/cleaning/dto/update-duty.dto.ts`
- Create: `backend/src/cleaning/dto/generate-schedule.dto.ts`
- Create: `backend/src/cleaning/dto/notify-schedule.dto.ts`
- Create: `backend/src/cleaning/cleaning.service.ts`
- Create: `backend/src/cleaning/cleaning.controller.ts`
- Create: `backend/src/cleaning/cleaning.module.ts`
- Modify: `backend/src/app.module.ts` (register `CleaningModule`)

**Interfaces:**
- Consumes: `buildRoster`, `RosterAssignment` (Task 2); `buildCleaningMessage` (Task 3); `SupabaseService.getClient()`; `LineNotifyService.send(message)`.
- Produces REST endpoints (all `@Roles("owner")`, under `/api`):
  - `GET /cleaning/duties` → `Duty[]`
  - `POST /cleaning/duties` body `{ name, required_count?, sort_order? }`
  - `PATCH /cleaning/duties/:id` body `{ name?, required_count?, sort_order? }`
  - `DELETE /cleaning/duties/:id`
  - `GET /cleaning/schedule?week=YYYY-MM-DD` → `{ week_start, duties: {id,name,required_count,therapists:{id,name_th,name_en}[]}[], backup: {id,name_th,name_en}[] }`
  - `POST /cleaning/generate` body `{ startWeek: "YYYY-MM-DD" }` → `{ week_starts: string[], count: number }`
  - `POST /cleaning/notify` body `{ week: "YYYY-MM-DD" }` → `{ success: true }`

- [ ] **Step 1: Write the DTOs**

Create `backend/src/cleaning/dto/create-duty.dto.ts`:

```typescript
import { IsString, IsNotEmpty, IsInt, IsOptional, Min } from "class-validator";

export class CreateDutyDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  required_count?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  sort_order?: number;
}
```

Create `backend/src/cleaning/dto/update-duty.dto.ts`:

```typescript
import { IsString, IsNotEmpty, IsInt, IsOptional, Min } from "class-validator";

export class UpdateDutyDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  required_count?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  sort_order?: number;
}
```

Create `backend/src/cleaning/dto/generate-schedule.dto.ts`:

```typescript
import { IsString, Matches } from "class-validator";

export class GenerateScheduleDto {
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: "startWeek must be YYYY-MM-DD" })
  startWeek: string;
}
```

Create `backend/src/cleaning/dto/notify-schedule.dto.ts`:

```typescript
import { IsString, Matches } from "class-validator";

export class NotifyScheduleDto {
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: "week must be YYYY-MM-DD" })
  week: string;
}
```

- [ ] **Step 2: Write the service**

Create `backend/src/cleaning/cleaning.service.ts`:

```typescript
import { Injectable, NotFoundException } from "@nestjs/common";
import { SupabaseService } from "../supabase/supabase.service";
import { LineNotifyService } from "../line-notify/line-notify.service";
import { buildRoster, RosterAssignment } from "./cleaning-roster";
import { buildCleaningMessage, DutyLine } from "./cleaning-notification";
import { CreateDutyDto } from "./dto/create-duty.dto";
import { UpdateDutyDto } from "./dto/update-duty.dto";

interface DutyRow {
  id: number;
  name: string;
  required_count: number;
  sort_order: number;
}
interface TherapistRow {
  id: number;
  name_th: string;
  name_en: string;
}
interface AssignmentRow {
  week_start: string;
  duty_id: number;
  therapist_id: number;
}

// Monday (ISO) of the week containing dateStr, as YYYY-MM-DD (UTC-safe).
export function mondayOf(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  const dow = d.getUTCDay(); // 0=Sun..6=Sat
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

export function addWeeks(dateStr: string, n: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n * 7);
  return d.toISOString().slice(0, 10);
}

function weekRangeLabel(monday: string): string {
  const start = new Date(`${monday}T00:00:00Z`);
  const end = new Date(`${monday}T00:00:00Z`);
  end.setUTCDate(end.getUTCDate() + 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString("th-TH", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
  return `${fmt(start)} - ${fmt(end)}`;
}

@Injectable()
export class CleaningService {
  constructor(
    private supabase: SupabaseService,
    private lineNotify: LineNotifyService,
  ) {}

  async listDuties(): Promise<DutyRow[]> {
    const { data, error } = await this.supabase
      .getClient()
      .from("cleaning_duties")
      .select("id, name, required_count, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return (data as DutyRow[]) || [];
  }

  async createDuty(dto: CreateDutyDto): Promise<DutyRow> {
    const { data, error } = await this.supabase
      .getClient()
      .from("cleaning_duties")
      .insert({
        name: dto.name,
        required_count: dto.required_count ?? 1,
        sort_order: dto.sort_order ?? 0,
      })
      .select("id, name, required_count, sort_order")
      .single();
    if (error) throw error;
    return data as DutyRow;
  }

  async updateDuty(id: number, dto: UpdateDutyDto): Promise<DutyRow> {
    const { data, error } = await this.supabase
      .getClient()
      .from("cleaning_duties")
      .update({
        name: dto.name,
        required_count: dto.required_count,
        sort_order: dto.sort_order,
      })
      .eq("id", id)
      .select("id, name, required_count, sort_order")
      .single();
    if (error || !data) throw new NotFoundException("Cleaning duty not found");
    return data as DutyRow;
  }

  async removeDuty(id: number): Promise<{ message: string }> {
    const { error } = await this.supabase
      .getClient()
      .from("cleaning_duties")
      .update({ is_active: false })
      .eq("id", id);
    if (error) throw error;
    return { message: "Cleaning duty deleted" };
  }

  private async activeTherapists(): Promise<TherapistRow[]> {
    const { data, error } = await this.supabase
      .getClient()
      .from("therapists")
      .select("id, name_th, name_en")
      .eq("is_active", true)
      .order("id", { ascending: true });
    if (error) throw error;
    return (data as TherapistRow[]) || [];
  }

  private async assignmentsForWeek(monday: string): Promise<AssignmentRow[]> {
    const { data, error } = await this.supabase
      .getClient()
      .from("cleaning_assignments")
      .select("week_start, duty_id, therapist_id")
      .eq("week_start", monday);
    if (error) throw error;
    return (data as AssignmentRow[]) || [];
  }

  async getSchedule(week: string) {
    const monday = mondayOf(week);
    const [duties, therapists, assignments] = await Promise.all([
      this.listDuties(),
      this.activeTherapists(),
      this.assignmentsForWeek(monday),
    ]);
    const therapistById = new Map(therapists.map((t) => [t.id, t]));

    const dutyView = duties.map((d) => ({
      id: d.id,
      name: d.name,
      required_count: d.required_count,
      therapists: assignments
        .filter((a) => a.duty_id === d.id)
        .map((a) => therapistById.get(a.therapist_id))
        .filter((t): t is TherapistRow => Boolean(t)),
    }));

    const assignedIds = new Set(assignments.map((a) => a.therapist_id));
    const backup = therapists.filter((t) => !assignedIds.has(t.id));

    return { week_start: monday, duties: dutyView, backup };
  }

  async generate(startWeek: string) {
    const monday = mondayOf(startWeek);
    const weeks = [0, 1, 2, 3].map((i) => addWeeks(monday, i));
    const [therapists, duties, prev] = await Promise.all([
      this.activeTherapists(),
      this.listDuties(),
      this.assignmentsForWeek(addWeeks(monday, -1)),
    ]);

    const roster: RosterAssignment[] = buildRoster(
      therapists.map((t) => ({ id: t.id })),
      duties.map((d) => ({
        id: d.id,
        required_count: d.required_count,
        sort_order: d.sort_order,
      })),
      weeks,
      prev,
    );

    const client = this.supabase.getClient();
    await client.from("cleaning_assignments").delete().in("week_start", weeks);
    for (const a of roster) {
      await client.from("cleaning_assignments").insert({
        week_start: a.week_start,
        duty_id: a.duty_id,
        therapist_id: a.therapist_id,
      });
    }

    return { week_starts: weeks, count: roster.length };
  }

  async notify(week: string) {
    const schedule = await this.getSchedule(week);
    const duties: DutyLine[] = schedule.duties.map((d) => ({
      dutyName: d.name,
      therapistNames: d.therapists.map((t) => t.name_th),
    }));
    const message = buildCleaningMessage({
      weekRangeLabel: weekRangeLabel(schedule.week_start),
      duties,
      backupNames: schedule.backup.map((t) => t.name_th),
    });
    return this.lineNotify.send(message);
  }
}
```

- [ ] **Step 3: Write the controller**

Create `backend/src/cleaning/cleaning.controller.ts`:

```typescript
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseIntPipe,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Roles } from "../auth/decorators/roles.decorator";
import { CleaningService } from "./cleaning.service";
import { CreateDutyDto } from "./dto/create-duty.dto";
import { UpdateDutyDto } from "./dto/update-duty.dto";
import { GenerateScheduleDto } from "./dto/generate-schedule.dto";
import { NotifyScheduleDto } from "./dto/notify-schedule.dto";

@ApiTags("cleaning")
@Roles("owner")
@Controller("cleaning")
export class CleaningController {
  constructor(private readonly cleaning: CleaningService) {}

  @Get("duties")
  listDuties() {
    return this.cleaning.listDuties();
  }

  @Post("duties")
  createDuty(@Body() dto: CreateDutyDto) {
    return this.cleaning.createDuty(dto);
  }

  @Patch("duties/:id")
  updateDuty(@Param("id", ParseIntPipe) id: number, @Body() dto: UpdateDutyDto) {
    return this.cleaning.updateDuty(id, dto);
  }

  @Delete("duties/:id")
  removeDuty(@Param("id", ParseIntPipe) id: number) {
    return this.cleaning.removeDuty(id);
  }

  @Get("schedule")
  getSchedule(@Query("week") week: string) {
    return this.cleaning.getSchedule(week);
  }

  @Post("generate")
  generate(@Body() dto: GenerateScheduleDto) {
    return this.cleaning.generate(dto.startWeek);
  }

  @Post("notify")
  notify(@Body() dto: NotifyScheduleDto) {
    return this.cleaning.notify(dto.week);
  }
}
```

- [ ] **Step 4: Write the module**

Create `backend/src/cleaning/cleaning.module.ts`:

```typescript
import { Module } from "@nestjs/common";
import { CleaningController } from "./cleaning.controller";
import { CleaningService } from "./cleaning.service";
import { LineNotifyModule } from "../line-notify/line-notify.module";

@Module({
  imports: [LineNotifyModule],
  controllers: [CleaningController],
  providers: [CleaningService],
})
export class CleaningModule {}
```

- [ ] **Step 5: Register in app.module**

In `backend/src/app.module.ts`, add the import after the `LineNotifyModule` import (line 17):

```typescript
import { CleaningModule } from "./cleaning/cleaning.module";
```

And add `CleaningModule,` to the `imports` array after `LineNotifyModule,` (line 39).

- [ ] **Step 6: Type-check the backend**

Run: `cd backend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Run all backend tests**

Run: `cd backend && npx jest cleaning`
Expected: PASS (roster + notification specs).

- [ ] **Step 8: Commit**

```bash
git add backend/src/cleaning/ backend/src/app.module.ts
git commit -m "feat(cleaning): add cleaning module with duties, schedule, generate, notify"
```

---

## Task 5: Frontend — week date helper

**Files:**
- Create: `frontend/src/lib/week.ts`

**Interfaces:**
- Produces:
  - `function mondayOf(d: Date): Date` — Monday of d's week (local), time zeroed
  - `function addWeeks(d: Date, n: number): Date`
  - `function toISODate(d: Date): string` — `YYYY-MM-DD` (local)
  - `function formatWeekRange(monday: Date, locale: string): string` — e.g. `23 มิ.ย. - 29 มิ.ย.`

> Frontend has no jest — verify with tsc and the manual smoke test. Keep functions pure.

- [ ] **Step 1: Write the implementation**

Create `frontend/src/lib/week.ts`:

```typescript
// Monday of the week containing d (local time), with time set to 00:00:00.
export function mondayOf(d: Date): Date {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = r.getDay(); // 0=Sun..6=Sat
  const diff = dow === 0 ? -6 : 1 - dow;
  r.setDate(r.getDate() + diff);
  return r;
}

export function addWeeks(d: Date, n: number): Date {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  r.setDate(r.getDate() + n * 7);
  return r;
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatWeekRange(monday: Date, locale: string): string {
  const end = addWeeks(monday, 0);
  end.setDate(end.getDate() + 6);
  const loc = locale === "th" ? "th-TH" : "en-GB";
  const fmt = (d: Date) =>
    d.toLocaleDateString(loc, { day: "numeric", month: "short" });
  return `${fmt(monday)} - ${fmt(end)}`;
}
```

- [ ] **Step 2: Type-check**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/week.ts
git commit -m "feat(frontend): add week date helpers for cleaning schedule"
```

---

## Task 6: Frontend — api client methods

**Files:**
- Modify: `frontend/src/lib/api.ts` (add a block before the closing `};` of the `api` object, after the "Line Messaging" block at line 132–136)

**Interfaces:**
- Consumes: `apiFetch`, `ApiRecord`.
- Produces: `api.getCleaningDuties`, `api.createCleaningDuty`, `api.updateCleaningDuty`, `api.deleteCleaningDuty`, `api.getCleaningSchedule`, `api.generateCleaningSchedule`, `api.notifyCleaningSchedule`.

- [ ] **Step 1: Add the cleaning methods**

In `frontend/src/lib/api.ts`, immediately after the "Line Messaging" block (the `sendLineMessage` method, before the `// Auth` comment), insert:

```typescript
  // Cleaning schedule
  getCleaningDuties: () => apiFetch<ApiRecord[]>("/cleaning/duties"),
  createCleaningDuty: (data: { name: string; required_count?: number; sort_order?: number }) =>
    apiFetch<ApiRecord>("/cleaning/duties", { method: "POST", body: JSON.stringify(data) }),
  updateCleaningDuty: (id: number, data: Record<string, unknown>) =>
    apiFetch<ApiRecord>(`/cleaning/duties/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteCleaningDuty: (id: number) =>
    apiFetch<ApiRecord>(`/cleaning/duties/${id}`, { method: "DELETE" }),
  getCleaningSchedule: (week: string) =>
    apiFetch<ApiRecord>(`/cleaning/schedule?week=${week}`),
  generateCleaningSchedule: (startWeek: string) =>
    apiFetch<ApiRecord>("/cleaning/generate", { method: "POST", body: JSON.stringify({ startWeek }) }),
  notifyCleaningSchedule: (week: string) =>
    apiFetch<ApiRecord>("/cleaning/notify", { method: "POST", body: JSON.stringify({ week }) }),
```

- [ ] **Step 2: Type-check**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/api.ts
git commit -m "feat(frontend): add cleaning schedule api methods"
```

---

## Task 7: Frontend — i18n strings + sidebar nav item

**Files:**
- Modify: `frontend/src/messages/th.json` (add a `cleaning` namespace at top level)
- Modify: `frontend/src/messages/en.json` (same keys, English)
- Modify: `frontend/src/components/layout/OwnerSidebar.tsx` (add nav item + change mobile grid to 7 cols)

**Interfaces:**
- Produces: translation keys under `cleaning.*`; a `/owner/cleaning` nav entry.

- [ ] **Step 1: Add the Thai messages**

In `frontend/src/messages/th.json`, add a new top-level key (e.g. after the `"owner"` object). Match the file's existing 2-space indentation:

```json
  "cleaning": {
    "title": "เวรทำความสะอาด",
    "generate": "สร้างตารางเวรอัตโนมัติ",
    "generating": "กำลังสร้าง...",
    "sendLine": "ส่งเข้า LINE",
    "sending": "กำลังส่ง...",
    "sent": "ส่งเข้า LINE แล้ว",
    "sendFailed": "ส่งไม่สำเร็จ",
    "week": "สัปดาห์ที่",
    "backup": "เวรสำรอง / ตรวจความเรียบร้อย",
    "people": "คน",
    "empty": "—",
    "noSchedule": "ยังไม่มีตารางเวร กด \"สร้างตารางเวรอัตโนมัติ\"",
    "manageDuties": "จัดการประเภทเวร",
    "addDuty": "เพิ่มประเภทเวร",
    "editDuty": "แก้ไข",
    "deleteDuty": "ลบ",
    "dutyName": "ชื่อเวร",
    "requiredCount": "จำนวนคน",
    "save": "บันทึก",
    "cancel": "ยกเลิก",
    "staffHint": "เพิ่ม/แก้ไข/ลบ พนักงาน ได้ที่หน้า \"พนักงาน\""
  },
```

- [ ] **Step 2: Add the English messages**

In `frontend/src/messages/en.json`, add the matching block:

```json
  "cleaning": {
    "title": "Cleaning Duty",
    "generate": "Auto-generate roster",
    "generating": "Generating...",
    "sendLine": "Send to LINE",
    "sending": "Sending...",
    "sent": "Sent to LINE",
    "sendFailed": "Failed to send",
    "week": "Week",
    "backup": "Backup / Inspection",
    "people": "people",
    "empty": "—",
    "noSchedule": "No roster yet. Tap \"Auto-generate roster\"",
    "manageDuties": "Manage duty types",
    "addDuty": "Add duty type",
    "editDuty": "Edit",
    "deleteDuty": "Delete",
    "dutyName": "Duty name",
    "requiredCount": "People needed",
    "save": "Save",
    "cancel": "Cancel",
    "staffHint": "Add/edit/remove staff on the \"Staff\" page"
  },
```

- [ ] **Step 3: Add the sidebar nav item and widen mobile grid**

In `frontend/src/components/layout/OwnerSidebar.tsx`:

Add to the `navItems` array (after the `manage-therapists` entry, line 13):

```tsx
  { href: "/owner/cleaning", labelKey: "cleaning.title", shortLabel: { th: "เวร", en: "Clean" }, icon: "🧹" },
```

Change the mobile grid from 6 to 7 columns (line 63):

```tsx
        <div className="grid grid-cols-7 py-1 px-0.5">
```

- [ ] **Step 4: Type-check + lint**

Run: `cd frontend && npx tsc --noEmit && npx eslint src/components/layout/OwnerSidebar.tsx`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/messages/th.json frontend/src/messages/en.json frontend/src/components/layout/OwnerSidebar.tsx
git commit -m "feat(frontend): add cleaning nav item and i18n strings"
```

---

## Task 8: Frontend — cleaning schedule page

**Files:**
- Create: `frontend/src/app/[locale]/(owner)/owner/cleaning/page.tsx`

**Interfaces:**
- Consumes: `api.*` cleaning methods (Task 6); `mondayOf`, `addWeeks`, `toISODate`, `formatWeekRange` (Task 5); `Card`; next-intl `useTranslations`/`useLocale`.

- [ ] **Step 1: Write the page**

Create `frontend/src/app/[locale]/(owner)/owner/cleaning/page.tsx`:

```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Card } from "@/components/ui/Card";
import { api } from "@/lib/api";
import { mondayOf, addWeeks, toISODate, formatWeekRange } from "@/lib/week";

type ApiRecord = Record<string, unknown>;

interface Therapist {
  id: number;
  name_th: string;
  name_en: string;
}
interface DutyView {
  id: number;
  name: string;
  required_count: number;
  therapists: Therapist[];
}
interface Schedule {
  week_start: string;
  duties: DutyView[];
  backup: Therapist[];
}
interface Duty {
  id: number;
  name: string;
  required_count: number;
  sort_order: number;
}

export default function CleaningPage() {
  const t = useTranslations("cleaning");
  const locale = useLocale();

  // Four consecutive weeks starting this week (Monday-anchored).
  const [weeks] = useState<Date[]>(() => {
    const base = mondayOf(new Date());
    return [0, 1, 2, 3].map((i) => addWeeks(base, i));
  });
  const [activeWeek, setActiveWeek] = useState(0);

  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [duties, setDuties] = useState<Duty[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [sendState, setSendState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [showDuties, setShowDuties] = useState(false);

  // Duty form state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formName, setFormName] = useState("");
  const [formCount, setFormCount] = useState(1);

  const weekIso = toISODate(weeks[activeWeek]);

  const loadSchedule = useCallback(async () => {
    setLoading(true);
    try {
      const data = (await api.getCleaningSchedule(weekIso)) as unknown as Schedule;
      setSchedule(data);
    } catch {
      setSchedule(null);
    }
    setLoading(false);
  }, [weekIso]);

  const loadDuties = useCallback(async () => {
    try {
      const data = await api.getCleaningDuties();
      setDuties(data as unknown as Duty[]);
    } catch {
      setDuties([]);
    }
  }, []);

  useEffect(() => {
    loadSchedule();
  }, [loadSchedule]);
  useEffect(() => {
    loadDuties();
  }, [loadDuties]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await api.generateCleaningSchedule(toISODate(weeks[0]));
      await loadSchedule();
    } catch {
      // ignore
    }
    setGenerating(false);
  };

  const handleSend = async () => {
    setSendState("sending");
    try {
      await api.notifyCleaningSchedule(weekIso);
      setSendState("sent");
      setTimeout(() => setSendState("idle"), 2500);
    } catch {
      setSendState("error");
      setTimeout(() => setSendState("idle"), 2500);
    }
  };

  const resetDutyForm = () => {
    setEditingId(null);
    setFormName("");
    setFormCount(1);
  };

  const submitDuty = async () => {
    if (!formName.trim() || formCount < 1) return;
    try {
      if (editingId) {
        await api.updateCleaningDuty(editingId, { name: formName.trim(), required_count: formCount });
      } else {
        await api.createCleaningDuty({
          name: formName.trim(),
          required_count: formCount,
          sort_order: duties.length + 1,
        });
      }
      resetDutyForm();
      await loadDuties();
    } catch {
      // ignore
    }
  };

  const editDuty = (d: Duty) => {
    setEditingId(d.id);
    setFormName(d.name);
    setFormCount(d.required_count);
    setShowDuties(true);
  };

  const deleteDuty = async (id: number) => {
    try {
      await api.deleteCleaningDuty(id);
      await loadDuties();
    } catch {
      // ignore
    }
  };

  const therapistName = (th: Therapist) => (locale === "th" ? th.name_th : th.name_en);

  return (
    <div className="pb-24 md:pb-6">
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <h1 className="font-heading text-xl md:text-2xl text-white">{t("title")}</h1>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="px-4 py-2 rounded-lg bg-accent-gold text-primary-dark text-sm font-medium hover:bg-accent-gold-dark transition-all cursor-pointer disabled:opacity-50"
        >
          {generating ? t("generating") : t("generate")}
        </button>
      </div>

      {/* Week tabs */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {weeks.map((w, i) => (
          <button
            key={i}
            onClick={() => setActiveWeek(i)}
            className={`px-2 py-2 rounded-lg text-xs transition-all cursor-pointer ${
              activeWeek === i
                ? "bg-accent-gold/15 text-accent-gold border border-accent-gold/30"
                : "bg-white/5 text-white/50 hover:bg-white/10"
            }`}
          >
            <div className="font-medium">
              {t("week")} {i + 1}
            </div>
            <div className="text-[10px] opacity-70">{formatWeekRange(w, locale)}</div>
          </button>
        ))}
      </div>

      {/* Send to LINE */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={handleSend}
          disabled={sendState === "sending"}
          className="px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-400 text-sm font-medium hover:bg-emerald-500/30 transition-all cursor-pointer disabled:opacity-50"
        >
          📤 {sendState === "sending" ? t("sending") : t("sendLine")}
        </button>
        {sendState === "sent" && <span className="text-emerald-400 text-sm">✓ {t("sent")}</span>}
        {sendState === "error" && <span className="text-red-400 text-sm">✗ {t("sendFailed")}</span>}
      </div>

      {/* Schedule */}
      {loading ? (
        <p className="text-white/50 text-center py-8">{locale === "th" ? "กำลังโหลด..." : "Loading..."}</p>
      ) : !schedule || schedule.duties.every((d) => d.therapists.length === 0) ? (
        <Card className="text-center !py-8">
          <p className="text-white/50 text-sm">{t("noSchedule")}</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {schedule.duties.map((d) => (
            <Card key={d.id}>
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-accent-gold/15 flex items-center justify-center text-base shrink-0">
                  🧹
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-semibold text-sm">{d.name}</h3>
                  <p className="text-white/40 text-xs mt-0.5">
                    {d.required_count} {t("people")}
                  </p>
                  <p className="text-accent-gold text-sm mt-1">
                    {d.therapists.length
                      ? d.therapists.map(therapistName).join(", ")
                      : t("empty")}
                  </p>
                </div>
              </div>
            </Card>
          ))}

          {/* Backup */}
          <Card>
            <h3 className="text-white font-semibold text-sm">{t("backup")}</h3>
            <p className="text-white/60 text-sm mt-1">
              {schedule.backup.length ? schedule.backup.map(therapistName).join(", ") : t("empty")}
            </p>
          </Card>
        </div>
      )}

      {/* Manage duties */}
      <div className="mt-6">
        <button
          onClick={() => setShowDuties((s) => !s)}
          className="text-white/60 text-sm hover:text-white transition-colors cursor-pointer"
        >
          ⚙️ {t("manageDuties")} {showDuties ? "▲" : "▼"}
        </button>

        {showDuties && (
          <Card className="mt-3">
            <p className="text-white/40 text-xs mb-3">{t("staffHint")}</p>

            {/* Duty form */}
            <div className="flex flex-col sm:flex-row gap-2 mb-4">
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder={t("dutyName")}
                className="flex-1 bg-surface-dark border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
              />
              <input
                type="number"
                value={formCount}
                min={1}
                onChange={(e) => setFormCount(Number(e.target.value))}
                placeholder={t("requiredCount")}
                className="w-full sm:w-28 bg-surface-dark border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
              />
              <button
                onClick={submitDuty}
                className="px-4 py-2 rounded-lg bg-accent-gold text-primary-dark font-medium text-sm hover:bg-accent-gold-dark transition-all cursor-pointer"
              >
                {editingId ? t("save") : t("addDuty")}
              </button>
              {editingId && (
                <button
                  onClick={resetDutyForm}
                  className="px-4 py-2 rounded-lg bg-white/10 text-white/60 text-sm hover:bg-white/20 transition-all cursor-pointer"
                >
                  {t("cancel")}
                </button>
              )}
            </div>

            {/* Duty list */}
            <div className="space-y-2">
              {duties.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2"
                >
                  <div className="flex-1 min-w-0">
                    <span className="text-white text-sm">{d.name}</span>
                    <span className="text-white/40 text-xs ml-2">
                      {d.required_count} {t("people")}
                    </span>
                  </div>
                  <button
                    onClick={() => editDuty(d)}
                    className="px-3 py-1 rounded-lg text-xs bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 cursor-pointer"
                  >
                    {t("editDuty")}
                  </button>
                  <button
                    onClick={() => deleteDuty(d.id)}
                    className="px-3 py-1 rounded-lg text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 cursor-pointer"
                  >
                    {t("deleteDuty")}
                  </button>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check + lint**

Run: `cd frontend && npx tsc --noEmit && npx eslint "src/app/[locale]/(owner)/owner/cleaning/page.tsx"`
Expected: no errors.

- [ ] **Step 3: Build the frontend to confirm the route compiles**

Run: `cd frontend && npx next build`
Expected: build succeeds; `/[locale]/owner/cleaning` appears in the route list.

- [ ] **Step 4: Commit**

```bash
git add "frontend/src/app/[locale]/(owner)/owner/cleaning/page.tsx"
git commit -m "feat(frontend): add cleaning schedule owner page"
```

---

## Task 9: Manual smoke test

**Purpose:** Verify end-to-end with real servers, DB, and LINE. Unit tests don't cover Supabase side-effects or the LINE push.

- [ ] **Step 1: Start servers**

`cd backend && npm run start:dev` (one terminal) and `cd frontend && npm run dev` (another). Ensure the `db` container is up (`docker compose up -d db`). Wait for both "ready".

- [ ] **Step 2: Generate a roster**

Log in as owner → open 🧹 "เวรทำความสะอาด". Click "สร้างตารางเวรอัตโนมัติ".
Verify:
- Each duty card shows the right number of names (ซักผ้า = 2 names, others = 1).
- No therapist appears in two duties in the same week.
- The "เวรสำรอง / ตรวจความเรียบร้อย" card lists the remaining active therapists.

- [ ] **Step 3: Check the 4 tabs rotate**

Click สัปดาห์ที่ 1→2→3→4. Verify assignments differ week-to-week (rotation) and a therapist generally doesn't get the same duty two weeks running.

- [ ] **Step 4: Send to LINE**

Click "ส่งเข้า LINE". Verify the LINE group receives the formatted schedule (header, week range, each duty with names, backup line) and the UI shows "✓ ส่งเข้า LINE แล้ว".

- [ ] **Step 5: Duty CRUD**

Expand "จัดการประเภทเวร". Add a duty ("เวรทดสอบ", 1 คน) → appears in list → regenerate → it shows in the schedule. Edit its count to 2 → regenerate → 2 names. Delete it → regenerate → gone.

- [ ] **Step 6: Staff change reflects**

Deactivate a therapist on the "พนักงาน" page, return to cleaning, regenerate → that person no longer appears. Reactivate when done.

- [ ] **Step 7: Commit verification note**

If fixes were needed, commit them. Otherwise:

```bash
git commit --allow-empty -m "test: manual smoke test of cleaning schedule passed"
```

---

## Self-Review Summary

- **Spec coverage:**
  - Active therapists as staff → Task 4 `activeTherapists()`; add/edit/remove via existing Staff page → Task 7 `staffHint`.
  - 4 calendar weeks, selectable → Task 5 (week math) + Task 8 (tabs).
  - Names shown per duty → Task 8 schedule cards.
  - Auto-generate button + fair rotation → Task 2 (algorithm) + Task 4 `generate` + Task 8 button.
  - Add/edit/delete duty types → Task 1 (table) + Task 4 (CRUD) + Task 8 (UI).
  - Backup / inspection → Task 4 computed `backup` + Task 8 card.
  - Send LINE reminder → Task 3 (message) + Task 4 `notify` + Task 8 button.
  - Mobile + desktop, Thai → Task 7 (i18n, grid-cols-7) + Task 8 (responsive Tailwind).
- **Placeholder scan:** none.
- **Type consistency:** `buildRoster`/`RosterAssignment`/`buildCleaningMessage`/`DutyLine` match across Tasks 2–4; `mondayOf`/`addWeeks`/`toISODate`/`formatWeekRange` match across Tasks 5 & 8; `api.*` names match across Tasks 6 & 8.
- **Out of scope (v1):** per-cell manual edit, cron auto-send, per-therapist duty stats.
