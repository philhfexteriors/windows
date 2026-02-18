'use client';

import { useEffect, useState, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { Role, Permission } from './permissions';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: Role;
  created_at: string;
  updated_at: string;
}

export interface BaseAuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
}

export interface AuthState extends BaseAuthState {
  effectiveRole: Role;
  viewAsRole: Role | null;
  setViewAsRole: (role: Role | null) => void;
  can: (permission: Permission) => boolean;
  permissionsLoaded: boolean;
  reloadPermissions: () => Promise<void>;
}

export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      skipBrowserRedirect: true, // Get the URL instead of auto-redirecting (fixes mobile/PWA)
      queryParams: {
        hd: 'hfexteriors.com', // Restrict to HF Exteriors Google Workspace domain
      },
    },
  });
  if (error) throw error;
  if (data?.url) {
    // Manually redirect — bypasses service worker and mobile browser quirks
    window.location.href = data.url;
  } else {
    throw new Error('No OAuth URL returned from Supabase');
  }
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getSession(): Promise<Session | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) return null;
  return data as Profile;
}

export function useAuth(): BaseAuthState {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (userId: string) => {
    const p = await fetchProfile(userId);
    setProfile(p);
    return p;
  }, []);

  useEffect(() => {
    let didTimeout = false;

    // Safety timeout — never hang on the loading screen for more than 8 seconds
    const timeout = setTimeout(() => {
      didTimeout = true;
      setLoading(false);
    }, 8000);

    // Get initial session — await profile before clearing loading state
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      setSession(s);
      if (s?.user) {
        try {
          await loadProfile(s.user.id);
        } catch (err) {
          console.error('Failed to load profile:', err);
        }
      }
      if (!didTimeout) {
        clearTimeout(timeout);
        setLoading(false);
      }
    }).catch((err) => {
      console.error('getSession failed:', err);
      if (!didTimeout) {
        clearTimeout(timeout);
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, s) => {
        setSession(s);
        if (s?.user) {
          try {
            await loadProfile(s.user.id);
          } catch (err) {
            console.error('Failed to load profile on auth change:', err);
          }
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  return {
    session,
    user: session?.user ?? null,
    profile,
    loading,
  };
}
