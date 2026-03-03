-- Add project_number column to Invoices table (for display purposes)
ALTER TABLE "Invoices" ADD COLUMN IF NOT EXISTS "project_number" TEXT;

-- Add discount column to Invoices table
ALTER TABLE "Invoices" ADD COLUMN IF NOT EXISTS "discount" NUMERIC(10, 2) DEFAULT 0;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_invoices_project_number ON "Invoices"(project_number);

-- Add comments to columns
COMMENT ON COLUMN "Invoices"."project_number" IS 'Stores the project number (e.g., PRJ-202602-0001) for easy reference on invoices';
COMMENT ON COLUMN "Invoices"."discount" IS 'Discount amount applied to the invoice (subtracted from subtotal)';
