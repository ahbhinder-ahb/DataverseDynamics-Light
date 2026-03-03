-- Add project_id column to Invoices table to link invoices with projects
ALTER TABLE "Invoices" ADD COLUMN IF NOT EXISTS "project_id" UUID REFERENCES "projects"(id) ON DELETE SET NULL;

-- Add project_number column to store the project number for reference
ALTER TABLE "Invoices" ADD COLUMN IF NOT EXISTS "project_number" TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_invoices_project_id ON "Invoices"(project_id);
CREATE INDEX IF NOT EXISTS idx_invoices_project_number ON "Invoices"(project_number);

-- Add comments to columns
COMMENT ON COLUMN "Invoices"."project_id" IS 'Links invoice to a completed project (replaces booking_id usage)';
COMMENT ON COLUMN "Invoices"."project_number" IS 'Stores the project number (e.g., PRJ-202602-0001) for easy reference';
