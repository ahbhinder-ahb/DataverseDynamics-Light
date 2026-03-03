-- Add total_hours column to projects table
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "total_hours" NUMERIC(10, 2);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_projects_total_hours ON "projects"(total_hours);

-- Add comment to column
COMMENT ON COLUMN "projects"."total_hours" IS 'Total working hours for the project';
