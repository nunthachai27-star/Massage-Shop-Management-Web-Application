-- ========================================
-- Massage Shop Database Schema + Seed
-- ========================================

CREATE TABLE IF NOT EXISTS services (
  id SERIAL PRIMARY KEY,
  name_th TEXT NOT NULL,
  name_en TEXT NOT NULL,
  description_th TEXT DEFAULT '',
  description_en TEXT DEFAULT '',
  duration INT NOT NULL DEFAULT 60,
  price NUMERIC(10,2) NOT NULL,
  image TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS therapists (
  id SERIAL PRIMARY KEY,
  name_th TEXT NOT NULL,
  name_en TEXT NOT NULL,
  skills TEXT[] DEFAULT '{}',
  rating NUMERIC(2,1) DEFAULT 0,
  status TEXT DEFAULT 'offline',
  pin TEXT,
  image TEXT,
  experience INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS beds (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'available',
  current_booking_id INT
);

CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT DEFAULT '',
  customer_code TEXT,
  visit_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bookings (
  id SERIAL PRIMARY KEY,
  customer_id INT REFERENCES customers(id),
  customer_name TEXT,
  phone TEXT,
  service_id INT REFERENCES services(id),
  therapist_id INT REFERENCES therapists(id),
  bed_id INT REFERENCES beds(id),
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  status TEXT DEFAULT 'booked',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  booking_id INT REFERENCES bookings(id),
  amount NUMERIC(10,2),
  method TEXT DEFAULT 'cash',
  status TEXT DEFAULT 'pending',
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS staff (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'staff',
  name TEXT
);

CREATE TABLE IF NOT EXISTS attendance (
  id SERIAL PRIMARY KEY,
  therapist_id INT REFERENCES therapists(id),
  check_in TIMESTAMPTZ,
  check_out TIMESTAMPTZ,
  date DATE
);

CREATE TABLE IF NOT EXISTS commissions (
  id SERIAL PRIMARY KEY,
  therapist_id INT REFERENCES therapists(id),
  date DATE NOT NULL,
  total_sessions INT DEFAULT 0,
  total_revenue NUMERIC(10,2) DEFAULT 0,
  total_commission NUMERIC(10,2) DEFAULT 0,
  status TEXT DEFAULT 'pending',
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(therapist_id, date)
);

-- Auto-generate customer code
CREATE OR REPLACE FUNCTION generate_customer_code()
RETURNS TRIGGER AS $$
BEGIN
  NEW.customer_code := 'C' || LPAD(NEW.id::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_customer_code ON customers;
CREATE TRIGGER set_customer_code
  BEFORE INSERT ON customers
  FOR EACH ROW
  WHEN (NEW.customer_code IS NULL)
  EXECUTE FUNCTION generate_customer_code();

-- ========================================
-- Seed Data
-- ========================================

INSERT INTO services (id, name_th, name_en, description_th, description_en, duration, price) VALUES
  (1, 'นวดไทย 1 ชม.', 'Thai Massage 1 hr', 'นวดแผนไทยโบราณ ผ่อนคลายกล้ามเนื้อ', 'Traditional Thai massage for muscle relaxation', 60, 400),
  (2, 'นวดไทย 1.5 ชม.', 'Thai Massage 1.5 hr', 'นวดแผนไทยโบราณ 1.5 ชั่วโมง', 'Traditional Thai massage 1.5 hours', 90, 600),
  (3, 'นวดไทย 2 ชม.', 'Thai Massage 2 hr', 'นวดแผนไทยโบราณ 2 ชั่วโมง ผ่อนคลายเต็มที่', 'Traditional Thai massage 2 hours for full relaxation', 120, 800),
  (4, 'นวดอโรม่า 1 ชม.', 'Aroma Massage 1 hr', 'นวดน้ำมันอโรม่า ผ่อนคลายลึก', 'Aromatherapy oil massage for deep relaxation', 60, 600),
  (5, 'นวดอโรม่า 1.5 ชม.', 'Aroma Massage 1.5 hr', 'นวดน้ำมันอโรม่า 1.5 ชั่วโมง', 'Aromatherapy oil massage 1.5 hours', 90, 800),
  (6, 'นวดอโรม่า 2 ชม.', 'Aroma Massage 2 hr', 'นวดน้ำมันอโรม่า 2 ชั่วโมง ผ่อนคลายสุดพิเศษ', 'Aromatherapy oil massage 2 hours for ultimate relaxation', 120, 1000)
ON CONFLICT (id) DO UPDATE SET
  name_th = EXCLUDED.name_th, name_en = EXCLUDED.name_en,
  description_th = EXCLUDED.description_th, description_en = EXCLUDED.description_en,
  duration = EXCLUDED.duration, price = EXCLUDED.price;

INSERT INTO therapists (id, name_th, name_en, skills, rating, status, pin, experience) VALUES
  (1, 'หมอเจเจ', 'Mor JJ', ARRAY['Thai Massage','Oil Massage'], 4.9, 'offline', '1234', 10),
  (2, 'หมอเกิ้ล', 'Mor Koil', ARRAY['Oil Massage','Thai Massage'], 4.8, 'offline', '5678', 8),
  (3, 'หมอพลอย', 'Mor Ploy', ARRAY['Thai Massage','Oil Massage'], 4.7, 'offline', '9012', 5),
  (4, 'หมอเดียร์', 'Mor Dear', ARRAY['Oil Massage','Thai Massage'], 4.6, 'offline', '3456', 3),
  (5, 'หมอบี', 'Mor Bee', ARRAY['Thai Massage','Oil Massage'], 4.8, 'offline', '1111', 6),
  (6, 'หมอออม', 'Mor Aom', ARRAY['Oil Massage','Thai Massage'], 4.7, 'offline', '2222', 4),
  (7, 'หมอเค๊ก', 'Mor Cake', ARRAY['Thai Massage','Oil Massage'], 4.5, 'offline', '3333', 2)
ON CONFLICT (id) DO UPDATE SET
  name_th = EXCLUDED.name_th, name_en = EXCLUDED.name_en,
  skills = EXCLUDED.skills, rating = EXCLUDED.rating, pin = EXCLUDED.pin, experience = EXCLUDED.experience;

INSERT INTO beds (id, name, status) VALUES
  (1, 'ห้อง 6', 'available'),
  (2, 'ห้อง 7', 'available'),
  (3, 'ห้อง 8', 'available'),
  (4, 'ห้อง 9', 'available')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Owner account: admin / admin123
-- Password hash for 'admin123' with bcrypt (10 rounds)
INSERT INTO staff (id, username, password_hash, role, name) VALUES
  (1, 'admin', '$2b$10$nuvKDFsVOMTq7DWz0AIG9eqTk48E9UVZsRH6np60PD5NktTj8uaRO', 'owner', 'Admin Owner')
ON CONFLICT (id) DO UPDATE SET
  username = EXCLUDED.username, password_hash = EXCLUDED.password_hash;

-- Reset sequences
SELECT setval('services_id_seq', (SELECT MAX(id) FROM services));
SELECT setval('therapists_id_seq', (SELECT COALESCE(MAX(id), 1) FROM therapists));
SELECT setval('beds_id_seq', (SELECT MAX(id) FROM beds));
SELECT setval('staff_id_seq', (SELECT MAX(id) FROM staff));
