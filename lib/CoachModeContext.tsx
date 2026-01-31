// CoachModeProvider with React context for Coach Mode state and PIN management
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const COACH_PIN_HASH_KEY = 'coach_pin_hash';
const COACH_MODE_UNLOCKED_KEY = 'coachModeUnlocked';

// Platform-specific storage abstraction
// Uses localStorage on web, AsyncStorage on native
const storage = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      // Use localStorage on web
      try {
        return localStorage.getItem(key);
      } catch (error) {
        console.error('Error reading from localStorage:', error);
        return null;
      }
    } else {
      // Use AsyncStorage on native
      try {
        return await AsyncStorage.getItem(key);
      } catch (error) {
        console.error('Error reading from AsyncStorage:', error);
        return null;
      }
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      // Use localStorage on web
      try {
        localStorage.setItem(key, value);
      } catch (error) {
        console.error('Error writing to localStorage:', error);
        throw error;
      }
    } else {
      // Use AsyncStorage on native
      try {
        await AsyncStorage.setItem(key, value);
      } catch (error) {
        console.error('Error writing to AsyncStorage:', error);
        throw error;
      }
    }
  },
};

// Simple hash function for PIN (using a basic algorithm that works in React Native)
// In production, consider using a proper crypto library
async function hashPin(pin: string): Promise<string> {
  // Use Web Crypto API if available (web), otherwise use a simple hash
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(pin);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  // Fallback: simple hash for React Native (not cryptographically secure but better than plaintext)
  let hash = 0;
  for (let i = 0; i < pin.length; i++) {
    const char = pin.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  // Add salt and convert to hex-like string
  const salt = 'coach_mode_salt_2024';
  let saltedHash = 0;
  for (let i = 0; i < (pin + salt).length; i++) {
    const char = (pin + salt).charCodeAt(i);
    saltedHash = ((saltedHash << 5) - saltedHash) + char;
    saltedHash = saltedHash & saltedHash;
  }
  return Math.abs(saltedHash).toString(16).padStart(16, '0');
}

interface CoachModeContextType {
  coachModeUnlocked: boolean;
  hasCoachPin: boolean;
  unlockCoachMode: (pin: string) => Promise<boolean>;
  lockCoachMode: () => Promise<void>;
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
  const [coachModeUnlocked, setCoachModeUnlocked] = useState(false);
  const [hasCoachPin, setHasCoachPin] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load initial state from platform-specific storage
  // Coach Mode always starts locked on app launch (session-based security)
  useEffect(() => {
    const loadState = async () => {
      try {
        // Only load PIN hash to check if PIN exists
        // Always start locked regardless of stored state
        const pinHash = await storage.getItem(COACH_PIN_HASH_KEY);
        
        // Force locked state on startup (ignore stored unlocked state)
        setCoachModeUnlocked(false);
        setHasCoachPin(!!pinHash);
        
        // Clear stored unlocked state to keep storage clean
        await storage.setItem(COACH_MODE_UNLOCKED_KEY, 'false');
      } catch (error) {
        console.error('Error loading Coach Mode state:', error);
        // Ensure locked state even on error
        setCoachModeUnlocked(false);
      } finally {
        setLoading(false);
      }
    };

    loadState();
  }, []);

  // Note: CoachModeProvider is only mounted when user is authenticated
  // When user logs out, this component unmounts, so no need to watch for user changes
  // Coach Mode state is automatically reset on unmount and will be locked on next mount

  const unlockCoachMode = async (pin: string): Promise<boolean> => {
    try {
      const storedPinHash = await storage.getItem(COACH_PIN_HASH_KEY);
      if (!storedPinHash) {
        return false; // No PIN set
      }
      
      const pinHash = await hashPin(pin);
      if (storedPinHash === pinHash) {
        await storage.setItem(COACH_MODE_UNLOCKED_KEY, 'true');
        setCoachModeUnlocked(true);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error unlocking Coach Mode:', error);
      return false;
    }
  };

  const lockCoachMode = async (): Promise<void> => {
    try {
      await storage.setItem(COACH_MODE_UNLOCKED_KEY, 'false');
      setCoachModeUnlocked(false);
    } catch (error) {
      console.error('Error locking Coach Mode:', error);
    }
  };

  const setCoachPin = async (pin: string): Promise<void> => {
    try {
      if (pin.length < 4 || pin.length > 8) {
        throw new Error('PIN must be between 4 and 8 digits');
      }
      const pinHash = await hashPin(pin);
      await storage.setItem(COACH_PIN_HASH_KEY, pinHash);
      setHasCoachPin(true);
      // Auto-unlock after setting PIN
      await storage.setItem(COACH_MODE_UNLOCKED_KEY, 'true');
      setCoachModeUnlocked(true);
    } catch (error) {
      console.error('Error setting Coach PIN:', error);
      throw error;
    }
  };

  const changeCoachPin = async (currentPin: string, newPin: string): Promise<boolean> => {
    try {
      // Verify current PIN first
      const isValid = await checkCoachPin(currentPin);
      if (!isValid) {
        return false;
      }
      
      // Set new PIN
      if (newPin.length < 4 || newPin.length > 8) {
        throw new Error('PIN must be between 4 and 8 digits');
      }
      const pinHash = await hashPin(newPin);
      await storage.setItem(COACH_PIN_HASH_KEY, pinHash);
      // Keep unlocked state
      return true;
    } catch (error) {
      console.error('Error changing Coach PIN:', error);
      return false;
    }
  };

  const checkCoachPin = async (pin: string): Promise<boolean> => {
    try {
      const storedPinHash = await storage.getItem(COACH_PIN_HASH_KEY);
      if (!storedPinHash) {
        return false;
      }
      const pinHash = await hashPin(pin);
      return storedPinHash === pinHash;
    } catch (error) {
      console.error('Error checking Coach PIN:', error);
      return false;
    }
  };

  const value: CoachModeContextType = {
    coachModeUnlocked,
    hasCoachPin,
    unlockCoachMode,
    lockCoachMode,
    setCoachPin,
    changeCoachPin,
    checkCoachPin,
  };

  return <CoachModeContext.Provider value={value}>{children}</CoachModeContext.Provider>;
}

