import { registerRootComponent } from 'expo';
import React from 'react';
import { View, Text } from 'react-native';

import App from './App';
import { AuthProvider } from './lib/AuthContext';
import { CoachModeProvider } from './lib/CoachModeContext';

// Error boundary to catch any initialization errors
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('App Error:', error);
    console.error('Error Info:', errorInfo);
    console.error('Error Stack:', error.stack);
    // Also log to window for browser debugging
    if (typeof window !== 'undefined') {
      (window as any).__APP_ERROR__ = { error, errorInfo };
    }
  }

  render() {
    if (this.state.hasError) {
      const errorMsg = this.state.error?.message || 'Unknown error';
      const errorStack = this.state.error?.stack || '';
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#fff' }}>
          <Text style={{ fontSize: 18, color: '#f44336', marginBottom: 10, fontWeight: 'bold' }}>App Error</Text>
          <Text style={{ fontSize: 14, color: '#666', marginBottom: 10, textAlign: 'center' }}>{errorMsg}</Text>
          {errorStack && (
            <Text style={{ fontSize: 10, color: '#999', marginTop: 10, fontFamily: 'monospace' }} numberOfLines={5}>
              {errorStack.split('\n').slice(0, 5).join('\n')}
            </Text>
          )}
          <Text style={{ fontSize: 12, color: '#999', marginTop: 20 }}>
            Check browser console (F12) for full details
          </Text>
        </View>
      );
    }

    return this.props.children;
  }
}

// Wrap App with AuthProvider and CoachModeProvider
function AppWithAuth() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <CoachModeProvider>
          <App />
        </CoachModeProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(AppWithAuth);
