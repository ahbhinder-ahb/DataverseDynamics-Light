-- Create blocked_time_slots table for managing unavailable time slots
-- This table stores time slots that admins want to block from being available for bookings

CREATE TABLE IF NOT EXISTS blocked_time_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Time slot details
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  
  -- Recurring configuration
  is_recurring BOOLEAN DEFAULT FALSE,
  recurring_pattern VARCHAR(50) DEFAULT NULL, -- 'daily', 'weekly_monday', 'weekly_friday', etc.
  
  -- Metadata
  reason TEXT, -- Why this slot is blocked (e.g., "Team meeting", "Admin break")
  blocked_by_admin UUID, -- Reference to admin user who blocked it
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_time_range CHECK (end_time > start_time),
  CONSTRAINT valid_date CHECK (date >= CURRENT_DATE)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_blocked_slots_date ON blocked_time_slots(date);
CREATE INDEX IF NOT EXISTS idx_blocked_slots_recurring ON blocked_time_slots(is_recurring, recurring_pattern);
CREATE INDEX IF NOT EXISTS idx_blocked_slots_date_time ON blocked_time_slots(date, start_time, end_time);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_blocked_slots_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_blocked_slots_updated_at ON blocked_time_slots;

CREATE TRIGGER trigger_blocked_slots_updated_at
BEFORE UPDATE ON blocked_time_slots
FOR EACH ROW
EXECUTE FUNCTION update_blocked_slots_updated_at();

-- Add RLS (Row Level Security) policies if needed
ALTER TABLE blocked_time_slots ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can view blocked slots
CREATE POLICY "blocked_slots_admin_view" ON blocked_time_slots
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Policy: Only admins can insert blocked slots
CREATE POLICY "blocked_slots_admin_insert" ON blocked_time_slots
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Policy: Only admins can update blocked slots
CREATE POLICY "blocked_slots_admin_update" ON blocked_time_slots
  FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Policy: Only admins can delete blocked slots
CREATE POLICY "blocked_slots_admin_delete" ON blocked_time_slots
  FOR DELETE
  USING (auth.role() = 'authenticated');
