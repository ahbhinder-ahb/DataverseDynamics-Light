-- Add project_id column to Contact Us Details table if it doesn't exist
ALTER TABLE "Contact Us Details"
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public."projects"(id) ON DELETE SET NULL;

-- Create index on project_id
CREATE INDEX IF NOT EXISTS idx_contact_details_project_id ON "Contact Us Details"(project_id);
