// AuthProvider with React context for Supabase authentication
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User, AuthError } from '@supabase/supabase-js';
import { supabase } from './supabase';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;
    let subscription: { unsubscribe: () => void } | null = null;
    
    // Set a timeout to force loading to false after 1 second
    timeoutId = setTimeout(() => {
      if (mounted) {
        setLoading(false);
      }
    }, 1000);
    
    // Initialize auth state asynchronously
    const initAuth = async () => {
      try {
        // Get initial session with error handling
        const result = await supabase.auth.getSession();
        const { data, error } = result || { data: { session: null }, error: null };
        const session = data?.session || null;
        
        clearTimeout(timeoutId);
        if (!mounted) return;
        
        if (error) {
          console.error('Error getting session:', error);
          setLoading(false);
          return;
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Subscribe to auth state changes
        try {
          const subResult = supabase.auth.onAuthStateChange((_event, session) => {
            if (mounted) {
              setSession(session);
              setUser(session?.user ?? null);
              setLoading(false);
            }
          });
          subscription = subResult?.data?.subscription || null;
        } catch (subError) {
          console.error('Error setting up auth subscription:', subError);
        }
      } catch (error) {
        clearTimeout(timeoutId);
        console.error('Exception getting session:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    // Use setTimeout to defer initialization and prevent blocking
    const initTimer = setTimeout(() => {
      initAuth();
    }, 100);

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      clearTimeout(initTimer);
      if (subscription) {
        try {
          subscription.unsubscribe();
        } catch (e) {
          // Ignore unsubscribe errors
        }
      }
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value: AuthContextType = {
    session,
    user,
    loading,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

