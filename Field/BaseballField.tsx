import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  
  // Use visualViewport on web for accurate viewport dimensions (accounts for address bar, etc.)
  const [effectiveViewportHeight, setEffectiveViewportHeight] = useState(windowHeight);
  const [effectiveViewportWidth, setEffectiveViewportWidth] = useState(windowWidth);
  
  // Update effective viewport dimensions on web using visualViewport API
  useEffect(() => {
    if (Platform.OS !== 'web') {
      return;
    }

    const updateViewport = () => {
      const visualViewport = typeof window !== 'undefined' ? window.visualViewport : null;
      if (visualViewport) {
        setEffectiveViewportHeight(visualViewport.height);
        setEffectiveViewportWidth(visualViewport.width);
      } else {
        // Fallback to window dimensions
        setEffectiveViewportHeight(window.innerHeight);
        setEffectiveViewportWidth(window.innerWidth);
      }
    };

    const visualViewport = typeof window !== 'undefined' ? window.visualViewport : null;
    const rafRef = { current: null as number | null };
    
    const scheduleUpdate = () => {
      if (rafRef.current !== null) {
        return;
      }
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        updateViewport();
      });
    };

    // Listen to visualViewport changes
    if (visualViewport) {
      visualViewport.addEventListener('resize', scheduleUpdate);
      visualViewport.addEventListener('scroll', scheduleUpdate);
    }
    
    // Listen to orientation changes
    const handleOrientationChange = () => {
      // Small delay to ensure layout has updated after orientation change
      setTimeout(() => scheduleUpdate(), 100);
    };
    
    // Listen to window resize (fallback)
    window.addEventListener('resize', scheduleUpdate);
    window.addEventListener('orientationchange', handleOrientationChange);

    // Initial update
    updateViewport();

    return () => {
      if (visualViewport) {
        visualViewport.removeEventListener('resize', scheduleUpdate);
        visualViewport.removeEventListener('scroll', scheduleUpdate);
      }
      window.removeEventListener('resize', scheduleUpdate);
      window.removeEventListener('orientationchange', handleOrientationChange);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  // Use effective viewport dimensions for calculations
  const viewportHeight = Platform.OS === 'web' ? effectiveViewportHeight : windowHeight;
  const viewportWidth = Platform.OS === 'web' ? effectiveViewportWidth : windowWidth;
  
  // Detect short viewport (typically mobile landscape) for field size constraint
  // Apply maxHeight constraint on web when viewport height is < 500-600px
  // Use effective viewport height to account for address bar hide/show
  const isShortViewport = Platform.OS === 'web' && viewportHeight < 600;
  
  // Responsive layout breakpoint: use lg (1024px) instead of md (768px)
  // Additionally, require minimum height of 600px to prevent side-by-side on short screens (e.g., Android landscape)
  // Only use side-by-side layout on truly large screens with sufficient height
  // IMPORTANT: If isShortViewport is true, force compact/stacked layout regardless of width
  const isWide = !isShortViewport && viewportWidth >= 1024 && viewportHeight >= 600;
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
  //    - Layout MUST stay stacked (not side-by-side) due to isShortViewport forcing compact mode
  //    - Main ScrollView handles all scrolling (no nested scroll containers)
  //    - Behaves identically to portrait, just shorter
  //
  // 3. iPhone Safari Landscape (~844x390 or similar)
  //    - Field should be square and fit within available height
  //    - Layout MUST stay stacked (not side-by-side) due to isShortViewport forcing compact mode
  //    - Main ScrollView handles all scrolling (no nested scroll containers)
  //    - Behaves identically to portrait, just shorter
  //
  // Key assertions:
  // - Field container does not overflow its parent
  // - Field maintains square aspect ratio (aspectRatio: 1)
  // - Field size = min(containerWidth, containerHeight) with 240px minimum
  // - Main content area scrolls (bodyContainer is ScrollView with height: calc(100dvh - headerHeight))
  // - Only field visual wrapper has overflow: hidden to prevent bleed
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
  const isLargeScreen = viewportHeight > 800;
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
  // On web, use effective viewport height (from visualViewport) for accurate rotation handling
  const containerPaddingTop = Platform.OS === 'web' ? 0 : statusBarHeight;
  const containerPaddingBottom = Platform.OS === 'web' ? 0 : bottomPadding;
  const bodyContainerHeight = Platform.OS === 'web' 
    ? viewportHeight - headerHeight 
    : viewportHeight - headerHeight - containerPaddingTop - containerPaddingBottom;
  
  // Check if header is fixed/sticky on web (for conditional padding)
  // Since header is in normal flow, we still add paddingTop to ensure content starts below header
  // This handles edge cases where the header might overlap content on rotation
  // On web, add small safety offset (6px) to handle rounding/dynamic viewport issues on Android Chrome
  const scrollContentPaddingTop = Platform.OS === 'web' ? headerHeight + 6 : headerHeight;
  
  // Debug mode: check URL params for ?debug=1
  const [showDebugOverlay, setShowDebugOverlay] = useState(false);
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      setShowDebugOverlay(urlParams.get('debug') === '1');
    }
  }, []);
  
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
        // Use effective viewport height (from visualViewport) on web for accurate rotation handling
        ...(Platform.OS === 'web' ? { height: viewportHeight } : {}),
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
        <ScrollView 
          style={[
            styles.bodyContainer, 
            Platform.OS === 'web' 
              ? { height: viewportHeight - headerHeight } 
              : { height: bodyContainerHeight }
          ]}
          contentContainerStyle={[
            styles.bodyContainerContent,
            { paddingTop: scrollContentPaddingTop }
          ]}
          showsVerticalScrollIndicator={true}
        >
          {/* FieldCanvas container - field computes square size from container dimensions */}
          {/* 
            RESPONSIVE LAYOUT: Field stays visible and doesn't scroll
            - Field size = min(containerWidth, containerHeight) with 240px minimum
            - Field maintains square aspect ratio (aspectRatio: 1)
            - Short viewport constraint: maxHeight: 60dvh when viewport height < 600px (mobile landscape)
              This ensures controls remain reachable without field dominating the screen
            - Verify field fits in: Android Chrome portrait/landscape, iPhone Safari landscape (844x390)
          */}
          <View style={[
            styles.fieldCanvasContainer,
            isShortViewport && styles.fieldCanvasContainerShort
          ]}>
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
          
          {/* Controls - part of main scrollable content */}
          {!isPopupOpen && controlsProps ? (
            <View style={styles.controlsContainer}>
              <FieldControls {...controlsProps} collapsed={false} />
            </View>
          ) : isPopupOpen ? (
            <View style={styles.controlsCollapsedBar}>
              <Text style={styles.controlsCollapsedText}>Controls</Text>
            </View>
          ) : null}
        </ScrollView>
      ) : (
        <ScrollView 
          style={[
            styles.bodyContainer, 
            styles.bodyContainerWide,
            Platform.OS === 'web' 
              ? { height: viewportHeight - headerHeight } 
              : { height: bodyContainerHeight }
          ]}
          contentContainerStyle={[
            styles.bodyContainerContentWide,
            { paddingTop: scrollContentPaddingTop }
          ]}
          showsVerticalScrollIndicator={true}
        >
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
        </ScrollView>
      )}
      
      {/* Debug overlay - only shown when ?debug=1 in URL */}
      {showDebugOverlay && Platform.OS === 'web' && (
        <View style={styles.debugOverlay}>
          <Text style={styles.debugText}>headerHeight: {headerHeight.toFixed(0)}px</Text>
          <Text style={styles.debugText}>viewportHeight: {viewportHeight.toFixed(0)}px</Text>
          <Text style={styles.debugText}>bodyHeight: {bodyContainerHeight.toFixed(0)}px</Text>
          <Text style={styles.debugText}>contentPaddingTop: {scrollContentPaddingTop.toFixed(0)}px</Text>
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
    // ScrollView container - height set dynamically via inline style
    flexDirection: 'column', // Ensure vertical stacking
  },
  bodyContainerContent: {
    // Content container for compact layout ScrollView
    // flexGrow: 1 allows content to exceed viewport and enables scrolling
    flexGrow: 1,
    paddingBottom: 20,
  },
  bodyContainerWide: {
    // Wide layout: side-by-side layout handled by InteractiveField
  },
  bodyContainerContentWide: {
    // Content container for wide layout ScrollView
    // flexGrow: 1 allows content to exceed viewport and enables scrolling
    flexGrow: 1,
  },
  fieldCanvasContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 20,
    minHeight: 240, // Minimum height to ensure field can render
    flexShrink: 0, // Prevent field from shrinking
    overflow: 'hidden', // Only field visual wrapper has overflow-hidden to prevent bleed
    // Field will compute square size = min(containerWidth, containerHeight) with 240px minimum
    // This ensures the field always fits inside available space, including rotation
  },
  fieldCanvasContainerShort: {
    // Constraint for short viewports (mobile landscape): field never exceeds 60% of viewport height
    // This ensures controls remain reachable without field dominating the screen
    maxHeight: '60dvh', // Only applies on web when windowHeight < 600px
  },
  controlsContainer: {
    width: '100%',
    backgroundColor: '#f5f5f5',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
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
  debugOverlay: {
    position: 'absolute',
    top: 60,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 10,
    borderRadius: 5,
    zIndex: 9999,
    minWidth: 200,
  },
  debugText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: Platform.OS === 'web' ? 'monospace' : 'monospace',
    marginVertical: 2,
  },
});

export default BaseballField;