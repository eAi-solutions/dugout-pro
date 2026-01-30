// Developer configuration
// Change this password to protect scenario recording
// IMPORTANT: Set your password here before deploying to production
export const DEV_PASSWORD = ''; // Set your password here

// Set to true to enable developer mode (shows delete buttons, etc.)
export const IS_DEV_MODE = __DEV__ || process.env.NODE_ENV === 'development';

// Debug flag for playback debugging features
export const ENABLE_PLAYBACK_DEBUG = __DEV__ || process.env.NODE_ENV === 'development';

