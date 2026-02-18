-- Migration 006: Hover reference columns, custom specs storage, and window spec fields table

-- 1. Add Hover reference columns to windows table
ALTER TABLE windows ADD COLUMN IF NOT EXISTS hover_label text;
ALTER TABLE windows ADD COLUMN IF NOT EXISTS hover_group text;

-- 2. Add custom specs JSON column for dynamic spec fields
ALTER TABLE windows ADD COLUMN IF NOT EXISTS custom_specs jsonb DEFAULT '{}';

-- 3. Create window_spec_fields table for admin-managed specs
CREATE TABLE IF NOT EXISTS window_spec_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  label text NOT NULL,
  field_type text NOT NULL DEFAULT 'dropdown',
  options jsonb DEFAULT '[]',
  sort_order int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  include_other boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Seed with current hardcoded spec fields
INSERT INTO window_spec_fields (name, label, field_type, options, sort_order, include_other) VALUES
  ('type', 'Window Type', 'dropdown', '["Single Hung","Double Hung","Slider","Picture","Casement","Round","Half-Round"]', 0, true),
  ('grid_style', 'Grid Style', 'dropdown', '["None","Colonial","Prairie","Perimeter"]', 1, true),
  ('temper', 'Temper', 'dropdown', '["None","Lower","Full"]', 2, true),
  ('screen', 'Screen', 'dropdown', '["None","Half","Full"]', 3, true),
  ('outside_color', 'Outside Color', 'text', '[]', 4, false),
  ('inside_color', 'Inside Color', 'text', '[]', 5, false)
ON CONFLICT (name) DO NOTHING;

-- 5. RLS for window_spec_fields
ALTER TABLE window_spec_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read spec fields"
  ON window_spec_fields FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage spec fields"
  ON window_spec_fields FOR ALL
  USING (is_admin());
