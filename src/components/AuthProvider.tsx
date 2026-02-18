'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode, Suspense } from 'react';
import { useAuth, signOut, type AuthState } from '@/lib/auth';
import { fetchRolePermissions } from '@/lib/supabase';
import { can as canCheck, DEFAULT_ROLE_PERMISSIONS, PERMISSIONS } from '@/lib/permissions';
import type { Role, Permission } from '@/lib/permissions';
import LoginPage from './LoginPage';

const VIEW_AS_KEY = 'hf_view_as_role';

const defaultAuthState: AuthState = {
  session: null,
  user: null,
  profile: null,
  loading: true,
  effectiveRole: 'salesperson',
  viewAsRole: null,
  setViewAsRole: () => {},
  can: () => false,
  permissionsLoaded: false,
  reloadPermissions: async () => {},
};

const AuthContext = createContext<AuthState>(defaultAuthState);

export function useAuthContext() {
  return useContext(AuthContext);
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();

  // View-as state (admin preview)
  const [viewAsRole, setViewAsRoleState] = useState<Role | null>(null);

  // DB-loaded permissions map
  const [permissionMap, setPermissionMap] = useState<Record<Role, Permission[]>>(
    DEFAULT_ROLE_PERMISSIONS
  );
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);

  // Initialize viewAsRole from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(VIEW_AS_KEY);
      if (stored && (stored === 'salesperson' || stored === 'field_tech' || stored === 'admin')) {
        setViewAsRoleState(stored as Role);
      }
    } catch {
      // localStorage not available
    }
  }, []);

  const setViewAsRole = useCallback(
    (role: Role | null) => {
      // Only admins can use view-as
      if (auth.profile?.role !== 'admin') return;
      setViewAsRoleState(role);
      try {
        if (role) {
          localStorage.setItem(VIEW_AS_KEY, role);
        } else {
          localStorage.removeItem(VIEW_AS_KEY);
        }
      } catch {
        // localStorage not available
      }
    },
    [auth.profile?.role]
  );

  // Load permissions from DB
  const loadPermissions = useCallback(async () => {
    try {
      const rows = await fetchRolePermissions();
      const map: Record<Role, Permission[]> = {
        salesperson: [],
        field_tech: [],
        admin: [...PERMISSIONS], // Admin always gets all
      };
      for (const row of rows) {
        const role = row.role as Role;
        const perm = row.permission as Permission;
        if (role !== 'admin' && row.granted && PERMISSIONS.includes(perm)) {
          map[role].push(perm);
        }
      }
      setPermissionMap(map);
      setPermissionsLoaded(true);
    } catch (err) {
      console.error('Failed to load role permissions:', err);
      // Fall back to defaults
      setPermissionMap(DEFAULT_ROLE_PERMISSIONS);
      setPermissionsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (auth.session) {
      loadPermissions();
    }
  }, [auth.session, loadPermissions]);

  // Compute effective role
  const effectiveRole: Role =
    auth.profile?.role === 'admin' && viewAsRole ? viewAsRole : (auth.profile?.role ?? 'salesperson');

  // Permission check using effective role and DB-loaded map
  const can = useCallback(
    (permission: Permission): boolean => {
      // Real admin always has all permissions, even when viewing as another role
      // But for UI preview purposes, we check against the effective role
      return canCheck(effectiveRole, permission, permissionMap);
    },
    [effectiveRole, permissionMap]
  );

  // Show loading spinner while checking auth
  if (auth.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-white font-bold text-lg mx-auto mb-4">
            H&F
          </div>
          <div className="animate-pulse text-gray-500 text-sm">Loading...</div>
        </div>
      </div>
    );
  }

  // Show login if not authenticated
  if (!auth.session) {
    return (
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-background"><div className="animate-pulse text-gray-500 text-sm">Loading...</div></div>}>
        <LoginPage />
      </Suspense>
    );
  }

  // Validate domain (defense in depth - Google OAuth hd param is the primary check)
  const email = auth.user?.email;
  if (email && !email.endsWith('@hfexteriors.com')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 rounded-xl bg-red-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Access Restricted</h2>
          <p className="text-sm text-gray-600 mb-6">
            This app is only available to @hfexteriors.com accounts. Please sign in with your HF Exteriors email.
          </p>
          <button
            onClick={() => signOut()}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  const value: AuthState = {
    ...auth,
    effectiveRole,
    viewAsRole,
    setViewAsRole,
    can,
    permissionsLoaded,
    reloadPermissions: loadPermissions,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
