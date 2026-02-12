-- Window Measurement App - Supabase Schema
-- Run this in the Supabase SQL Editor after creating your project

-- Window measurements organized by PO number
create table windows (
  id uuid primary key default gen_random_uuid(),
  po_number text not null,
  label text,                              -- from spreadsheet col A (e.g., "221")
  location text not null default '',
  type text not null default '',

  -- Approximate values from spreadsheet (reference only, not editable by tech)
  approx_width text,                       -- e.g., "33"
  approx_height text,                      -- e.g., "54 Right, 45 Left"

  -- Precise measurements from field tech (1/8" precision)
  widths decimal[] not null default '{}',
  heights decimal[] not null default '{}',
  final_w decimal,                         -- nullable: null = not yet measured
  final_h decimal,

  -- Transom
  transom_shape text,
  transom_height decimal,

  -- Spreadsheet fields (stored, shown as secondary info)
  style text,                              -- col F: "See Pics", "Half Round"
  grid_style text,                         -- col G: "None", "Colonial", "Prairie", "Perimeter"
  temper text,                             -- col H: "None", "Lower", "Full"
  outside_color text,                      -- col I
  inside_color text,                       -- col J
  screen text,                             -- col K: "None", "Half", "Full"

  notes text default '',
  status text not null default 'pending',  -- 'pending' | 'measured'
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index for fast PO lookups
create index idx_windows_po_number on windows(po_number);

-- Enable realtime
alter publication supabase_realtime add table windows;

-- RLS: allow all operations for now (no auth — anonymous access like Firebase)
alter table windows enable row level security;
create policy "Allow all access" on windows for all using (true) with check (true);
