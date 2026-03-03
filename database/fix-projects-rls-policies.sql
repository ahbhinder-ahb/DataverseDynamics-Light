-- Fix RLS policies for projects table
-- Drop existing broken policies that try to query auth.users
DROP POLICY IF EXISTS projects_admin_select ON public.projects;
DROP POLICY IF EXISTS projects_admin_insert ON public.projects;
DROP POLICY IF EXISTS projects_admin_update ON public.projects;
DROP POLICY IF EXISTS projects_admin_delete ON public.projects;

-- Create new RLS policies that use JWT token metadata instead of querying auth.users
-- This avoids the "permission denied for table users" error

-- Policy: Allow admins and admin_view role to SELECT (read) projects
CREATE POLICY projects_select_admin ON public.projects
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role' IN ('admin', 'admin_view'))
  );

-- Policy: Allow only full admins to INSERT (create) projects
CREATE POLICY projects_insert_admin ON public.projects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
  );

-- Policy: Allow only full admins to UPDATE (edit) projects
CREATE POLICY projects_update_admin ON public.projects
  FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
  );

-- Policy: Allow only full admins to DELETE (remove) projects
CREATE POLICY projects_delete_admin ON public.projects
  FOR DELETE
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
  );
