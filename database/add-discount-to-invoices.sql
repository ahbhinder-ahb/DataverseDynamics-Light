-- Add discount column to Invoices table
ALTER TABLE "Invoices" ADD COLUMN IF NOT EXISTS "discount" NUMERIC(10, 2) DEFAULT 0;

-- Add comment to column
COMMENT ON COLUMN "Invoices"."discount" IS 'Discount amount applied to the invoice (subtracted from subtotal)';
