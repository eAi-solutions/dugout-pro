// Component for playing back field scenarios
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, Modal, Animated, ScrollView } from 'react-native';
import { FieldScenario, PlayerKeyframe, BallKeyframe, RunnerKeyframe, MovementPhase } from '../Data/Models/fieldScenarios';

// Phase gap duration (must match ScenarioRecorder.PHASE_GAP_SECONDS)
const PHASE_GAP_SECONDS = 0.6; // seconds - pause between phases

interface ScenarioPlayerProps {
  scenario: FieldScenario;
  fieldSize: number;
  onPlayerPositionsChange: (positions: Array<{ key: string; label: string; x: number; y: number; color: string }>) => void;
  onBallPosChange: (pos: { x: number; y: number }) => void;
  onRunnersChange: (runners: Array<{ id: string; x: number; y: number }>) => void;
  onClose: () => void;
  dockMode?: boolean; // If true, uses normal flow instead of absolute positioning
}

// Interpolate between two keyframes
function interpolatePosition(
  keyframes: Array<{ timestamp: number; position: { x: number; y: number } }>,
  currentTime: number
): { x: number; y: number } | null {
  if (keyframes.length === 0) return null;
  if (keyframes.length === 1) return keyframes[0].position;

  // Find the two keyframes to interpolate between
  let before = keyframes[0];
  let after = keyframes[keyframes.length - 1];

  for (let i = 0; i < keyframes.length - 1; i++) {
    if (keyframes[i].timestamp <= currentTime && keyframes[i + 1].timestamp >= currentTime) {
      before = keyframes[i];
      after = keyframes[i + 1];
      break;
    }
  }

  // If before the first keyframe, use first position
  if (currentTime < before.timestamp) {
    return before.position;
  }

  // If after the last keyframe, use last position
  if (currentTime > after.timestamp) {
    return after.position;
  }

  // Interpolate between before and after
  const timeDiff = after.timestamp - before.timestamp;
  if (timeDiff === 0) return before.position;

  const t = (currentTime - before.timestamp) / timeDiff;
  return {
    x: before.position.x + (after.position.x - before.position.x) * t,
    y: before.position.y + (after.position.y - before.position.y) * t,
  };
}

export default function ScenarioPlayer({
  scenario,
  fieldSize,
  onPlayerPositionsChange,
  onBallPosChange,
  onRunnersChange,
  onClose,
  dockMode = false,
}: ScenarioPlayerProps) {
  // Validate scenario
  if (!scenario) {
    console.error('ScenarioPlayer: scenario is null or undefined');
    return null;
  }

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const pausedTimeRef = useRef<number>(0);
  const tickCountRef = useRef<number>(0);

  // Scale positions if field size changed
  const scaleFactor = (scenario.fieldSize && scenario.fieldSize > 0) ? (fieldSize / scenario.fieldSize) : 1;

  const updatePositions = useCallback((time: number) => {
    try {
      // Don't update if fieldSize is not ready
      if (!fieldSize || fieldSize <= 0) {
        return;
      }
      
      // DEBUG: Log timing info (only first few calls to avoid spam)
      tickCountRef.current = (tickCountRef.current || 0) + 1;
      if (tickCountRef.current <= 5 || tickCountRef.current % 20 === 0) {
        console.log('[PLAYBACK DEBUG] updatePositions tick', tickCountRef.current, {
          inputTime: time,
          scenarioDuration: scenario.duration,
          scaledTime: Math.min(Math.max(0, time), scenario.duration || 0),
          phasesLength: scenario.phases?.length || 0,
        });
      }
      
      // Scale time to match scenario duration
      // Safety: Ensure duration is never 0 (fallback to a reasonable default)
      const playbackDuration = scenario.duration && scenario.duration > 0 ? scenario.duration : 1.0;
      const scaledTime = Math.min(Math.max(0, time), playbackDuration);
      
      // Check if scenario uses new phase-based format or legacy flat keyframes
      // Only use phases if they exist, are an array, have length > 0, and have at least one phase with keyframes
      const hasValidPhases = scenario.phases && 
                            Array.isArray(scenario.phases) && 
                            scenario.phases.length > 0 &&
                            scenario.phases.some(p => p && (
                              (p.playerKeyframes && p.playerKeyframes.length > 0) ||
                              (p.ballKeyframes && p.ballKeyframes.length > 0) ||
                              (p.runnerKeyframes && p.runnerKeyframes.length > 0)
                            ));
      
      // Batch all position updates together to avoid overwriting
      let newPlayerPositions: Array<{ key: string; label: string; x: number; y: number; color: string }> | null = null;
      let newBallPos: { x: number; y: number } | null = null;
      let newRunners: Array<{ id: string; x: number; y: number }> | null = null;
      
      let isPhaseGap = false;
      let gapTimeRemaining: number | null = null;
      
      if (hasValidPhases) {
      // New phase-based format
      // Find which phase the current time falls into (or if we're in a gap)
      let currentPhaseIndex = -1;
      let phaseRelativeTime = 0;
      let phaseStartTime = 0;
      
      for (let i = 0; i < scenario.phases.length; i++) {
        const phase = scenario.phases[i];
        if (!phase || typeof phase.phaseStartTime !== 'number' || typeof phase.phaseDuration !== 'number') {
          continue; // Skip invalid phases
        }
        const phaseEndTime = phase.phaseStartTime + phase.phaseDuration;
        const nextPhaseStartTime = (i < scenario.phases.length - 1 && scenario.phases[i + 1]) 
          ? scenario.phases[i + 1].phaseStartTime 
          : null;
        
        if (scaledTime >= phase.phaseStartTime && scaledTime <= phaseEndTime) {
          // We're in this phase
          currentPhaseIndex = i;
          phaseRelativeTime = scaledTime - phase.phaseStartTime;
          phaseStartTime = phase.phaseStartTime;
          break;
        } else if (nextPhaseStartTime !== null && scaledTime > phaseEndTime && scaledTime < nextPhaseStartTime) {
          // We're in a gap between this phase and the next
          isPhaseGap = true;
          currentPhaseIndex = i; // Use previous phase's end state
          phaseRelativeTime = phase.phaseDuration; // Hold at end of previous phase
          phaseStartTime = phase.phaseStartTime;
          gapTimeRemaining = nextPhaseStartTime - scaledTime;
          break;
        } else if (scaledTime < phase.phaseStartTime) {
          // Before this phase, use previous phase's end state (or initial)
          break;
        }
      }
      
      // If we're past all phases, use the last phase's end state
      if (currentPhaseIndex === -1 && scenario.phases.length > 0) {
        const lastPhase = scenario.phases[scenario.phases.length - 1];
        if (lastPhase) {
          currentPhaseIndex = scenario.phases.length - 1;
          phaseRelativeTime = lastPhase.phaseDuration || 0;
          phaseStartTime = lastPhase.phaseStartTime || 0;
        }
      }
      
      // DEBUG: Log phase selection (first few ticks)
      if (tickCountRef.current <= 5 || tickCountRef.current % 20 === 0) {
        const currentPhaseForDebug = (currentPhaseIndex >= 0 && currentPhaseIndex < scenario.phases.length) 
          ? scenario.phases[currentPhaseIndex] 
          : null;
        console.log('[PLAYBACK DEBUG] Phase selection:', {
          scaledTime,
          currentPhaseIndex,
          phaseStartTime,
          phaseRelativeTime,
          isPhaseGap,
          gapTimeRemaining,
          currentPhaseDuration: currentPhaseForDebug?.phaseDuration ?? null,
        });
      }
      
      const currentPhase = (currentPhaseIndex >= 0 && currentPhaseIndex < scenario.phases.length) 
        ? scenario.phases[currentPhaseIndex] 
        : null;
      
      // CRITICAL FIX: Clamp phaseRelativeTime to [0, phaseDuration]
      // During gaps, hold at phaseDuration (end of previous phase)
      if (currentPhase) {
        if (isPhaseGap) {
          // During gap: hold at end of previous phase
          phaseRelativeTime = currentPhase.phaseDuration;
        } else {
          // During phase: clamp to [0, phaseDuration]
          phaseRelativeTime = Math.max(0, Math.min(phaseRelativeTime, currentPhase.phaseDuration));
        }
      }
      
      // Update player positions (batch)
      if (!scenario.initialPlayers || !Array.isArray(scenario.initialPlayers)) {
        console.warn('[PLAYBACK] No initial players found');
        return;
      }
      newPlayerPositions = scenario.initialPlayers.map(player => {
        let interpolated: { x: number; y: number } | null = null;
        
        if (currentPhase && Array.isArray(currentPhase.playerKeyframes)) {
          // Get keyframes for this player in current phase
          const keyframes = currentPhase.playerKeyframes.filter(kf => kf && kf.key === player.key);
          if (keyframes.length > 0) {
            // Convert absolute timestamps back to phase-relative for interpolation
            const relativeKeyframes = keyframes.map(kf => ({
              ...kf,
              timestamp: kf.timestamp - phaseStartTime, // Convert to phase-relative [0..phaseDuration]
            })).sort((a, b) => a.timestamp - b.timestamp);
            
            let beforeKf: { timestamp: number; position: { x: number; y: number } } | null = null;
            let afterKf: { timestamp: number; position: { x: number; y: number } } | null = null;
            let interpolationAlpha: number | null = null;
            
            // FIXED SELECTION LOGIC: Must handle time=0 correctly and find correct interpolation pair
            // Find prev = greatest timestamp <= timeIntoPhase, next = smallest timestamp >= timeIntoPhase
            if (relativeKeyframes.length === 1) {
              // Single keyframe: use it for both
              beforeKf = relativeKeyframes[0];
              afterKf = relativeKeyframes[0];
              interpolationAlpha = 0;
            } else {
              // Find the correct interpolation pair
              let foundPair = false;
              for (let i = 0; i < relativeKeyframes.length - 1; i++) {
                const kf0 = relativeKeyframes[i];
                const kf1 = relativeKeyframes[i + 1];
                // Use <= and >= to include exact matches (including time=0)
                if (kf0.timestamp <= phaseRelativeTime && kf1.timestamp >= phaseRelativeTime) {
                  beforeKf = kf0;
                  afterKf = kf1;
                  const timeDiff = afterKf.timestamp - beforeKf.timestamp;
                  interpolationAlpha = timeDiff > 0 ? (phaseRelativeTime - beforeKf.timestamp) / timeDiff : 0;
                  foundPair = true;
                  break;
                }
              }
              
              // Handle edge cases
              if (!foundPair) {
                if (phaseRelativeTime < relativeKeyframes[0].timestamp) {
                  // Before first keyframe: use first keyframe as both (clamp)
                  beforeKf = relativeKeyframes[0];
                  afterKf = relativeKeyframes[0];
                  interpolationAlpha = 0;
                } else if (phaseRelativeTime > relativeKeyframes[relativeKeyframes.length - 1].timestamp) {
                  // After last keyframe: use last keyframe as both (clamp)
                  beforeKf = relativeKeyframes[relativeKeyframes.length - 1];
                  afterKf = relativeKeyframes[relativeKeyframes.length - 1];
                  interpolationAlpha = 1;
                }
              }
            }
            
            // Use clamped phase-relative time for interpolation
            interpolated = interpolatePosition(relativeKeyframes, phaseRelativeTime);
          } else {
            // No keyframes in current phase - use position from previous phase end or initial
            if (currentPhaseIndex > 0 && scenario.phases[currentPhaseIndex - 1] && Array.isArray(scenario.phases[currentPhaseIndex - 1].playerKeyframes)) {
              const prevPhase = scenario.phases[currentPhaseIndex - 1];
              const prevKeyframes = prevPhase.playerKeyframes.filter(kf => kf && kf.key === player.key);
              if (prevKeyframes.length > 0) {
                const lastKf = prevKeyframes.reduce((latest, kf) => 
                  kf.timestamp > latest.timestamp ? kf : latest
                );
                interpolated = lastKf.position;
              }
            }
          }
        }
        
        // Fallback to initial position
        if (!interpolated) {
          interpolated = { x: player.x, y: player.y };
        }
        
        return {
          key: player.key,
          label: player.label,
          x: interpolated.x * scaleFactor,
          y: interpolated.y * scaleFactor,
          color: player.color,
        };
      });
      
      // Update ball position (batch)
      if (currentPhase && Array.isArray(currentPhase.ballKeyframes)) {
        if (currentPhase.ballKeyframes.length > 0) {
          const relativeKeyframes = currentPhase.ballKeyframes.map(kf => ({
            ...kf,
            timestamp: kf.timestamp - phaseStartTime, // Convert to phase-relative [0..phaseDuration]
          })).sort((a, b) => a.timestamp - b.timestamp);
          
          let beforeKf: { timestamp: number; position: { x: number; y: number } } | null = null;
          let afterKf: { timestamp: number; position: { x: number; y: number } } | null = null;
          let interpolationAlpha: number | null = null;
          
          // FIXED SELECTION LOGIC: Must handle time=0 correctly and find correct interpolation pair
          if (relativeKeyframes.length === 1) {
            beforeKf = relativeKeyframes[0];
            afterKf = relativeKeyframes[0];
            interpolationAlpha = 0;
          } else {
            let foundPair = false;
            for (let i = 0; i < relativeKeyframes.length - 1; i++) {
              const kf0 = relativeKeyframes[i];
              const kf1 = relativeKeyframes[i + 1];
              if (kf0.timestamp <= phaseRelativeTime && kf1.timestamp >= phaseRelativeTime) {
                beforeKf = kf0;
                afterKf = kf1;
                const timeDiff = afterKf.timestamp - beforeKf.timestamp;
                interpolationAlpha = timeDiff > 0 ? (phaseRelativeTime - beforeKf.timestamp) / timeDiff : 0;
                foundPair = true;
                break;
              }
            }
            
            if (!foundPair) {
              if (phaseRelativeTime < relativeKeyframes[0].timestamp) {
                beforeKf = relativeKeyframes[0];
                afterKf = relativeKeyframes[0];
                interpolationAlpha = 0;
              } else if (phaseRelativeTime > relativeKeyframes[relativeKeyframes.length - 1].timestamp) {
                beforeKf = relativeKeyframes[relativeKeyframes.length - 1];
                afterKf = relativeKeyframes[relativeKeyframes.length - 1];
                interpolationAlpha = 1;
              }
            }
          }
          
          // Use clamped phase-relative time for interpolation
          const interpolated = interpolatePosition(relativeKeyframes, phaseRelativeTime);
          newBallPos = interpolated || (scenario.initialBall || { x: 0, y: 0 });
        } else {
          // No keyframes in current phase - use position from previous phase end
          if (currentPhaseIndex > 0 && scenario.phases[currentPhaseIndex - 1] && Array.isArray(scenario.phases[currentPhaseIndex - 1].ballKeyframes)) {
            const prevPhase = scenario.phases[currentPhaseIndex - 1];
            if (prevPhase.ballKeyframes.length > 0) {
              const lastKf = prevPhase.ballKeyframes.reduce((latest, kf) => 
                kf.timestamp > latest.timestamp ? kf : latest
              );
              newBallPos = lastKf.position;
            } else {
              newBallPos = scenario.initialBall || { x: 0, y: 0 };
            }
          } else {
            newBallPos = scenario.initialBall || { x: 0, y: 0 };
          }
        }
      } else {
        newBallPos = scenario.initialBall || { x: 0, y: 0 };
      }
      
      // Update runner positions (batch)
      if (!scenario.initialRunners || !Array.isArray(scenario.initialRunners)) {
        newRunners = [];
      } else {
        newRunners = scenario.initialRunners.map(runner => {
        let interpolated: { x: number; y: number } | null = null;
        
        if (currentPhase && Array.isArray(currentPhase.runnerKeyframes)) {
          const keyframes = currentPhase.runnerKeyframes.filter(kf => kf && kf.id === runner.id);
          if (keyframes.length > 0) {
            const relativeKeyframes = keyframes.map(kf => ({
              ...kf,
              timestamp: kf.timestamp - phaseStartTime, // Convert to phase-relative [0..phaseDuration]
            })).sort((a, b) => a.timestamp - b.timestamp);
            
            let beforeKf: { timestamp: number; position: { x: number; y: number } } | null = null;
            let afterKf: { timestamp: number; position: { x: number; y: number } } | null = null;
            let interpolationAlpha: number | null = null;
            
            // FIXED SELECTION LOGIC: Must handle time=0 correctly and find correct interpolation pair
            if (relativeKeyframes.length === 1) {
              beforeKf = relativeKeyframes[0];
              afterKf = relativeKeyframes[0];
              interpolationAlpha = 0;
            } else {
              let foundPair = false;
              for (let i = 0; i < relativeKeyframes.length - 1; i++) {
                const kf0 = relativeKeyframes[i];
                const kf1 = relativeKeyframes[i + 1];
                if (kf0.timestamp <= phaseRelativeTime && kf1.timestamp >= phaseRelativeTime) {
                  beforeKf = kf0;
                  afterKf = kf1;
                  const timeDiff = afterKf.timestamp - beforeKf.timestamp;
                  interpolationAlpha = timeDiff > 0 ? (phaseRelativeTime - beforeKf.timestamp) / timeDiff : 0;
                  foundPair = true;
                  break;
                }
              }
              
              if (!foundPair) {
                if (phaseRelativeTime < relativeKeyframes[0].timestamp) {
                  beforeKf = relativeKeyframes[0];
                  afterKf = relativeKeyframes[0];
                  interpolationAlpha = 0;
                } else if (phaseRelativeTime > relativeKeyframes[relativeKeyframes.length - 1].timestamp) {
                  beforeKf = relativeKeyframes[relativeKeyframes.length - 1];
                  afterKf = relativeKeyframes[relativeKeyframes.length - 1];
                  interpolationAlpha = 1;
                }
              }
            }
            
            // Use clamped phase-relative time for interpolation
            interpolated = interpolatePosition(relativeKeyframes, phaseRelativeTime);
          } else {
            // No keyframes in current phase - use position from previous phase end or initial
            if (currentPhaseIndex > 0 && scenario.phases[currentPhaseIndex - 1] && Array.isArray(scenario.phases[currentPhaseIndex - 1].runnerKeyframes)) {
              const prevPhase = scenario.phases[currentPhaseIndex - 1];
              const prevKeyframes = prevPhase.runnerKeyframes.filter(kf => kf && kf.id === runner.id);
              if (prevKeyframes.length > 0) {
                const lastKf = prevKeyframes.reduce((latest, kf) => 
                  kf.timestamp > latest.timestamp ? kf : latest
                );
                interpolated = lastKf.position;
              }
            }
          }
        }
        
        if (!interpolated) {
          interpolated = { x: runner.x, y: runner.y };
        }
        
        return {
          id: runner.id,
          x: interpolated.x * scaleFactor,
          y: interpolated.y * scaleFactor,
        };
      });
      }
      
      // Batch apply all updates together (prevents overwriting)
      if (newPlayerPositions) {
        onPlayerPositionsChange(newPlayerPositions);
      }
      if (newBallPos) {
        onBallPosChange({
          x: newBallPos.x * scaleFactor,
          y: newBallPos.y * scaleFactor,
        });
      }
      if (newRunners) {
        onRunnersChange(newRunners);
      }
    } else {
      // Legacy format: treat flat keyframes as a single phase (backward compatibility)
      const playerKeyframes = scenario.playerKeyframes || [];
      const ballKeyframes = scenario.ballKeyframes || [];
      const runnerKeyframes = scenario.runnerKeyframes || [];
      
      // Update player positions (batch)
      if (!scenario.initialPlayers || !Array.isArray(scenario.initialPlayers)) {
        console.warn('[PLAYBACK] No initial players found (legacy format)');
        return;
      }
      newPlayerPositions = scenario.initialPlayers.map(player => {
        const keyframes = playerKeyframes.filter(kf => kf.key === player.key);
        const interpolated = interpolatePosition(keyframes, scaledTime);
        
        return {
          key: player.key,
          label: player.label,
          x: (interpolated?.x || player.x) * scaleFactor,
          y: (interpolated?.y || player.y) * scaleFactor,
          color: player.color,
        };
      });
      
      // Update ball position (batch)
      const ballInterpolated = interpolatePosition(ballKeyframes, scaledTime) || (scenario.initialBall || { x: 0, y: 0 });
      newBallPos = {
        x: ballInterpolated.x * scaleFactor,
        y: ballInterpolated.y * scaleFactor,
      };
      
      // Update runner positions (batch)
      if (!scenario.initialRunners || !Array.isArray(scenario.initialRunners)) {
        newRunners = [];
      } else {
        newRunners = scenario.initialRunners.map(runner => {
        const keyframes = runnerKeyframes.filter(kf => kf.id === runner.id);
        const interpolated = interpolatePosition(keyframes, scaledTime);
        
        return {
          id: runner.id,
          x: (interpolated?.x || runner.x) * scaleFactor,
          y: (interpolated?.y || runner.y) * scaleFactor,
        };
      });
      }
      
      // Batch apply all updates together
      if (newPlayerPositions) {
        onPlayerPositionsChange(newPlayerPositions);
      }
      if (newBallPos) {
        onBallPosChange(newBallPos);
      }
      if (newRunners) {
        onRunnersChange(newRunners);
      }
    }
    } catch (error) {
      console.error('Error in updatePositions:', error);
      // Fallback to initial positions on error
      if (scenario.initialPlayers) {
        onPlayerPositionsChange(scenario.initialPlayers.map(p => ({
          ...p,
          x: p.x * scaleFactor,
          y: p.y * scaleFactor,
        })));
      }
      if (scenario.initialBall) {
        onBallPosChange({
          x: scenario.initialBall.x * scaleFactor,
          y: scenario.initialBall.y * scaleFactor,
        });
      }
      if (scenario.initialRunners) {
        onRunnersChange(scenario.initialRunners.map(r => ({
          ...r,
          x: r.x * scaleFactor,
          y: r.y * scaleFactor,
        })));
      }
    }
  }, [scenario, fieldSize, scaleFactor, onPlayerPositionsChange, onBallPosChange, onRunnersChange]);

  useEffect(() => {
    if (isPlaying) {
      // Safety: Ensure duration is never 0
      const playbackDuration = scenario.duration && scenario.duration > 0 ? scenario.duration : 1.0;
      
      if (startTimeRef.current === null) {
        startTimeRef.current = Date.now();
        tickCountRef.current = 0; // Reset tick count on play start
        console.log('[PLAYBACK DEBUG] Playback started:', {
          scenarioDuration: scenario.duration,
          playbackDuration,
          phasesLength: scenario.phases?.length || 0,
          computedTotalDuration: scenario.phases?.reduce((sum, p, i) => {
            if (!p || typeof p.phaseDuration !== 'number') return sum;
            const gap = i < (scenario.phases?.length || 0) - 1 ? 0.6 : 0;
            return sum + p.phaseDuration + gap;
          }, 0) || 0,
        });
      }
      
      // Update every 50ms for smooth animation
      intervalRef.current = setInterval(() => {
        if (startTimeRef.current === null) return;
        
        const now = Date.now();
        const elapsed = (now - startTimeRef.current) / 1000 * playbackSpeed;
        const newTime = pausedTimeRef.current + elapsed;

        // DEBUG: Log timer tick (first few)
        if (tickCountRef.current <= 5 || tickCountRef.current % 20 === 0) {
          console.log('[PLAYBACK DEBUG] Timer tick:', {
            tickCount: tickCountRef.current,
            newTime,
            scenarioDuration: scenario.duration,
            playbackDuration,
            isPlaying,
            willStop: newTime >= playbackDuration,
          });
        }

        if (newTime >= playbackDuration) {
          setCurrentTime(playbackDuration);
          try {
            updatePositions(playbackDuration);
          } catch (error) {
            console.error('[PLAYBACK] Error updating positions at end:', error);
          }
          setIsPlaying(false);
          pausedTimeRef.current = 0;
          startTimeRef.current = null;
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          return;
        }

        setCurrentTime(newTime);
        try {
          updatePositions(newTime);
        } catch (error) {
          console.error('[PLAYBACK] Error updating positions:', error);
          // Stop playback on error to prevent infinite error loop
          setIsPlaying(false);
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        }
      }, 50);
    } else {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (startTimeRef.current !== null) {
        pausedTimeRef.current = currentTime;
        startTimeRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, playbackSpeed, scenario.duration, scenario.phases]);
  
  // Initialize positions when component mounts
  useEffect(() => {
    try {
      // DEBUG: Log scenario info at initialization
      console.log('[PLAYBACK DEBUG] Initialization:', {
        scenarioDuration: scenario.duration,
        phasesLength: scenario.phases?.length || 0,
        hasPhases: !!(scenario.phases && scenario.phases.length > 0),
        phaseDurations: scenario.phases?.map((p, i) => ({
          phaseIndex: i,
          phaseDuration: p?.phaseDuration ?? 0,
          phaseStartTime: p?.phaseStartTime ?? 0,
          playerKeyframes: Array.isArray(p?.playerKeyframes) ? p.playerKeyframes.length : 0,
          ballKeyframes: Array.isArray(p?.ballKeyframes) ? p.ballKeyframes.length : 0,
          runnerKeyframes: Array.isArray(p?.runnerKeyframes) ? p.runnerKeyframes.length : 0,
        })) || [],
        computedTotalDuration: scenario.phases?.reduce((sum, p, i) => {
          if (!p || typeof p.phaseDuration !== 'number') return sum;
          const gap = i < (scenario.phases?.length || 0) - 1 ? 0.6 : 0;
          return sum + p.phaseDuration + gap;
        }, 0) || 0,
      });
      updatePositions(0);
    } catch (error) {
      console.error('Error initializing ScenarioPlayer:', error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePlay = useCallback(() => {
    try {
      // Check if scenario has any movements
      const hasMovements = (scenario.phases && Array.isArray(scenario.phases) && scenario.phases.length > 0) ||
                          (scenario.playerKeyframes && scenario.playerKeyframes.length > 0) ||
                          (scenario.ballKeyframes && scenario.ballKeyframes.length > 0) ||
                          (scenario.runnerKeyframes && scenario.runnerKeyframes.length > 0);
      
      if (!hasMovements) {
        console.warn('[PLAYBACK] No movements to play');
        return; // Don't start playback if there's nothing to play
      }
      
      const playbackDuration = scenario.duration && scenario.duration > 0 ? scenario.duration : 1.0;
      if (currentTime >= playbackDuration) {
        // Reset to start
        setCurrentTime(0);
        pausedTimeRef.current = 0;
        updatePositions(0);
      }
      setIsPlaying(true);
    } catch (error) {
      console.error('[PLAYBACK] Error starting playback:', error);
      setIsPlaying(false);
    }
  }, [currentTime, scenario.duration, scenario.phases, scenario.playerKeyframes, scenario.ballKeyframes, scenario.runnerKeyframes, updatePositions]);

  const handlePause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const handleReset = useCallback(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    pausedTimeRef.current = 0;
    startTimeRef.current = null;
    updatePositions(0);
  }, [updatePositions]);

  const handleSeek = useCallback((time: number) => {
    const playbackDuration = scenario.duration && scenario.duration > 0 ? scenario.duration : 1.0;
    const newTime = Math.max(0, Math.min(time, playbackDuration));
    setCurrentTime(newTime);
    pausedTimeRef.current = newTime;
    startTimeRef.current = null;
    updatePositions(newTime);
  }, [scenario.duration, updatePositions]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={{
      ...(dockMode ? {} : {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
      }),
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      padding: dockMode ? 12 : 15, // Slightly reduced padding in dock mode
      ...(dockMode ? {
        borderTopWidth: 1,
        borderTopColor: '#333',
        borderBottomWidth: 1,
        borderBottomColor: '#333',
      } : {
        borderTopLeftRadius: 15,
        borderTopRightRadius: 15,
      }),
    }}>
      {/* Header: Title + Time (fixed, flexShrink: 0) - Always visible */}
      <View style={{ 
        marginBottom: dockMode ? 6 : 8,
        flexShrink: 0, // Prevent header from shrinking
      }}>
        <Text 
          style={{ 
            color: 'white', 
            fontSize: dockMode ? 16 : 18, 
            fontWeight: 'bold', 
            marginBottom: dockMode ? 3 : 5 
          }}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {scenario.name}
        </Text>
        <Text style={{ color: '#aaa', fontSize: 12 }}>
          {formatTime(currentTime)} / {formatTime((scenario.duration && scenario.duration > 0) ? scenario.duration : 1.0)}
        </Text>
      </View>

      {/* Notes: Bounded scrollable region (maxHeight + scroll) - Cannot push controls off-screen */}
      {scenario.description && (
        <View style={{ 
          maxHeight: dockMode ? 48 : 60, // Constrained height in dockMode (~2-3 lines at 12px font)
          marginBottom: dockMode ? 6 : 8,
          flexShrink: 0, // Critical: Prevent notes container from expanding and pushing controls
          overflow: 'hidden', // Ensure content doesn't overflow container
        }}>
          <ScrollView 
            showsVerticalScrollIndicator={true}
            style={{ flexGrow: 0 }}
            contentContainerStyle={{ 
              flexGrow: 0,
              paddingRight: 4, // Space for scroll indicator
            }}
            bounces={false} // Prevent bounce on iOS that could affect layout
          >
            <Text style={{ 
              color: '#ccc', 
              fontSize: dockMode ? 12 : 14,
              lineHeight: dockMode ? 16 : 18, // Consistent line height for accurate maxHeight calculation
            }}>
              {scenario.description}
            </Text>
          </ScrollView>
        </View>
      )}

      {/* Progress bar (fixed, flexShrink: 0) - Always visible */}
      <View style={{
        height: 4,
        backgroundColor: '#333',
        borderRadius: 2,
        marginBottom: dockMode ? 10 : 15,
        overflow: 'hidden',
        flexShrink: 0, // Prevent progress bar from shrinking
      }}>
        <View style={{
          height: '100%',
          width: `${Math.min(100, Math.max(0, (currentTime / ((scenario.duration && scenario.duration > 0) ? scenario.duration : 1.0)) * 100))}%`,
          backgroundColor: '#4CAF50',
        }} />
      </View>

      {/* Controls: Always visible (fixed, flexShrink: 0) - Critical: Never pushed off-screen */}
      <View style={{ 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'center', 
        gap: dockMode ? 6 : 10, 
        flexWrap: 'wrap',
        flexShrink: 0, // Critical: Prevent controls from being pushed off-screen
        minHeight: 44, // Ensure minimum height for touch targets
      }}>
        <TouchableOpacity
          style={{
            backgroundColor: '#666',
            paddingVertical: 10,
            paddingHorizontal: 12,
            borderRadius: 8,
            minWidth: 60,
            minHeight: 44, // Ensure >=44px tall for accessibility
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onPress={handleReset}
        >
          <Text style={{ color: 'white', fontSize: 14, fontWeight: 'bold' }}>Reset</Text>
        </TouchableOpacity>

        {!isPlaying ? (
          <TouchableOpacity
            style={{
              backgroundColor: '#4CAF50',
              paddingVertical: 12,
              paddingHorizontal: 16,
              borderRadius: 8,
              minWidth: 80,
              minHeight: 44, // Ensure >=44px tall for accessibility
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onPress={handlePlay}
          >
            <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>Play</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={{
              backgroundColor: '#ff9800',
              paddingVertical: 12,
              paddingHorizontal: 16,
              borderRadius: 8,
              minWidth: 80,
              minHeight: 44, // Ensure >=44px tall for accessibility
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onPress={handlePause}
          >
            <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>Pause</Text>
          </TouchableOpacity>
        )}

        <View style={{ flexDirection: 'row', gap: 5 }}>
          <TouchableOpacity
            style={{
              backgroundColor: playbackSpeed === 0.5 ? '#4CAF50' : '#666',
              paddingVertical: 8,
              paddingHorizontal: 10,
              borderRadius: 6,
              minWidth: 50,
              minHeight: 44, // Ensure >=44px tall for accessibility
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onPress={() => setPlaybackSpeed(0.5)}
          >
            <Text style={{ color: 'white', fontSize: 12 }}>0.5x</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              backgroundColor: playbackSpeed === 1 ? '#4CAF50' : '#666',
              paddingVertical: 8,
              paddingHorizontal: 10,
              borderRadius: 6,
              minWidth: 50,
              minHeight: 44, // Ensure >=44px tall for accessibility
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onPress={() => setPlaybackSpeed(1)}
          >
            <Text style={{ color: 'white', fontSize: 12 }}>1x</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              backgroundColor: playbackSpeed === 2 ? '#4CAF50' : '#666',
              paddingVertical: 8,
              paddingHorizontal: 10,
              borderRadius: 6,
              minWidth: 50,
              minHeight: 44, // Ensure >=44px tall for accessibility
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onPress={() => setPlaybackSpeed(2)}
          >
            <Text style={{ color: 'white', fontSize: 12 }}>2x</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={{
            backgroundColor: '#f44336',
            paddingVertical: 10,
            paddingHorizontal: 12,
            borderRadius: 8,
            minWidth: 60,
            minHeight: 44, // Ensure >=44px tall for accessibility
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onPress={onClose}
        >
          <Text style={{ color: 'white', fontSize: 14, fontWeight: 'bold' }}>Close</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
