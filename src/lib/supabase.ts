import { createClient, RealtimeChannel } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface WindowRow {
  id: string;
  po_number: string;
  label: string | null;
  location: string;
  type: string;
  approx_width: string | null;
  approx_height: string | null;
  widths: number[];
  heights: number[];
  final_w: number | null;
  final_h: number | null;
  transom_shape: string | null;
  transom_height: number | null;
  style: string | null;
  grid_style: string | null;
  temper: string | null;
  outside_color: string | null;
  inside_color: string | null;
  screen: string | null;
  notes: string;
  status: 'pending' | 'measured';
  created_at: string;
  updated_at: string;
}

export type WindowInsert = Omit<WindowRow, 'id' | 'created_at' | 'updated_at'>;

export interface POSummary {
  po_number: string;
  total: number;
  measured: number;
  created_at: string;
}

export async function fetchAvailablePOs(): Promise<POSummary[]> {
  const { data, error } = await supabase
    .from('windows')
    .select('po_number, status, created_at')
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Group by PO number
  const poMap = new Map<string, POSummary>();
  for (const row of data) {
    const existing = poMap.get(row.po_number);
    if (existing) {
      existing.total++;
      if (row.status === 'measured') existing.measured++;
    } else {
      poMap.set(row.po_number, {
        po_number: row.po_number,
        total: 1,
        measured: row.status === 'measured' ? 1 : 0,
        created_at: row.created_at,
      });
    }
  }

  return Array.from(poMap.values());
}

export async function fetchWindows(poNumber: string): Promise<WindowRow[]> {
  const { data, error } = await supabase
    .from('windows')
    .select('*')
    .eq('po_number', poNumber)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data as WindowRow[];
}

export function subscribeToWindows(
  poNumber: string,
  onUpdate: () => void
): RealtimeChannel {
  return supabase
    .channel(`windows:${poNumber}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'windows',
        filter: `po_number=eq.${poNumber}`,
      },
      () => {
        onUpdate();
      }
    )
    .subscribe();
}

export async function addWindow(
  poNumber: string,
  data: Partial<Omit<WindowRow, 'id' | 'po_number' | 'created_at' | 'updated_at'>>
): Promise<WindowRow> {
  const { data: row, error } = await supabase
    .from('windows')
    .insert({
      po_number: poNumber,
      location: data.location || '',
      type: data.type || '',
      label: data.label || null,
      approx_width: data.approx_width || null,
      approx_height: data.approx_height || null,
      widths: data.widths || [],
      heights: data.heights || [],
      final_w: data.final_w ?? null,
      final_h: data.final_h ?? null,
      transom_shape: data.transom_shape || null,
      transom_height: data.transom_height ?? null,
      style: data.style || null,
      grid_style: data.grid_style || null,
      temper: data.temper || null,
      outside_color: data.outside_color || null,
      inside_color: data.inside_color || null,
      screen: data.screen || null,
      notes: data.notes || '',
      status: data.status || 'measured',
    })
    .select()
    .single();

  if (error) throw error;
  return row as WindowRow;
}

export async function updateWindow(
  id: string,
  data: Partial<Omit<WindowRow, 'id' | 'po_number' | 'created_at'>>
): Promise<WindowRow> {
  const { data: row, error } = await supabase
    .from('windows')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return row as WindowRow;
}

export async function removeWindow(id: string): Promise<void> {
  const { error } = await supabase
    .from('windows')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function bulkInsertWindows(
  poNumber: string,
  rows: Partial<Omit<WindowRow, 'id' | 'po_number' | 'created_at' | 'updated_at'>>[]
): Promise<WindowRow[]> {
  const inserts = rows.map((row) => ({
    po_number: poNumber,
    label: row.label || null,
    location: row.location || '',
    type: row.type || '',
    approx_width: row.approx_width || null,
    approx_height: row.approx_height || null,
    widths: row.widths || [],
    heights: row.heights || [],
    final_w: row.final_w ?? null,
    final_h: row.final_h ?? null,
    transom_shape: row.transom_shape || null,
    transom_height: row.transom_height ?? null,
    style: row.style || null,
    grid_style: row.grid_style || null,
    temper: row.temper || null,
    outside_color: row.outside_color || null,
    inside_color: row.inside_color || null,
    screen: row.screen || null,
    notes: row.notes || '',
    status: row.status || 'pending',
  }));

  const { data, error } = await supabase
    .from('windows')
    .insert(inserts)
    .select();

  if (error) throw error;
  return data as WindowRow[];
}
