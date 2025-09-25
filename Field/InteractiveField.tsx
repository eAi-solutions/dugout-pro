import React, { useState } from 'react';
import { View, Dimensions, Text, PanResponder, Animated, TouchableOpacity } from 'react-native';
import BaseballFieldImage from './BaseballFieldImage';

const { width: screenWidth } = Dimensions.get('window');
const fieldWidth = screenWidth;
const fieldHeight = screenWidth;

const positions = [
  { key: 'P', label: 'P', x: screenWidth * 0.5, y: screenWidth * 0.6, color: '#e74c3c' },
  { key: 'C', label: 'C', x: screenWidth * 0.5, y: screenWidth * 0.9, color: '#3498db' },
  { key: '1B', label: '1B', x: screenWidth * 0.72, y: screenWidth * 0.75, color: '#2ecc71' },
  { key: '2B', label: '2B', x: screenWidth * 0.6, y: screenWidth * 0.5, color: '#f39c12' },
  { key: '3B', label: '3B', x: screenWidth * 0.28, y: screenWidth * 0.75, color: '#9b59b6' },
  { key: 'SS', label: 'SS', x: screenWidth * 0.4, y: screenWidth * 0.5, color: '#1abc9c' },
  { key: 'LF', label: 'LF', x: screenWidth * 0.2, y: screenWidth * 0.35, color: '#34495e' },
  { key: 'CF', label: 'CF', x: screenWidth * 0.5, y: screenWidth * 0.2, color: '#e67e22' },
  { key: 'RF', label: 'RF', x: screenWidth * 0.8, y: screenWidth * 0.35, color: '#27ae60' },
];

interface InteractiveFieldProps {
  onReset?: () => void;
}

export default function InteractiveField({ onReset }: InteractiveFieldProps) {
  const [playerPositions, setPlayerPositions] = useState(positions);
  const [ballPos, setBallPos] = useState({ x: screenWidth * 0.55, y: screenWidth * 0.55 });
  const [runners, setRunners] = useState<Array<{id: string, x: number, y: number}>>([]);
  const [draggedPlayer, setDraggedPlayer] = useState<string | null>(null);
  const [draggedBall, setDraggedBall] = useState(false);
  const [draggedRunner, setDraggedRunner] = useState<string | null>(null);

  const resetPositions = () => {
    setPlayerPositions(positions);
    setBallPos({ x: screenWidth * 0.55, y: screenWidth * 0.55 });
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
      x: screenWidth * 0.85, // Bottom right area
      y: screenWidth * 0.85
    };
    setRunners(prev => [...prev, newRunner]);
  };

  const removeRunner = () => {
    if (runners.length > 0) {
      setRunners(prev => prev.slice(0, -1)); // Remove the last runner
    }
  };

  const createPanResponder = (key: string, isBall: boolean = false, isRunner: boolean = false) => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        if (isBall) {
          setDraggedBall(true);
        } else if (isRunner) {
          setDraggedRunner(key);
        } else {
          setDraggedPlayer(key);
        }
      },
      onPanResponderMove: (evt, gestureState) => {
        // Use gestureState.dx and dy for relative movement
        let currentPos;
        if (isBall) {
          currentPos = ballPos;
        } else if (isRunner) {
          currentPos = runners.find(r => r.id === key);
        } else {
          currentPos = playerPositions.find(p => p.key === key);
        }
        
        if (!currentPos) return;
        
        const newX = Math.max(18, Math.min(screenWidth - 18, currentPos.x + gestureState.dx));
        const newY = Math.max(18, Math.min(screenWidth - 18, currentPos.y + gestureState.dy));
        
        if (isBall) {
          setBallPos({ x: newX, y: newY });
        } else if (isRunner) {
          setRunners(prev =>
            prev.map((runner) =>
              runner.id === key ? { ...runner, x: newX, y: newY } : runner
            )
          );
        } else {
          setPlayerPositions(prev =>
            prev.map((pos) =>
              pos.key === key ? { ...pos, x: newX, y: newY } : pos
            )
          );
        }
      },
      onPanResponderRelease: () => {
        setDraggedPlayer(null);
        setDraggedBall(false);
        setDraggedRunner(null);
      },
    });
  };

  const renderPlayer = (player: any) => {
    const panResponder = createPanResponder(player.key);
    const isDragging = draggedPlayer === player.key;
    
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
        }}
        {...panResponder.panHandlers}
      >
        <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 12 }}>{player.label}</Text>
      </Animated.View>
    );
  };

  const renderBall = () => {
    const panResponder = createPanResponder('ball', true);
    const isDragging = draggedBall;
    
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
        }}
        {...panResponder.panHandlers}
      >
        <Text style={{ color: '#c00', fontWeight: 'bold', fontSize: 12 }}>⚾</Text>
      </Animated.View>
    );
  };

  const renderRunner = (runner: {id: string, x: number, y: number}) => {
    const panResponder = createPanResponder(runner.id, false, true);
    const isDragging = draggedRunner === runner.id;
    
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
        }}
        {...panResponder.panHandlers}
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
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <View style={{ 
        width: screenWidth, 
        height: screenWidth, 
        alignSelf: 'center', 
        marginVertical: 20, 
        position: 'relative'
      }}>
        {/* Image-based Baseball Field Background */}
        <BaseballFieldImage />
        
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
      <View style={{ marginTop: 20, padding: 15, backgroundColor: '#f0f0f0', borderRadius: 8, alignItems: 'center' }}>
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