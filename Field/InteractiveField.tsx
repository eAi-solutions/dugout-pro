import React, { useState, useRef, useEffect } from 'react';
import { View, Dimensions, Text, PanResponder, Animated, TouchableOpacity, Platform } from 'react-native';
import BaseballFieldImage from './BaseballFieldImage';

// Field dimensions will be calculated dynamically based on viewport
const getFieldDimensions = () => {
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  
  if (Platform.OS === 'web') {
    // On web, use 90% of viewport width, but cap at 900px max, and ensure it fits height too
    const maxWidth = Math.min(900, screenWidth * 0.9);
    const maxHeight = (screenHeight - 200) * 0.9; // Leave space for header and buttons
    const fieldSize = Math.min(maxWidth, maxHeight);
    return Math.max(400, fieldSize); // Minimum 400px
  } else {
    // On mobile, use full width minus padding
    return screenWidth - 40;
  }
};

// Initialize positions based on field dimensions - standard baseball positions
// Positions are percentage-based (0.0 to 1.0) so they scale correctly with field size
// Based on standard baseball field layout: home plate at bottom center, bases form diamond
// Coordinates match the actual baseball-field.png image layout
// FINALIZED POSITIONS - These coordinates are locked in and will scale proportionally
// across all devices, browsers, and screen sizes
const getInitialPositions = (width: number) => {
  // All positions use width for both x and y since field is square
  // React Native coordinates: (0,0) is top-left, y increases downward
  // Home plate is at bottom (y ~ 0.88), center field is at top (y ~ 0.12-0.15)
  return [
    { key: 'P', label: 'P', x: width * 0.35, y: width * 0.66, color: '#e74c3c' },      // Pitcher - centered on mound
    { key: 'C', label: 'C', x: width * 0.35, y: width * 0.83, color: '#3498db' },      // Catcher - directly behind home plate
    { key: '1B', label: '1B', x: width * 0.51, y: width * 0.61, color: '#2ecc71' },  // First Baseman - just past 1B base towards home (right side)
    { key: '2B', label: '2B', x: width * 0.45, y: width * 0.50, color: '#f39c12' },   // Second Baseman - between 1B and 2B, closer to 2B
    { key: '3B', label: '3B', x: width * 0.21, y: width * 0.60, color: '#9b59b6' }, // Third Baseman - just past 3B base towards home (left side)
    { key: 'SS', label: 'SS', x: width * 0.25, y: width * 0.50, color: '#1abc9c' },  // Shortstop - between 2B and 3B, closer to 2B
    { key: 'LF', label: 'LF', x: width * 0.11, y: width * 0.36, color: '#34495e' },  // Left Fielder - deep left outfield
    { key: 'CF', label: 'CF', x: width * 0.35, y: width * 0.29, color: '#e67e22' },   // Center Fielder - deep center outfield
    { key: 'RF', label: 'RF', x: width * 0.58, y: width * 0.36, color: '#27ae60' },   // Right Fielder - deep right outfield
  ];
};

interface InteractiveFieldProps {
  onReset?: () => void;
}

export default function InteractiveField({ onReset }: InteractiveFieldProps) {
  // Calculate initial field dimensions
  const initialDim = getFieldDimensions();
  
  // Calculate field dimensions dynamically
  const [fieldDimensions, setFieldDimensions] = useState({ width: initialDim, height: initialDim });

  const fieldWidth = fieldDimensions.width;
  const fieldHeight = fieldDimensions.height;

  // Initialize positions with correct field dimensions
  const [playerPositions, setPlayerPositions] = useState(() => getInitialPositions(initialDim));
  const [ballPos, setBallPos] = useState(() => ({ x: initialDim * 0.35, y: initialDim * 0.70 }));
  const [runners, setRunners] = useState<Array<{id: string, x: number, y: number}>>([]);
  const [draggedPlayer, setDraggedPlayer] = useState<string | null>(null);
  const [draggedBall, setDraggedBall] = useState(false);
  const [draggedRunner, setDraggedRunner] = useState<string | null>(null);

  // Recalculate on dimension changes
  useEffect(() => {
    const updateDimensions = () => {
      const dim = getFieldDimensions();
      setFieldDimensions({ width: dim, height: dim });
    };

    const subscription = Dimensions.addEventListener('change', updateDimensions);
    updateDimensions(); // Initial calculation

    // Also update on window resize for web
    if (Platform.OS === 'web') {
      const handleResize = () => {
        setTimeout(updateDimensions, 100); // Small delay to ensure dimensions are updated
      };
      window.addEventListener('resize', handleResize);
      return () => {
        subscription?.remove();
        window.removeEventListener('resize', handleResize);
      };
    }

    return () => subscription?.remove();
  }, []);

  // Attach native DOM event listeners for more reliable coordinate tracking
  useEffect(() => {
    if (Platform.OS !== 'web' || !containerDOMRef.current) return;

    const container = containerDOMRef.current;
    
    const handleMouseMove = (e: MouseEvent) => {
      if (dragStart) {
        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        handleMove(x, y);
      }
    };

    const handleMouseUp = () => {
      if (dragStart) handleEnd();
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (dragStart) {
        e.preventDefault();
        const touch = e.touches[0] || e.changedTouches[0];
        if (touch) {
          const rect = container.getBoundingClientRect();
          const x = touch.clientX - rect.left;
          const y = touch.clientY - rect.top;
          handleMove(x, y);
        }
      }
    };

    const handleTouchEnd = () => {
      if (dragStart) handleEnd();
    };

    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseup', handleMouseUp);
    container.addEventListener('mouseleave', handleMouseUp);
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);
    container.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseup', handleMouseUp);
      container.removeEventListener('mouseleave', handleMouseUp);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [dragStart]);

  // Update positions when field size changes - recalculate based on new dimensions
  useEffect(() => {
    if (fieldWidth > 0) {
      setPlayerPositions(getInitialPositions(fieldWidth));
      setBallPos({ x: fieldWidth * 0.35, y: fieldWidth * 0.70 });
    }
  }, [fieldWidth]);

  const resetPositions = () => {
    setPlayerPositions(getInitialPositions(fieldWidth));
    setBallPos({ x: fieldWidth * 0.35, y: fieldWidth * 0.70 });
    setRunners([]);
    setDraggedPlayer(null);
    setDraggedBall(false);
    setDraggedRunner(null);
    // Call the parent reset function if provided
    if (onReset) {
      onReset();
    }
  };

  const addRunner = () => {
    const newRunner = {
      id: `runner_${Date.now()}`,
      x: fieldWidth * 0.85, // Bottom right area
      y: fieldWidth * 0.85
    };
    setRunners(prev => [...prev, newRunner]);
  };

  const removeRunner = () => {
    if (runners.length > 0) {
      setRunners(prev => prev.slice(0, -1)); // Remove the last runner
    }
  };

  const fieldContainerRef = useRef<View>(null);
  const containerDOMRef = useRef<HTMLElement | null>(null);
  const [containerLayout, setContainerLayout] = useState<{x: number, y: number, width: number, height: number} | null>(null);
  const [containerWindowLayout, setContainerWindowLayout] = useState<{x: number, y: number, width: number, height: number} | null>(null);
  const [dragStart, setDragStart] = useState<{x: number, y: number, key: string, isBall: boolean, isRunner: boolean} | null>(null);
  
  // Callback ref to get direct DOM element access
  const setContainerRef = (node: View | null) => {
    fieldContainerRef.current = node;
    if (Platform.OS === 'web' && node) {
      // @ts-ignore
      containerDOMRef.current = node._nativeNode || 
        // @ts-ignore
        node._internalFiberInstanceHandleDEV?.stateNode || 
        // @ts-ignore
        (node.nodeType === 1 ? node : null);
    }
  };

  // Get container's bounding rect for accurate positioning across all browsers
  // Use measureInWindow for React Native (works on web too) which gives window-relative coordinates
  const getContainerBounds = (): {x: number, y: number, width: number, height: number} | null => {
    // Prefer window layout from measureInWindow as it's most reliable
    if (containerWindowLayout) {
      return containerWindowLayout;
    }
    
    // Fallback to onLayout if measureInWindow hasn't been called yet
    if (containerLayout) {
      return containerLayout;
    }
    
    // Last resort: try getBoundingClientRect on web
    if (Platform.OS === 'web' && fieldContainerRef.current) {
      try {
        // @ts-ignore - accessing DOM element
        let element = fieldContainerRef.current._nativeNode;
        if (!element) {
          // @ts-ignore - alternative access method
          element = fieldContainerRef.current._internalFiberInstanceHandleDEV?.stateNode;
        }
        if (!element) {
          // @ts-ignore - another alternative
          element = fieldContainerRef.current;
        }
        
        if (element && typeof element.getBoundingClientRect === 'function') {
          const rect = element.getBoundingClientRect();
          return {
            x: rect.left,
            y: rect.top,
            width: rect.width,
            height: rect.height
          };
        }
      } catch (e) {
        // Silently fail and return null
      }
    }
    
    return null;
  };

  const handleStart = (key: string, isBall: boolean, isRunner: boolean, startX: number, startY: number) => {
    if (isBall) {
      setDraggedBall(true);
      setDragStart({ x: startX, y: startY, key, isBall: true, isRunner: false });
    } else if (isRunner) {
      setDraggedRunner(key);
      setDragStart({ x: startX, y: startY, key, isBall: false, isRunner: true });
    } else {
      setDraggedPlayer(key);
      setDragStart({ x: startX, y: startY, key, isBall: false, isRunner: false });
    }
  };

  const handleMove = (currentX: number, currentY: number) => {
    if (!dragStart) return;

    const deltaX = currentX - dragStart.x;
    const deltaY = currentY - dragStart.y;

    let currentPos;
    if (dragStart.isBall) {
      currentPos = ballPos;
    } else if (dragStart.isRunner) {
      currentPos = runners.find(r => r.id === dragStart.key);
    } else {
      currentPos = playerPositions.find(p => p.key === dragStart.key);
    }

    if (!currentPos) return;

    const newX = Math.max(18, Math.min(fieldWidth - 18, currentPos.x + deltaX));
    const newY = Math.max(18, Math.min(fieldHeight - 18, currentPos.y + deltaY));

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
  };

  const handleEnd = () => {
    setDraggedPlayer(null);
    setDraggedBall(false);
    setDraggedRunner(null);
    setDragStart(null);
  };

  const createPanResponder = (key: string, isBall: boolean = false, isRunner: boolean = false) => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        handleStart(key, isBall, isRunner, locationX, locationY);
      },
      onPanResponderMove: (evt, gestureState) => {
        if (!dragStart) return;
        const { locationX, locationY } = evt.nativeEvent;
        handleMove(locationX, locationY);
      },
      onPanResponderRelease: handleEnd,
      onPanResponderTerminate: handleEnd,
    });
  };

  // Web mouse/touch handlers - use direct DOM element access for accurate coordinates
  const getWebHandlers = (key: string, isBall: boolean = false, isRunner: boolean = false) => {
    if (Platform.OS !== 'web') return {};
    
    const getRelativeCoords = (e: any, callback: (coords: {x: number, y: number}) => void) => {
      const nativeEvent = e.nativeEvent || e;
      const originalEvent = e.originalEvent || e;
      
      // PRIORITY 1: Use offsetX/offsetY - these are directly relative to the target element
      // This is the most reliable method as it doesn't require any calculations
      if (originalEvent && originalEvent.offsetX !== undefined && originalEvent.offsetY !== undefined) {
        callback({
          x: originalEvent.offsetX,
          y: originalEvent.offsetY
        });
        return;
      }
      
      // PRIORITY 2: Try offsetX/offsetY from nativeEvent
      if (nativeEvent.offsetX !== undefined && nativeEvent.offsetY !== undefined) {
        callback({
          x: nativeEvent.offsetX,
          y: nativeEvent.offsetY
        });
        return;
      }
      
      // PRIORITY 3: Use layerX/layerY (deprecated but sometimes more reliable)
      if (originalEvent && originalEvent.layerX !== undefined && originalEvent.layerY !== undefined) {
        callback({
          x: originalEvent.layerX,
          y: originalEvent.layerY
        });
        return;
      }
      
      // FALLBACK: Calculate from viewport coordinates
      let clientX = 0;
      let clientY = 0;
      
      if (nativeEvent.touches || nativeEvent.changedTouches) {
        const touch = nativeEvent.touches?.[0] || nativeEvent.changedTouches?.[0] || nativeEvent;
        clientX = touch.clientX !== undefined ? touch.clientX : (touch.pageX !== undefined ? touch.pageX - (window.scrollX || window.pageXOffset || 0) : 0);
        clientY = touch.clientY !== undefined ? touch.clientY : (touch.pageY !== undefined ? touch.pageY - (window.scrollY || window.pageYOffset || 0) : 0);
      } else {
        clientX = nativeEvent.clientX !== undefined ? nativeEvent.clientX : (nativeEvent.pageX !== undefined ? nativeEvent.pageX - (window.scrollX || window.pageXOffset || 0) : 0);
        clientY = nativeEvent.clientY !== undefined ? nativeEvent.clientY : (nativeEvent.pageY !== undefined ? nativeEvent.pageY - (window.scrollY || window.pageYOffset || 0) : 0);
      }
      
      // Use getBoundingClientRect on the cached DOM element
      if (containerDOMRef.current && typeof containerDOMRef.current.getBoundingClientRect === 'function') {
        const rect = containerDOMRef.current.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        callback({ x, y });
      } else if (fieldContainerRef.current) {
        fieldContainerRef.current.measureInWindow((winX, winY, winWidth, winHeight) => {
          const x = clientX - winX;
          const y = clientY - winY;
          callback({ x, y });
        });
      } else {
        callback({ x: 0, y: 0 });
      }
    };
    
    return {
      onMouseDown: (e: any) => {
        e.preventDefault();
        e.stopPropagation();
        getRelativeCoords(e, (coords) => {
          handleStart(key, isBall, isRunner, coords.x, coords.y);
        });
      },
      onTouchStart: (e: any) => {
        e.preventDefault();
        e.stopPropagation();
        getRelativeCoords(e, (coords) => {
          handleStart(key, isBall, isRunner, coords.x, coords.y);
        });
      },
    };
  };

  const renderPlayer = (player: any) => {
    const panResponder = createPanResponder(player.key);
    const isDragging = draggedPlayer === player.key;
    const webHandlers = getWebHandlers(player.key);
    
    return (
      <Animated.View
        key={player.key}
        style={{
          position: 'absolute',
          left: player.x - 18,
          top: player.y - 18,
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: player.color,
          justifyContent: 'center',
          alignItems: 'center',
          borderWidth: isDragging ? 3 : 2,
          borderColor: '#fff',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDragging ? 0.8 : 0.5,
          shadowRadius: isDragging ? 5 : 3,
          elevation: isDragging ? 8 : 5,
          transform: [{ scale: isDragging ? 1.1 : 1 }],
          cursor: Platform.OS === 'web' ? 'grab' : 'default',
          zIndex: isDragging ? 1000 : 10,
        }}
        {...(Platform.OS === 'web' ? webHandlers : panResponder.panHandlers)}
      >
        <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 12 }}>{player.label}</Text>
      </Animated.View>
    );
  };

  const renderBall = () => {
    const panResponder = createPanResponder('ball', true);
    const isDragging = draggedBall;
    const webHandlers = getWebHandlers('ball', true);
    
    return (
      <Animated.View
        style={{
          position: 'absolute',
          left: ballPos.x - 12,
          top: ballPos.y - 12,
          width: 24,
          height: 24,
          borderRadius: 12,
          backgroundColor: '#fff',
          justifyContent: 'center',
          alignItems: 'center',
          borderWidth: isDragging ? 3 : 2,
          borderColor: '#c00',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: isDragging ? 0.8 : 0.3,
          shadowRadius: isDragging ? 4 : 2,
          elevation: isDragging ? 6 : 3,
          transform: [{ scale: isDragging ? 1.2 : 1 }],
          cursor: Platform.OS === 'web' ? 'grab' : 'default',
          zIndex: isDragging ? 1000 : 10,
        }}
        {...(Platform.OS === 'web' ? webHandlers : panResponder.panHandlers)}
      >
        <Text style={{ color: '#c00', fontWeight: 'bold', fontSize: 12 }}>⚾</Text>
      </Animated.View>
    );
  };

  const renderRunner = (runner: {id: string, x: number, y: number}) => {
    const panResponder = createPanResponder(runner.id, false, true);
    const isDragging = draggedRunner === runner.id;
    const webHandlers = getWebHandlers(runner.id, false, true);
    
    return (
      <Animated.View
        key={runner.id}
        style={{
          position: 'absolute',
          left: runner.x - 15,
          top: runner.y - 15,
          width: 30,
          height: 30,
          borderRadius: 15,
          backgroundColor: '#000000',
          justifyContent: 'center',
          alignItems: 'center',
          borderWidth: isDragging ? 3 : 2,
          borderColor: '#fff',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDragging ? 0.8 : 0.5,
          shadowRadius: isDragging ? 5 : 3,
          elevation: isDragging ? 8 : 5,
          transform: [{ scale: isDragging ? 1.1 : 1 }],
          cursor: Platform.OS === 'web' ? 'grab' : 'default',
          zIndex: isDragging ? 1000 : 10,
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
  };

  return (
    <View style={{ width: '100%', alignItems: 'center', paddingHorizontal: 10 }}>
      <View 
        ref={setContainerRef}
        style={{ 
          width: fieldWidth, 
          height: fieldHeight, 
          alignSelf: 'center', 
          marginVertical: 20, 
          position: 'relative',
          maxWidth: '100%'
        }}
        onLayout={(e) => {
          const { x, y, width, height } = e.nativeEvent.layout;
          setContainerLayout({ x, y, width, height });
          
          // Also measure in window for accurate cross-browser coordinates
          if (fieldContainerRef.current) {
            fieldContainerRef.current.measureInWindow((winX, winY, winWidth, winHeight) => {
              setContainerWindowLayout({ x: winX, y: winY, width: winWidth, height: winHeight });
            });
          }
        }}
        // Move events are now handled by native DOM listeners in useEffect
      >
        {/* Image-based Baseball Field Background */}
        <BaseballFieldImage width={fieldWidth} height={fieldHeight} />
        
        {/* Overlay Players, Ball, and Runners on top of field */}
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
      </View>

      {/* Add/Remove Runner Buttons */}
      <View style={{ 
        marginTop: 20,
        width: fieldWidth,
        maxWidth: '100%',
        flexDirection: 'row', 
        justifyContent: 'center', 
        alignItems: 'center',
        gap: 15
      }}>
        <TouchableOpacity
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
        width: fieldWidth,
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
        style={{ marginTop: 15, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#e74c3c', borderRadius: 8, alignSelf: 'center' }}
        onPress={resetPositions}
      >
        <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>Reset Positions</Text>
      </TouchableOpacity>
    </View>
  );
}