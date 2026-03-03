-- Create Invoices table for tracking customer invoices
CREATE TABLE IF NOT EXISTS "Invoices" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Invoice Identification
  invoice_number TEXT UNIQUE NOT NULL,
  
  -- Link to Booking (optional)
  booking_id UUID REFERENCES "Contact Us Details"(id) ON DELETE SET NULL,
  
  -- Customer Information
  customer_name TEXT NOT NULL,
  email TEXT NOT NULL,
  customer_company TEXT,
  
  -- Service & Billing
  service_of_interest TEXT,
  per_hour_rate NUMERIC(10, 2) NOT NULL,
  total_hours NUMERIC(10, 2) NOT NULL,
  total_amount NUMERIC(10, 2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  
  -- Payment Details
  due_date DATE,
  payment_terms TEXT DEFAULT 'Net 30',
  
  -- Status Tracking
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'partially_paid', 'refunded')),
  
  -- Additional Info
  comments TEXT,
  
  -- Tracking
  sent_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON "Invoices"(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_email ON "Invoices"(email);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON "Invoices"(status);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON "Invoices"(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_booking_id ON "Invoices"(booking_id);

-- Enable Row Level Security
ALTER TABLE "Invoices" ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Admins can do everything
CREATE POLICY "admin_all_access_invoices"
ON "Invoices"
FOR ALL
USING (
  (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'admin_view')
);

-- Create function to generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
  current_month TEXT;
  invoice_count INTEGER;
  new_invoice_number TEXT;
BEGIN
  -- Get current year-month (YYYYMM format)
  current_month := TO_CHAR(NOW(), 'YYYYMM');
  
  -- Count existing invoices for this month
  SELECT COUNT(*) INTO invoice_count
  FROM "Invoices"
  WHERE invoice_number LIKE 'INV-' || current_month || '-%';
  
  -- Generate new invoice number
  new_invoice_number := 'INV-' || current_month || '-' || LPAD((invoice_count + 1)::TEXT, 4, '0');
  
  RETURN new_invoice_number;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate invoice number if not provided
CREATE OR REPLACE FUNCTION set_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
    NEW.invoice_number := generate_invoice_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_invoice_number
BEFORE INSERT ON "Invoices"
FOR EACH ROW
EXECUTE FUNCTION set_invoice_number();

-- Add comment to table
COMMENT ON TABLE "Invoices" IS 'Stores customer invoices for services rendered';
