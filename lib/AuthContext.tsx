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
    let subscription: { unsubscribe: () => void } | null = null;
    
    // Initialize auth state asynchronously
    const initAuth = async () => {
      try {
        // Get initial session with error handling
        // App remains in loading state until this resolves
        const result = await supabase.auth.getSession();
        const { data, error } = result || { data: { session: null }, error: null };
        const session = data?.session || null;
        
        if (!mounted) return;
        
        if (error) {
          console.error('Error getting session:', error);
          setSession(null);
          setUser(null);
          setLoading(false);
          return;
        }
        
        // Set session and user state
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Subscribe to auth state changes
        // Note: loading is already false at this point, so we just update session/user
        try {
          const subResult = supabase.auth.onAuthStateChange((_event, session) => {
            if (mounted) {
              setSession(session);
              setUser(session?.user ?? null);
              // Loading is already false after initial session check
              // Auth state changes don't affect loading state
            }
          });
          subscription = subResult?.data?.subscription || null;
        } catch (subError) {
          console.error('Error setting up auth subscription:', subError);
          // Even if subscription fails, we've initialized the session
          if (mounted) {
            setLoading(false);
          }
        }
      } catch (error) {
        console.error('Exception getting session:', error);
        if (mounted) {
          setSession(null);
          setUser(null);
          setLoading(false);
        }
      }
    };

    // Initialize immediately - no artificial delay
    initAuth();

    return () => {
      mounted = false;
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
    // Explicitly clear session and user state after sign out
    setSession(null);
    setUser(null);
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

