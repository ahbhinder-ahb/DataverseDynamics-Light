-- Add project_number column to projects table
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS project_number TEXT UNIQUE;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_projects_project_number ON public.projects(project_number);

-- Create function to generate project number
CREATE OR REPLACE FUNCTION generate_project_number()
RETURNS TEXT AS $$
DECLARE
  current_month TEXT;
  project_count INTEGER;
  new_project_number TEXT;
BEGIN
  -- Get current year-month (YYYYMM format)
  current_month := TO_CHAR(NOW(), 'YYYYMM');
  
  -- Count existing projects for this month
  SELECT COUNT(*) INTO project_count
  FROM public.projects
  WHERE project_number LIKE 'PRJ-' || current_month || '-%';
  
  -- Generate new project number
  new_project_number := 'PRJ-' || current_month || '-' || LPAD((project_count + 1)::TEXT, 4, '0');
  
  RETURN new_project_number;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate project number if not provided
CREATE OR REPLACE FUNCTION set_project_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.project_number IS NULL OR NEW.project_number = '' THEN
    NEW.project_number := generate_project_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists and recreate it
DROP TRIGGER IF EXISTS projects_set_number ON public.projects;
CREATE TRIGGER projects_set_number
BEFORE INSERT ON public.projects
FOR EACH ROW
EXECUTE FUNCTION set_project_number();
