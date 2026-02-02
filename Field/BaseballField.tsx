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
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  
  // Responsive layout breakpoint: use lg (1024px) instead of md (768px)
  // Additionally, require minimum height of 600px to prevent side-by-side on short screens (e.g., Android landscape)
  // Only use side-by-side layout on truly large screens with sufficient height
  const isWide = windowWidth >= 1024 && windowHeight >= 600;
  const isCompact = !isWide;
  
  // ============================================================================
  // RESPONSIVE LAYOUT SANITY CHECK
  // ============================================================================
  // Verify the field fits correctly in these viewports:
  //
  // 1. Android Chrome Portrait (~412x915 or similar)
  //    - Field should be square and fit within available height
  //    - Controls panel should scroll if needed
  //    - Field should remain fully visible
  //
  // 2. Android Chrome Landscape (~915x412 or similar)
  //    - Field should be square and fit within available height
  //    - Layout should stay stacked (not side-by-side) due to height < 600px
  //    - Controls panel should scroll independently
  //
  // 3. iPhone Safari Landscape (~844x390 or similar)
  //    - Field should be square and fit within available height
  //    - Layout should stay stacked (not side-by-side) due to height < 600px
  //    - Controls panel should scroll independently
  //
  // Key assertions:
  // - Field container does not overflow its parent
  // - Field maintains square aspect ratio (aspectRatio: 1)
  // - Field size = min(containerWidth, containerHeight) with 240px minimum
  // - Only controls area scrolls, field stays fixed and visible
  // - No page-level scrolling (overflow: hidden on bodyContainer)
  // ============================================================================
  
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
  const isLargeScreen = windowHeight > 800;
  const statusBarHeight = Platform.OS === 'android' 
    ? (isLargeScreen ? 50 : 45)
    : 50;
  const bottomPadding = Platform.OS === 'android' 
    ? (isLargeScreen ? 30 : 25)
    : 40;
  
  // Measure header height dynamically
  const [headerHeight, setHeaderHeight] = useState<number>(50); // Default fallback
  
  // Calculate body container height: calc(100dvh - headerHeight - padding)
  // Account for container padding (statusBarHeight on mobile, bottomPadding)
  const containerPaddingTop = Platform.OS === 'web' ? 0 : statusBarHeight;
  const containerPaddingBottom = Platform.OS === 'web' ? 0 : bottomPadding;
  const bodyContainerHeight = windowHeight - headerHeight - containerPaddingTop - containerPaddingBottom;
  
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
    <View style={[
      styles.container, 
      { 
        paddingTop: Platform.OS === 'web' ? 0 : statusBarHeight, 
        paddingBottom: Platform.OS === 'web' ? 0 : bottomPadding,
        // Use dynamic viewport height (100dvh equivalent) on web
        ...(Platform.OS === 'web' ? { height: windowHeight } : {}),
        overflow: 'hidden', // Prevent clipping/scrollbars
      }
    ]}>
      <View 
        style={styles.header}
        onLayout={(e) => {
          const { height } = e.nativeEvent.layout;
          setHeaderHeight(height);
        }}
      >
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Menu</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Baseball Field Diagram</Text>
        <View style={styles.headerRight} />
      </View>

      {isCompact ? (
        <View style={[
          styles.bodyContainer, 
          { 
            height: bodyContainerHeight, // Fixed height: calc(100dvh - headerHeight)
            overflow: 'hidden', // Prevent page-level scrolling
          }
        ]}>
          {/* Header (fixed) - already rendered above */}
          
          {/* FieldCanvas container - field computes square size from container dimensions */}
          {/* 
            RESPONSIVE LAYOUT: Field stays visible and doesn't scroll
            - Field size = min(containerWidth, containerHeight) with 240px minimum
            - Field maintains square aspect ratio (aspectRatio: 1)
            - Verify field fits in: Android Chrome portrait/landscape, iPhone Safari landscape (844x390)
          */}
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
          
          {/* Playback Dock (fixed height; does not overlay field) */}
          {playbackState && playbackState.isPlayingScenario && playbackState.currentScenario && (
            <View style={styles.playbackDock}>
              <ScenarioPlayer
                scenario={playbackState.currentScenario}
                fieldSize={playbackState.fieldSize}
                onPlayerPositionsChange={playbackState.setPlayerPositions}
                onBallPosChange={playbackState.setBallPos}
                onRunnersChange={playbackState.setRunners}
                onClose={playbackState.handleClosePlayer}
                dockMode={true}
                dockVariant="compact"
              />
            </View>
          )}
          
          {/* Controls ScrollView - ONLY this area scrolls when vertical space is tight */}
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
                      dockVariant="wide"
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
    flex: 1, // Default to flex, but can be overridden with fixed height
    flexDirection: 'column', // Ensure vertical stacking
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
    width: '100%',
    flex: 1, // Fill available container space
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    minHeight: 240, // Minimum height to ensure field can render
    flexShrink: 0, // Prevent field from shrinking
    overflow: 'hidden', // Prevent clipping/scrollbars
    // Field will compute square size = min(containerWidth, containerHeight) with 240px minimum
    // This ensures the field always fits inside available space, including rotation
  },
  controlsScrollView: {
    flex: 1, // Takes remaining space after field and playback dock
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
    flexShrink: 0, // Prevent playback dock from shrinking
    maxHeight: 180, // Constrain height to prevent pushing field off-screen
    // Fixed height container - does not scroll, does not overlay field
    // Height is determined by ScenarioPlayer content (up to maxHeight)
    backgroundColor: '#f5f5f5',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  playbackDockWide: {
    width: '100%',
    // Allow natural height growth; ScenarioPlayer handles internal scrolling for notes
    // Controls are protected with flexShrink: 0 and will always be visible
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    // Removed overflow: 'hidden' and maxHeight to prevent clipping controls
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