// TEST VERSION - ChatGPT's suggested approach
// Original backup saved as InteractiveField_backup.tsx
// This version uses ImageBackground with normalized percentage positions for better browser alignment

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Platform,
  ImageBackground,
  LayoutChangeEvent,
} from 'react-native';

type PlayerKey = 'P' | 'C' | '1B' | '2B' | '3B' | 'SS' | 'LF' | 'CF' | 'RF';

type NormalizedPos = {
  key: PlayerKey;
  label: string;
  nx: number; // 0..1 across width (left→right)
  ny: number; // 0..1 across height (top→bottom)
  color: string;
};

type RunnerPos = {
  id: string;
  nx: number;
  ny: number;
};

interface InteractiveFieldProps {
  onReset?: () => void;
}

// Normalized base positions (tweak these once visually; they'll be correct in all browsers)
const BASE_POSITIONS: NormalizedPos[] = [
  { key: 'P',  label: 'P',  nx: 0.35, ny: 0.66, color: '#e74c3c' },
  { key: 'C',  label: 'C',  nx: 0.35, ny: 0.83, color: '#3498db' },
  { key: '1B', label: '1B', nx: 0.51, ny: 0.61, color: '#2ecc71' },
  { key: '2B', label: '2B', nx: 0.45, ny: 0.50, color: '#f39c12' },
  { key: '3B', label: '3B', nx: 0.21, ny: 0.60, color: '#9b59b6' },
  { key: 'SS', label: 'SS', nx: 0.25, ny: 0.50, color: '#1abc9c' },
  { key: 'LF', label: 'LF', nx: 0.11, ny: 0.36, color: '#34495e' },
  { key: 'CF', label: 'CF', nx: 0.35, ny: 0.29, color: '#e67e22' },
  { key: 'RF', label: 'RF', nx: 0.58, ny: 0.36, color: '#27ae60' },
];

export default function InteractiveField({ onReset }: InteractiveFieldProps) {
  // Container pixel size (needed only for drag → normalized)
  const [fieldSize, setFieldSize] = useState({ width: 0, height: 0 });

  // Normalized state
  const [players, setPlayers] = useState<NormalizedPos[]>(BASE_POSITIONS);
  const [ballPos, setBallPos] = useState<{ nx: number; ny: number }>({
    nx: 0.35,
    ny: 0.70,
  });
  const [runners, setRunners] = useState<RunnerPos[]>([]);

  // Drag state
  const dragTarget = useRef<
    | { type: 'player'; key: PlayerKey }
    | { type: 'ball' }
    | { type: 'runner'; id: string }
    | null
  >(null);

  const onFieldLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width !== fieldSize.width || height !== fieldSize.height) {
      setFieldSize({ width, height });
    }
  };

  // Helpers to go between pixels <-> normalized
  const toNormalized = (x: number, y: number) => {
    const { width, height } = fieldSize;
    if (width <= 0 || height <= 0) return { nx: 0, ny: 0 };
    const nx = Math.min(1, Math.max(0, x / width));
    const ny = Math.min(1, Math.max(0, y / height));
    return { nx, ny };
  };

  const pointerToFieldCoords = (e: any) => {
    const nativeEvent = e.nativeEvent || e;
    let clientX = 0;
    let clientY = 0;

    if (nativeEvent.touches && nativeEvent.touches[0]) {
      clientX = nativeEvent.touches[0].clientX;
      clientY = nativeEvent.touches[0].clientY;
    } else if (nativeEvent.changedTouches && nativeEvent.changedTouches[0]) {
      clientX = nativeEvent.changedTouches[0].clientX;
      clientY = nativeEvent.changedTouches[0].clientY;
    } else {
      clientX = nativeEvent.clientX ?? nativeEvent.pageX ?? 0;
      clientY = nativeEvent.clientY ?? nativeEvent.pageY ?? 0;
    }

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    return { x, y };
  };

  const startDrag = (
    kind: 'player' | 'ball' | 'runner',
    id: PlayerKey | string
  ) => {
    if (kind === 'player') {
      dragTarget.current = { type: 'player', key: id as PlayerKey };
    } else if (kind === 'ball') {
      dragTarget.current = { type: 'ball' };
    } else {
      dragTarget.current = { type: 'runner', id: id as string };
    }
  };

  const moveDrag = (nx: number, ny: number) => {
    const target = dragTarget.current;
    if (!target) return;

    if (target.type === 'ball') {
      setBallPos({ nx, ny });
    } else if (target.type === 'player') {
      setPlayers((prev) =>
        prev.map((p) =>
          p.key === target.key ? { ...p, nx, ny } : p
        )
      );
    } else if (target.type === 'runner') {
      setRunners((prev) =>
        prev.map((r) =>
          r.id === target.id ? { ...r, nx, ny } : r
        )
      );
    }
  };

  const endDrag = () => {
    dragTarget.current = null;
  };

  // Web-only global handlers for move/up (keeps drag smooth)
  const webHandlers =
    Platform.OS === 'web'
      ? {
          onMouseMove: (e: any) => {
            if (!dragTarget.current) return;
            const { x, y } = pointerToFieldCoords(e);
            const { nx, ny } = toNormalized(x, y);
            moveDrag(nx, ny);
          },
          onMouseUp: () => {
            if (dragTarget.current) endDrag();
          },
          onMouseLeave: () => {
            if (dragTarget.current) endDrag();
          },
          onTouchMove: (e: any) => {
            if (!dragTarget.current) return;
            e.preventDefault();
            const { x, y } = pointerToFieldCoords(e);
            const { nx, ny } = toNormalized(x, y);
            moveDrag(nx, ny);
          },
          onTouchEnd: () => {
            if (dragTarget.current) endDrag();
          },
        }
      : {};

  const markerCommon = {
    position: 'absolute' as const,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  };

  const resetPositions = () => {
    setPlayers(BASE_POSITIONS);
    setBallPos({ nx: 0.35, ny: 0.70 });
    setRunners([]);
    dragTarget.current = null;
    onReset && onReset();
  };

  const addRunner = () => {
    setRunners((prev) => [
      ...prev,
      { id: `runner_${Date.now()}`, nx: 0.85, ny: 0.85 },
    ]);
  };

  const removeRunner = () => {
    setRunners((prev) => prev.slice(0, -1));
  };

  return (
    <View style={{ width: '100%', alignItems: 'center', paddingHorizontal: 10 }}>
      <View
        // This is the single field box: image + markers share this coord system
        style={{
          width: '100%',
          maxWidth: 900,
          // Use real image aspect ratio (approx from your screenshot: 1168x1024)
          aspectRatio: 1168 / 1024,
          alignSelf: 'center',
          marginVertical: 20,
        }}
      >
        <ImageBackground
          source={require('../assets/baseball-field.png')}
          style={{ flex: 1, position: 'relative' }}
          imageStyle={{ resizeMode: 'cover' }}
          onLayout={onFieldLayout}
          {...webHandlers}
        >
          {/* Players */}
          {players.map((p) => (
            <View
              key={p.key}
              style={{
                ...markerCommon,
                // percentages keep them correctly aligned across sizes/browsers
                left: `${p.nx * 100}%` as any,
                top: `${p.ny * 100}%` as any,
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: p.color,
                borderWidth: 2,
                borderColor: '#fff',
                transform: [{ translateX: -18 }, { translateY: -18 }],
                cursor: Platform.OS === 'web' ? 'pointer' : undefined,
              }}
              {...(Platform.OS === 'web' ? {
                // @ts-ignore - React Native Web supports these
                onMouseDown: (e: any) => {
                  e.preventDefault();
                  e.stopPropagation();
                  startDrag('player', p.key);
                },
                // @ts-ignore
                onTouchStart: (e: any) => {
                  e.preventDefault();
                  e.stopPropagation();
                  startDrag('player', p.key);
                },
              } : {})}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 12 }}>
                {p.label}
              </Text>
            </View>
          ))}

          {/* Ball */}
          <View
            style={{
              ...markerCommon,
              left: `${ballPos.nx * 100}%` as any,
              top: `${ballPos.ny * 100}%` as any,
              width: 24,
              height: 24,
              borderRadius: 12,
              backgroundColor: '#fff',
              borderWidth: 2,
              borderColor: '#c00',
              transform: [{ translateX: -12 }, { translateY: -12 }],
              cursor: Platform.OS === 'web' ? 'pointer' : undefined,
            }}
            {...(Platform.OS === 'web' ? {
              // @ts-ignore - React Native Web supports these
              onMouseDown: (e: any) => {
                e.preventDefault();
                e.stopPropagation();
                startDrag('ball', 'ball');
              },
              // @ts-ignore
              onTouchStart: (e: any) => {
                e.preventDefault();
                e.stopPropagation();
                startDrag('ball', 'ball');
              },
            } : {})}
          >
            <Text style={{ color: '#c00', fontWeight: 'bold', fontSize: 12 }}>
              ⚾
            </Text>
          </View>

          {/* Runners */}
          {runners.map((r) => (
            <View
              key={r.id}
              style={{
                ...markerCommon,
                left: `${r.nx * 100}%` as any,
                top: `${r.ny * 100}%` as any,
                width: 30,
                height: 30,
                borderRadius: 15,
                backgroundColor: '#000',
                borderWidth: 2,
                borderColor: '#fff',
                transform: [{ translateX: -15 }, { translateY: -15 }],
                cursor: Platform.OS === 'web' ? 'pointer' : undefined,
              }}
              {...(Platform.OS === 'web' ? {
                // @ts-ignore - React Native Web supports these
                onMouseDown: (e: any) => {
                  e.preventDefault();
                  e.stopPropagation();
                  startDrag('runner', r.id);
                },
                // @ts-ignore
                onTouchStart: (e: any) => {
                  e.preventDefault();
                  e.stopPropagation();
                  startDrag('runner', r.id);
                },
              } : {})}
            >
              <Text
                style={{
                  color: '#fff',
                  fontWeight: 'bold',
                  fontSize: 14,
                }}
              >
                R
              </Text>
            </View>
          ))}
        </ImageBackground>
      </View>

      {/* Controls */}
      <View
        style={{
          marginTop: 20,
          width: '100%',
          maxWidth: 900,
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 15,
        }}
      >
        <TouchableOpacity
          style={{
            paddingHorizontal: 20,
            paddingVertical: 10,
            backgroundColor: '#ff6b6b',
            borderRadius: 8,
          }}
          onPress={addRunner}
        >
          <Text
            style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}
          >
            + Add Runner
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            paddingHorizontal: 20,
            paddingVertical: 10,
            backgroundColor: '#3498db',
            borderRadius: 8,
          }}
          onPress={removeRunner}
        >
          <Text
            style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}
          >
            - Remove Runner
          </Text>
        </TouchableOpacity>
      </View>

      <View
        style={{
          marginTop: 20,
          width: '100%',
          maxWidth: 900,
          padding: 15,
          backgroundColor: '#f0f0f0',
          borderRadius: 8,
          alignItems: 'center',
        }}
      >
        <Text
          style={{
            fontSize: 14,
            fontWeight: 'bold',
            marginBottom: 5,
            color: '#333',
          }}
        >
          Interactive Field
        </Text>
        <Text
          style={{ fontSize: 12, color: '#666', textAlign: 'center' }}
        >
          Drag players, runners, or the ball to move them around the field.
        </Text>
      </View>

      <TouchableOpacity
        style={{
          marginTop: 15,
          paddingHorizontal: 20,
          paddingVertical: 10,
          backgroundColor: '#e74c3c',
          borderRadius: 8,
          alignSelf: 'center',
        }}
        onPress={resetPositions}
      >
        <Text
          style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}
        >
          Reset Positions
        </Text>
      </TouchableOpacity>
    </View>
  );
}
