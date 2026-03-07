-- Add customer_code column and make phone optional
ALTER TABLE customers ALTER COLUMN phone DROP NOT NULL;
ALTER TABLE customers ALTER COLUMN phone SET DEFAULT '';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS customer_code VARCHAR(10);

-- Generate codes for existing customers
UPDATE customers SET customer_code = 'C' || LPAD(id::TEXT, 3, '0') WHERE customer_code IS NULL;

-- Make customer_code not null and unique after backfill
ALTER TABLE customers ALTER COLUMN customer_code SET NOT NULL;
ALTER TABLE customers ADD CONSTRAINT unique_customer_code UNIQUE (customer_code);

-- Create index on customer_code and name for search
CREATE INDEX IF NOT EXISTS idx_customers_code ON customers(customer_code);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);

-- Create sequence for customer code generation
CREATE SEQUENCE IF NOT EXISTS customer_code_seq START 1;

-- Function to auto-generate customer_code on insert
CREATE OR REPLACE FUNCTION generate_customer_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.customer_code IS NULL OR NEW.customer_code = '' THEN
    NEW.customer_code := 'C' || LPAD(nextval('customer_code_seq')::TEXT, 3, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_customer_code
  BEFORE INSERT ON customers
  FOR EACH ROW
  EXECUTE FUNCTION generate_customer_code();
