-- Migration: Add auth profiles, jobs table, and link windows to jobs
-- Run this in the Supabase SQL editor

-- ===== PROFILES TABLE =====
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  avatar_url text,
  role text NOT NULL DEFAULT 'salesperson',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Auto-create profile when a new user signs up via Google OAuth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS for profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins read all profiles" ON profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ===== JOBS TABLE =====
CREATE TABLE IF NOT EXISTS jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL REFERENCES profiles(id),
  assigned_to uuid REFERENCES profiles(id),

  po_number text NOT NULL,
  client_name text,
  client_address text,
  client_city text,
  client_state text,
  client_zip text,

  -- External system linkage
  cc_project_id text,
  cc_project_number text,
  hover_job_id integer,
  hover_model_ids jsonb,

  -- Workflow status
  status text NOT NULL DEFAULT 'draft',

  approved_at timestamptz,
  approved_by uuid REFERENCES profiles(id),
  completed_at timestamptz,
  notes text DEFAULT '',

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_jobs_created_by ON jobs(created_by);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_po_number ON jobs(po_number);

-- RLS for jobs
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read all jobs" ON jobs FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can create jobs" ON jobs FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Creators and admins can update jobs" ON jobs FOR UPDATE USING (
  auth.uid() = created_by
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Creators and admins can delete jobs" ON jobs FOR DELETE USING (
  auth.uid() = created_by
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ===== LINK WINDOWS TO JOBS =====
ALTER TABLE windows ADD COLUMN IF NOT EXISTS job_id uuid REFERENCES jobs(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_windows_job_id ON windows(job_id);

-- ===== JOB ACTIVITY LOG =====
CREATE TABLE IF NOT EXISTS job_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id),
  action text NOT NULL,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_job_activity_job_id ON job_activity(job_id);

ALTER TABLE job_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read activity" ON job_activity FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can create activity" ON job_activity FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE job_activity;
