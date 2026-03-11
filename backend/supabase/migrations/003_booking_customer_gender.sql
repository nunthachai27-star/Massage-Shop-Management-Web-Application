-- Add customer_gender to bookings for commission calculation
-- 'male' or 'female'; NULL means not specified (uses default commission rules)
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS customer_gender VARCHAR(10) CHECK (customer_gender IN ('male', 'female'));
