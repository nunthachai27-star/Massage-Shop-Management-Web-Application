# Top Level Specification (TLS)

## Massage Shop Management Web Application

| รายละเอียด | ข้อมูล |
|---|---|
| **Version** | 1.0 |
| **Architecture** | Web Application (Mobile First) |
| **Target** | Claude Code AI Development |

---

## 1. System Overview

ระบบนี้เป็น Web Application สำหรับบริหารร้านนวดเพื่อสุขภาพ รองรับ:

- การจองคิวลูกค้า
- การเลือกบริการ
- การเลือกหมอนวด
- ระบบชำระเงิน
- การจัดการเตียงนวด
- ระบบลงเวลาเข้างานพนักงาน
- Dashboard สำหรับเจ้าของร้าน

### รองรับการใช้งานผ่าน

- Mobile Browser
- Tablet
- Desktop

---

## 2. System Users

### 2.1 Customer

สามารถ:
- จองบริการ
- เลือกหมอนวด
- เลือกเวลา
- ชำระเงิน

### 2.2 Staff

สามารถ:
- Check-in ลูกค้า
- เริ่มบริการ
- จบการนวด
- Check-out

### 2.3 Therapist

สามารถ:
- Check-in เข้างาน
- Check-out เลิกงาน
- ดูคิวของตนเอง

### 2.4 Owner

สามารถ:
- ดู Dashboard
- ดูรายได้
- ดูสถิติพนักงาน

---

## 3. Core Business Flow

```
Customer Booking
       ↓
Select Service
       ↓
Select Therapist
       ↓
Select Time
       ↓
Payment
       ↓
Booking Confirmed
       ↓
Customer Check-in
       ↓
Massage Session
       ↓
Service Completed
       ↓
Checkout
```

---

## 4. Functional Modules

### 4.1 Booking Module

**Features:**
- Create Booking
- Select Service
- Select Therapist
- Select Time
- Check Availability

**Booking Logic:**

System must validate:
```
therapist_available AND bed_available
```

If unavailable → `suggest_next_available_slot`

---

### 4.2 Service Management

Admin can manage:
- Service Name
- Duration
- Price

**ตัวอย่างบริการ:**

| Service | Duration | Price (THB) |
|---|---|---|
| Thai Massage | 60 min | 400 |
| Oil Massage | 60 min | 600 |
| Oil Massage | 120 min | 1,000 |

---

### 4.3 Therapist Management

Store therapist information

**Fields:**
- `therapist_id`
- `name`
- `skill`
- `rating`
- `status`

**Status:**

| Status | Description |
|---|---|
| `available` | พร้อมให้บริการ |
| `busy` | กำลังให้บริการ |
| `break` | พักเบรก |
| `offline` | ออฟไลน์ |

---

### 4.4 Bed Management

System must manage **4 massage beds**

**Bed Status:**

| Status | Description |
|---|---|
| `available` | ว่าง |
| `reserved` | จองแล้ว |
| `in_service` | กำลังใช้งาน |
| `cleaning` | กำลังทำความสะอาด |

---

### 4.5 Payment Module

**Supported payment methods:**
- `promptpay_qr` — PromptPay QR Code
- `cash` — เงินสด
- `bank_transfer` — โอนเงินผ่านธนาคาร

**Payment Flow:**

```
create_payment → generate_qr → payment_confirm → update_booking_status
```

---

### 4.6 Attendance Module

Therapists must check-in before accepting bookings.

**Flow:**

```
Therapist Login
       ↓
   Check-in
       ↓
Status = Available

   Check-out
       ↓
Status = Offline
```

---

### 4.7 Session Management

**Session lifecycle:**

```
Booked → Checked-in → In Service → Completed → Checkout
```

---

### 4.8 Dashboard Module

Owner Dashboard must display:

**Daily Metrics:**
- `total_customers` — จำนวนลูกค้าทั้งหมด
- `daily_revenue` — รายได้ประจำวัน
- `bed_utilization` — อัตราการใช้เตียง

**Therapist Metrics:**
- `sessions_per_therapist` — จำนวนรอบต่อหมอนวด
- `revenue_per_therapist` — รายได้ต่อหมอนวด

---

## 5. System Architecture

```
┌─────────────────────────┐
│  Mobile / Tablet Browser │
└────────────┬────────────┘
             │
┌────────────▼────────────┐
│      Web Frontend        │
│   (Next.js + React)      │
└────────────┬────────────┘
             │
┌────────────▼────────────┐
│      Backend API         │
│       (NestJS)           │
└────────────┬────────────┘
             │
┌────────────▼────────────┐
│       Database           │
│     (PostgreSQL)         │
└─────────────────────────┘
```

---

## 6. Recommended Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js, React, Tailwind CSS |
| **Backend** | Node.js, NestJS |
| **Database** | PostgreSQL |
| **Hosting** | Vercel, Supabase |

---

## 7. Database Schema

### Table: `services`

| Column | Type | Note |
|---|---|---|
| `service_id` | PK | Primary Key |
| `name` | string | ชื่อบริการ |
| `duration` | integer | ระยะเวลา (นาที) |
| `price` | decimal | ราคา |
| `created_at` | timestamp | วันที่สร้าง |

### Table: `therapists`

| Column | Type | Note |
|---|---|---|
| `therapist_id` | PK | Primary Key |
| `name` | string | ชื่อ |
| `skill` | string | ทักษะ |
| `rating` | decimal | คะแนน |
| `status` | enum | สถานะ |
| `created_at` | timestamp | วันที่สร้าง |

### Table: `beds`

| Column | Type | Note |
|---|---|---|
| `bed_id` | PK | Primary Key |
| `status` | enum | สถานะเตียง |

### Table: `customers`

| Column | Type | Note |
|---|---|---|
| `customer_id` | PK | Primary Key |
| `name` | string | ชื่อลูกค้า |
| `phone` | string | เบอร์โทร |
| `line_id` | string | LINE ID |
| `visit_count` | integer | จำนวนครั้งที่มา |

### Table: `bookings`

| Column | Type | Note |
|---|---|---|
| `booking_id` | PK | Primary Key |
| `customer_id` | FK | → customers |
| `service_id` | FK | → services |
| `therapist_id` | FK | → therapists |
| `bed_id` | FK | → beds |
| `start_time` | timestamp | เวลาเริ่ม |
| `end_time` | timestamp | เวลาสิ้นสุด |
| `status` | enum | สถานะการจอง |
| `created_at` | timestamp | วันที่สร้าง |

### Table: `payments`

| Column | Type | Note |
|---|---|---|
| `payment_id` | PK | Primary Key |
| `booking_id` | FK | → bookings |
| `amount` | decimal | จำนวนเงิน |
| `method` | enum | วิธีชำระเงิน |
| `status` | enum | สถานะการชำระ |
| `paid_at` | timestamp | วันที่ชำระ |

### Table: `attendance`

| Column | Type | Note |
|---|---|---|
| `attendance_id` | PK | Primary Key |
| `therapist_id` | FK | → therapists |
| `check_in` | timestamp | เวลาเข้างาน |
| `check_out` | timestamp | เวลาเลิกงาน |
| `date` | date | วันที่ |

---

## 8. API Design

### Create Booking

```
POST /api/bookings
```

**Payload:**
```json
{
  "customer_name": "string",
  "phone": "string",
  "service_id": "number",
  "therapist_id": "number",
  "start_time": "datetime"
}
```

### Get Available Slots

```
GET /api/availability
```

**Response:**
```json
{
  "therapist_id": "number",
  "available_slots": ["datetime"]
}
```

### Start Session

```
POST /api/session/start
```

### Finish Session

```
POST /api/session/finish
```

---

## 9. UI Pages

### Customer Pages

| Page | Description |
|---|---|
| Home | หน้าแรก |
| Service Selection | เลือกบริการ |
| Therapist Selection | เลือกหมอนวด |
| Time Selection | เลือกเวลา |
| Payment | ชำระเงิน |

### Staff Pages

| Page | Description |
|---|---|
| Bed Dashboard | แดชบอร์ดเตียง |
| Booking List | รายการจอง |
| Session Control | ควบคุม Session |

### Owner Pages

| Page | Description |
|---|---|
| Revenue Dashboard | แดชบอร์ดรายได้ |
| Therapist Performance | ผลงานหมอนวด |

---

## 10. Security

Required security features:

- **HTTPS** — การเชื่อมต่อที่ปลอดภัย
- **JWT Authentication** — ยืนยันตัวตนด้วย Token
- **Role Based Access** — ควบคุมสิทธิ์ตามบทบาท
- **Input Validation** — ตรวจสอบข้อมูลนำเข้า
- **Rate Limiting** — จำกัดจำนวนคำขอ

---

## 11. Performance Requirements

System must support:

- **50** concurrent users
- **300** bookings per day

---

## 12. Future Enhancements

Optional features:

- AI Therapist Recommendation — ระบบแนะนำหมอนวดด้วย AI
- Automatic Bed Allocation — จัดสรรเตียงอัตโนมัติ
- Customer Loyalty System — ระบบสะสมแต้ม
- Promotion Engine — ระบบโปรโมชั่น

---

## 13. Deployment

**Deployment Flow:**

```
Git Repository
       ↓
Claude Code AI Development
       ↓
     CI/CD
       ↓
Deploy to Vercel
       ↓
Database on Supabase
```

---

## 14. Expected System Capacity

| Metric | Value |
|---|---|
| Massage Beds | 1 – 20 |
| Therapists | 10 – 50 |
