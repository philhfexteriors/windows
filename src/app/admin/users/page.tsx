'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import { useAuthContext } from '@/components/AuthProvider';
import type { Profile } from '@/lib/auth';
import {
  fetchAllProfiles,
  updateProfileRole,
  fetchRolePermissions,
  upsertRolePermission,
  type RolePermissionRow,
} from '@/lib/supabase';
import {
  PERMISSIONS,
  PERMISSION_LABELS,
  ROLE_LABELS,
  type Role,
  type Permission,
} from '@/lib/permissions';

const EDITABLE_ROLES: Role[] = ['salesperson', 'field_tech'];
const ALL_ROLES: Role[] = ['salesperson', 'field_tech', 'admin'];

export default function AdminUsersPage() {
  const { profile, reloadPermissions } = useAuthContext();

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [permissions, setPermissions] = useState<RolePermissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingRole, setSavingRole] = useState<string | null>(null);
  const [savingPerm, setSavingPerm] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [p, perms] = await Promise.all([
        fetchAllProfiles(),
        fetchRolePermissions(),
      ]);
      setProfiles(p);
      setPermissions(perms);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Only real admins can access this page
  if (profile?.role !== 'admin') {
    return (
      <AppShell>
        <div className="max-w-2xl mx-auto text-center py-12">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Admin Access Required</h2>
          <p className="text-sm text-gray-500 mb-4">Only administrators can access this page.</p>
          <Link href="/" className="text-sm text-primary hover:underline">Back to Dashboard</Link>
        </div>
      </AppShell>
    );
  }

  const handleRoleChange = async (userId: string, newRole: Role) => {
    // Prevent admin from demoting themselves
    if (userId === profile.id) {
      alert("You can't change your own role.");
      return;
    }

    setSavingRole(userId);
    try {
      await updateProfileRole(userId, newRole);
      setProfiles((prev) =>
        prev.map((p) => (p.id === userId ? { ...p, role: newRole } : p))
      );
    } catch (err) {
      console.error('Failed to update role:', err);
      alert('Failed to update role. Please try again.');
    } finally {
      setSavingRole(null);
    }
  };

  const hasPermission = (role: Role, permission: Permission): boolean => {
    if (role === 'admin') return true;
    return permissions.some(
      (p) => p.role === role && p.permission === permission && p.granted
    );
  };

  const handlePermissionToggle = async (role: Role, permission: Permission) => {
    if (role === 'admin') return; // Admin always has all

    const key = `${role}:${permission}`;
    setSavingPerm(key);

    const currentlyGranted = hasPermission(role, permission);
    const newGranted = !currentlyGranted;

    try {
      await upsertRolePermission(role, permission, newGranted);

      // Update local state
      if (newGranted) {
        setPermissions((prev) => [
          ...prev.filter((p) => !(p.role === role && p.permission === permission)),
          { id: '', role, permission, granted: true, updated_at: new Date().toISOString(), updated_by: profile.id },
        ]);
      } else {
        setPermissions((prev) =>
          prev.filter((p) => !(p.role === role && p.permission === permission))
        );
      }

      // Reload permissions in auth context so UI updates everywhere
      await reloadPermissions();
    } catch (err) {
      console.error('Failed to update permission:', err);
      alert('Failed to update permission. Please try again.');
    } finally {
      setSavingPerm(null);
    }
  };

  if (loading) {
    return (
      <AppShell>
        <div className="text-center py-12 text-gray-500">Loading...</div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="text-sm text-gray-500 hover:text-gray-700 mb-4 inline-flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Dashboard
        </Link>

        <h1 className="text-xl font-bold text-gray-900 mb-6">Admin Settings</h1>

        {/* Section A: User Management */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Team Members</h2>
          <div className="space-y-3">
            {profiles.map((p) => (
              <div key={p.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl">
                {p.avatar_url ? (
                  <img src={p.avatar_url} alt="" className="w-10 h-10 rounded-full" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600">
                    {(p.full_name || p.email).charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {p.full_name || 'No name'}
                    {p.id === profile.id && (
                      <span className="ml-2 text-xs text-gray-400">(you)</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{p.email}</p>
                </div>
                <select
                  value={p.role}
                  onChange={(e) => handleRoleChange(p.id, e.target.value as Role)}
                  disabled={savingRole === p.id || p.id === profile.id}
                  className={`text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-primary ${
                    p.id === profile.id ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {ALL_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>

        {/* Section B: Permissions Grid */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Role Permissions</h2>
          <p className="text-sm text-gray-500 mb-4">
            Configure what each role can do. Admin always has all permissions.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 pr-4 font-medium text-gray-700">Permission</th>
                  {ALL_ROLES.map((role) => (
                    <th key={role} className="text-center py-3 px-4 font-medium text-gray-700">
                      {ROLE_LABELS[role]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PERMISSIONS.filter((p) => p !== 'admin:manage_users').map((permission) => (
                  <tr key={permission} className="border-b border-gray-100 last:border-0">
                    <td className="py-3 pr-4 text-gray-700">{PERMISSION_LABELS[permission]}</td>
                    {ALL_ROLES.map((role) => {
                      const isAdmin = role === 'admin';
                      const granted = hasPermission(role, permission);
                      const key = `${role}:${permission}`;
                      const isSaving = savingPerm === key;

                      return (
                        <td key={role} className="text-center py-3 px-4">
                          <label className="inline-flex items-center justify-center">
                            <input
                              type="checkbox"
                              checked={granted}
                              onChange={() => handlePermissionToggle(role, permission)}
                              disabled={isAdmin || isSaving}
                              className={`w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary ${
                                isAdmin ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                              } ${isSaving ? 'animate-pulse' : ''}`}
                            />
                          </label>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
