-- Migration 005: Role-based permissions table + RLS enhancements
-- Run this in the Supabase SQL editor

-- ===== CONSTRAIN ROLE VALUES =====
-- (Use DO block so it doesn't error if constraint already exists)
DO $$
BEGIN
  ALTER TABLE profiles ADD CONSTRAINT valid_role
    CHECK (role IN ('salesperson', 'field_tech', 'admin'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ===== ROLE PERMISSIONS TABLE =====
CREATE TABLE IF NOT EXISTS role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL,
  permission text NOT NULL,
  granted boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES profiles(id),
  UNIQUE(role, permission)
);

ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read permissions (needed for UI gating)
CREATE POLICY "Authenticated users can read permissions"
  ON role_permissions FOR SELECT USING (auth.uid() IS NOT NULL);

-- Only admins can insert/update/delete permissions
CREATE POLICY "Admins can insert permissions"
  ON role_permissions FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update permissions"
  ON role_permissions FOR UPDATE USING (public.is_admin());
CREATE POLICY "Admins can delete permissions"
  ON role_permissions FOR DELETE USING (public.is_admin());

-- Seed default permissions for salesperson
INSERT INTO role_permissions (role, permission) VALUES
  ('salesperson', 'jobs:create'),
  ('salesperson', 'jobs:import'),
  ('salesperson', 'jobs:approve'),
  ('salesperson', 'jobs:delete'),
  ('salesperson', 'export:all')
ON CONFLICT (role, permission) DO NOTHING;

-- Seed default permissions for field_tech
INSERT INTO role_permissions (role, permission) VALUES
  ('field_tech', 'measure:submit'),
  ('field_tech', 'measure:start'),
  ('field_tech', 'export:all')
ON CONFLICT (role, permission) DO NOTHING;

-- ===== UPDATED JOBS RLS =====
-- Allow assigned user (field tech) to update jobs they're assigned to
DROP POLICY IF EXISTS "Creators and admins can update jobs" ON jobs;
CREATE POLICY "Creators, assignees and admins can update jobs" ON jobs FOR UPDATE USING (
  auth.uid() = created_by
  OR auth.uid() = assigned_to
  OR public.is_admin()
);

-- Allow admins to update any profile (for role management)
CREATE POLICY "Admins can update all profiles" ON profiles FOR UPDATE USING (
  public.is_admin()
);
