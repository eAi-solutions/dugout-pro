import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { 
  StyleSheet, 
  Text, 
  View, 
  Platform,
  Dimensions
} from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

// Import existing components (will be moved to proper locations in future tasks)
import { baseballDrills, Drill, PracticePlan } from './Data/Models/baseballDrills';
import BaseballField from './Field/BaseballField';

const Tab = createBottomTabNavigator();

// Placeholder screens - will be implemented in T09
function PracticePlannerView() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.title}>Practice Planner</Text>
      <Text style={styles.subtitle}>Plan your practice sessions</Text>
    </SafeAreaView>
  );
}

function DrillLibraryView() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.title}>Drill Library</Text>
      <Text style={styles.subtitle}>Browse and manage drills</Text>
    </SafeAreaView>
  );
}

function FieldView() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.title}>Field View</Text>
      <Text style={styles.subtitle}>Interactive field diagram</Text>
      <BaseballField onBack={() => {}} />
    </SafeAreaView>
  );
}

function ReviewView() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.title}>Review</Text>
      <Text style={styles.subtitle}>Analyze practice performance</Text>
    </SafeAreaView>
  );
}

export default function App() {
  const { height: screenHeight } = Dimensions.get('window');
  const isLargeScreen = screenHeight > 800;

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="light" />
        <Tab.Navigator
        screenOptions={({ route }: { route: any }) => ({
          tabBarIcon: ({ focused, color, size }: { focused: boolean; color: string; size: number }) => {
            let iconName: keyof typeof Ionicons.glyphMap;

            if (route.name === 'Practice Planner') {
              iconName = focused ? 'calendar' : 'calendar-outline';
            } else if (route.name === 'Drill Library') {
              iconName = focused ? 'library' : 'library-outline';
            } else if (route.name === 'Field') {
              iconName = focused ? 'baseball' : 'baseball-outline';
            } else if (route.name === 'Review') {
              iconName = focused ? 'analytics' : 'analytics-outline';
            } else {
              iconName = 'help-outline';
            }

            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: '#34D399',
          tabBarInactiveTintColor: '#9CA3AF',
          tabBarStyle: {
            backgroundColor: '#1A1A1A',
            borderTopColor: '#374151',
            paddingBottom: Platform.OS === 'android' ? (isLargeScreen ? 8 : 5) : 0,
            paddingTop: 5,
            height: Platform.OS === 'android' ? (isLargeScreen ? 70 : 65) : 85,
          },
          tabBarSafeAreaInsets: {
            bottom: 0,
          },
          headerStyle: {
            backgroundColor: '#1A1A1A',
            borderBottomColor: '#374151',
          },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: {
            fontWeight: '600',
          },
        })}
      >
        <Tab.Screen 
          name="Practice Planner" 
          component={PracticePlannerView}
          options={{
            title: 'Practice Planner',
          }}
        />
        <Tab.Screen 
          name="Drill Library" 
          component={DrillLibraryView}
          options={{
            title: 'Drill Library',
          }}
        />
        <Tab.Screen 
          name="Field" 
          component={FieldView}
          options={{
            title: 'Field View',
          }}
        />
        <Tab.Screen 
          name="Review" 
          component={ReviewView}
          options={{
            title: 'Review',
          }}
        />
      </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 20,
  },
});
