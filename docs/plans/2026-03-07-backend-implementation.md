# Backend (NestJS + Supabase) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the NestJS backend API with Supabase (PostgreSQL) for the Massage Shop Management Web Application, covering all CRUD operations, booking logic, payment, attendance, and dashboard metrics.

**Architecture:** NestJS REST API with modular structure. Supabase provides PostgreSQL database and Auth. Each module (services, therapists, beds, bookings, payments, attendance) has its own controller, service, and DTO. Supabase client is shared via a global module.

**Tech Stack:** NestJS 10, TypeScript, Supabase JS Client (@supabase/supabase-js), class-validator, class-transformer, Swagger (API docs)

---

## Phase 1: Project Setup

### Task 1: Initialize NestJS Project

**Files:**
- Create: `backend/package.json`
- Create: `backend/src/main.ts`
- Create: `backend/src/app.module.ts`

**Step 1: Scaffold NestJS project**

```bash
cd "d:/Project/Massage Shop Management Web Application"
npx @nestjs/cli new backend --package-manager npm --skip-git
```

**Step 2: Install dependencies**

```bash
cd backend
npm install @supabase/supabase-js class-validator class-transformer @nestjs/config @nestjs/swagger
```

**Step 3: Create environment file**

Create `backend/.env`:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
PORT=4000
```

**Step 4: Verify build**

```bash
cd backend && npm run build
```

**Step 5: Commit**

```bash
git add backend/ && git commit -m "chore: initialize NestJS backend project"
```

---

### Task 2: Configure Supabase Module

**Files:**
- Create: `backend/src/supabase/supabase.module.ts`
- Create: `backend/src/supabase/supabase.service.ts`
- Modify: `backend/src/app.module.ts`

**Step 1: Create Supabase service**

`backend/src/supabase/supabase.service.ts`:
```ts
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

@Injectable()
export class SupabaseService {
  private client: SupabaseClient;

  constructor(private configService: ConfigService) {
    this.client = createClient(
      this.configService.get<string>("SUPABASE_URL")!,
      this.configService.get<string>("SUPABASE_SERVICE_ROLE_KEY")!,
    );
  }

  getClient(): SupabaseClient {
    return this.client;
  }
}
```

**Step 2: Create Supabase module**

`backend/src/supabase/supabase.module.ts`:
```ts
import { Global, Module } from "@nestjs/common";
import { SupabaseService } from "./supabase.service";

@Global()
@Module({
  providers: [SupabaseService],
  exports: [SupabaseService],
})
export class SupabaseModule {}
```

**Step 3: Update AppModule**

Add `ConfigModule.forRoot()` and `SupabaseModule` to imports in `app.module.ts`.

**Step 4: Verify build**

```bash
npm run build
```

**Step 5: Commit**

```bash
git add . && git commit -m "feat: add Supabase module with global client"
```

---

### Task 3: Setup Swagger API Docs

**Files:**
- Modify: `backend/src/main.ts`

**Step 1: Configure Swagger in main.ts**

```ts
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ValidationPipe } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors();
  app.setGlobalPrefix("api");
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const config = new DocumentBuilder()
    .setTitle("Massage Shop API")
    .setDescription("API for Massage Shop Management")
    .setVersion("1.0")
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, document);

  await app.listen(process.env.PORT ?? 4000);
}
bootstrap();
```

**Step 2: Verify Swagger loads**

```bash
npm run start:dev
```
Visit: `http://localhost:4000/api/docs`

**Step 3: Commit**

```bash
git add . && git commit -m "feat: configure Swagger API docs and global validation"
```

---

### Task 4: Create Database Tables in Supabase

**Files:**
- Create: `backend/supabase/migrations/001_initial_schema.sql`

**Step 1: Write SQL migration**

```sql
-- Services
CREATE TABLE IF NOT EXISTS services (
  id SERIAL PRIMARY KEY,
  name_th VARCHAR(255) NOT NULL,
  name_en VARCHAR(255) NOT NULL,
  description_th TEXT,
  description_en TEXT,
  duration INTEGER NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  image VARCHAR(500),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Therapists
CREATE TABLE IF NOT EXISTS therapists (
  id SERIAL PRIMARY KEY,
  name_th VARCHAR(255) NOT NULL,
  name_en VARCHAR(255) NOT NULL,
  skills TEXT[] DEFAULT '{}',
  rating DECIMAL(2,1) DEFAULT 5.0,
  status VARCHAR(20) DEFAULT 'offline' CHECK (status IN ('available','busy','break','offline')),
  pin VARCHAR(6),
  image VARCHAR(500),
  experience INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Beds
CREATE TABLE IF NOT EXISTS beds (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available','reserved','in_service','cleaning')),
  current_booking_id INTEGER
);

-- Customers
CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  line_id VARCHAR(100),
  visit_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bookings
CREATE TABLE IF NOT EXISTS bookings (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id),
  service_id INTEGER REFERENCES services(id),
  therapist_id INTEGER REFERENCES therapists(id),
  bed_id INTEGER REFERENCES beds(id),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) DEFAULT 'booked' CHECK (status IN ('booked','checked_in','in_service','completed','checkout','cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER REFERENCES bookings(id),
  amount DECIMAL(10,2) NOT NULL,
  method VARCHAR(20) NOT NULL CHECK (method IN ('promptpay_qr','cash','bank_transfer')),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','confirmed','failed')),
  paid_at TIMESTAMPTZ
);

-- Attendance
CREATE TABLE IF NOT EXISTS attendance (
  id SERIAL PRIMARY KEY,
  therapist_id INTEGER REFERENCES therapists(id),
  check_in TIMESTAMPTZ NOT NULL,
  check_out TIMESTAMPTZ,
  date DATE NOT NULL DEFAULT CURRENT_DATE
);

-- Staff (for owner login)
CREATE TABLE IF NOT EXISTS staff (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'staff' CHECK (role IN ('staff','owner')),
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed initial data
INSERT INTO beds (name, status) VALUES
  ('Bed 1', 'available'),
  ('Bed 2', 'available'),
  ('Bed 3', 'available'),
  ('Bed 4', 'available');

INSERT INTO services (name_th, name_en, description_th, description_en, duration, price) VALUES
  ('นวดแผนไทย', 'Thai Massage', 'นวดแผนไทยโบราณ ผ่อนคลายกล้ามเนื้อ', 'Traditional Thai massage for muscle relaxation', 60, 400),
  ('นวดน้ำมัน', 'Oil Massage', 'นวดน้ำมันอโรมา ผ่อนคลายลึก', 'Aromatherapy oil massage for deep relaxation', 60, 600),
  ('นวดน้ำมัน', 'Oil Massage', 'นวดน้ำมันอโรมา 2 ชั่วโมง', '2-hour aromatherapy oil massage', 120, 1000),
  ('นวดเท้า', 'Foot Massage', 'นวดเท้าและขา กดจุดสะท้อน', 'Foot and leg reflexology massage', 60, 350),
  ('นวดศีรษะ คอ บ่า ไหล่', 'Head & Shoulder Massage', 'แก้ออฟฟิศซินโดรม', 'For office syndrome', 45, 300);
```

**Step 2: Run migration via Supabase Dashboard SQL Editor** (or use supabase CLI)

**Step 3: Commit**

```bash
git add . && git commit -m "feat: add initial database schema and seed data"
```

---

## Phase 2: Core API Modules

### Task 5: Services Module (CRUD)

**Files:**
- Create: `backend/src/services/services.module.ts`
- Create: `backend/src/services/services.controller.ts`
- Create: `backend/src/services/services.service.ts`
- Create: `backend/src/services/dto/create-service.dto.ts`
- Create: `backend/src/services/dto/update-service.dto.ts`

**Step 1: Create DTOs**

`create-service.dto.ts`:
```ts
import { IsString, IsNumber, IsOptional, Min } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateServiceDto {
  @ApiProperty() @IsString() name_th: string;
  @ApiProperty() @IsString() name_en: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() description_th?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() description_en?: string;
  @ApiProperty() @IsNumber() @Min(1) duration: number;
  @ApiProperty() @IsNumber() @Min(0) price: number;
  @ApiProperty({ required: false }) @IsOptional() @IsString() image?: string;
}
```

**Step 2: Create service**

`services.service.ts`:
```ts
import { Injectable, NotFoundException } from "@nestjs/common";
import { SupabaseService } from "../supabase/supabase.service";
import { CreateServiceDto } from "./dto/create-service.dto";
import { UpdateServiceDto } from "./dto/update-service.dto";

@Injectable()
export class ServicesService {
  constructor(private supabase: SupabaseService) {}

  async findAll() {
    const { data, error } = await this.supabase.getClient()
      .from("services").select("*").eq("is_active", true).order("id");
    if (error) throw error;
    return data;
  }

  async findOne(id: number) {
    const { data, error } = await this.supabase.getClient()
      .from("services").select("*").eq("id", id).single();
    if (error || !data) throw new NotFoundException("Service not found");
    return data;
  }

  async create(dto: CreateServiceDto) {
    const { data, error } = await this.supabase.getClient()
      .from("services").insert(dto).select().single();
    if (error) throw error;
    return data;
  }

  async update(id: number, dto: UpdateServiceDto) {
    const { data, error } = await this.supabase.getClient()
      .from("services").update(dto).eq("id", id).select().single();
    if (error || !data) throw new NotFoundException("Service not found");
    return data;
  }

  async remove(id: number) {
    const { error } = await this.supabase.getClient()
      .from("services").update({ is_active: false }).eq("id", id);
    if (error) throw error;
    return { message: "Service deleted" };
  }
}
```

**Step 3: Create controller with full CRUD endpoints**

```
GET    /api/services         → findAll
GET    /api/services/:id     → findOne
POST   /api/services         → create
PATCH  /api/services/:id     → update
DELETE /api/services/:id     → remove (soft delete)
```

**Step 4: Create module, register in AppModule**

**Step 5: Verify build + commit**

```bash
git add . && git commit -m "feat: add services CRUD module"
```

---

### Task 6: Therapists Module (CRUD + Status)

**Files:**
- Create: `backend/src/therapists/therapists.module.ts`
- Create: `backend/src/therapists/therapists.controller.ts`
- Create: `backend/src/therapists/therapists.service.ts`
- Create: `backend/src/therapists/dto/create-therapist.dto.ts`
- Create: `backend/src/therapists/dto/update-therapist.dto.ts`

**Endpoints:**
```
GET    /api/therapists              → findAll (with optional ?status=available filter)
GET    /api/therapists/:id          → findOne
POST   /api/therapists              → create
PATCH  /api/therapists/:id          → update
PATCH  /api/therapists/:id/status   → updateStatus (available/busy/break/offline)
DELETE /api/therapists/:id          → remove (soft delete)
```

**Step 1: Create DTOs, service, controller, module** (similar pattern to Task 5)

**Step 2: Add status filter to findAll**

```ts
async findAll(status?: string) {
  let query = this.supabase.getClient()
    .from("therapists").select("*").eq("is_active", true).order("id");
  if (status) query = query.eq("status", status);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}
```

**Step 3: Verify build + commit**

```bash
git add . && git commit -m "feat: add therapists CRUD module with status management"
```

---

### Task 7: Beds Module

**Files:**
- Create: `backend/src/beds/beds.module.ts`
- Create: `backend/src/beds/beds.controller.ts`
- Create: `backend/src/beds/beds.service.ts`

**Endpoints:**
```
GET    /api/beds              → findAll (with current booking info)
PATCH  /api/beds/:id/status   → updateStatus
```

**Step 1: Create service with joined booking data**

```ts
async findAll() {
  const { data, error } = await this.supabase.getClient()
    .from("beds")
    .select("*, bookings!current_booking_id(*, services(*), therapists(*), customers(*))")
    .order("id");
  if (error) throw error;
  return data;
}
```

**Step 2: Create controller, module, register**

**Step 3: Verify build + commit**

```bash
git add . && git commit -m "feat: add beds module with status and booking info"
```

---

### Task 8: Customers Module

**Files:**
- Create: `backend/src/customers/customers.module.ts`
- Create: `backend/src/customers/customers.controller.ts`
- Create: `backend/src/customers/customers.service.ts`
- Create: `backend/src/customers/dto/create-customer.dto.ts`

**Endpoints:**
```
GET    /api/customers              → findAll
GET    /api/customers/:id          → findOne
POST   /api/customers              → create (or find existing by phone)
```

**Key logic:** `findOrCreate` — if customer with same phone exists, return existing + increment visit_count. Otherwise create new.

**Step 1: Create DTOs, service with findOrCreate, controller, module**

**Step 2: Verify build + commit**

```bash
git add . && git commit -m "feat: add customers module with find-or-create logic"
```

---

## Phase 3: Business Logic

### Task 9: Bookings Module (Core Business Flow)

**Files:**
- Create: `backend/src/bookings/bookings.module.ts`
- Create: `backend/src/bookings/bookings.controller.ts`
- Create: `backend/src/bookings/bookings.service.ts`
- Create: `backend/src/bookings/dto/create-booking.dto.ts`
- Create: `backend/src/bookings/dto/update-booking-status.dto.ts`

**Endpoints:**
```
GET    /api/bookings                → findAll (with ?status filter, ?date filter)
GET    /api/bookings/:id            → findOne (with relations)
POST   /api/bookings                → create (validate availability)
PATCH  /api/bookings/:id/status     → updateStatus (check-in, start, complete, checkout, cancel)
GET    /api/availability            → getAvailableSlots (by therapist + date)
```

**Step 1: Create booking DTO**

```ts
export class CreateBookingDto {
  @ApiProperty() @IsString() customer_name: string;
  @ApiProperty() @IsString() phone: string;
  @ApiProperty() @IsNumber() service_id: number;
  @ApiProperty() @IsNumber() therapist_id: number;
  @ApiProperty() @IsString() start_time: string;
}
```

**Step 2: Create booking service with availability validation**

Key logic for `create`:
1. Find or create customer (by phone)
2. Get service to calculate end_time (start_time + duration)
3. Validate therapist is available at that time
4. Find available bed
5. If no bed available → throw error with suggestion
6. Create booking + payment record
7. Update bed status to "reserved"
8. Return booking with relations

Key logic for `updateStatus`:
- `booked` → `checked_in`: mark customer arrived
- `checked_in` → `in_service`: update bed to "in_service", therapist to "busy"
- `in_service` → `completed`: update bed to "cleaning", therapist to "available"
- `completed` → `checkout`: update bed to "available"
- Any → `cancelled`: release bed + therapist

Key logic for `getAvailableSlots`:
1. Get therapist's bookings for the date
2. Generate time slots (09:00 - 18:00, hourly)
3. Remove slots that overlap with existing bookings
4. Return available slots

**Step 3: Create controller, module, register**

**Step 4: Verify build + commit**

```bash
git add . && git commit -m "feat: add bookings module with availability validation and status flow"
```

---

### Task 10: Payments Module

**Files:**
- Create: `backend/src/payments/payments.module.ts`
- Create: `backend/src/payments/payments.controller.ts`
- Create: `backend/src/payments/payments.service.ts`
- Create: `backend/src/payments/dto/create-payment.dto.ts`
- Create: `backend/src/payments/dto/confirm-payment.dto.ts`

**Endpoints:**
```
GET    /api/payments/:bookingId     → getByBooking
POST   /api/payments                → create
PATCH  /api/payments/:id/confirm    → confirm (update status + booking status)
```

**Step 1: Create payment service**

Key logic for `confirm`:
1. Update payment status to "confirmed" + set paid_at
2. Update booking status to "booked" (confirmed)
3. Return updated payment

**Step 2: Create controller, module, register**

**Step 3: Verify build + commit**

```bash
git add . && git commit -m "feat: add payments module with confirmation flow"
```

---

### Task 11: Attendance Module

**Files:**
- Create: `backend/src/attendance/attendance.module.ts`
- Create: `backend/src/attendance/attendance.controller.ts`
- Create: `backend/src/attendance/attendance.service.ts`

**Endpoints:**
```
GET    /api/attendance/today         → getTodayAttendance
POST   /api/attendance/check-in      → checkIn (therapist_id)
PATCH  /api/attendance/:id/check-out → checkOut
```

**Step 1: Create attendance service**

Key logic for `checkIn`:
1. Create attendance record with check_in = now
2. Update therapist status to "available"

Key logic for `checkOut`:
1. Update attendance record with check_out = now
2. Update therapist status to "offline"

**Step 2: Create controller, module, register**

**Step 3: Verify build + commit**

```bash
git add . && git commit -m "feat: add attendance module with check-in/check-out"
```

---

### Task 12: Dashboard Module (Owner Metrics)

**Files:**
- Create: `backend/src/dashboard/dashboard.module.ts`
- Create: `backend/src/dashboard/dashboard.controller.ts`
- Create: `backend/src/dashboard/dashboard.service.ts`

**Endpoints:**
```
GET    /api/dashboard/daily          → getDailyMetrics
GET    /api/dashboard/therapists     → getTherapistPerformance
```

**Step 1: Create dashboard service**

`getDailyMetrics`:
```ts
async getDailyMetrics(date?: string) {
  const targetDate = date || new Date().toISOString().split("T")[0];

  // Total customers today
  const { count: totalCustomers } = await this.supabase.getClient()
    .from("bookings")
    .select("*", { count: "exact", head: true })
    .gte("start_time", `${targetDate}T00:00:00`)
    .lte("start_time", `${targetDate}T23:59:59`);

  // Daily revenue
  const { data: payments } = await this.supabase.getClient()
    .from("payments")
    .select("amount, bookings!inner(start_time)")
    .eq("status", "confirmed")
    .gte("bookings.start_time", `${targetDate}T00:00:00`)
    .lte("bookings.start_time", `${targetDate}T23:59:59`);

  const dailyRevenue = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

  // Bed utilization
  const { data: beds } = await this.supabase.getClient()
    .from("beds").select("status");
  const inUse = beds?.filter((b) => b.status !== "available").length || 0;
  const bedUtilization = beds?.length ? Math.round((inUse / beds.length) * 100) : 0;

  return { totalCustomers, dailyRevenue, bedUtilization };
}
```

`getTherapistPerformance`:
- Query bookings grouped by therapist for today
- Return sessions count + total revenue per therapist

**Step 2: Create controller, module, register**

**Step 3: Verify build + commit**

```bash
git add . && git commit -m "feat: add dashboard module with daily metrics and therapist performance"
```

---

## Phase 4: Auth & Security

### Task 13: Auth Module (PIN + Password)

**Files:**
- Create: `backend/src/auth/auth.module.ts`
- Create: `backend/src/auth/auth.controller.ts`
- Create: `backend/src/auth/auth.service.ts`
- Create: `backend/src/auth/dto/pin-login.dto.ts`
- Create: `backend/src/auth/dto/owner-login.dto.ts`
- Create: `backend/src/auth/guards/roles.guard.ts`

**Endpoints:**
```
POST   /api/auth/pin-login      → Staff/Therapist login with PIN
POST   /api/auth/owner-login    → Owner login with username + password
```

**Step 1: Install bcrypt and JWT**

```bash
npm install bcrypt @nestjs/jwt
npm install -D @types/bcrypt
```

**Step 2: Create auth service**

- `pinLogin`: Find therapist by PIN → return JWT token with role "therapist"
- `ownerLogin`: Find staff by username, verify password hash → return JWT token with role "owner"
- JWT payload: `{ id, role, name }`

**Step 3: Create roles guard for protected routes**

Staff/Owner routes require valid JWT. Owner-only routes check role === "owner".

**Step 4: Verify build + commit**

```bash
git add . && git commit -m "feat: add auth module with PIN and password login + JWT"
```

---

## Phase 5: Frontend Integration

### Task 14: Connect Frontend to Backend API

**Files:**
- Create: `frontend/src/lib/api.ts` (API client)
- Modify: Customer pages to fetch from API instead of mock data
- Modify: Staff pages to fetch from API
- Modify: Owner pages to fetch from API

**Step 1: Create API client**

`frontend/src/lib/api.ts`:
```ts
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
```

**Step 2: Update frontend `.env.local`**

```
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

**Step 3: Replace mock data imports with API calls in each page**

- Home/Services pages: `apiFetch("/services")`
- Therapists page: `apiFetch("/therapists?status=available")`
- Booking page: `apiFetch("/availability?therapistId=X&date=Y")`
- Payment page: `apiFetch("/payments", { method: "POST", body: ... })`
- Staff Dashboard: `apiFetch("/beds")`
- Staff Bookings: `apiFetch("/bookings?date=today")`
- Owner Dashboard: `apiFetch("/dashboard/daily")`
- Owner Therapists: `apiFetch("/dashboard/therapists")`
- Attendance: `apiFetch("/attendance/today")`

**Step 4: Verify full flow works**

```bash
cd backend && npm run start:dev &
cd frontend && npm run dev
```

**Step 5: Commit**

```bash
git add . && git commit -m "feat: connect frontend to backend API, replace mock data"
```

---

## Phase 6: Final Polish

### Task 15: CORS, Error Handling, and Rate Limiting

**Files:**
- Modify: `backend/src/main.ts`
- Create: `backend/src/common/filters/http-exception.filter.ts`

**Step 1: Add CORS config for frontend origin**

**Step 2: Add global exception filter for consistent error responses**

**Step 3: Add basic rate limiting (optional: @nestjs/throttler)**

**Step 4: Verify + commit**

```bash
git add . && git commit -m "chore: add CORS, error handling, and rate limiting"
```

---

### Task 16: Seed Data Script

**Files:**
- Create: `backend/src/seed/seed.ts`

**Step 1: Create seed script that populates test data**

- 5 services (already in migration)
- 4 therapists with PINs
- 4 beds (already in migration)
- 1 owner account (username: admin, password: admin123)
- Sample bookings for today

**Step 2: Add npm script**

```json
"seed": "ts-node src/seed/seed.ts"
```

**Step 3: Commit**

```bash
git add . && git commit -m "feat: add database seed script with test data"
```
