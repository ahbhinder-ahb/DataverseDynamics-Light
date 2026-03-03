-- Create Projects table
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  client_email TEXT NOT NULL,
  service TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'on-hold', 'completed', 'cancelled')),
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  budget NUMERIC(12, 2),
  hourly_rate NUMERIC(10, 2),
  meeting_id UUID REFERENCES "Contact Us Details"(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow admins to see all projects
CREATE POLICY projects_admin_select ON public.projects
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (raw_app_meta_data->>'role' IN ('admin', 'admin_view'))
    )
  );

-- RLS Policy: Allow full admins to insert projects
CREATE POLICY projects_admin_insert ON public.Projects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (raw_app_meta_data->>'role' = 'admin')
    )
  );

-- RLS Policy: Allow full admins to update projects
CREATE POLICY projects_admin_update ON public.Projects
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (raw_app_meta_data->>'role' = 'admin')
    )
  );

-- RLS Policy: Allow full admins to delete projects
CREATE POLICY projects_admin_delete ON public.projects
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (raw_app_meta_data->>'role' = 'admin')
    )
  );

-- Create indexes for performance
CREATE INDEX idx_projects_status ON public.projects(status);
CREATE INDEX idx_projects_client_email ON public.projects(client_email);
CREATE INDEX idx_projects_meeting_id ON public.projects(meeting_id);
CREATE INDEX idx_projects_created_at ON public.projects(created_at DESC);

-- Create function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_projects_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER projects_update_timestamp
BEFORE UPDATE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION update_projects_timestamp();
