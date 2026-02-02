import React, { useState, useRef, useEffect, useMemo, useCallback, ReactElement } from 'react';
import { View, Text, PanResponder, Animated, TouchableOpacity, Platform, LayoutChangeEvent, Alert, TextInput, ScrollView } from 'react-native';
import BaseballFieldImage from './BaseballFieldImage';
import ScenarioRecorder from './ScenarioRecorder';
import ScenarioLibrary from './ScenarioLibrary';
import { FieldScenario } from '../Data/Models/fieldScenarios';
import { upsertScenario } from '../services/scenarioStore';
import { useAuth } from '../lib/AuthContext';
import { useCoachMode } from '../lib/CoachModeContext';
import CoachModeControls from './CoachModeControls';

// Constants for marker sizes and offsets
const MARKER_SIZES = {
  PLAYER: { size: 36, offset: 18, borderWidth: { normal: 2, dragging: 3 } },
  BALL: { size: 24, offset: 12, borderWidth: { normal: 2, dragging: 3 } },
  RUNNER: { size: 30, offset: 15, borderWidth: { normal: 2, dragging: 3 } },
} as const;

const Z_INDEX = {
  NORMAL: 10,
  DRAGGING: 1000,
} as const;

// Normalized positions (0.0 to 1.0) - these scale proportionally across all browsers and devices
// React Native coordinates: (0,0) is top-left, y increases downward
type PlayerPos = {
  key: string;
  label: string;
  xPercent: number; // 0.0 to 1.0
  yPercent: number; // 0.0 to 1.0
  color: string;
};

type PlayerPosition = {
  key: string;
  label: string;
  x: number;
  y: number;
  color: string;
};

type RunnerPosition = {
  id: string;
  x: number;
  y: number;
};

type ContainerLayout = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type DragStart = {
  x: number;
  y: number;
  key: string;
  isBall: boolean;
  isRunner: boolean;
};

// Type guard for HTMLElement
const isHTMLElement = (node: unknown): node is HTMLElement => {
  return (
    typeof node === 'object' &&
    node !== null &&
    'getBoundingClientRect' in node &&
    typeof (node as HTMLElement).getBoundingClientRect === 'function'
  );
};

// Safe window access for SSR compatibility
const getWindowScrollX = (): number => {
  if (typeof window === 'undefined') return 0;
  return window.scrollX ?? window.pageXOffset ?? 0;
};

const getWindowScrollY = (): number => {
  if (typeof window === 'undefined') return 0;
  return window.scrollY ?? window.pageYOffset ?? 0;
};

const BASE_POSITIONS: PlayerPos[] = [
  { key: 'P', label: 'P', xPercent: 0.50, yPercent: 0.66, color: '#e74c3c' },      // Pitcher - centered on mound
  { key: 'C', label: 'C', xPercent: 0.50, yPercent: 0.83, color: '#3498db' },      // Catcher - directly behind home plate
  { key: '1B', label: '1B', xPercent: 0.66, yPercent: 0.61, color: '#2ecc71' },  // First Baseman - just past 1B base towards home (right side)
  { key: '2B', label: '2B', xPercent: 0.60, yPercent: 0.50, color: '#f39c12' },   // Second Baseman - between 1B and 2B, closer to 2B
  { key: '3B', label: '3B', xPercent: 0.36, yPercent: 0.60, color: '#9b59b6' }, // Third Baseman - just past 3B base towards home (left side)
  { key: 'SS', label: 'SS', xPercent: 0.40, yPercent: 0.50, color: '#1abc9c' },  // Shortstop - between 2B and 3B, closer to 2B
  { key: 'LF', label: 'LF', xPercent: 0.26, yPercent: 0.36, color: '#34495e' },  // Left Fielder - deep left outfield
  { key: 'CF', label: 'CF', xPercent: 0.50, yPercent: 0.29, color: '#e67e22' },   // Center Fielder - deep center outfield
  { key: 'RF', label: 'RF', xPercent: 0.73, yPercent: 0.36, color: '#27ae60' },   // Right Fielder - deep right outfield
];

const BALL_BASE_POS = { xPercent: 0.50, yPercent: 0.70 };

interface InteractiveFieldProps {
  onReset?: () => void;
  layoutMode?: 'compact' | 'wide';
  onPopupStateChange?: (isOpen: boolean) => void;
  renderControlsSeparately?: boolean;
  controlsCollapsed?: boolean;
  onControlsPropsChange?: (controlsProps: {
    fieldSize: number;
    showRecorder: boolean;
    showLibrary: boolean;
    coachModeUnlocked: boolean;
    multiSelectMode: boolean;
    selectedPlayers: Set<string>;
    playerPositions: PlayerPosition[];
    ballPos: { x: number; y: number };
    runners: RunnerPosition[];
    addRunner: () => void;
    removeRunner: () => void;
    resetPositions: () => void;
    handleRecordButtonPress: () => void;
    setShowLibrary: (show: boolean) => void;
    setMultiSelectMode: (mode: boolean) => void;
    clearSelection: () => void;
    selectAllPlayers: () => void;
    handleSaveScenario: (scenario: FieldScenario) => Promise<void>;
    handleSelectScenario: (scenario: FieldScenario) => void;
    setShowRecorder: (show: boolean) => void;
    collapsed?: boolean;
  }) => void;
  onPlaybackStateChange?: (playbackState: {
    isPlayingScenario: boolean;
    currentScenario: FieldScenario | null;
    fieldSize: number;
    setPlayerPositions: (positions: PlayerPosition[]) => void;
    setBallPos: (pos: { x: number; y: number }) => void;
    setRunners: (runners: RunnerPosition[]) => void;
    handleClosePlayer: () => void;
  }) => void;
  renderPlaybackDock?: () => ReactElement | null;
}

// Helper to convert normalized positions to pixel positions
const convertPositionsToPixels = (fieldSize: number): PlayerPosition[] => {
  if (fieldSize <= 0) return [];
  
  return BASE_POSITIONS.map(pos => ({
    key: pos.key,
    label: pos.label,
    x: fieldSize * pos.xPercent,
    y: fieldSize * pos.yPercent,
    color: pos.color,
  }));
};

// ============================================
// FieldCanvas Component
// Renders the interactive field diagram and player control popup overlay
// ============================================
interface FieldCanvasProps {
  fieldSize: number;
  playerPositions: PlayerPosition[];
  ballPos: { x: number; y: number };
  runners: RunnerPosition[];
  setContainerRef: (node: View | null) => void;
  handleLayout: (e: LayoutChangeEvent) => void;
  webEventHandlers: any;
  renderPlayer: (player: PlayerPosition) => ReactElement;
  renderBall: () => ReactElement;
  renderRunner: (runner: RunnerPosition) => ReactElement;
  layoutMode?: 'compact' | 'wide';
}

function FieldCanvas({
  fieldSize,
  playerPositions,
  ballPos,
  runners,
  setContainerRef,
  handleLayout,
  webEventHandlers,
  renderPlayer,
  renderBall,
  renderRunner,
  layoutMode = 'compact',
}: FieldCanvasProps) {
  return (
    <View 
      ref={setContainerRef}
      accessible={true}
      accessibilityLabel="Baseball field interactive diagram"
      style={{ 
        width: '100%',
        maxWidth: '100%',
        minWidth: 240,
        minHeight: 240,
        aspectRatio: 1, // Maintain square shape - height will be computed from width
        alignSelf: 'center', 
        marginVertical: layoutMode === 'wide' ? 0 : 20, 
        position: 'relative',
        overflow: 'hidden', // Prevent clipping/scrollbars
      }}
      onLayout={handleLayout}
      {...(Platform.OS === 'web' ? webEventHandlers : {})}
    >
      {/* Image-based Baseball Field Background */}
      <BaseballFieldImage />
      
      {/* Overlay Players, Ball, and Runners on top of field - only render when fieldSize is set */}
      {fieldSize > 0 && (
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: 'box-none'
        }}>
          {/* Players */}
          {playerPositions.map(renderPlayer)}

          {/* Baseball */}
          {renderBall()}

          {/* Runners */}
          {runners.map(renderRunner)}
        </View>
      )}
    </View>
  );
}

// ============================================
// FieldControls Component
// Renders all control UI: buttons, recorder, library, coach controls
// ============================================
interface FieldControlsProps {
  fieldSize: number;
  showRecorder: boolean;
  showLibrary: boolean;
  coachModeUnlocked: boolean;
  multiSelectMode: boolean;
  selectedPlayers: Set<string>;
  playerPositions: PlayerPosition[];
  ballPos: { x: number; y: number };
  runners: RunnerPosition[];
  addRunner: () => void;
  removeRunner: () => void;
  resetPositions: () => void;
  handleRecordButtonPress: () => void;
  setShowLibrary: (show: boolean) => void;
  setMultiSelectMode: (mode: boolean) => void;
  clearSelection: () => void;
  selectAllPlayers: () => void;
  handleSaveScenario: (scenario: FieldScenario) => Promise<void>;
  handleSelectScenario: (scenario: FieldScenario) => void;
  setShowRecorder: (show: boolean) => void;
  collapsed?: boolean;
}

function FieldControls({
  fieldSize,
  showRecorder,
  showLibrary,
  coachModeUnlocked,
  multiSelectMode,
  selectedPlayers,
  playerPositions,
  ballPos,
  runners,
  addRunner,
  removeRunner,
  resetPositions,
  handleRecordButtonPress,
  setShowLibrary,
  setMultiSelectMode,
  clearSelection,
  selectAllPlayers,
  handleSaveScenario,
  handleSelectScenario,
  setShowRecorder,
  collapsed = false,
}: FieldControlsProps) {
  // Collapsed state: show only a minimal "Controls" bar
  if (collapsed) {
    return (
      <View style={{ 
        padding: 12, 
        backgroundColor: '#e8e8e8', 
        borderTopWidth: 1, 
        borderTopColor: '#ddd',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Text style={{ fontSize: 14, color: '#666', fontWeight: '600' }}>Controls</Text>
      </View>
    );
  }

  return (
    <>
      {/* Add/Remove Runner Buttons */}
      <View style={{ 
        marginTop: 20,
        width: fieldSize > 0 ? fieldSize : '100%',
        maxWidth: '100%',
        flexDirection: 'row', 
        justifyContent: 'center', 
        alignItems: 'center',
        gap: 15
      }}>
        <TouchableOpacity
          accessible={true}
          accessibilityLabel="Add runner"
          accessibilityRole="button"
          style={{ 
            paddingHorizontal: 20, 
            paddingVertical: 10, 
            backgroundColor: '#ff6b6b', 
            borderRadius: 8
          }}
          onPress={addRunner}
        >
          <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>+ Add Runner</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          accessible={true}
          accessibilityLabel="Remove runner"
          accessibilityRole="button"
          style={{ 
            paddingHorizontal: 20, 
            paddingVertical: 10, 
            backgroundColor: '#3498db', 
            borderRadius: 8
          }}
          onPress={removeRunner}
        >
          <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>- Remove Runner</Text>
        </TouchableOpacity>
      </View>

      {/* Instructions */}
      <View style={{ 
        marginTop: 20, 
        width: fieldSize > 0 ? fieldSize : '100%',
        maxWidth: '100%',
        padding: 15, 
        backgroundColor: '#f0f0f0', 
        borderRadius: 8, 
        alignItems: 'center' 
      }}>
        <Text style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 5, color: '#333' }}>
          Interactive Field
        </Text>
        <Text style={{ fontSize: 12, color: '#666', textAlign: 'center' }}>
          Tap, hold, and drag players, runners, or the ball to move them around the field
        </Text>
      </View>

      <TouchableOpacity
        accessible={true}
        accessibilityLabel="Reset all positions"
        accessibilityRole="button"
        style={{ marginTop: 15, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#e74c3c', borderRadius: 8, alignSelf: 'center' }}
        onPress={resetPositions}
      >
        <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>Reset Positions</Text>
      </TouchableOpacity>

      {/* Coach Mode Controls */}
      {!showRecorder && (
        <CoachModeControls />
      )}

      {/* Scenario Controls */}
      <View style={{ 
        marginTop: 20,
        width: fieldSize > 0 ? fieldSize : '100%',
        maxWidth: '100%',
        flexDirection: 'row', 
        justifyContent: 'center', 
        alignItems: 'center',
        gap: 10,
        flexWrap: 'wrap'
      }}>
        {!showRecorder && (
          <>
            <TouchableOpacity
              accessible={true}
              accessibilityLabel="Record new scenario"
              accessibilityRole="button"
              style={{ 
                paddingHorizontal: 20, 
                paddingVertical: 10, 
                backgroundColor: coachModeUnlocked ? '#9b59b6' : '#999', 
                borderRadius: 8,
                opacity: coachModeUnlocked ? 1 : 0.6,
              }}
              onPress={handleRecordButtonPress}
              disabled={!coachModeUnlocked}
            >
              <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>
                📹 Record Scenario
                {!coachModeUnlocked && ' (Coach Mode Required)'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              accessible={true}
              accessibilityLabel="Browse scenarios"
              accessibilityRole="button"
              style={{ 
                paddingHorizontal: 20, 
                paddingVertical: 10, 
                backgroundColor: '#3498db', 
                borderRadius: 8
              }}
              onPress={() => setShowLibrary(true)}
            >
              <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>📚 Browse Scenarios</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Multi-Select Controls - Only show when recording */}
      {showRecorder && (
        <View style={{ 
          marginTop: 15,
          width: fieldSize > 0 ? fieldSize : '100%',
          maxWidth: '100%',
          flexDirection: 'row',
          justifyContent: 'center',
          gap: 10,
          flexWrap: 'wrap'
        }}>
          <TouchableOpacity
            style={{
              paddingHorizontal: 15,
              paddingVertical: 8,
              backgroundColor: multiSelectMode ? '#4CAF50' : '#666',
              borderRadius: 8,
            }}
            onPress={() => {
              setMultiSelectMode(!multiSelectMode);
              if (!multiSelectMode) {
                clearSelection();
              }
            }}
          >
            <Text style={{ color: 'white', fontSize: 14, fontWeight: 'bold' }}>
              {multiSelectMode ? '✓ Multi-Select ON' : 'Multi-Select OFF'}
            </Text>
          </TouchableOpacity>
          
          {multiSelectMode && (
            <>
              <TouchableOpacity
                style={{
                  paddingHorizontal: 15,
                  paddingVertical: 8,
                  backgroundColor: '#2196F3',
                  borderRadius: 8,
                }}
                onPress={selectAllPlayers}
              >
                <Text style={{ color: 'white', fontSize: 14, fontWeight: 'bold' }}>
                  Select All Players
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={{
                  paddingHorizontal: 15,
                  paddingVertical: 8,
                  backgroundColor: '#ff9800',
                  borderRadius: 8,
                }}
                onPress={clearSelection}
              >
                <Text style={{ color: 'white', fontSize: 14, fontWeight: 'bold' }}>
                  Clear Selection ({selectedPlayers.size})
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      {/* Scenario Recorder - Inline below field */}
      {showRecorder && (
        <View style={{ width: fieldSize > 0 ? fieldSize : '100%', maxWidth: '100%' }}>
          <ScenarioRecorder
            fieldSize={fieldSize}
            playerPositions={playerPositions}
            ballPos={ballPos}
            runners={runners}
            onSave={handleSaveScenario}
            onCancel={() => {
              setShowRecorder(false);
              setMultiSelectMode(false);
              clearSelection();
            }}
          />
        </View>
      )}

      {/* Scenario Library Modal */}
      <ScenarioLibrary
        visible={showLibrary}
        onSelectScenario={handleSelectScenario}
        onClose={() => setShowLibrary(false)}
        isDevMode={coachModeUnlocked}
      />
    </>
  );
}

// ============================================
// Main InteractiveField Component
// Manages all state and renders FieldCanvas + FieldControls
// ============================================
export default function InteractiveField({ onReset, layoutMode = 'compact', onPopupStateChange, renderControlsSeparately = false, controlsCollapsed = false, onControlsPropsChange, onPlaybackStateChange, renderPlaybackDock }: InteractiveFieldProps) {
  const { user } = useAuth();
  const { coachModeUnlocked } = useCoachMode();
  
  // ... existing state and logic remains unchanged ...
  // (all the existing useState, useCallback, useEffect hooks stay here)

  // Use actual rendered container width as single source of truth
  const [fieldSize, setFieldSize] = useState(0);
  const fieldWidth = fieldSize;
  const fieldHeight = fieldSize;

  // Store positions in pixels (converted from normalized percentages)
  const [playerPositions, setPlayerPositions] = useState<PlayerPosition[]>([]);
  const [ballPos, setBallPos] = useState({ x: 0, y: 0 });
  const [runners, setRunners] = useState<RunnerPosition[]>([]);
  const [draggedPlayer, setDraggedPlayer] = useState<string | null>(null);
  const [draggedBall, setDraggedBall] = useState(false);
  const [draggedRunner, setDraggedRunner] = useState<string | null>(null);

  // Multi-select for players (only active when recording)
  const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(new Set());
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const selectedPlayersStartPositions = useRef<Map<string, { x: number; y: number }>>(new Map());

  // Scenario recording and playback states
  const [showRecorder, setShowRecorder] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [currentScenario, setCurrentScenario] = useState<FieldScenario | null>(null);
  const [isPlayingScenario, setIsPlayingScenario] = useState(false);

  // ... all existing useCallback, useEffect, and helper functions remain unchanged ...
  // (convertPositionsToPixels, resetPositions, addRunner, removeRunner, etc.)

  // Convert normalized positions to pixels when field size changes
  useEffect(() => {
    if (fieldSize > 0) {
      setPlayerPositions(convertPositionsToPixels(fieldSize));
      setBallPos({ 
        x: fieldSize * BALL_BASE_POS.xPercent, 
        y: fieldSize * BALL_BASE_POS.yPercent 
      });
    }
  }, [fieldSize]);

  // Use ResizeObserver on web to update field size on rotation/resizes
  useEffect(() => {
    if (Platform.OS !== 'web' || !containerDOMRef.current) {
      return;
    }

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          // Compute square size = min(containerWidth, containerHeight) with 240px minimum
          const squareSize = Math.max(240, Math.min(width, height));
          if (squareSize !== fieldSize) {
            setFieldSize(squareSize);
          }
        }
      }
    });

    resizeObserver.observe(containerDOMRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [fieldSize]);

  const resetPositions = useCallback(() => {
    if (fieldSize > 0) {
      setPlayerPositions(convertPositionsToPixels(fieldSize));
      setBallPos({ 
        x: fieldSize * BALL_BASE_POS.xPercent, 
        y: fieldSize * BALL_BASE_POS.yPercent 
      });
    }
    setRunners([]);
    setDraggedPlayer(null);
    setDraggedBall(false);
    setDraggedRunner(null);
    // Call the parent reset function if provided
    if (onReset) {
      try {
        onReset();
      } catch (error) {
        // Log error but don't break the component
        if (__DEV__) {
          console.error('Error in onReset callback:', error);
        }
      }
    }
  }, [fieldSize, onReset]);

  const addRunner = useCallback(() => {
    if (fieldSize <= 0) return;
    
    const newRunner: RunnerPosition = {
      id: `runner_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // More unique ID
      x: fieldSize * 0.85, // Bottom right area
      y: fieldSize * 0.85
    };
    setRunners(prev => [...prev, newRunner]);
  }, [fieldSize]);

  const removeRunner = useCallback(() => {
    setRunners(prev => {
      if (prev.length > 0) {
        return prev.slice(0, -1);
      }
      return prev;
    });
  }, []);

  // Scenario handlers
  const handleSaveScenario = useCallback(async (scenario: FieldScenario) => {
    // Coach Mode guard: prevent save/overwrite if Coach Mode is OFF
    if (!coachModeUnlocked) {
      Alert.alert('Coach Mode Required', 'Coach Mode required to save or overwrite scenarios');
      throw new Error('Coach Mode required to save scenarios');
    }

    // Validate scenario object
    if (!scenario.id || typeof scenario.id !== 'string' || scenario.id.trim() === '') {
      throw new Error('Scenario must have a valid ID');
    }
    if (!scenario.name || typeof scenario.name !== 'string' || scenario.name.trim() === '') {
      throw new Error('Scenario must have a valid name');
    }

    if (!user) {
      throw new Error('Please log in to save scenarios');
    }

    // Add timeout around upsertScenario call (10 seconds)
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Save timed out after 10s at step: calling upsertScenario')), 10000);
    });

    const upsertPromise = upsertScenario(scenario);
    const result = await Promise.race([upsertPromise, timeoutPromise]);

    if (result.error) {
      throw new Error(result.error.message || 'Failed to save scenario');
    }

    Alert.alert('Success', 'Scenario saved!');
    setShowRecorder(false);
  }, [user, coachModeUnlocked]);

  const handleSelectScenario = useCallback((scenario: FieldScenario) => {
    setCurrentScenario(scenario);
    setIsPlayingScenario(true);
    // Reset positions to initial scenario positions
    if (fieldSize > 0) {
      const scaleFactor = fieldSize / scenario.fieldSize;
      setPlayerPositions(
        scenario.initialPlayers.map(p => ({
          key: p.key,
          label: p.label,
          x: p.x * scaleFactor,
          y: p.y * scaleFactor,
          color: p.color,
        }))
      );
      setBallPos({
        x: scenario.initialBall.x * scaleFactor,
        y: scenario.initialBall.y * scaleFactor,
      });
      setRunners(
        scenario.initialRunners.map(r => ({
          id: r.id,
          x: r.x * scaleFactor,
          y: r.y * scaleFactor,
        }))
      );
    }
    // Notify parent of popup state change
    if (onPopupStateChange) {
      onPopupStateChange(true);
    }
  }, [fieldSize, onPopupStateChange]);

  const handleClosePlayer = useCallback(() => {
    setIsPlayingScenario(false);
    setCurrentScenario(null);
    // Notify parent of popup state change
    if (onPopupStateChange) {
      onPopupStateChange(false);
    }
  }, [onPopupStateChange]);

  // Expose playback state to parent via callback
  useEffect(() => {
    if (onPlaybackStateChange) {
      onPlaybackStateChange({
        isPlayingScenario,
        currentScenario,
        fieldSize,
        setPlayerPositions,
        setBallPos,
        setRunners,
        handleClosePlayer,
      });
    }
  }, [isPlayingScenario, currentScenario, fieldSize, onPlaybackStateChange, handleClosePlayer]);

  const handleRecordButtonPress = useCallback(() => {
    if (!coachModeUnlocked) {
      Alert.alert('Coach Mode Required', 'Please unlock Coach Mode to record scenarios');
      return;
    }
    setShowRecorder(true);
  }, [coachModeUnlocked]);

  const fieldContainerRef = useRef<View>(null);
  const containerDOMRef = useRef<HTMLElement | null>(null);
  const [containerLayout, setContainerLayout] = useState<ContainerLayout | null>(null);
  const [containerWindowLayout, setContainerWindowLayout] = useState<ContainerLayout | null>(null);
  const [dragStart, setDragStart] = useState<DragStart | null>(null);
  
  // Helper function to get coordinates relative to container - used by both start and move events
  const getContainerRelativeCoords = useCallback((e: any): { x: number; y: number } => {
    const nativeEvent = 'nativeEvent' in e ? e.nativeEvent : e;
    let clientX = 0;
    let clientY = 0;

    if (nativeEvent && 'touches' in nativeEvent && nativeEvent.touches && nativeEvent.touches[0]) {
      clientX = nativeEvent.touches[0].clientX ?? 0;
      clientY = nativeEvent.touches[0].clientY ?? 0;
    } else if (nativeEvent && 'changedTouches' in nativeEvent && nativeEvent.changedTouches && nativeEvent.changedTouches[0]) {
      clientX = nativeEvent.changedTouches[0].clientX ?? 0;
      clientY = nativeEvent.changedTouches[0].clientY ?? 0;
    } else if (nativeEvent && 'clientX' in nativeEvent) {
      clientX = nativeEvent.clientX ?? 0;
      clientY = nativeEvent.clientY ?? 0;
    } else if (nativeEvent && 'pageX' in nativeEvent) {
      clientX = nativeEvent.pageX - getWindowScrollX();
      clientY = nativeEvent.pageY - getWindowScrollY();
    }

    // Try to get coordinates relative to container
    if (containerDOMRef.current && isHTMLElement(containerDOMRef.current)) {
      try {
        const rect = containerDOMRef.current.getBoundingClientRect();
        return {
          x: Math.max(0, clientX - rect.left),
          y: Math.max(0, clientY - rect.top)
        };
      } catch (error) {
        if (__DEV__) {
          console.warn('Error getting container bounds:', error);
        }
      }
    }
    
    // Fallback: use measureInWindow (async, but better than nothing)
    if (fieldContainerRef.current) {
      // Note: measureInWindow is async, so this is a best-effort fallback
      // The actual measurement happens in onLayout
      if (containerWindowLayout) {
        return {
          x: Math.max(0, clientX - containerWindowLayout.x),
          y: Math.max(0, clientY - containerWindowLayout.y)
        };
      }
    }
    
    return { x: 0, y: 0 };
  }, [containerWindowLayout]);

  // Safe DOM element access with proper type guards
  const setContainerRef = useCallback((node: View | null) => {
    fieldContainerRef.current = node;
    if (Platform.OS === 'web' && node) {
      // Safely access React Native Web's internal properties with type guards
      // These are implementation details but necessary for cross-browser compatibility
      try {
        const nodeAny = node as unknown as {
          _nativeNode?: HTMLElement;
          _internalFiberInstanceHandleDEV?: { stateNode?: HTMLElement };
          nodeType?: number;
        };
        
        if (nodeAny._nativeNode && isHTMLElement(nodeAny._nativeNode)) {
          containerDOMRef.current = nodeAny._nativeNode;
        } else if (nodeAny._internalFiberInstanceHandleDEV?.stateNode && isHTMLElement(nodeAny._internalFiberInstanceHandleDEV.stateNode)) {
          containerDOMRef.current = nodeAny._internalFiberInstanceHandleDEV.stateNode;
        } else if (nodeAny.nodeType === 1 && isHTMLElement(node)) {
          containerDOMRef.current = node as unknown as HTMLElement;
        }
      } catch (error) {
        if (__DEV__) {
          console.warn('Error accessing DOM node:', error);
        }
      }
    }
  }, []);

  // Get container's bounding rect for accurate positioning across all browsers
  const getContainerBounds = useCallback((): ContainerLayout | null => {
    // Prefer window layout from measureInWindow as it's most reliable
    if (containerWindowLayout) {
      return containerWindowLayout;
    }
    
    // Fallback to onLayout if measureInWindow hasn't been called yet
    if (containerLayout) {
      return containerLayout;
    }
    
    // Last resort: try getBoundingClientRect on web
    if (Platform.OS === 'web' && containerDOMRef.current && isHTMLElement(containerDOMRef.current)) {
      try {
        const rect = containerDOMRef.current.getBoundingClientRect();
        return {
          x: rect.left,
          y: rect.top,
          width: rect.width,
          height: rect.height
        };
      } catch (error) {
        if (__DEV__) {
          console.warn('Error getting container bounds:', error);
        }
      }
    }
    
    return null;
  }, [containerLayout, containerWindowLayout]);

  const handleStart = useCallback((key: string, isBall: boolean, isRunner: boolean, startX: number, startY: number) => {
    // Don't allow dragging while playing a scenario
    if (isPlayingScenario) {
      return;
    }

    // Validate key is a string and not empty
    if (typeof key !== 'string' || key.length === 0) {
      if (__DEV__) {
        console.warn('Invalid key provided to handleStart:', key);
      }
      return;
    }

    // Clamp coordinates to valid range
    const clampedX = Math.max(0, Math.min(fieldWidth, startX));
    const clampedY = Math.max(0, Math.min(fieldHeight, startY));

    if (isBall) {
      setDraggedBall(true);
      setDragStart({ x: clampedX, y: clampedY, key, isBall: true, isRunner: false });
    } else if (isRunner) {
      setDraggedRunner(key);
      setDragStart({ x: clampedX, y: clampedY, key, isBall: false, isRunner: true });
    } else {
      // Handle player selection/dragging
      if (multiSelectMode && showRecorder) {
        // Toggle selection on click (not drag start)
        // For now, we'll handle selection separately
      }
      
      // If this player is selected and we're in multi-select mode, store starting positions
      if (multiSelectMode && showRecorder && selectedPlayers.has(key)) {
        selectedPlayersStartPositions.current.clear();
        selectedPlayers.forEach(playerKey => {
          const player = playerPositions.find(p => p.key === playerKey);
          if (player) {
            selectedPlayersStartPositions.current.set(playerKey, { x: player.x, y: player.y });
          }
        });
      }
      
      setDraggedPlayer(key);
      setDragStart({ x: clampedX, y: clampedY, key, isBall: false, isRunner: false });
    }
  }, [fieldWidth, fieldHeight, isPlayingScenario, multiSelectMode, showRecorder, selectedPlayers, playerPositions]);

  const handleMove = useCallback((currentX: number, currentY: number) => {
    // Don't allow dragging while playing a scenario
    if (isPlayingScenario) return;
    if (!dragStart) return;

    // Validate inputs are numbers
    if (typeof currentX !== 'number' || typeof currentY !== 'number' || isNaN(currentX) || isNaN(currentY)) {
      return;
    }

    const deltaX = currentX - dragStart.x;
    const deltaY = currentY - dragStart.y;

    let currentPos: { x: number; y: number } | undefined;
    if (dragStart.isBall) {
      currentPos = ballPos;
    } else if (dragStart.isRunner) {
      currentPos = runners.find(r => r.id === dragStart.key);
    } else {
      currentPos = playerPositions.find(p => p.key === dragStart.key);
    }

    if (!currentPos) return;

    // Clamp to field boundaries with marker offset
    const markerOffset = dragStart.isBall 
      ? MARKER_SIZES.BALL.offset 
      : dragStart.isRunner 
      ? MARKER_SIZES.RUNNER.offset 
      : MARKER_SIZES.PLAYER.offset;

    const newX = Math.max(markerOffset, Math.min(fieldWidth - markerOffset, currentPos.x + deltaX));
    const newY = Math.max(markerOffset, Math.min(fieldHeight - markerOffset, currentPos.y + deltaY));

    if (dragStart.isBall) {
      setBallPos({ x: newX, y: newY });
    } else if (dragStart.isRunner) {
      setRunners(prev =>
        prev.map((runner) =>
          runner.id === dragStart.key ? { ...runner, x: newX, y: newY } : runner
        )
      );
    } else {
      // Handle player movement - if multi-select and this player is selected, move all selected players
      if (multiSelectMode && showRecorder && selectedPlayers.has(dragStart.key) && selectedPlayers.size > 1) {
        const draggedPlayerStart = selectedPlayersStartPositions.current.get(dragStart.key);
        if (draggedPlayerStart) {
          const deltaX = newX - draggedPlayerStart.x;
          const deltaY = newY - draggedPlayerStart.y;
          
          setPlayerPositions(prev =>
            prev.map((pos) => {
              if (selectedPlayers.has(pos.key)) {
                const startPos = selectedPlayersStartPositions.current.get(pos.key);
                if (startPos) {
                  const markerOffset = MARKER_SIZES.PLAYER.offset;
                  return {
                    ...pos,
                    x: Math.max(markerOffset, Math.min(fieldWidth - markerOffset, startPos.x + deltaX)),
                    y: Math.max(markerOffset, Math.min(fieldHeight - markerOffset, startPos.y + deltaY)),
                  };
                }
              }
              return pos;
            })
          );
        } else {
          // Fallback to single player movement
          setPlayerPositions(prev =>
            prev.map((pos) =>
              pos.key === dragStart.key ? { ...pos, x: newX, y: newY } : pos
            )
          );
        }
      } else {
        // Single player movement
        setPlayerPositions(prev =>
          prev.map((pos) =>
            pos.key === dragStart.key ? { ...pos, x: newX, y: newY } : pos
          )
        );
      }
    }

    // Update drag start position for next move
    setDragStart(prev => prev ? { ...prev, x: currentX, y: currentY } : null);
  }, [dragStart, ballPos, runners, playerPositions, fieldWidth, fieldHeight, isPlayingScenario]);

  const handleEnd = useCallback(() => {
    setDraggedPlayer(null);
    setDraggedBall(false);
    setDraggedRunner(null);
    setDragStart(null);
  }, []);

  // Memoize PanResponder creation to avoid recreating on every render
  const panRespondersRef = useRef<Map<string, ReturnType<typeof PanResponder.create>>>(new Map());

  const createPanResponder = useCallback((key: string, isBall: boolean = false, isRunner: boolean = false) => {
    const cacheKey = `${key}_${isBall}_${isRunner}`;
    
    if (!panRespondersRef.current.has(cacheKey)) {
      panRespondersRef.current.set(cacheKey, PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
          const { locationX, locationY } = evt.nativeEvent;
          handleStart(key, isBall, isRunner, locationX, locationY);
        },
        onPanResponderMove: (evt) => {
          if (!dragStart) return;
          const { locationX, locationY } = evt.nativeEvent;
          handleMove(locationX, locationY);
        },
        onPanResponderRelease: handleEnd,
        onPanResponderTerminate: handleEnd,
      }));
    }
    
    return panRespondersRef.current.get(cacheKey)!;
  }, [handleStart, handleMove, handleEnd, dragStart]);

  // Web mouse/touch handlers - use consistent coordinate system (always relative to container)
  const getWebHandlers = useCallback((key: string, isBall: boolean = false, isRunner: boolean = false) => {
    if (Platform.OS !== 'web') return {};

    return {
      // @ts-ignore - React Native Web supports these web event handlers
      onMouseDown: (e: any) => {
        e.preventDefault();
        e.stopPropagation();
        const coords = getContainerRelativeCoords(e);
        handleStart(key, isBall, isRunner, coords.x, coords.y);
      },
      // @ts-ignore - React Native Web supports these web event handlers
      onTouchStart: (e: any) => {
        e.preventDefault();
        e.stopPropagation();
        const coords = getContainerRelativeCoords(e);
        handleStart(key, isBall, isRunner, coords.x, coords.y);
      },
    };
  }, [getContainerRelativeCoords, handleStart]);

  const togglePlayerSelection = useCallback((playerKey: string) => {
    if (!showRecorder) return;
    setSelectedPlayers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(playerKey)) {
        newSet.delete(playerKey);
      } else {
        newSet.add(playerKey);
      }
      return newSet;
    });
  }, [showRecorder]);

  const selectAllPlayers = useCallback(() => {
    if (!showRecorder) return;
    setSelectedPlayers(new Set(playerPositions.map(p => p.key)));
  }, [showRecorder, playerPositions]);

  const clearSelection = useCallback(() => {
    setSelectedPlayers(new Set());
  }, []);

  const renderPlayer = useCallback((player: PlayerPosition) => {
    const panResponder = createPanResponder(player.key);
    const isDragging = draggedPlayer === player.key;
    const isSelected = selectedPlayers.has(player.key);
    const webHandlers = getWebHandlers(player.key);
    
    return (
      <Animated.View
        key={player.key}
        accessible={true}
        accessibilityLabel={`${player.label} player position`}
        accessibilityRole="button"
        style={{
          position: 'absolute',
          left: player.x - MARKER_SIZES.PLAYER.offset,
          top: player.y - MARKER_SIZES.PLAYER.offset,
          width: MARKER_SIZES.PLAYER.size,
          height: MARKER_SIZES.PLAYER.size,
          borderRadius: MARKER_SIZES.PLAYER.offset,
          backgroundColor: player.color,
          justifyContent: 'center',
          alignItems: 'center',
          borderWidth: isSelected ? 4 : (isDragging ? MARKER_SIZES.PLAYER.borderWidth.dragging : MARKER_SIZES.PLAYER.borderWidth.normal),
          borderColor: isSelected ? '#ffd700' : '#fff',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDragging ? 0.8 : (isSelected ? 0.7 : 0.5),
          shadowRadius: isDragging ? 5 : 3,
          elevation: isDragging ? 8 : (isSelected ? 7 : 5),
          transform: [{ scale: isDragging ? 1.1 : (isSelected ? 1.05 : 1) }],
          cursor: Platform.OS === 'web' ? 'pointer' : undefined,
          zIndex: isDragging ? Z_INDEX.DRAGGING : (isSelected ? 100 : Z_INDEX.NORMAL),
        }}
        {...(Platform.OS === 'web' ? webHandlers : panResponder.panHandlers)}
      >
        <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 12 }}>{player.label}</Text>
        {isSelected && showRecorder && (
          <View style={{
            position: 'absolute',
            top: -5,
            right: -5,
            width: 20,
            height: 20,
            borderRadius: 10,
            backgroundColor: '#ffd700',
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: 2,
            borderColor: '#fff',
          }}>
            <Text style={{ color: '#000', fontSize: 12, fontWeight: 'bold' }}>✓</Text>
          </View>
        )}
      </Animated.View>
    );
  }, [createPanResponder, draggedPlayer, getWebHandlers, selectedPlayers, showRecorder, multiSelectMode]);

  const renderBall = useCallback(() => {
    const panResponder = createPanResponder('ball', true);
    const isDragging = draggedBall;
    const webHandlers = getWebHandlers('ball', true);
    
    return (
      <Animated.View
        accessible={true}
        accessibilityLabel="Baseball position"
        accessibilityRole="button"
        style={{
          position: 'absolute',
          left: ballPos.x - MARKER_SIZES.BALL.offset,
          top: ballPos.y - MARKER_SIZES.BALL.offset,
          width: MARKER_SIZES.BALL.size,
          height: MARKER_SIZES.BALL.size,
          borderRadius: MARKER_SIZES.BALL.offset,
          backgroundColor: '#fff',
          justifyContent: 'center',
          alignItems: 'center',
          borderWidth: isDragging ? MARKER_SIZES.BALL.borderWidth.dragging : MARKER_SIZES.BALL.borderWidth.normal,
          borderColor: '#c00',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: isDragging ? 0.8 : 0.3,
          shadowRadius: isDragging ? 4 : 2,
          elevation: isDragging ? 6 : 3,
          transform: [{ scale: isDragging ? 1.2 : 1 }],
          cursor: Platform.OS === 'web' ? 'pointer' : undefined,
          zIndex: isDragging ? Z_INDEX.DRAGGING : Z_INDEX.NORMAL,
        }}
        {...(Platform.OS === 'web' ? webHandlers : panResponder.panHandlers)}
      >
        <Text style={{ color: '#c00', fontWeight: 'bold', fontSize: 12 }}>⚾</Text>
      </Animated.View>
    );
  }, [ballPos, createPanResponder, draggedBall, getWebHandlers]);

  const renderRunner = useCallback((runner: RunnerPosition) => {
    const panResponder = createPanResponder(runner.id, false, true);
    const isDragging = draggedRunner === runner.id;
    const webHandlers = getWebHandlers(runner.id, false, true);
    
    return (
      <Animated.View
        key={runner.id}
        accessible={true}
        accessibilityLabel="Runner position"
        accessibilityRole="button"
        style={{
          position: 'absolute',
          left: runner.x - MARKER_SIZES.RUNNER.offset,
          top: runner.y - MARKER_SIZES.RUNNER.offset,
          width: MARKER_SIZES.RUNNER.size,
          height: MARKER_SIZES.RUNNER.size,
          borderRadius: MARKER_SIZES.RUNNER.offset,
          backgroundColor: '#000000',
          justifyContent: 'center',
          alignItems: 'center',
          borderWidth: isDragging ? MARKER_SIZES.RUNNER.borderWidth.dragging : MARKER_SIZES.RUNNER.borderWidth.normal,
          borderColor: '#fff',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDragging ? 0.8 : 0.5,
          shadowRadius: isDragging ? 5 : 3,
          elevation: isDragging ? 8 : 5,
          transform: [{ scale: isDragging ? 1.1 : 1 }],
          cursor: Platform.OS === 'web' ? 'pointer' : undefined,
          zIndex: isDragging ? Z_INDEX.DRAGGING : Z_INDEX.NORMAL,
        }}
        {...(Platform.OS === 'web' ? webHandlers : panResponder.panHandlers)}
      >
        <Text style={{ 
          color: '#ffffff', 
          fontWeight: 'bold', 
          fontSize: 14,
          textShadowColor: '#000',
          textShadowOffset: { width: 1, height: 1 },
          textShadowRadius: 1
        }}>R</Text>
      </Animated.View>
    );
  }, [createPanResponder, draggedRunner, getWebHandlers]);

  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    const { x, y, width, height } = e.nativeEvent.layout;
    setContainerLayout({ x, y, width, height });
    
    // Compute square size = min(containerWidth, containerHeight) with 240px minimum
    // This ensures the field always fits inside available space, including rotation
    // 
    // RESPONSIVE LAYOUT SANITY CHECK:
    // - Field size should never exceed min(containerWidth, containerHeight)
    // - Minimum size of 240px prevents field from collapsing
    // - Square aspect ratio (aspectRatio: 1) ensures field fits in both portrait and landscape
    // - Verify in: Android Chrome portrait/landscape, iPhone Safari landscape (844x390)
    const squareSize = Math.max(240, Math.min(width, height));
    
    // Set fieldSize to computed square size - this is the single source of truth
    if (squareSize > 0 && squareSize !== fieldSize) {
      setFieldSize(squareSize);
    }
    
    // Also measure in window for accurate cross-browser coordinates
    if (fieldContainerRef.current) {
      fieldContainerRef.current.measureInWindow((winX, winY, winWidth, winHeight) => {
        setContainerWindowLayout({ x: winX, y: winY, width: winWidth, height: winHeight });
      });
    }
  }, [fieldSize]);

  const webEventHandlers = useMemo(() => {
    if (Platform.OS !== 'web') return {};
    
    return {
      // @ts-ignore - React Native Web supports these web event handlers
      onMouseMove: (e: any) => {
        if (dragStart) {
          const coords = getContainerRelativeCoords(e);
          handleMove(coords.x, coords.y);
        }
      },
      // @ts-ignore
      onMouseUp: () => {
        if (dragStart) handleEnd();
      },
      // @ts-ignore
      onMouseLeave: () => {
        if (dragStart) handleEnd();
      },
      // @ts-ignore
      onTouchMove: (e: any) => {
        if (dragStart) {
          e.preventDefault();
          const coords = getContainerRelativeCoords(e);
          handleMove(coords.x, coords.y);
        }
      },
      // @ts-ignore
      onTouchEnd: () => {
        if (dragStart) handleEnd();
      },
    };
  }, [dragStart, getContainerRelativeCoords, handleMove, handleEnd]);

  if (layoutMode === 'wide') {
    return (
      <View style={{ flex: 1, flexDirection: 'row', width: '100%', overflow: 'hidden' }}>
        {/* Left: FieldCanvas */}
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20, overflow: 'hidden' }}>
          <FieldCanvas
            fieldSize={fieldSize}
            playerPositions={playerPositions}
            ballPos={ballPos}
            runners={runners}
            setContainerRef={setContainerRef}
            handleLayout={handleLayout}
            webEventHandlers={webEventHandlers}
            renderPlayer={renderPlayer}
            renderBall={renderBall}
            renderRunner={renderRunner}
            layoutMode="wide"
          />
        </View>
        
        {/* Right: Playback Dock (if playing) and FieldControls in fixed-width panel (360-420px) */}
        <View style={{ width: 390, minWidth: 360, maxWidth: 420, backgroundColor: '#f5f5f5', borderLeftWidth: 1, borderLeftColor: '#ddd', flexDirection: 'column' }}>
          {/* Playback Dock at top of right panel */}
          {renderPlaybackDock && renderPlaybackDock()}
          
          {/* FieldControls below Playback Dock */}
          <ScrollView 
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 20 }}
            showsVerticalScrollIndicator={true}
          >
            <FieldControls
              fieldSize={fieldSize}
              showRecorder={showRecorder}
              showLibrary={showLibrary}
              coachModeUnlocked={coachModeUnlocked}
              multiSelectMode={multiSelectMode}
              selectedPlayers={selectedPlayers}
              playerPositions={playerPositions}
              ballPos={ballPos}
              runners={runners}
              addRunner={addRunner}
              removeRunner={removeRunner}
              resetPositions={resetPositions}
              handleRecordButtonPress={handleRecordButtonPress}
              setShowLibrary={setShowLibrary}
              setMultiSelectMode={setMultiSelectMode}
              clearSelection={clearSelection}
              selectAllPlayers={selectAllPlayers}
              handleSaveScenario={handleSaveScenario}
              handleSelectScenario={handleSelectScenario}
              setShowRecorder={setShowRecorder}
            />
          </ScrollView>
        </View>
      </View>
    );
  }

  // Prepare controls props
  const controlsProps = {
    fieldSize,
    showRecorder,
    showLibrary,
    coachModeUnlocked,
    multiSelectMode,
    selectedPlayers,
    playerPositions,
    ballPos,
    runners,
    addRunner,
    removeRunner,
    resetPositions,
    handleRecordButtonPress,
    setShowLibrary,
    setMultiSelectMode,
    clearSelection,
    selectAllPlayers,
    handleSaveScenario,
    handleSelectScenario,
    setShowRecorder,
    collapsed: controlsCollapsed,
  };

  // Notify parent of controls props changes when renderControlsSeparately is true
  useEffect(() => {
    if (renderControlsSeparately && onControlsPropsChange) {
      onControlsPropsChange(controlsProps);
    }
  }, [renderControlsSeparately, onControlsPropsChange, fieldSize, showRecorder, showLibrary, coachModeUnlocked, multiSelectMode, selectedPlayers.size, playerPositions.length, ballPos.x, ballPos.y, runners.length, controlsCollapsed]);

  // Compact layout (default)
  // If renderControlsSeparately is true, only render FieldCanvas (controls rendered by parent)
  if (renderControlsSeparately) {
    return (
      <View style={{ width: '100%', alignItems: 'center', paddingHorizontal: 10 }}>
        <FieldCanvas
          fieldSize={fieldSize}
          playerPositions={playerPositions}
          ballPos={ballPos}
          runners={runners}
          setContainerRef={setContainerRef}
          handleLayout={handleLayout}
          webEventHandlers={webEventHandlers}
          renderPlayer={renderPlayer}
          renderBall={renderBall}
          renderRunner={renderRunner}
          layoutMode="compact"
        />
      </View>
    );
  }

  // Default compact layout (both canvas and controls together)
  return (
    <View style={{ width: '100%', alignItems: 'center', paddingHorizontal: 10 }}>
      <FieldCanvas
        fieldSize={fieldSize}
        playerPositions={playerPositions}
        ballPos={ballPos}
        runners={runners}
        setContainerRef={setContainerRef}
        handleLayout={handleLayout}
        webEventHandlers={webEventHandlers}
        renderPlayer={renderPlayer}
        renderBall={renderBall}
        renderRunner={renderRunner}
        layoutMode="compact"
      />
      
      <FieldControls {...controlsProps} />
    </View>
  );
}

// Export components for external use
export { FieldCanvas, FieldControls };
