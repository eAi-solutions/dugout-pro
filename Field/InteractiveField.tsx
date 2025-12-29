import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { View, Text, PanResponder, Animated, TouchableOpacity, Platform, LayoutChangeEvent } from 'react-native';
import BaseballFieldImage from './BaseballFieldImage';

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

export default function InteractiveField({ onReset }: InteractiveFieldProps) {
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
      setDraggedPlayer(key);
      setDragStart({ x: clampedX, y: clampedY, key, isBall: false, isRunner: false });
    }
  }, [fieldWidth, fieldHeight]);

  const handleMove = useCallback((currentX: number, currentY: number) => {
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
      setPlayerPositions(prev =>
        prev.map((pos) =>
          pos.key === dragStart.key ? { ...pos, x: newX, y: newY } : pos
        )
      );
    }

    // Update drag start position for next move
    setDragStart(prev => prev ? { ...prev, x: currentX, y: currentY } : null);
  }, [dragStart, ballPos, runners, playerPositions, fieldWidth, fieldHeight]);

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

  const renderPlayer = useCallback((player: PlayerPosition) => {
    const panResponder = createPanResponder(player.key);
    const isDragging = draggedPlayer === player.key;
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
          borderWidth: isDragging ? MARKER_SIZES.PLAYER.borderWidth.dragging : MARKER_SIZES.PLAYER.borderWidth.normal,
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
        <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 12 }}>{player.label}</Text>
      </Animated.View>
    );
  }, [createPanResponder, draggedPlayer, getWebHandlers]);

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
    
    // Set fieldSize to actual rendered width - this is the single source of truth
    if (width > 0 && width !== fieldSize) {
      setFieldSize(width);
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

  return (
    <View style={{ width: '100%', alignItems: 'center', paddingHorizontal: 10 }}>
      <View 
        ref={setContainerRef}
        accessible={true}
        accessibilityLabel="Baseball field interactive diagram"
        style={{ 
          width: '100%',
          maxWidth: 900,
          aspectRatio: 1,
          alignSelf: 'center', 
          marginVertical: 20, 
          position: 'relative',
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
    </View>
  );
}
