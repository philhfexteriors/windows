import { createBrowserClient } from '@supabase/ssr';
import { RealtimeChannel } from '@supabase/supabase-js';
import type { Profile } from './auth';
import type { Role, Permission } from './permissions';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

// ===== JOB TYPES =====

export type JobStatus = 'draft' | 'windows_imported' | 'configured' | 'approved' | 'measuring' | 'complete';

export interface Job {
  id: string;
  created_by: string;
  assigned_to: string | null;
  po_number: string;
  client_name: string | null;
  client_address: string | null;
  client_city: string | null;
  client_state: string | null;
  client_zip: string | null;
  cc_project_id: string | null;
  cc_project_number: string | null;
  hover_job_id: number | null;
  hover_model_ids: { id: number; name: string; state: string }[] | null;
  status: JobStatus;
  approved_at: string | null;
  approved_by: string | null;
  completed_at: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

export type JobInsert = Omit<Job, 'id' | 'created_at' | 'updated_at' | 'approved_at' | 'approved_by' | 'completed_at'>;

export interface JobWithCounts extends Job {
  total_windows: number;
  measured_windows: number;
}

// ===== WINDOW TYPES =====

export interface WindowRow {
  id: string;
  po_number: string;
  job_id: string | null;
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

export interface DashboardStats {
  totalJobs: number;
  pendingWindows: number;
  measuredWindows: number;
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const { data, error } = await supabase
    .from('windows')
    .select('po_number, status');

  if (error) throw error;

  const poNumbers = new Set<string>();
  let pending = 0;
  let measured = 0;

  for (const row of data) {
    poNumbers.add(row.po_number);
    if (row.status === 'measured') measured++;
    else pending++;
  }

  return {
    totalJobs: poNumbers.size,
    pendingWindows: pending,
    measuredWindows: measured,
  };
}

export async function fetchRecentMeasurements(limit = 10): Promise<WindowRow[]> {
  const { data, error } = await supabase
    .from('windows')
    .select('*')
    .eq('status', 'measured')
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data as WindowRow[];
}

export async function bulkInsertWindows(
  poNumber: string,
  rows: Partial<Omit<WindowRow, 'id' | 'po_number' | 'created_at' | 'updated_at'>>[],
  jobId?: string
): Promise<WindowRow[]> {
  const inserts = rows.map((row) => ({
    po_number: poNumber,
    job_id: jobId || row.job_id || null,
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

// ===== JOB FUNCTIONS =====

export async function fetchJobs(statusFilter?: JobStatus): Promise<JobWithCounts[]> {
  let query = supabase
    .from('jobs')
    .select('*')
    .order('created_at', { ascending: false });

  if (statusFilter) {
    query = query.eq('status', statusFilter);
  }

  const { data: jobs, error } = await query;
  if (error) throw error;

  // Fetch window counts for each job
  const jobIds = (jobs as Job[]).map((j) => j.id);
  if (jobIds.length === 0) return [];

  const { data: windows, error: wError } = await supabase
    .from('windows')
    .select('job_id, status')
    .in('job_id', jobIds);

  if (wError) throw wError;

  const countMap = new Map<string, { total: number; measured: number }>();
  for (const w of windows || []) {
    const existing = countMap.get(w.job_id) || { total: 0, measured: 0 };
    existing.total++;
    if (w.status === 'measured') existing.measured++;
    countMap.set(w.job_id, existing);
  }

  return (jobs as Job[]).map((j) => ({
    ...j,
    total_windows: countMap.get(j.id)?.total || 0,
    measured_windows: countMap.get(j.id)?.measured || 0,
  }));
}

export async function fetchJob(id: string): Promise<Job> {
  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as Job;
}

export async function createJob(
  data: Partial<Omit<Job, 'id' | 'created_at' | 'updated_at'>>
): Promise<Job> {
  const { data: job, error } = await supabase
    .from('jobs')
    .insert({
      created_by: data.created_by!,
      po_number: data.po_number!,
      client_name: data.client_name || null,
      client_address: data.client_address || null,
      client_city: data.client_city || null,
      client_state: data.client_state || null,
      client_zip: data.client_zip || null,
      cc_project_id: data.cc_project_id || null,
      cc_project_number: data.cc_project_number || null,
      hover_job_id: data.hover_job_id || null,
      hover_model_ids: data.hover_model_ids || null,
      status: data.status || 'draft',
      notes: data.notes || '',
    })
    .select()
    .single();

  if (error) throw error;
  return job as Job;
}

export async function updateJob(
  id: string,
  data: Partial<Omit<Job, 'id' | 'created_by' | 'created_at'>>
): Promise<Job> {
  const { data: job, error } = await supabase
    .from('jobs')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return job as Job;
}

export async function deleteJob(id: string): Promise<void> {
  const { error } = await supabase.from('jobs').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchWindowsByJobId(jobId: string): Promise<WindowRow[]> {
  const { data, error } = await supabase
    .from('windows')
    .select('*')
    .eq('job_id', jobId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data as WindowRow[];
}

export async function deleteWindowsByJobId(jobId: string): Promise<void> {
  const { error } = await supabase
    .from('windows')
    .delete()
    .eq('job_id', jobId);

  if (error) throw error;
}

export async function addJobActivity(
  jobId: string,
  userId: string,
  action: string,
  details?: Record<string, unknown>
): Promise<void> {
  const { error } = await supabase
    .from('job_activity')
    .insert({ job_id: jobId, user_id: userId, action, details: details || null });

  if (error) throw error;
}

export function subscribeToJob(
  jobId: string,
  onUpdate: () => void
): RealtimeChannel {
  return supabase
    .channel(`job:${jobId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'jobs', filter: `id=eq.${jobId}` },
      () => onUpdate()
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'windows', filter: `job_id=eq.${jobId}` },
      () => onUpdate()
    )
    .subscribe();
}

// ===== ADMIN / RBAC FUNCTIONS =====

export interface RolePermissionRow {
  id: string;
  role: string;
  permission: string;
  granted: boolean;
  updated_at: string;
  updated_by: string | null;
}

export async function fetchAllProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('full_name', { ascending: true });

  if (error) throw error;
  return data as Profile[];
}

export async function updateProfileRole(
  userId: string,
  role: Role
): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ role, updated_at: new Date().toISOString() })
    .eq('id', userId);

  if (error) throw error;
}

export async function fetchRolePermissions(): Promise<RolePermissionRow[]> {
  const { data, error } = await supabase
    .from('role_permissions')
    .select('*');

  if (error) throw error;
  return data as RolePermissionRow[];
}

export async function upsertRolePermission(
  role: Role,
  permission: Permission,
  granted: boolean
): Promise<void> {
  if (granted) {
    // Insert the permission row (granted=true)
    const { error } = await supabase
      .from('role_permissions')
      .upsert(
        { role, permission, granted: true, updated_at: new Date().toISOString() },
        { onConflict: 'role,permission' }
      );
    if (error) throw error;
  } else {
    // Remove the permission row
    const { error } = await supabase
      .from('role_permissions')
      .delete()
      .eq('role', role)
      .eq('permission', permission);
    if (error) throw error;
  }
}
