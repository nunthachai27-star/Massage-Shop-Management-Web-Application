# Design Document: Massage Shop Management Web Application

**Date:** 2026-03-07
**Status:** Approved

---

## 1. Overview

Web Application สำหรับบริหารร้านนวดเพื่อสุขภาพ รองรับการจองคิว, ชำระเงิน, จัดการเตียง, ลงเวลาพนักงาน และ Dashboard เจ้าของร้าน รองรับ Mobile First + Desktop

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router) + React 19 + Tailwind CSS |
| Backend | NestJS |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Hosting | Vercel (Frontend) + Supabase (DB + Auth) |
| i18n | next-intl (TH/EN) |

## 3. Architecture

```
Mobile / Tablet / Desktop Browser
            │
    Next.js Frontend (Vercel)
            │
    NestJS Backend API
            │
    Supabase (PostgreSQL + Auth)
```

## 4. Frontend Structure (Approach B — Route Groups)

```
/app
  /[locale]
    /(customer)/                → Customer-facing pages
      /page.tsx                 → Home
      /services/page.tsx        → Service Selection
      /therapists/page.tsx      → Therapist Selection
      /booking/page.tsx         → Time Selection + Booking
      /payment/page.tsx         → Payment
    /(staff)/staff/             → Staff pages
      /dashboard/page.tsx       → Bed Dashboard
      /bookings/page.tsx        → Booking List
      /session/page.tsx         → Session Control
    /(owner)/owner/             → Owner pages
      /dashboard/page.tsx       → Revenue Dashboard
      /therapists/page.tsx      → Therapist Performance
    /(auth)/
      /login/page.tsx           → Staff PIN / Owner Login
```

## 5. UI Design

- **Style:** Spa & Luxury
- **Color Palette:**
  - Primary Dark: `#1a1a2e` (deep navy)
  - Primary: `#16213e` (dark blue)
  - Accent Gold: `#d4af37`
  - Accent Light: `#f5e6cc` (warm cream)
  - Text Light: `#e0e0e0`
  - Text Dark: `#1a1a2e`
  - Background: `#0f0f1a` (dark pages), `#faf7f2` (light/customer pages)
- **Typography:** Modern serif headings + clean sans-serif body
- **Mobile First:** Responsive design, touch-friendly

## 6. Authentication

| Role | Method |
|---|---|
| Customer | No login required — name + phone to book |
| Staff / Therapist | PIN Code (4-6 digits) |
| Owner | Username + Password |

## 7. Core Modules

### 7.1 Booking Module
- Customer กรอกข้อมูล → เลือก Service → เลือก Therapist → เลือกเวลา → ชำระเงิน
- Validate: therapist available AND bed available
- If unavailable: suggest next available slot

### 7.2 Service Display
- แสดงรายการบริการพร้อมราคา/ระยะเวลา
- Admin จัดการ CRUD

### 7.3 Therapist Selection
- แสดงหมอนวดที่ available พร้อม rating/skill
- Filter ตาม skill ได้

### 7.4 Payment
- PromptPay QR / Cash / Bank Transfer
- Flow: create → generate QR → confirm → update status

### 7.5 Staff Dashboard
- Bed status overview (4 beds)
- Booking list + check-in/check-out
- Session control (start/finish)

### 7.6 Owner Dashboard
- Daily: total customers, revenue, bed utilization
- Therapist: sessions per therapist, revenue per therapist

### 7.7 Attendance
- Therapist check-in/check-out
- Must check-in before accepting bookings

## 8. i18n (Internationalization)

- สองภาษา: Thai (TH) + English (EN)
- ใช้ next-intl กับ locale-based routing `/th/...` `/en/...`
- Default locale: `th`

## 9. Database Schema

ใช้ตาม TLS: services, therapists, beds, customers, bookings, payments, attendance

## 10. Development Approach

- **Frontend First** — สร้าง UI ทุกหน้าก่อน ใช้ mock data
- จากนั้นพัฒนา Backend (NestJS) + เชื่อมต่อ Supabase
- สุดท้ายเชื่อม Frontend ↔ Backend

## 11. Non-Functional Requirements

- 50 concurrent users
- 300 bookings/day
- HTTPS, JWT Auth, Role-Based Access, Input Validation, Rate Limiting
