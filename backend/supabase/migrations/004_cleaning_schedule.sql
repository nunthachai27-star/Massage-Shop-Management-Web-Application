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
