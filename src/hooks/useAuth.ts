import { useEffect, useState, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { fetchProfile } from '../lib/db';
import { UserProfile } from '../types';

const DEFAULT_PROFILE: Omit<UserProfile, 'id' | 'email'> = {
  name: 'User',
  avatarUrl: '',
  role: 'Researcher',
  plan: 'free',
  confidenceThresholdHideWeak: false,
  autoSaveHistory: true,
  modelStrictness: 'exact',
};

function deriveProfile(user: User | null, profile: UserProfile | null): UserProfile | null {
  if (!user) return null;
  if (profile) return profile;
  return {
    id: user.id,
    email: user.email || '',
    ...DEFAULT_PROFILE,
  };
}

export interface AuthState {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export function useAuth(): AuthState {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (user: User | null) => {
    if (!user) {
      setProfile(null);
      return;
    }
    try {
      const p = await fetchProfile(user.id);
      setProfile(p);
    } catch (err) {
      console.warn('[Iroko] Failed to load profile (table not applied yet?)', err);
      setProfile(null);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    await loadProfile(data.session?.user ?? null);
  }, [loadProfile]);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      await loadProfile(data.session?.user ?? null);
      if (mounted) setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      await loadProfile(newSession?.user ?? null);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
  }, []);

  return {
    session,
    user: session?.user ?? null,
    profile: deriveProfile(session?.user ?? null, profile),
    loading,
    isAuthenticated: Boolean(session),
    signOut,
    refreshProfile,
  };
}
