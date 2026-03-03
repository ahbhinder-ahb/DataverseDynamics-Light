-- Add is_invoiced column to projects table to track which projects have been invoiced
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "is_invoiced" BOOLEAN DEFAULT FALSE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_projects_is_invoiced ON "projects"(is_invoiced);

-- Add comment to column
COMMENT ON COLUMN "projects"."is_invoiced" IS 'Indicates whether this project has been invoiced (prevents duplicate invoicing)';
