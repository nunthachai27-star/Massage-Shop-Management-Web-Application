# Massage Shop Frontend Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the complete Frontend UI for the Massage Shop Management Web Application using mock data, Mobile First, Spa & Luxury theme.

**Architecture:** Single Next.js 15 app with App Router, Route Groups to separate Customer/Staff/Owner layouts. Tailwind CSS for styling with a custom Spa & Luxury theme (dark navy + gold). next-intl for TH/EN internationalization.

**Tech Stack:** Next.js 15, React 19, Tailwind CSS 4, next-intl, TypeScript

---

## Phase 1: Project Setup

### Task 1: Initialize Next.js Project

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/tsconfig.json`
- Create: `frontend/tailwind.config.ts`
- Create: `frontend/next.config.ts`

**Step 1: Create Next.js app with TypeScript + Tailwind**

Run:
```bash
cd "d:/Project/Massage Shop Management Web Application"
npx create-next-app@latest frontend --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

**Step 2: Verify app runs**

Run:
```bash
cd frontend && npm run dev
```
Expected: App running at http://localhost:3000

**Step 3: Commit**

```bash
git init
git add .
git commit -m "chore: initialize Next.js 15 project with TypeScript and Tailwind CSS"
```

---

### Task 2: Configure Tailwind Spa & Luxury Theme

**Files:**
- Modify: `frontend/tailwind.config.ts`
- Modify: `frontend/src/app/globals.css`

**Step 1: Update tailwind.config.ts with custom theme**

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#16213e",
          dark: "#1a1a2e",
          light: "#1a2a4a",
        },
        accent: {
          gold: "#d4af37",
          "gold-light": "#e8c95a",
          "gold-dark": "#b8960c",
          cream: "#f5e6cc",
        },
        surface: {
          dark: "#0f0f1a",
          card: "#1e1e30",
          light: "#faf7f2",
        },
      },
      fontFamily: {
        heading: ["Playfair Display", "Noto Serif Thai", "serif"],
        body: ["Inter", "Noto Sans Thai", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
```

**Step 2: Update globals.css with base styles**

```css
@import "tailwindcss";

@layer base {
  body {
    font-family: "Inter", "Noto Sans Thai", sans-serif;
  }
  h1, h2, h3, h4, h5, h6 {
    font-family: "Playfair Display", "Noto Serif Thai", serif;
  }
}
```

**Step 3: Verify theme loads correctly**

Run: `npm run dev`
Expected: App runs without errors, custom fonts/colors available

**Step 4: Commit**

```bash
git add frontend/tailwind.config.ts frontend/src/app/globals.css
git commit -m "style: configure Spa & Luxury theme with dark navy and gold palette"
```

---

### Task 3: Setup next-intl for TH/EN

**Files:**
- Create: `frontend/src/i18n/request.ts`
- Create: `frontend/src/i18n/routing.ts`
- Create: `frontend/src/messages/th.json`
- Create: `frontend/src/messages/en.json`
- Create: `frontend/src/middleware.ts`
- Modify: `frontend/next.config.ts`

**Step 1: Install next-intl**

Run:
```bash
cd frontend && npm install next-intl
```

**Step 2: Create routing config**

`frontend/src/i18n/routing.ts`:
```ts
import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["th", "en"],
  defaultLocale: "th",
});
```

**Step 3: Create request config**

`frontend/src/i18n/request.ts`:
```ts
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  if (!locale || !routing.locales.includes(locale as any)) {
    locale = routing.defaultLocale;
  }
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
```

**Step 4: Create middleware**

`frontend/src/middleware.ts`:
```ts
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  matcher: ["/", "/(th|en)/:path*"],
};
```

**Step 5: Create Thai translation file**

`frontend/src/messages/th.json`:
```json
{
  "common": {
    "appName": "Massage & Spa",
    "book": "จองบริการ",
    "services": "บริการ",
    "therapists": "หมอนวด",
    "payment": "ชำระเงิน",
    "login": "เข้าสู่ระบบ",
    "logout": "ออกจากระบบ",
    "dashboard": "แดชบอร์ด",
    "language": "ภาษา",
    "back": "ย้อนกลับ",
    "next": "ถัดไป",
    "confirm": "ยืนยัน",
    "cancel": "ยกเลิก",
    "loading": "กำลังโหลด..."
  },
  "home": {
    "hero": "ผ่อนคลายร่างกายและจิตใจ",
    "subtitle": "บริการนวดเพื่อสุขภาพระดับพรีเมียม",
    "cta": "จองคิวตอนนี้"
  },
  "services": {
    "title": "บริการของเรา",
    "duration": "ระยะเวลา",
    "minutes": "นาที",
    "price": "ราคา",
    "baht": "บาท",
    "select": "เลือกบริการนี้"
  },
  "therapists": {
    "title": "เลือกหมอนวด",
    "rating": "คะแนน",
    "available": "ว่าง",
    "busy": "กำลังให้บริการ",
    "select": "เลือกหมอนวดท่านนี้"
  },
  "booking": {
    "title": "จองคิว",
    "selectTime": "เลือกเวลา",
    "customerName": "ชื่อ",
    "phone": "เบอร์โทร",
    "summary": "สรุปการจอง",
    "confirmed": "จองสำเร็จ!"
  },
  "payment": {
    "title": "ชำระเงิน",
    "method": "วิธีชำระเงิน",
    "promptpay": "พร้อมเพย์ QR",
    "cash": "เงินสด",
    "transfer": "โอนเงิน",
    "total": "ยอดรวม",
    "confirm": "ยืนยันการชำระ"
  },
  "staff": {
    "dashboard": "แดชบอร์ดพนักงาน",
    "beds": "สถานะเตียง",
    "bookings": "รายการจอง",
    "session": "ควบคุม Session",
    "checkin": "เช็คอินลูกค้า",
    "checkout": "เช็คเอาท์",
    "startService": "เริ่มบริการ",
    "endService": "จบบริการ"
  },
  "owner": {
    "dashboard": "แดชบอร์ดเจ้าของร้าน",
    "revenue": "รายได้",
    "dailyRevenue": "รายได้วันนี้",
    "totalCustomers": "ลูกค้าวันนี้",
    "bedUtilization": "อัตราใช้เตียง",
    "therapistPerformance": "ผลงานหมอนวด",
    "sessions": "จำนวนรอบ",
    "revenuePerTherapist": "รายได้ต่อคน"
  },
  "auth": {
    "staffLogin": "เข้าสู่ระบบพนักงาน",
    "ownerLogin": "เข้าสู่ระบบเจ้าของร้าน",
    "enterPin": "กรอก PIN",
    "username": "ชื่อผู้ใช้",
    "password": "รหัสผ่าน"
  },
  "attendance": {
    "checkin": "ลงเวลาเข้างาน",
    "checkout": "ลงเวลาเลิกงาน",
    "status": "สถานะ"
  }
}
```

**Step 6: Create English translation file**

`frontend/src/messages/en.json`:
```json
{
  "common": {
    "appName": "Massage & Spa",
    "book": "Book Now",
    "services": "Services",
    "therapists": "Therapists",
    "payment": "Payment",
    "login": "Login",
    "logout": "Logout",
    "dashboard": "Dashboard",
    "language": "Language",
    "back": "Back",
    "next": "Next",
    "confirm": "Confirm",
    "cancel": "Cancel",
    "loading": "Loading..."
  },
  "home": {
    "hero": "Relax Your Body & Mind",
    "subtitle": "Premium Health Massage Services",
    "cta": "Book Now"
  },
  "services": {
    "title": "Our Services",
    "duration": "Duration",
    "minutes": "min",
    "price": "Price",
    "baht": "THB",
    "select": "Select This Service"
  },
  "therapists": {
    "title": "Choose Your Therapist",
    "rating": "Rating",
    "available": "Available",
    "busy": "Busy",
    "select": "Select This Therapist"
  },
  "booking": {
    "title": "Book Appointment",
    "selectTime": "Select Time",
    "customerName": "Name",
    "phone": "Phone",
    "summary": "Booking Summary",
    "confirmed": "Booking Confirmed!"
  },
  "payment": {
    "title": "Payment",
    "method": "Payment Method",
    "promptpay": "PromptPay QR",
    "cash": "Cash",
    "transfer": "Bank Transfer",
    "total": "Total",
    "confirm": "Confirm Payment"
  },
  "staff": {
    "dashboard": "Staff Dashboard",
    "beds": "Bed Status",
    "bookings": "Bookings",
    "session": "Session Control",
    "checkin": "Check-in Customer",
    "checkout": "Checkout",
    "startService": "Start Service",
    "endService": "End Service"
  },
  "owner": {
    "dashboard": "Owner Dashboard",
    "revenue": "Revenue",
    "dailyRevenue": "Today's Revenue",
    "totalCustomers": "Today's Customers",
    "bedUtilization": "Bed Utilization",
    "therapistPerformance": "Therapist Performance",
    "sessions": "Sessions",
    "revenuePerTherapist": "Revenue per Therapist"
  },
  "auth": {
    "staffLogin": "Staff Login",
    "ownerLogin": "Owner Login",
    "enterPin": "Enter PIN",
    "username": "Username",
    "password": "Password"
  },
  "attendance": {
    "checkin": "Check In",
    "checkout": "Check Out",
    "status": "Status"
  }
}
```

**Step 7: Update next.config.ts**

```ts
import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {};

export default withNextIntl(nextConfig);
```

**Step 8: Restructure app directory for locale routing**

- Move `frontend/src/app/layout.tsx` → `frontend/src/app/[locale]/layout.tsx`
- Move `frontend/src/app/page.tsx` → `frontend/src/app/[locale]/page.tsx`
- Create root `frontend/src/app/layout.tsx` (minimal, just html/body)

**Step 9: Verify i18n works**

Run: `npm run dev`
Visit: `http://localhost:3000/th` and `http://localhost:3000/en`
Expected: Both locales load without errors

**Step 10: Commit**

```bash
git add .
git commit -m "feat: setup next-intl with Thai and English translations"
```

---

### Task 4: Create Mock Data

**Files:**
- Create: `frontend/src/data/services.ts`
- Create: `frontend/src/data/therapists.ts`
- Create: `frontend/src/data/beds.ts`
- Create: `frontend/src/data/bookings.ts`

**Step 1: Create services mock data**

`frontend/src/data/services.ts`:
```ts
export interface Service {
  id: number;
  name: { th: string; en: string };
  duration: number;
  price: number;
  description: { th: string; en: string };
  image: string;
}

export const services: Service[] = [
  {
    id: 1,
    name: { th: "นวดแผนไทย", en: "Thai Massage" },
    duration: 60,
    price: 400,
    description: {
      th: "นวดแผนไทยโบราณ ผ่อนคลายกล้ามเนื้อ",
      en: "Traditional Thai massage for muscle relaxation",
    },
    image: "/images/thai-massage.jpg",
  },
  {
    id: 2,
    name: { th: "นวดน้ำมัน", en: "Oil Massage" },
    duration: 60,
    price: 600,
    description: {
      th: "นวดน้ำมันอโรมา ผ่อนคลายลึก",
      en: "Aromatherapy oil massage for deep relaxation",
    },
    image: "/images/oil-massage.jpg",
  },
  {
    id: 3,
    name: { th: "นวดน้ำมัน", en: "Oil Massage" },
    duration: 120,
    price: 1000,
    description: {
      th: "นวดน้ำมันอโรมา 2 ชั่วโมง ผ่อนคลายอย่างเต็มที่",
      en: "2-hour aromatherapy oil massage for ultimate relaxation",
    },
    image: "/images/oil-massage-2h.jpg",
  },
  {
    id: 4,
    name: { th: "นวดเท้า", en: "Foot Massage" },
    duration: 60,
    price: 350,
    description: {
      th: "นวดเท้าและขา กดจุดสะท้อน",
      en: "Foot and leg reflexology massage",
    },
    image: "/images/foot-massage.jpg",
  },
  {
    id: 5,
    name: { th: "นวดศีรษะ คอ บ่า ไหล่", en: "Head & Shoulder Massage" },
    duration: 45,
    price: 300,
    description: {
      th: "นวดศีรษะ คอ บ่า ไหล่ แก้ออฟฟิศซินโดรม",
      en: "Head, neck & shoulder massage for office syndrome",
    },
    image: "/images/head-massage.jpg",
  },
];
```

**Step 2: Create therapists mock data**

`frontend/src/data/therapists.ts`:
```ts
export type TherapistStatus = "available" | "busy" | "break" | "offline";

export interface Therapist {
  id: number;
  name: { th: string; en: string };
  skill: string[];
  rating: number;
  status: TherapistStatus;
  image: string;
  experience: number;
}

export const therapists: Therapist[] = [
  {
    id: 1,
    name: { th: "สมศรี สุขใจ", en: "Somsri Sukjai" },
    skill: ["Thai Massage", "Foot Massage"],
    rating: 4.9,
    status: "available",
    image: "/images/therapist-1.jpg",
    experience: 10,
  },
  {
    id: 2,
    name: { th: "วิภา ใจดี", en: "Wipa Jaidee" },
    skill: ["Oil Massage", "Head & Shoulder"],
    rating: 4.8,
    status: "available",
    image: "/images/therapist-2.jpg",
    experience: 8,
  },
  {
    id: 3,
    name: { th: "มาลี สวยงาม", en: "Malee Suayngam" },
    skill: ["Thai Massage", "Oil Massage"],
    rating: 4.7,
    status: "busy",
    image: "/images/therapist-3.jpg",
    experience: 5,
  },
  {
    id: 4,
    name: { th: "นภา รักสุข", en: "Napa Raksuk" },
    skill: ["Oil Massage", "Foot Massage"],
    rating: 4.6,
    status: "available",
    image: "/images/therapist-4.jpg",
    experience: 3,
  },
];
```

**Step 3: Create beds mock data**

`frontend/src/data/beds.ts`:
```ts
export type BedStatus = "available" | "reserved" | "in_service" | "cleaning";

export interface Bed {
  id: number;
  name: string;
  status: BedStatus;
  currentBookingId?: number;
}

export const beds: Bed[] = [
  { id: 1, name: "Bed 1", status: "available" },
  { id: 2, name: "Bed 2", status: "in_service", currentBookingId: 1 },
  { id: 3, name: "Bed 3", status: "reserved", currentBookingId: 2 },
  { id: 4, name: "Bed 4", status: "cleaning" },
];
```

**Step 4: Create bookings mock data**

`frontend/src/data/bookings.ts`:
```ts
export type BookingStatus = "booked" | "checked_in" | "in_service" | "completed" | "checkout";

export interface Booking {
  id: number;
  customerName: string;
  phone: string;
  serviceId: number;
  therapistId: number;
  bedId: number;
  startTime: string;
  endTime: string;
  status: BookingStatus;
  createdAt: string;
}

export const bookings: Booking[] = [
  {
    id: 1,
    customerName: "คุณสมชาย",
    phone: "081-234-5678",
    serviceId: 1,
    therapistId: 3,
    bedId: 2,
    startTime: "2026-03-07T10:00:00",
    endTime: "2026-03-07T11:00:00",
    status: "in_service",
    createdAt: "2026-03-07T09:00:00",
  },
  {
    id: 2,
    customerName: "คุณสมหญิง",
    phone: "089-876-5432",
    serviceId: 2,
    therapistId: 1,
    bedId: 3,
    startTime: "2026-03-07T11:00:00",
    endTime: "2026-03-07T12:00:00",
    status: "booked",
    createdAt: "2026-03-07T08:30:00",
  },
  {
    id: 3,
    customerName: "คุณวิชัย",
    phone: "062-111-2222",
    serviceId: 4,
    therapistId: 2,
    bedId: 1,
    startTime: "2026-03-07T13:00:00",
    endTime: "2026-03-07T14:00:00",
    status: "booked",
    createdAt: "2026-03-07T09:15:00",
  },
];
```

**Step 5: Commit**

```bash
git add frontend/src/data/
git commit -m "feat: add mock data for services, therapists, beds, and bookings"
```

---

## Phase 2: Shared Components

### Task 5: Create Shared UI Components

**Files:**
- Create: `frontend/src/components/ui/Button.tsx`
- Create: `frontend/src/components/ui/Card.tsx`
- Create: `frontend/src/components/ui/Badge.tsx`
- Create: `frontend/src/components/ui/LanguageSwitcher.tsx`

**Step 1: Create Button component**

`frontend/src/components/ui/Button.tsx`:
```tsx
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  children,
  className = "",
  ...props
}: ButtonProps) {
  const base = "inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";

  const variants = {
    primary: "bg-accent-gold text-primary-dark hover:bg-accent-gold-light active:bg-accent-gold-dark shadow-lg shadow-accent-gold/20",
    secondary: "bg-primary text-white hover:bg-primary-light",
    outline: "border-2 border-accent-gold text-accent-gold hover:bg-accent-gold hover:text-primary-dark",
    ghost: "text-accent-gold hover:bg-accent-gold/10",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-5 py-2.5 text-base",
    lg: "px-8 py-3.5 text-lg",
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
```

**Step 2: Create Card component**

`frontend/src/components/ui/Card.tsx`:
```tsx
interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: "dark" | "light";
  hover?: boolean;
}

export function Card({
  children,
  className = "",
  variant = "dark",
  hover = false,
}: CardProps) {
  const variants = {
    dark: "bg-surface-card border border-white/10 text-white",
    light: "bg-white border border-gray-200 text-primary-dark",
  };

  const hoverClass = hover
    ? "hover:border-accent-gold/50 hover:shadow-lg hover:shadow-accent-gold/10 transition-all duration-300 cursor-pointer"
    : "";

  return (
    <div className={`rounded-2xl p-6 ${variants[variant]} ${hoverClass} ${className}`}>
      {children}
    </div>
  );
}
```

**Step 3: Create Badge component**

`frontend/src/components/ui/Badge.tsx`:
```tsx
interface BadgeProps {
  children: React.ReactNode;
  variant?: "gold" | "green" | "red" | "blue" | "gray";
  className?: string;
}

export function Badge({ children, variant = "gold", className = "" }: BadgeProps) {
  const variants = {
    gold: "bg-accent-gold/20 text-accent-gold border-accent-gold/30",
    green: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    red: "bg-red-500/20 text-red-400 border-red-500/30",
    blue: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    gray: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
```

**Step 4: Create LanguageSwitcher component**

`frontend/src/components/ui/LanguageSwitcher.tsx`:
```tsx
"use client";

import { useLocale } from "next-intl";
import { useRouter, usePathname } from "next/navigation";

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const toggleLocale = () => {
    const newLocale = locale === "th" ? "en" : "th";
    const newPath = pathname.replace(`/${locale}`, `/${newLocale}`);
    router.push(newPath);
  };

  return (
    <button
      onClick={toggleLocale}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-accent-gold/30 text-accent-gold hover:bg-accent-gold/10 transition-colors text-sm cursor-pointer"
    >
      <span>{locale === "th" ? "EN" : "TH"}</span>
    </button>
  );
}
```

**Step 5: Commit**

```bash
git add frontend/src/components/
git commit -m "feat: add shared UI components (Button, Card, Badge, LanguageSwitcher)"
```

---

## Phase 3: Customer Pages

### Task 6: Create Customer Layout + Home Page

**Files:**
- Create: `frontend/src/app/[locale]/(customer)/layout.tsx`
- Modify: `frontend/src/app/[locale]/(customer)/page.tsx` (Home)
- Create: `frontend/src/components/layout/CustomerNavbar.tsx`
- Create: `frontend/src/components/layout/Footer.tsx`

**Step 1: Create CustomerNavbar**

`frontend/src/components/layout/CustomerNavbar.tsx`:
```tsx
"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";

export function CustomerNavbar() {
  const t = useTranslations("common");

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-primary-dark/95 backdrop-blur-md border-b border-accent-gold/20">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="font-heading text-xl text-accent-gold">
          {t("appName")}
        </Link>
        <div className="flex items-center gap-4">
          <LanguageSwitcher />
        </div>
      </div>
    </nav>
  );
}
```

Note: `Link` from `@/i18n/routing` needs to be created. Add this navigation helper:

`frontend/src/i18n/routing.ts` (update):
```ts
import { defineRouting } from "next-intl/routing";
import { createNavigation } from "next-intl/navigation";

export const routing = defineRouting({
  locales: ["th", "en"],
  defaultLocale: "th",
});

export const { Link, redirect, usePathname, useRouter } =
  createNavigation(routing);
```

**Step 2: Create Footer**

`frontend/src/components/layout/Footer.tsx`:
```tsx
import { useTranslations } from "next-intl";

export function Footer() {
  const t = useTranslations("common");

  return (
    <footer className="bg-primary-dark border-t border-accent-gold/20 py-8">
      <div className="max-w-7xl mx-auto px-4 text-center text-white/50 text-sm">
        <p className="font-heading text-accent-gold text-lg mb-2">
          {t("appName")}
        </p>
        <p>&copy; 2026 {t("appName")}. All rights reserved.</p>
      </div>
    </footer>
  );
}
```

**Step 3: Create Customer layout**

`frontend/src/app/[locale]/(customer)/layout.tsx`:
```tsx
import { CustomerNavbar } from "@/components/layout/CustomerNavbar";
import { Footer } from "@/components/layout/Footer";

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-surface-dark flex flex-col">
      <CustomerNavbar />
      <main className="flex-1 pt-16">{children}</main>
      <Footer />
    </div>
  );
}
```

**Step 4: Create Home page**

`frontend/src/app/[locale]/(customer)/page.tsx`:
```tsx
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { services } from "@/data/services";

export default function HomePage() {
  const t = useTranslations();
  const locale = "th"; // Will be dynamic

  return (
    <>
      {/* Hero Section */}
      <section className="relative min-h-[80vh] flex items-center justify-center bg-gradient-to-b from-primary-dark via-primary to-surface-dark">
        <div className="absolute inset-0 bg-[url('/images/hero-bg.jpg')] bg-cover bg-center opacity-20" />
        <div className="relative text-center px-4 max-w-3xl mx-auto">
          <h1 className="font-heading text-4xl md:text-6xl text-white mb-4">
            {t("home.hero")}
          </h1>
          <p className="text-accent-cream text-lg md:text-xl mb-8">
            {t("home.subtitle")}
          </p>
          <Link href="/services">
            <Button size="lg" variant="primary">
              {t("home.cta")}
            </Button>
          </Link>
        </div>
      </section>

      {/* Services Preview Section */}
      <section className="py-16 px-4 max-w-7xl mx-auto">
        <h2 className="font-heading text-3xl text-white text-center mb-12">
          {t("services.title")}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.slice(0, 3).map((service) => (
            <Card key={service.id} hover>
              <div className="h-48 bg-primary rounded-xl mb-4" />
              <h3 className="font-heading text-xl text-white mb-2">
                {service.name[locale as keyof typeof service.name]}
              </h3>
              <p className="text-white/60 text-sm mb-4">
                {service.description[locale as keyof typeof service.description]}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-accent-gold font-bold">
                  {service.price} {t("services.baht")}
                </span>
                <span className="text-white/40 text-sm">
                  {service.duration} {t("services.minutes")}
                </span>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </>
  );
}
```

**Step 5: Verify Home page renders**

Run: `npm run dev`
Visit: `http://localhost:3000/th`
Expected: Hero section + services preview with Spa & Luxury theme

**Step 6: Commit**

```bash
git add .
git commit -m "feat: add customer layout, navbar, footer, and home page"
```

---

### Task 7: Create Services Page

**Files:**
- Create: `frontend/src/app/[locale]/(customer)/services/page.tsx`

**Step 1: Create services page that displays all services with select action**

Full page with service cards, duration, price, and "Select" button. Each card links to therapist selection with serviceId as query param.

**Step 2: Commit**

```bash
git add .
git commit -m "feat: add services selection page"
```

---

### Task 8: Create Therapist Selection Page

**Files:**
- Create: `frontend/src/app/[locale]/(customer)/therapists/page.tsx`

**Step 1: Create therapist selection page**

Show available therapists with rating, skills, experience. Filter by availability. Select links to booking page.

**Step 2: Commit**

```bash
git add .
git commit -m "feat: add therapist selection page"
```

---

### Task 9: Create Booking Page (Time Selection + Customer Info)

**Files:**
- Create: `frontend/src/app/[locale]/(customer)/booking/page.tsx`

**Step 1: Create booking page**

Time slot picker, customer name + phone input, booking summary. Confirm button leads to payment.

**Step 2: Commit**

```bash
git add .
git commit -m "feat: add booking page with time selection and customer info"
```

---

### Task 10: Create Payment Page

**Files:**
- Create: `frontend/src/app/[locale]/(customer)/payment/page.tsx`

**Step 1: Create payment page**

Show booking summary, payment method selection (PromptPay QR / Cash / Transfer), QR code display for PromptPay, confirmation button.

**Step 2: Commit**

```bash
git add .
git commit -m "feat: add payment page with PromptPay QR, cash, and bank transfer"
```

---

## Phase 4: Auth Pages

### Task 11: Create Login Pages

**Files:**
- Create: `frontend/src/app/[locale]/(auth)/login/page.tsx`
- Create: `frontend/src/components/auth/PinInput.tsx`

**Step 1: Create PIN input component for Staff/Therapist**

4-6 digit PIN input with number pad UI.

**Step 2: Create login page**

Tab-based UI: Staff (PIN) / Owner (Username + Password). Spa & Luxury styled.

**Step 3: Commit**

```bash
git add .
git commit -m "feat: add login page with staff PIN and owner password auth"
```

---

## Phase 5: Staff Pages

### Task 12: Create Staff Layout + Dashboard

**Files:**
- Create: `frontend/src/app/[locale]/(staff)/staff/layout.tsx`
- Create: `frontend/src/app/[locale]/(staff)/staff/dashboard/page.tsx`
- Create: `frontend/src/components/layout/StaffSidebar.tsx`

**Step 1: Create Staff sidebar navigation + layout**

**Step 2: Create Bed Dashboard page**

Show 4 beds with status (available/reserved/in_service/cleaning), color-coded cards.

**Step 3: Commit**

```bash
git add .
git commit -m "feat: add staff layout, sidebar, and bed dashboard"
```

---

### Task 13: Create Staff Booking List Page

**Files:**
- Create: `frontend/src/app/[locale]/(staff)/staff/bookings/page.tsx`

**Step 1: Create booking list with status badges, check-in/checkout actions**

**Step 2: Commit**

```bash
git add .
git commit -m "feat: add staff booking list page"
```

---

### Task 14: Create Session Control Page

**Files:**
- Create: `frontend/src/app/[locale]/(staff)/staff/session/page.tsx`

**Step 1: Create session control page with start/finish service buttons and timer**

**Step 2: Commit**

```bash
git add .
git commit -m "feat: add session control page"
```

---

## Phase 6: Owner Pages

### Task 15: Create Owner Layout + Revenue Dashboard

**Files:**
- Create: `frontend/src/app/[locale]/(owner)/owner/layout.tsx`
- Create: `frontend/src/app/[locale]/(owner)/owner/dashboard/page.tsx`
- Create: `frontend/src/components/layout/OwnerSidebar.tsx`

**Step 1: Create Owner sidebar navigation + layout**

**Step 2: Create Revenue Dashboard**

Daily metrics cards (total customers, revenue, bed utilization) + simple charts/stats.

**Step 3: Commit**

```bash
git add .
git commit -m "feat: add owner layout and revenue dashboard"
```

---

### Task 16: Create Therapist Performance Page

**Files:**
- Create: `frontend/src/app/[locale]/(owner)/owner/therapists/page.tsx`

**Step 1: Create therapist performance table with sessions count and revenue per therapist**

**Step 2: Commit**

```bash
git add .
git commit -m "feat: add therapist performance page"
```

---

## Phase 7: Attendance Module

### Task 17: Create Therapist Attendance Page

**Files:**
- Create: `frontend/src/app/[locale]/(staff)/staff/attendance/page.tsx`

**Step 1: Create attendance page with check-in/check-out buttons and today's attendance list**

**Step 2: Commit**

```bash
git add .
git commit -m "feat: add therapist attendance page"
```

---

## Phase 8: Final Polish

### Task 18: Add Google Fonts (Playfair Display + Noto Sans Thai)

**Files:**
- Modify: `frontend/src/app/[locale]/layout.tsx`

**Step 1: Import Google Fonts via next/font**

**Step 2: Commit**

```bash
git add .
git commit -m "style: add Playfair Display and Noto Sans Thai fonts"
```

---

### Task 19: Responsive Testing & Polish

**Step 1: Test all pages on mobile (375px), tablet (768px), desktop (1280px)**

**Step 2: Fix any responsive issues**

**Step 3: Commit**

```bash
git add .
git commit -m "style: responsive polish across all breakpoints"
```
