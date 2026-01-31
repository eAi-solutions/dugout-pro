import React, { useState } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity, Text, ScrollView, Platform, useWindowDimensions } from 'react-native';
import InteractiveField, { FieldControls } from './InteractiveField';
import ScenarioPlayer from './ScenarioPlayer';
import { FieldScenario } from '../Data/Models/fieldScenarios';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const fieldWidth = screenWidth - 40;
const fieldHeight = fieldWidth * 0.75; // Better aspect ratio


interface FieldDiagramProps {
  onBack: () => void;
}

const BaseballField: React.FC<FieldDiagramProps> = ({ onBack }) => {
  const { width: windowWidth, height: screenHeight } = useWindowDimensions();
  
  // Responsive layout breakpoint
  const isCompact = windowWidth < 768;
  const isWide = windowWidth >= 768;
  
  // Popup state for collapsing controls
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  
  // Controls props state (updated by InteractiveField callback)
  const [controlsProps, setControlsProps] = useState<any>(null);
  
  // Playback state (updated by InteractiveField callback)
  const [playbackState, setPlaybackState] = useState<{
    isPlayingScenario: boolean;
    currentScenario: FieldScenario | null;
    fieldSize: number;
    setPlayerPositions: (positions: any[]) => void;
    setBallPos: (pos: { x: number; y: number }) => void;
    setRunners: (runners: any[]) => void;
    handleClosePlayer: () => void;
  } | null>(null);
  
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

  const handlePopupStateChange = (isOpen: boolean) => {
    setIsPopupOpen(isOpen);
  };

  const handlePlaybackStateChange = (state: {
    isPlayingScenario: boolean;
    currentScenario: FieldScenario | null;
    fieldSize: number;
    setPlayerPositions: (positions: any[]) => void;
    setBallPos: (pos: { x: number; y: number }) => void;
    setRunners: (runners: any[]) => void;
    handleClosePlayer: () => void;
  }) => {
    setPlaybackState(state);
  };



  return (
    <View style={[styles.container, { paddingTop: Platform.OS === 'web' ? 0 : statusBarHeight, paddingBottom: Platform.OS === 'web' ? 0 : bottomPadding }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Menu</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Baseball Field Diagram</Text>
        <View style={styles.headerRight} />
      </View>

      {isCompact ? (
        <View style={styles.bodyContainer}>
          {/* Top: FieldCanvas (as wide as possible) */}
          <View style={styles.fieldCanvasContainer}>
            <InteractiveField 
              onReset={resetPositions} 
              layoutMode="compact"
              onPopupStateChange={handlePopupStateChange}
              renderControlsSeparately={true}
              onControlsPropsChange={setControlsProps}
              onPlaybackStateChange={handlePlaybackStateChange}
            />
          </View>
          
          {/* Playback Dock - Renders when scenario is playing or paused */}
          {playbackState && playbackState.isPlayingScenario && playbackState.currentScenario && (
            <ScrollView 
              style={styles.playbackDockScrollView}
              contentContainerStyle={styles.playbackDockContent}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
            >
              <View style={styles.playbackDock}>
                <ScenarioPlayer
                  scenario={playbackState.currentScenario}
                  fieldSize={playbackState.fieldSize}
                  onPlayerPositionsChange={playbackState.setPlayerPositions}
                  onBallPosChange={playbackState.setBallPos}
                  onRunnersChange={playbackState.setRunners}
                  onClose={playbackState.handleClosePlayer}
                  dockMode={true}
                />
              </View>
            </ScrollView>
          )}
          
          {/* Bottom: FieldControls in ScrollView (collapsed when popup is open) */}
          {!isPopupOpen && controlsProps ? (
            <ScrollView 
              style={styles.controlsScrollView}
              contentContainerStyle={styles.controlsScrollContent}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
            >
              <FieldControls {...controlsProps} collapsed={false} />
            </ScrollView>
          ) : isPopupOpen ? (
            <View style={styles.controlsCollapsedBar}>
              <Text style={styles.controlsCollapsedText}>Controls</Text>
            </View>
          ) : null}
        </View>
      ) : (
        <View style={[styles.bodyContainer, styles.bodyContainerWide]}>
          <InteractiveField 
            onReset={resetPositions} 
            layoutMode="wide"
            onPlaybackStateChange={handlePlaybackStateChange}
            renderPlaybackDock={() => {
              if (playbackState && playbackState.isPlayingScenario && playbackState.currentScenario) {
                return (
                  <View style={styles.playbackDockWide}>
                    <ScenarioPlayer
                      scenario={playbackState.currentScenario}
                      fieldSize={playbackState.fieldSize}
                      onPlayerPositionsChange={playbackState.setPlayerPositions}
                      onBallPosChange={playbackState.setBallPos}
                      onRunnersChange={playbackState.setRunners}
                      onClose={playbackState.handleClosePlayer}
                      dockMode={true}
                    />
                  </View>
                );
              }
              return null;
            }}
          />
        </View>
      )}
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
  bodyContainer: {
    flex: 1,
  },
  bodyContainerCompact: {
    padding: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  bodyContainerWide: {
    // Wide layout: side-by-side layout handled by InteractiveField
  },
  fieldCanvasContainer: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    minHeight: 0, // Allow flex to shrink if needed
  },
  controlsScrollView: {
    maxHeight: '40%',
    backgroundColor: '#f5f5f5',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  controlsScrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  controlsCollapsedBar: {
    padding: 12,
    backgroundColor: '#e8e8e8',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlsCollapsedText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  playbackDock: {
    width: '100%',
  },
  playbackDockScrollView: {
    width: '100%',
    maxHeight: 140, // ~120-160px range, prevents field from being pushed off-screen
    backgroundColor: '#f5f5f5',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  playbackDockContent: {
    padding: 0,
  },
  playbackDockWide: {
    width: '100%',
    maxHeight: 160, // Constraint for wide layout as well
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    overflow: 'hidden',
  },
  fieldContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldContainerCompact: {
    maxWidth: '100%',
  },
});

export default BaseballField;