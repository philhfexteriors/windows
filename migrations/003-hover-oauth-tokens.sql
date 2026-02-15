-- Migration: Store Hover OAuth tokens
-- Run this in the Supabase SQL editor

CREATE TABLE IF NOT EXISTS hover_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Only one active token set needed (org-wide)
-- RLS: only authenticated users can read/write
ALTER TABLE hover_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read hover tokens" ON hover_tokens FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can insert hover tokens" ON hover_tokens FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update hover tokens" ON hover_tokens FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete hover tokens" ON hover_tokens FOR DELETE USING (auth.uid() IS NOT NULL);
