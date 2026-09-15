import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  company_name: string;
  role: string;
  phone?: string;
  company_id?: string;
}

interface SignUpData {
  fullName: string;
  companyName: string;
  role?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
    data: SignUpData,
  ) => Promise<{ error: string | null; needsEmailConfirmation?: boolean }>;
  signOut: () => Promise<{ error: string | null }>;
  resetPassword: (email: string) => Promise<{ error: string | null; successMessage?: string }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (currentUser: User): Promise<UserProfile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .maybeSingle();

      if (!error && data) {
        return {
          id: data.id,
          email: data.email || currentUser.email || '',
          full_name: data.full_name || currentUser.user_metadata?.full_name || '',
          company_name: data.company_name || currentUser.user_metadata?.company_name || '',
          role: data.role || currentUser.user_metadata?.role || 'HVAC_ESTIMATOR',
          phone: data.phone || '',
          company_id: data.company_id,
        };
      }
    } catch {
      // Profiles table might not be migrated yet; fallback to user metadata
    }

    // Fallback to user metadata
    return {
      id: currentUser.id,
      email: currentUser.email || '',
      full_name:
        currentUser.user_metadata?.full_name ||
        currentUser.email?.split('@')[0] ||
        'HVAC Engineer',
      company_name: currentUser.user_metadata?.company_name || 'Engineering Workbench',
      role: currentUser.user_metadata?.role || 'HVAC_ESTIMATOR',
    };
  };

  useEffect(() => {
    let mounted = true;

    async function initSession() {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.warn('[Supabase Auth] getSession error:', error.message);
        }
        if (mounted) {
          setSession(data.session);
          setUser(data.session?.user ?? null);
          if (data.session?.user) {
            const p = await fetchProfile(data.session.user);
            if (mounted) setProfile(p);
          } else {
            setProfile(null);
          }
        }
      } catch (err) {
        console.error('[Supabase Auth] Initialization failed:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    initSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!mounted) return;
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        const p = await fetchProfile(newSession.user);
        if (mounted) setProfile(p);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const refreshProfile = async () => {
    if (user) {
      const p = await fetchProfile(user);
      setProfile(p);
    }
  };

  const friendlyError = (err: any): string => {
    if (!err) return 'An unknown error occurred.';
    const msg = typeof err === 'string' ? err : err.message || '';
    if (msg.includes('Invalid login credentials')) {
      return 'Incorrect email or password. Please verify your credentials.';
    }
    if (msg.includes('Email not confirmed')) {
      return 'Your email has not been verified yet. Please check your inbox for the confirmation link.';
    }
    if (msg.includes('User already registered')) {
      return 'An account with this email address already exists. Try signing in instead.';
    }
    if (msg.includes('Password should be at least')) {
      return 'Password must be at least 6 characters long.';
    }
    if (msg.includes('NetworkError') || msg.includes('fetch')) {
      return 'Network connection issue. Please check your internet connection.';
    }
    return msg;
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        return { error: friendlyError(error) };
      }

      setSession(data.session);
      setUser(data.user);
      if (data.user) {
        const p = await fetchProfile(data.user);
        setProfile(p);
      }
      return { error: null };
    } catch (err) {
      return { error: friendlyError(err) };
    }
  };

  const signUp = async (email: string, password: string, data: SignUpData) => {
    try {
      const { data: authData, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: data.fullName.trim(),
            company_name: data.companyName.trim(),
            role: data.role || 'HVAC_ESTIMATOR',
          },
        },
      });

      if (error) {
        return { error: friendlyError(error) };
      }

      // If Supabase has email confirmation enabled, session will be null
      const needsEmailConfirmation = !authData.session;

      if (authData.user) {
        // Attempt to create profile directly in case trigger hasn't run or table exists
        try {
          await supabase.from('profiles').upsert({
            id: authData.user.id,
            email: authData.user.email,
            full_name: data.fullName.trim(),
            company_name: data.companyName.trim(),
            role: data.role || 'HVAC_ESTIMATOR',
            updated_at: new Date().toISOString(),
          });
        } catch {
          // Ignore if profiles table is not yet created
        }

        if (authData.session) {
          setSession(authData.session);
          setUser(authData.user);
          const p = await fetchProfile(authData.user);
          setProfile(p);
        }
      }

      return { error: null, needsEmailConfirmation };
    } catch (err) {
      return { error: friendlyError(err) };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setProfile(null);
      if (error) {
        return { error: friendlyError(error) };
      }
      return { error: null };
    } catch (err) {
      return { error: friendlyError(err) };
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/settings`,
      });

      if (error) {
        return { error: friendlyError(error) };
      }
      return {
        error: null,
        successMessage: 'Password reset link sent! Check your email inbox.',
      };
    } catch (err) {
      return { error: friendlyError(err) };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        signIn,
        signUp,
        signOut,
        resetPassword,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
