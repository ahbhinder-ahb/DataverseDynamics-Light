-- Fix invoice number generation to prevent duplicates using a sequence-based approach

-- Drop existing trigger and functions
DROP TRIGGER IF EXISTS trigger_set_invoice_number ON "Invoices";
DROP FUNCTION IF EXISTS set_invoice_number();
DROP FUNCTION IF EXISTS generate_invoice_number();

-- Create a more robust function using row locking to prevent race conditions
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
  current_month TEXT;
  max_invoice_number TEXT;
  invoice_count INTEGER;
  new_invoice_number TEXT;
BEGIN
  -- Get current year-month (YYYYMM format)
  current_month := TO_CHAR(NOW(), 'YYYYMM');
  
  -- Lock the table to prevent race conditions and get the highest invoice number for this month
  SELECT invoice_number INTO max_invoice_number
  FROM "Invoices"
  WHERE invoice_number LIKE 'INV-' || current_month || '-%'
  ORDER BY invoice_number DESC
  LIMIT 1
  FOR UPDATE;
  
  -- Extract the sequence number from the max invoice number
  IF max_invoice_number IS NOT NULL THEN
    invoice_count := SUBSTRING(max_invoice_number FROM 'INV-[0-9]{6}-([0-9]{4})')::INTEGER;
  ELSE
    invoice_count := 0;
  END IF;
  
  -- Generate new invoice number
  new_invoice_number := 'INV-' || current_month || '-' || LPAD((invoice_count + 1)::TEXT, 4, '0');
  
  -- Check if this number already exists (additional safety check)
  WHILE EXISTS (SELECT 1 FROM "Invoices" WHERE invoice_number = new_invoice_number) LOOP
    invoice_count := invoice_count + 1;
    new_invoice_number := 'INV-' || current_month || '-' || LPAD((invoice_count + 1)::TEXT, 4, '0');
  END LOOP;
  
  RETURN new_invoice_number;
END;
$$ LANGUAGE plpgsql;

-- Trigger function to auto-generate invoice number if not provided
CREATE OR REPLACE FUNCTION set_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
    NEW.invoice_number := generate_invoice_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER trigger_set_invoice_number
BEFORE INSERT ON "Invoices"
FOR EACH ROW
EXECUTE FUNCTION set_invoice_number();

-- Add comment
COMMENT ON FUNCTION generate_invoice_number() IS 'Generates unique invoice numbers in format INV-YYYYMM-0001 with row locking to prevent race conditions';
