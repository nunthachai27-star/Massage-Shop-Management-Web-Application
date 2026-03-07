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
  customer_name VARCHAR(255),
  phone VARCHAR(20),
  service_id INTEGER REFERENCES services(id),
  therapist_id INTEGER REFERENCES therapists(id),
  bed_id INTEGER REFERENCES beds(id),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) DEFAULT 'booked' CHECK (status IN ('booked','checked_in','in_service','completed','checkout','cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key for beds.current_booking_id after bookings table exists
ALTER TABLE beds ADD CONSTRAINT fk_beds_current_booking FOREIGN KEY (current_booking_id) REFERENCES bookings(id) ON DELETE SET NULL;

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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bookings_start_time ON bookings(start_time);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_therapist ON bookings(therapist_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_therapist ON attendance(therapist_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);

-- Seed beds (matching frontend: ห้อง 6-9)
INSERT INTO beds (name, status) VALUES
  ('ห้อง 6', 'available'),
  ('ห้อง 7', 'available'),
  ('ห้อง 8', 'available'),
  ('ห้อง 9', 'available')
ON CONFLICT DO NOTHING;

-- Seed services (matching frontend exactly)
INSERT INTO services (name_th, name_en, description_th, description_en, duration, price) VALUES
  ('นวดไทย', 'Thai Massage', 'นวดแผนไทยโบราณ ผ่อนคลายกล้ามเนื้อ', 'Traditional Thai massage for muscle relaxation', 60, 400),
  ('นวดน้ำมัน (อโรม่า) 1 ชม.', 'Aroma Oil Massage 1 hr', 'นวดน้ำมันอโรม่า ผ่อนคลายลึก ในห้องส่วนตัวพร้อมห้องน้ำในตัว', 'Aromatherapy oil massage in private room with en-suite bathroom', 60, 600),
  ('นวดน้ำมัน (อโรม่า) 1.5 ชม.', 'Aroma Oil Massage 1.5 hr', 'นวดน้ำมันอโรม่า 1 ชั่วโมงครึ่ง ผ่อนคลายอย่างเต็มที่', '1.5-hour aromatherapy oil massage for deep relaxation', 90, 800),
  ('นวดน้ำมัน (อโรม่า) 2 ชม.', 'Aroma Oil Massage 2 hr', 'นวดน้ำมันอโรม่า 2 ชั่วโมง ผ่อนคลายสุดพิเศษ', '2-hour aromatherapy oil massage for ultimate relaxation', 120, 1000)
ON CONFLICT DO NOTHING;

-- Seed therapists with PINs (matching frontend: 7 therapists)
INSERT INTO therapists (name_th, name_en, skills, rating, status, pin, experience) VALUES
  ('หมอเจเจ', 'Mor JJ', ARRAY['นวดไทย','นวดอโรมา'], 4.9, 'offline', '1234', 10),
  ('หมอเกิ้ล', 'Mor Koil', ARRAY['นวดอโรมา','นวดไทย'], 4.8, 'offline', '5678', 8),
  ('หมอพลอย', 'Mor Ploy', ARRAY['นวดไทย','นวดอโรมา'], 4.7, 'offline', '9012', 5),
  ('หมอเดียร์', 'Mor Dear', ARRAY['นวดอโรมา','นวดไทย'], 4.6, 'offline', '3456', 3),
  ('หมอบี', 'Mor Bee', ARRAY['นวดไทย','นวดอโรมา'], 4.8, 'offline', '1111', 6),
  ('หมอออม', 'Mor Aom', ARRAY['นวดอโรมา','นวดไทย'], 4.7, 'offline', '2222', 4),
  ('หมอเค๊ก', 'Mor Cake', ARRAY['นวดไทย','นวดอโรมา'], 4.5, 'offline', '3333', 2)
ON CONFLICT DO NOTHING;

-- Seed owner account (password: admin123 — bcrypt hash)
INSERT INTO staff (username, password_hash, role, name) VALUES
  ('owner', '$2b$10$QrKJN3QkVpzWZlPL7B7VUOdW7MHPzrAZ3FQAqh4N.dCwrXHpKu9Pu', 'owner', 'Owner')
ON CONFLICT DO NOTHING;
