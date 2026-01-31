// Supabase client configuration for Expo/React Native
import 'react-native-url-polyfill/auto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Get Supabase URL from Expo environment variables
const getSupabaseUrl = (): string => {
  return process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
};

// Get Supabase anon key from Expo environment variables
const getSupabaseAnonKey = (): string => {
  return process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';
};

// Initialize Supabase client - use try/catch to prevent crashes
let supabaseInstance: SupabaseClient;

try {
  const supabaseUrl = getSupabaseUrl();
  const supabaseAnonKey = getSupabaseAnonKey();

  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: Platform.OS === 'web' ? undefined : AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: Platform.OS === 'web',
    },
  });
} catch (error) {
  console.error('Failed to initialize Supabase:', error);
  // Create a minimal fallback client
  supabaseInstance = createClient(
    'https://placeholder.supabase.co',
    'placeholder-key',
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    }
  );
}

export const supabase = supabaseInstance;

