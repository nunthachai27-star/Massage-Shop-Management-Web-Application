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

-- Seed initial beds
INSERT INTO beds (name, status) VALUES
  ('Bed 1', 'available'),
  ('Bed 2', 'available'),
  ('Bed 3', 'available'),
  ('Bed 4', 'available')
ON CONFLICT DO NOTHING;

-- Seed initial services
INSERT INTO services (name_th, name_en, description_th, description_en, duration, price) VALUES
  ('นวดแผนไทย', 'Thai Massage', 'นวดแผนไทยโบราณ ผ่อนคลายกล้ามเนื้อ', 'Traditional Thai massage for muscle relaxation', 60, 400),
  ('นวดน้ำมัน', 'Oil Massage', 'นวดน้ำมันอโรมา ผ่อนคลายลึก', 'Aromatherapy oil massage for deep relaxation', 60, 600),
  ('นวดน้ำมัน 2 ชม.', 'Oil Massage 2hr', 'นวดน้ำมันอโรมา 2 ชั่วโมง ผ่อนคลายอย่างเต็มที่', '2-hour aromatherapy oil massage for ultimate relaxation', 120, 1000),
  ('นวดเท้า', 'Foot Massage', 'นวดเท้าและขา กดจุดสะท้อน', 'Foot and leg reflexology massage', 60, 350),
  ('นวดศีรษะ คอ บ่า ไหล่', 'Head & Shoulder Massage', 'นวดศีรษะ คอ บ่า ไหล่ แก้ออฟฟิศซินโดรม', 'Head, neck & shoulder massage for office syndrome', 45, 300)
ON CONFLICT DO NOTHING;

-- Seed therapists with PINs
INSERT INTO therapists (name_th, name_en, skills, rating, status, pin, experience) VALUES
  ('สมศรี สุขใจ', 'Somsri Sukjai', ARRAY['Thai Massage','Foot Massage'], 4.9, 'offline', '1234', 10),
  ('วิภา ใจดี', 'Wipa Jaidee', ARRAY['Oil Massage','Head & Shoulder'], 4.8, 'offline', '5678', 8),
  ('มาลี สวยงาม', 'Malee Suayngam', ARRAY['Thai Massage','Oil Massage'], 4.7, 'offline', '9012', 5),
  ('นภา รักสุข', 'Napa Raksuk', ARRAY['Oil Massage','Foot Massage'], 4.6, 'offline', '3456', 3)
ON CONFLICT DO NOTHING;
