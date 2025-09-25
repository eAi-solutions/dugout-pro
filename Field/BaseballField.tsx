import React, { useState } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity, Text, ScrollView, Platform } from 'react-native';
import InteractiveField from './InteractiveField';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const fieldWidth = screenWidth - 40;
const fieldHeight = fieldWidth * 0.75; // Better aspect ratio


interface FieldDiagramProps {
  onBack: () => void;
}

const BaseballField: React.FC<FieldDiagramProps> = ({ onBack }) => {
  const { height: screenHeight } = Dimensions.get('window');
  
  // Safe area calculations
  const isLargeScreen = screenHeight > 800;
  const statusBarHeight = Platform.OS === 'android' 
    ? (isLargeScreen ? 50 : 45)
    : 50;
  const bottomPadding = Platform.OS === 'android' 
    ? (isLargeScreen ? 30 : 25)
    : 40;
  
  const resetPositions = () => {
    // This function is called by InteractiveField when reset is needed
    // The actual reset logic is handled in InteractiveField component
  };



  return (
    <View style={[styles.container, { paddingTop: statusBarHeight, paddingBottom: bottomPadding }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Menu</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Baseball Field Diagram</Text>
        <View style={styles.headerRight} />
      </View>


      <View style={styles.fieldContainer}>
        <InteractiveField onReset={resetPositions} />
      </View>

      <View style={styles.instructions}>
        <Text style={styles.instructionText}>
          • Use Reset to return to standard positions
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#2c3e50',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: '#3498db',
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerRight: {
    width: 60, // Same width as back button for balance
  },
  fieldContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  instructions: {
    padding: 15,
    backgroundColor: '#ecf0f1',
  },
  instructionText: {
    fontSize: 12,
    color: '#7f8c8d',
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default BaseballField;