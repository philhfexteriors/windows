export const PERMISSIONS = [
  'jobs:create',
  'jobs:import',
  'jobs:approve',
  'jobs:delete',
  'measure:submit',
  'measure:start',
  'export:all',
  'admin:manage_users',
] as const;

export type Permission = (typeof PERMISSIONS)[number];
export type Role = 'salesperson' | 'field_tech' | 'admin';

export const ROLE_LABELS: Record<Role, string> = {
  salesperson: 'Salesperson',
  field_tech: 'Field Tech',
  admin: 'Admin',
};

export const PERMISSION_LABELS: Record<Permission, string> = {
  'jobs:create': 'Create Jobs',
  'jobs:import': 'Import Windows',
  'jobs:approve': 'Approve for Measurement',
  'jobs:delete': 'Delete Jobs & Windows',
  'measure:submit': 'Submit Measurements',
  'measure:start': 'Start Measuring',
  'export:all': 'Export (PDF, Sheets, CC)',
  'admin:manage_users': 'Manage Users & Permissions',
};

// Hardcoded fallback defaults (used before DB loads, and admin always gets all)
export const DEFAULT_ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  salesperson: ['jobs:create', 'jobs:import', 'jobs:approve', 'jobs:delete', 'export:all'],
  field_tech: ['measure:submit', 'measure:start', 'export:all'],
  admin: [...PERMISSIONS],
};

/**
 * Check if a role has a permission given a permission map.
 * Admin always has all permissions regardless of the map.
 */
export function can(
  role: Role,
  permission: Permission,
  permissionMap?: Record<Role, Permission[]>
): boolean {
  if (role === 'admin') return true;
  const map = permissionMap ?? DEFAULT_ROLE_PERMISSIONS;
  return map[role]?.includes(permission) ?? false;
}
