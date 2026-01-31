/**
 * Coach Mode PIN utilities
 * 
 * Provides secure PIN validation and hashing using SHA-256.
 * Never stores or logs plaintext PINs.
 */

import { Platform } from 'react-native';

/**
 * Validates that a PIN is numeric and between 4-8 digits
 * @param pin - The PIN string to validate
 * @returns true if valid, false otherwise
 */
export function isValidCoachPin(pin: string): boolean {
  // Must be numeric only (digits 0-9)
  // Must be between 4 and 8 digits inclusive
  return /^\d{4,8}$/.test(pin);
}

/**
 * Hashes a PIN using SHA-256
 * Uses Web Crypto API on web, compatible fallback for native
 * @param pin - The plaintext PIN to hash (will be validated)
 * @returns Promise resolving to hex-encoded SHA-256 hash
 * @throws Error if PIN is invalid
 */
export async function hashCoachPin(pin: string): Promise<string> {
  // Validate PIN before hashing
  if (!isValidCoachPin(pin)) {
    throw new Error('PIN must be numeric and between 4-8 digits');
  }

  // Use Web Crypto API if available (web platforms)
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(pin);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Fallback for React Native: use expo-crypto if available
  // Note: This requires expo-crypto to be installed for native platforms
  // For web, Web Crypto API should always be available
  if (Platform.OS !== 'web') {
    try {
      // Try to use expo-crypto if available
      const { digest } = require('expo-crypto');
      const hash = await digest('SHA256', pin);
      return hash;
    } catch (error) {
      // If expo-crypto is not available, throw an error
      // This ensures we don't use insecure fallbacks
      throw new Error(
        'SHA-256 hashing requires expo-crypto on native platforms. ' +
        'Install it with: npx expo install expo-crypto'
      );
    }
  }

  // This should never be reached on web (crypto.subtle should always exist)
  throw new Error('SHA-256 hashing is not available on this platform');
}

/**
 * Verifies a PIN against a stored hash
 * @param pin - The plaintext PIN to verify
 * @param hash - The stored hash to compare against
 * @returns Promise resolving to true if PIN matches hash, false otherwise
 */
export async function verifyCoachPin(pin: string, hash: string): Promise<boolean> {
  try {
    // Validate PIN format first
    if (!isValidCoachPin(pin)) {
      return false;
    }

    // Hash the provided PIN
    const computedHash = await hashCoachPin(pin);
    
    // Constant-time comparison to prevent timing attacks
    // Compare all characters even if early mismatch is detected
    if (computedHash.length !== hash.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < hash.length; i++) {
      result |= computedHash.charCodeAt(i) ^ hash.charCodeAt(i);
    }

    return result === 0;
  } catch (error) {
    // If hashing fails, verification fails
    // Never log the PIN or hash
    return false;
  }
}

