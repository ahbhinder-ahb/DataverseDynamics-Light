-- Add service column to projects table if it doesn't exist
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS service TEXT;
