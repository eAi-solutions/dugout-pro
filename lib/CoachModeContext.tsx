// CoachModeProvider with React context for Coach Mode state and PIN management
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from './supabase';
import { verifyCoachPin, hashCoachPin } from './coachPin';

interface CoachModeContextType {
  coachModeUnlocked: boolean;
  hasCoachPin: boolean;
  loadingCoachPin: boolean;
  coachPinHash: string | null;
  unlockCoachMode: (pin: string) => Promise<boolean>;
  lockCoachMode: () => void;
  setCoachPin: (pin: string) => Promise<void>;
  changeCoachPin: (currentPin: string, newPin: string) => Promise<boolean>;
  checkCoachPin: (pin: string) => Promise<boolean>;
}

const CoachModeContext = createContext<CoachModeContextType | undefined>(undefined);

export function useCoachMode() {
  const context = useContext(CoachModeContext);
  if (context === undefined) {
    throw new Error('useCoachMode must be used within a CoachModeProvider');
  }
  return context;
}

interface CoachModeProviderProps {
  children: ReactNode;
}

export function CoachModeProvider({ children }: CoachModeProviderProps) {
  const { user } = useAuth();
  const [coachModeUnlocked, setCoachModeUnlocked] = useState(false);
  const [hasCoachPin, setHasCoachPin] = useState(false);
  const [loadingCoachPin, setLoadingCoachPin] = useState(true);
  const [coachPinHash, setCoachPinHash] = useState<string | null>(null);

  /**
   * Internal helper: Fetches coach_pin_hash from Supabase profiles table
   * Single source of truth for all PIN hash reads
   * @param userId - The user ID to fetch the hash for
   * @returns Promise resolving to the hash string or null if not set/error
   * @throws Never throws - returns null on errors (fail locked)
   */
  const fetchCoachPinHash = async (userId: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('coach_pin_hash')
        .eq('id', userId)
        .single();

      if (error) {
        // Fail locked: treat errors as no PIN (secure default)
        console.error('Error fetching coach PIN hash:', error);
        return null;
      }

      return data?.coach_pin_hash || null;
    } catch (error) {
      // Fail locked: treat exceptions as no PIN (secure default)
      console.error('Exception fetching coach PIN hash:', error);
      return null;
    }
  };

  /**
   * Internal helper: Updates coach_pin_hash in Supabase profiles table
   * Single source of truth for all PIN hash writes
   * @param userId - The user ID to update the hash for
   * @param newHash - The new hash value to set
   * @param expectedCurrentHash - Optional: if provided, only update if current hash matches (optimistic locking)
   * @returns Promise resolving when update succeeds
   * @throws Error if update fails (caller must handle - never unlocks on error)
   */
  const updateCoachPinHash = async (
    userId: string,
    newHash: string,
    expectedCurrentHash?: string | null
  ): Promise<void> => {
    let query = supabase
      .from('profiles')
      .update({ coach_pin_hash: newHash })
      .eq('id', userId);

    // Optimistic locking: only update if hash matches expected value
    if (expectedCurrentHash !== undefined) {
      if (expectedCurrentHash === null) {
        query = query.is('coach_pin_hash', null);
      } else {
        query = query.eq('coach_pin_hash', expectedCurrentHash);
      }
    }

    const { error, data } = await query.select('coach_pin_hash').single();

    if (error) {
      throw new Error(`Failed to update Coach PIN: ${error.message}`);
    }

    // Verify the update succeeded
    if (!data?.coach_pin_hash || data.coach_pin_hash !== newHash) {
      throw new Error('Failed to verify Coach PIN was updated');
    }
  };

  // Fetch coach_pin_hash from public.profiles when user is authenticated
  useEffect(() => {
    const loadCoachPinHash = async () => {
      // Reset state when no user
      if (!user?.id) {
        setCoachPinHash(null);
        setHasCoachPin(false);
        setCoachModeUnlocked(false);
        setLoadingCoachPin(false);
        return;
      }

      try {
        setLoadingCoachPin(true);
        
        // Use internal helper for single source of truth
        const hash = await fetchCoachPinHash(user.id);
        
        setCoachPinHash(hash);
        setHasCoachPin(!!hash);

        // Always start locked on app load (session-only unlock state)
        setCoachModeUnlocked(false);
      } catch (error) {
        // Fail locked: treat errors as no PIN
        console.error('Exception loading coach PIN hash:', error);
        setCoachPinHash(null);
        setHasCoachPin(false);
        setCoachModeUnlocked(false);
      } finally {
        setLoadingCoachPin(false);
      }
    };

    loadCoachPinHash();
  }, [user?.id]);

  // Lock Coach Mode and clear PIN hash state on logout
  useEffect(() => {
    if (!user) {
      setCoachModeUnlocked(false);
      setCoachPinHash(null);
      setHasCoachPin(false);
    }
  }, [user]);

  const unlockCoachMode = async (pin: string): Promise<boolean> => {
    try {
      if (!coachPinHash) {
        return false; // No PIN set
      }
      
      const isValid = await verifyCoachPin(pin, coachPinHash);
      if (isValid) {
        // Session-only unlock state (not persisted)
        setCoachModeUnlocked(true);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error unlocking Coach Mode:', error);
      return false;
    }
  };

  const lockCoachMode = (): void => {
    // Session-only unlock state (not persisted)
    setCoachModeUnlocked(false);
  };

  const setCoachPin = async (pin: string): Promise<void> => {
    if (!user?.id) {
      throw new Error('User must be authenticated to set Coach PIN');
    }

    try {
      // CRITICAL: Re-fetch coach_pin_hash from Supabase right before writing
      // This prevents race conditions where two devices try to set PIN simultaneously
      const currentHash = await fetchCoachPinHash(user.id);

      // Refuse if PIN already exists (even if local state shows setup)
      if (currentHash) {
        throw new Error('Coach PIN is already set for this account');
      }

      // Hash the new PIN
      const pinHash = await hashCoachPin(pin);
      
      // Update coach_pin_hash in profiles table with optimistic locking
      // updateCoachPinHash verifies the write succeeded internally
      await updateCoachPinHash(user.id, pinHash, null);

      // Re-fetch to get the confirmed hash value
      const verifiedHash = await fetchCoachPinHash(user.id);
      if (!verifiedHash || verifiedHash !== pinHash) {
        throw new Error('Failed to verify Coach PIN was set');
      }

      // Update local state only after successful server write
      setCoachPinHash(verifiedHash);
      setHasCoachPin(true);
      // Auto-unlock after setting PIN (session-only)
      setCoachModeUnlocked(true);
    } catch (error) {
      // Fail locked: never unlock on errors
      console.error('Error setting Coach PIN:', error);
      throw error;
    }
  };

  const changeCoachPin = async (currentPin: string, newPin: string): Promise<boolean> => {
    if (!user?.id) {
      return false;
    }

    try {
      // CRITICAL: Fetch latest coach_pin_hash from Supabase before verification
      // This ensures we verify against the most current hash, not stale local state
      const latestHash = await fetchCoachPinHash(user.id);

      if (!latestHash) {
        console.error('No Coach PIN hash found');
        return false;
      }

      // Verify current PIN against the latest hash from Supabase
      const isValid = await verifyCoachPin(currentPin, latestHash);
      if (!isValid) {
        return false;
      }
      
      // Hash the new PIN
      const newPinHash = await hashCoachPin(newPin);
      
      // Update coach_pin_hash in profiles table with optimistic locking
      // updateCoachPinHash verifies the write succeeded internally
      await updateCoachPinHash(user.id, newPinHash, latestHash);

      // Re-fetch to get the confirmed hash value
      const verifiedHash = await fetchCoachPinHash(user.id);
      if (!verifiedHash || verifiedHash !== newPinHash) {
        console.error('Failed to verify Coach PIN was updated');
        return false;
      }

      // Update local state only after successful server write
      setCoachPinHash(verifiedHash);
      // Keep unlocked state (session-only)
      return true;
    } catch (error) {
      // Fail locked: never unlock on errors
      console.error('Error changing Coach PIN:', error);
      return false;
    }
  };

  const checkCoachPin = async (pin: string): Promise<boolean> => {
    try {
      if (!coachPinHash) {
        return false;
      }
      return await verifyCoachPin(pin, coachPinHash);
    } catch (error) {
      console.error('Error checking Coach PIN:', error);
      return false;
    }
  };

  const value: CoachModeContextType = {
    coachModeUnlocked,
    hasCoachPin,
    loadingCoachPin,
    coachPinHash,
    unlockCoachMode,
    lockCoachMode,
    setCoachPin,
    changeCoachPin,
    checkCoachPin,
  };

  return <CoachModeContext.Provider value={value}>{children}</CoachModeContext.Provider>;
}

