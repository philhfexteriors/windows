-- Migration 007: Measurement History / Audit Trail
-- Tracks every re-measurement with previous values, user, and timestamp

CREATE TABLE IF NOT EXISTS measurement_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  window_id uuid NOT NULL REFERENCES windows(id) ON DELETE CASCADE,
  measured_by uuid REFERENCES profiles(id),
  widths decimal[] NOT NULL DEFAULT '{}',
  heights decimal[] NOT NULL DEFAULT '{}',
  final_w decimal,
  final_h decimal,
  transom_shape text,
  transom_height decimal,
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_measurement_history_window_id ON measurement_history(window_id);
CREATE INDEX idx_measurement_history_created_at ON measurement_history(created_at DESC);

ALTER TABLE measurement_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read measurement history"
  ON measurement_history FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert measurement history"
  ON measurement_history FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Add measured_by to windows table to track who last measured
ALTER TABLE windows ADD COLUMN IF NOT EXISTS measured_by uuid REFERENCES profiles(id);
