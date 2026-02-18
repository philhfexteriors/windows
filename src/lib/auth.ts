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
      skipBrowserRedirect: true,
      queryParams: {
        hd: 'hfexteriors.com',
      },
    },
  });
  if (error) throw error;
  if (data?.url) {
    window.location.assign(data.url);
  } else {
    throw new Error('Sign-in failed — no redirect URL received.');
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

  // Load profile whenever session changes
  useEffect(() => {
    if (session?.user) {
      fetchProfile(session.user.id).then((p) => setProfile(p)).catch(() => {});
    } else {
      setProfile(null);
    }
  }, [session]);

  // Determine session on mount
  useEffect(() => {
    let cancelled = false;

    // Safety timeout — never hang on loading
    const timeout = setTimeout(() => { if (!cancelled) setLoading(false); }, 3000);

    supabase.auth.getSession()
      .then(({ data: { session: s } }) => {
        if (!cancelled) {
          setSession(s);
          setLoading(false);
        }
      })
      .catch(() => {
        // AbortError from React 19 strict mode is expected
        if (!cancelled) setLoading(false);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, s) => {
        if (!cancelled) {
          setSession(s);
          setLoading(false);
        }
      }
    );

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  return {
    session,
    user: session?.user ?? null,
    profile,
    loading,
  };
}
