// Developer configuration
// Change this password to protect scenario recording
export const DEV_PASSWORD = 'dev123'; // Change this to your desired password

// Set to true to enable developer mode (shows delete buttons, etc.)
export const IS_DEV_MODE = __DEV__ || process.env.NODE_ENV === 'development';

// Debug flag for playback debugging features
export const ENABLE_PLAYBACK_DEBUG = __DEV__ || process.env.NODE_ENV === 'development';

