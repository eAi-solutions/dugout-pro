import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView,
  TouchableOpacity
} from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      <View style={styles.header}>
        <Text style={styles.title}>⚾ Dugout Planner</Text>
        <Text style={styles.subtitle}>Baseball Coaching Assistant</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Practice Planner</Text>
          <Text style={styles.sectionText}>Plan your practice sessions</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Drill Library</Text>
          <Text style={styles.sectionText}>Browse and manage drills</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Field View</Text>
          <Text style={styles.sectionText}>Interactive field diagram</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Review</Text>
          <Text style={styles.sectionText}>Analyze practice performance</Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Ready for development!</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A1A',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#2A2A2A',
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    backgroundColor: '#2A2A2A',
    padding: 20,
    marginBottom: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#34D399',
    marginBottom: 8,
  },
  sectionText: {
    fontSize: 16,
    color: '#D1D5DB',
    lineHeight: 24,
  },
  footer: {
    padding: 20,
    backgroundColor: '#2A2A2A',
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  footerText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});
