-- 008: CompanyCam photo integration
-- Adds companycam_project_id to jobs, creates window_photos table

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS companycam_project_id text;

CREATE TABLE IF NOT EXISTS window_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  window_id uuid NOT NULL REFERENCES windows(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  public_url text NOT NULL,
  companycam_photo_id text,
  description text DEFAULT '',
  captured_at timestamptz NOT NULL DEFAULT now(),
  uploaded_by uuid NOT NULL REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_window_photos_window_id ON window_photos(window_id);
CREATE INDEX idx_window_photos_job_id ON window_photos(job_id);

ALTER TABLE window_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read photos"
  ON window_photos FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert photos"
  ON window_photos FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Owner or admin can delete photos"
  ON window_photos FOR DELETE
  USING (
    auth.uid() = uploaded_by
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Create storage bucket for window photos (run in Supabase dashboard if needed):
-- INSERT INTO storage.buckets (id, name, public) VALUES ('window-photos', 'window-photos', true);
