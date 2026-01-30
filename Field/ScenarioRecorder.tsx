// Component for recording/programming field scenarios
import React, { useState, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, Alert } from 'react-native';
import { FieldScenario, PlayerKeyframe, BallKeyframe, RunnerKeyframe, MovementPhase } from '../Data/Models/fieldScenarios';
import { generateScenarioId } from '../Data/Store/scenarioStorage';

// Keyframe compression: All movements in a phase animate over this consistent duration
const MOVE_DURATION = 1.9; // seconds - tune this to adjust animation speed (increased from 1.5s for slower movement)
const MOVEMENT_TOLERANCE = 1.0; // pixels - minimum movement to consider entity as "moved"
const PHASE_GAP_SECONDS = 0.6; // seconds - pause duration between phases

interface ScenarioRecorderProps {
  fieldSize: number;
  playerPositions: Array<{ key: string; label: string; x: number; y: number; color: string }>;
  ballPos: { x: number; y: number };
  runners: Array<{ id: string; x: number; y: number }>;
  onSave: (scenario: FieldScenario) => void;
  onCancel: () => void;
}

export default function ScenarioRecorder({
  fieldSize,
  playerPositions,
  ballPos,
  runners,
  onSave,
  onCancel,
}: ScenarioRecorderProps) {
  const [scenarioName, setScenarioName] = useState('');
  const [scenarioDescription, setScenarioDescription] = useState('');
  const [recordingTimeLimit, setRecordingTimeLimit] = useState('120'); // Default 120 seconds for recording
  const [currentTime, setCurrentTime] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const recordingStartTime = useRef<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastCaptureTime = useRef<number>(0);
  const captureInterval = 0.1; // Capture keyframes every 100ms (10 times per second)
  const recordingTimeLimitSeconds = useRef<number>(120); // Current recording limit (can be extended)
  
  // Store phases: each phase contains keyframes that should play concurrently
  const [phases, setPhases] = useState<MovementPhase[]>([]);
  const currentPhaseIndex = useRef<number>(0); // Index of the phase currently being recorded
  
  // Track current positions (will be updated from parent)
  const currentPlayerPositions = useRef(playerPositions);
  const currentBallPos = useRef(ballPos);
  const currentRunners = useRef(runners);
  const lastPositions = useRef<{
    players: typeof playerPositions;
    ball: typeof ballPos;
    runners: typeof runners;
  }>({ players: playerPositions, ball: ballPos, runners });
  
  // Track last captured positions per entity to detect movement (for sparse keyframe recording)
  const lastCapturedPositions = useRef<{
    players: Map<string, { x: number; y: number }>;
    ball: { x: number; y: number } | null;
    runners: Map<string, { x: number; y: number }>;
  }>({
    players: new Map(),
    ball: null,
    runners: new Map(),
  });

  // Update refs when positions change
  React.useEffect(() => {
    currentPlayerPositions.current = playerPositions;
    currentBallPos.current = ballPos;
    currentRunners.current = runners;
  }, [playerPositions, ballPos, runners]);

  const captureKeyframe = useCallback((timestamp: number) => {
    // Capture current positions as keyframes in the current phase
    // Timestamps within a phase are relative to the phase start time
    const phaseIndex = currentPhaseIndex.current;
    
    setPhases(prev => {
      const newPhases = [...prev];
      
      // Ensure the current phase exists
      if (!newPhases[phaseIndex]) {
        // Calculate phase start time (sum of durations of previous phases)
        let phaseStartTime = 0;
        for (let i = 0; i < phaseIndex; i++) {
          phaseStartTime += newPhases[i]?.phaseDuration || 0;
        }
        
        newPhases[phaseIndex] = {
          playerKeyframes: [],
          ballKeyframes: [],
          runnerKeyframes: [],
          phaseStartTime,
          phaseDuration: 0,
        };
      }
      
      const phase = newPhases[phaseIndex];
      // Calculate phase relative time: timestamp minus the cumulative duration of previous phases
      let cumulativePreviousDuration = 0;
      for (let i = 0; i < phaseIndex; i++) {
        cumulativePreviousDuration += newPhases[i]?.phaseDuration || 0;
      }
      const phaseRelativeTime = timestamp - cumulativePreviousDuration;
      
      // FIX: Only capture keyframes for entities that have actually moved (sparse recording)
      // This prevents creating sampled keyframes for all entities at the same timestamps
      const MOVEMENT_THRESHOLD = 1.0; // Minimum pixel movement to record a keyframe
      
      // Capture player keyframes only for players that moved
      const newPlayerKeyframes: PlayerKeyframe[] = [];
      const isInitialCapture = phaseRelativeTime < 0.01;
      
      currentPlayerPositions.current.forEach(player => {
        const lastPos = lastCapturedPositions.current.players.get(player.key);
        // At t=0 (initial capture), always record all entities. Otherwise, only record if moved.
        const moved = isInitialCapture || !lastPos || 
          Math.abs(player.x - lastPos.x) > MOVEMENT_THRESHOLD || 
          Math.abs(player.y - lastPos.y) > MOVEMENT_THRESHOLD;
        
        if (moved) {
          newPlayerKeyframes.push({
            key: player.key,
            position: { x: player.x, y: player.y },
            timestamp: phaseRelativeTime,
          });
          lastCapturedPositions.current.players.set(player.key, { x: player.x, y: player.y });
        }
      });

      // Capture ball keyframe only if ball moved
      let newBallKeyframe: BallKeyframe | null = null;
      const lastBallPos = lastCapturedPositions.current.ball;
      const ballMoved = isInitialCapture || !lastBallPos || 
        Math.abs(currentBallPos.current.x - lastBallPos.x) > MOVEMENT_THRESHOLD || 
        Math.abs(currentBallPos.current.y - lastBallPos.y) > MOVEMENT_THRESHOLD;
      
      if (ballMoved) {
        newBallKeyframe = {
          position: { x: currentBallPos.current.x, y: currentBallPos.current.y },
          timestamp: phaseRelativeTime,
        };
        lastCapturedPositions.current.ball = { x: currentBallPos.current.x, y: currentBallPos.current.y };
      }

      // Capture runner keyframes only for runners that moved
      const newRunnerKeyframes: RunnerKeyframe[] = [];
      currentRunners.current.forEach(runner => {
        const lastPos = lastCapturedPositions.current.runners.get(runner.id);
        const moved = isInitialCapture || !lastPos || 
          Math.abs(runner.x - lastPos.x) > MOVEMENT_THRESHOLD || 
          Math.abs(runner.y - lastPos.y) > MOVEMENT_THRESHOLD;
        
        if (moved) {
          newRunnerKeyframes.push({
            id: runner.id,
            position: { x: runner.x, y: runner.y },
            timestamp: phaseRelativeTime,
          });
          lastCapturedPositions.current.runners.set(runner.id, { x: runner.x, y: runner.y });
        }
      });
      
      // Update phase keyframes (remove duplicates at same timestamp, then add new ones)
      const updatedPhase: MovementPhase = {
        ...phase,
        playerKeyframes: [
          ...phase.playerKeyframes.filter(kf => 
            !newPlayerKeyframes.some(nkf => 
              nkf.key === kf.key && Math.abs(kf.timestamp - phaseRelativeTime) < 0.1
            )
          ),
          ...newPlayerKeyframes,
        ].sort((a, b) => a.timestamp - b.timestamp),
        ballKeyframes: [
          ...phase.ballKeyframes.filter(kf => !newBallKeyframe || Math.abs(kf.timestamp - phaseRelativeTime) >= 0.1),
          ...(newBallKeyframe ? [newBallKeyframe] : []),
        ].sort((a, b) => a.timestamp - b.timestamp),
        runnerKeyframes: [
          ...phase.runnerKeyframes.filter(kf => 
            !newRunnerKeyframes.some(nkf => 
              nkf.id === kf.id && Math.abs(kf.timestamp - phaseRelativeTime) < 0.1
            )
          ),
          ...newRunnerKeyframes,
        ].sort((a, b) => a.timestamp - b.timestamp),
      };
      
      // Update phase duration to be the maximum timestamp in this phase
      const allTimestamps = [
        ...updatedPhase.playerKeyframes.map(kf => kf.timestamp),
        ...updatedPhase.ballKeyframes.map(kf => kf.timestamp),
        ...updatedPhase.runnerKeyframes.map(kf => kf.timestamp),
      ];
      updatedPhase.phaseDuration = allTimestamps.length > 0 ? Math.max(...allTimestamps) : 0;
      
      newPhases[phaseIndex] = updatedPhase;
      return newPhases;
    });
  }, []);

  const startRecording = useCallback(() => {
    if (!scenarioName.trim()) {
      Alert.alert('Error', 'Please enter a scenario name');
      return;
    }

    const limitNum = parseFloat(recordingTimeLimit);
    if (isNaN(limitNum) || limitNum <= 0) {
      Alert.alert('Error', 'Please enter a valid recording time limit (greater than 0)');
      return;
    }

    // Set initial recording limit
    recordingTimeLimitSeconds.current = limitNum;

    setIsRecording(true);
    setCurrentTime(0);
    setPhases([]);
    currentPhaseIndex.current = 0;
    lastCaptureTime.current = 0;
    
    // Initialize first phase
    setPhases([{
      playerKeyframes: [],
      ballKeyframes: [],
      runnerKeyframes: [],
      phaseStartTime: 0,
      phaseDuration: 0,
    }]);
    
    // Initialize last captured positions with current positions (for movement detection)
    lastCapturedPositions.current.players.clear();
    currentPlayerPositions.current.forEach(player => {
      lastCapturedPositions.current.players.set(player.key, { x: player.x, y: player.y });
    });
    lastCapturedPositions.current.ball = { x: currentBallPos.current.x, y: currentBallPos.current.y };
    lastCapturedPositions.current.runners.clear();
    currentRunners.current.forEach(runner => {
      lastCapturedPositions.current.runners.set(runner.id, { x: runner.x, y: runner.y });
    });
    
    // Capture initial keyframe at time 0 (all entities at start)
    captureKeyframe(0);
    
    recordingStartTime.current = Date.now();
    
    // Update time and auto-capture keyframes every 100ms
    intervalRef.current = setInterval(() => {
      if (recordingStartTime.current === null) return;
      
      const elapsed = (Date.now() - recordingStartTime.current) / 1000;
      if (elapsed >= recordingTimeLimitSeconds.current) {
        // Auto-extend recording limit by 30 seconds
        recordingTimeLimitSeconds.current += 30;
      }
      setCurrentTime(elapsed);
      // Auto-capture keyframe at regular intervals
      if (elapsed - lastCaptureTime.current >= captureInterval) {
        captureKeyframe(elapsed);
        lastCaptureTime.current = elapsed;
      }
    }, 100);
  }, [scenarioName, recordingTimeLimit, captureKeyframe]);

  const stopRecording = useCallback(() => {
    setIsRecording(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    // Automatically capture final keyframe at current time
    captureKeyframe(currentTime);
    
    recordingStartTime.current = null;
  }, [currentTime, captureKeyframe]);

  const addKeyframe = useCallback(() => {
    if (!isRecording) {
      Alert.alert('Error', 'Please start recording first');
      return;
    }
    captureKeyframe(currentTime);
  }, [isRecording, currentTime, captureKeyframe]);

  const handleSave = useCallback(() => {
    if (!scenarioName.trim()) {
      Alert.alert('Error', 'Please enter a scenario name');
      return;
    }

    // Normalize phases: All movements in a phase start simultaneously
    // Phase duration = longest movement duration
    const normalizedPhases: MovementPhase[] = [];
    let cumulativeTime = 0;
    
    for (let i = 0; i < phases.length; i++) {
      const phase = phases[i];
      
      // If phase has no keyframes, skip it
      if (!phase || (phase.playerKeyframes.length === 0 && phase.ballKeyframes.length === 0 && phase.runnerKeyframes.length === 0)) {
        continue;
      }
      
      // Find the earliest start time and latest end time across ALL movements in this phase
      const allTimestamps = [
        ...phase.playerKeyframes.map(kf => kf.timestamp),
        ...phase.ballKeyframes.map(kf => kf.timestamp),
        ...phase.runnerKeyframes.map(kf => kf.timestamp),
      ];
      
      if (allTimestamps.length === 0) continue;
      
      const phaseMinTime = Math.min(...allTimestamps); // Earliest movement start
      const phaseMaxTime = Math.max(...allTimestamps); // Latest movement end
      const phaseDuration = phaseMaxTime - phaseMinTime; // Duration of longest movement
      
      // Normalize all keyframes: shift to start at 0 (all movements start simultaneously)
      // Each movement keeps its relative timing, but all start at time 0
      const normalizeTimestamp = (t: number): number => {
        return t - phaseMinTime; // Shift so earliest starts at 0
      };
      
      // Normalize all keyframes: shift to start at 0 (relative to phase start)
      const normalizedPlayerKeyframes: PlayerKeyframe[] = phase.playerKeyframes.map(kf => ({
        ...kf,
        timestamp: normalizeTimestamp(kf.timestamp), // Now relative to phase start (0)
      }));
      
      const normalizedBallKeyframes: BallKeyframe[] = phase.ballKeyframes.map(kf => ({
        ...kf,
        timestamp: normalizeTimestamp(kf.timestamp),
      }));
      
      const normalizedRunnerKeyframes: RunnerKeyframe[] = phase.runnerKeyframes.map(kf => ({
        ...kf,
        timestamp: normalizeTimestamp(kf.timestamp),
      }));
      
      // CRITICAL FIX: Ensure each movement has a keyframe at time 0 (phase start)
      // This ensures all movements start simultaneously at t=0
      const playerKeys = new Set(normalizedPlayerKeyframes.map(kf => kf.key));
      const runnerIds = new Set(normalizedRunnerKeyframes.map(kf => kf.id));
      
      // Get starting positions from previous phase end, initial positions, or earliest keyframe
      const getStartingPosition = (key: string, isBall: boolean, isRunner: boolean, runnerId?: string) => {
        // For phase 0, use initial positions from scenario
        if (i === 0) {
          if (isBall) {
            return { x: currentBallPos.current.x, y: currentBallPos.current.y };
          } else if (isRunner && runnerId) {
            const runner = currentRunners.current.find(r => r.id === runnerId);
            if (runner) return { x: runner.x, y: runner.y };
          } else if (!isBall && !isRunner) {
            const player = currentPlayerPositions.current.find(p => p.key === key);
            if (player) return { x: player.x, y: player.y };
          }
        }
        
        // For later phases, use end position from previous phase
        if (i > 0 && normalizedPhases.length > 0) {
          const prevPhase = normalizedPhases[i - 1];
          if (isBall && prevPhase.ballKeyframes.length > 0) {
            const lastBallKf = prevPhase.ballKeyframes.reduce((latest, kf) => 
              kf.timestamp > latest.timestamp ? kf : latest
            );
            return lastBallKf.position;
          } else if (isRunner && runnerId && prevPhase.runnerKeyframes.length > 0) {
            const runnerKfs = prevPhase.runnerKeyframes.filter(kf => kf.id === runnerId);
            if (runnerKfs.length > 0) {
              const lastKf = runnerKfs.reduce((latest, kf) => 
                kf.timestamp > latest.timestamp ? kf : latest
              );
              return lastKf.position;
            }
          } else if (!isBall && !isRunner) {
            const playerKfs = prevPhase.playerKeyframes.filter(kf => kf.key === key);
            if (playerKfs.length > 0) {
              const lastKf = playerKfs.reduce((latest, kf) => 
                kf.timestamp > latest.timestamp ? kf : latest
              );
              return lastKf.position;
            }
          }
        }
        
        // Fallback to earliest keyframe in current phase (before normalization)
        if (isBall && phase.ballKeyframes.length > 0) {
          const sorted = phase.ballKeyframes.sort((a, b) => a.timestamp - b.timestamp);
          return sorted[0].position;
        } else if (isRunner && runnerId && phase.runnerKeyframes.length > 0) {
          const sorted = phase.runnerKeyframes
            .filter(kf => kf.id === runnerId)
            .sort((a, b) => a.timestamp - b.timestamp);
          if (sorted.length > 0) return sorted[0].position;
        } else if (!isBall && !isRunner && phase.playerKeyframes.length > 0) {
          const sorted = phase.playerKeyframes
            .filter(kf => kf.key === key)
            .sort((a, b) => a.timestamp - b.timestamp);
          if (sorted.length > 0) return sorted[0].position;
        }
        return null;
      };
      
      // Add time 0 keyframes for players that don't have one
      currentPlayerPositions.current.forEach(player => {
        if (playerKeys.has(player.key)) {
          const hasTimeZero = normalizedPlayerKeyframes.some(
            kf => kf.key === player.key && Math.abs(kf.timestamp) < 0.01
          );
          if (!hasTimeZero) {
            const startPos = getStartingPosition(player.key, false, false);
            if (startPos) {
              normalizedPlayerKeyframes.push({
                key: player.key,
                position: startPos,
                timestamp: 0,
              });
            }
          }
        }
      });
      
      // Add time 0 keyframe for ball if it doesn't have one
      const hasBallTimeZero = normalizedBallKeyframes.some(kf => Math.abs(kf.timestamp) < 0.01);
      if (!hasBallTimeZero && normalizedBallKeyframes.length > 0) {
        const startPos = getStartingPosition('', true, false);
        if (startPos) {
          normalizedBallKeyframes.push({
            position: startPos,
            timestamp: 0,
          });
        }
      }
      
      // Add time 0 keyframes for runners that don't have one
      currentRunners.current.forEach(runner => {
        if (runnerIds.has(runner.id)) {
          const hasTimeZero = normalizedRunnerKeyframes.some(
            kf => kf.id === runner.id && Math.abs(kf.timestamp) < 0.01
          );
          if (!hasTimeZero) {
            const startPos = getStartingPosition('', false, true, runner.id);
            if (startPos) {
              normalizedRunnerKeyframes.push({
                id: runner.id,
                position: startPos,
                timestamp: 0,
              });
            }
          }
        }
      });
      
      // Sort all keyframes by timestamp
      normalizedPlayerKeyframes.sort((a, b) => a.timestamp - b.timestamp);
      normalizedBallKeyframes.sort((a, b) => a.timestamp - b.timestamp);
      normalizedRunnerKeyframes.sort((a, b) => a.timestamp - b.timestamp);
      
      // KEYFRAME COMPRESSION: Compress each entity's movement to consistent short duration
      // This ensures all movements in a phase animate over MOVE_DURATION regardless of recording timestamps
      let finalPlayerKeyframes: PlayerKeyframe[] = normalizedPlayerKeyframes;
      let finalBallKeyframes: BallKeyframe[] = normalizedBallKeyframes;
      let finalRunnerKeyframes: RunnerKeyframe[] = normalizedRunnerKeyframes;
      let finalPhaseDuration = phaseDuration;
      
      // Only compress if we have keyframes to compress
      const hasKeyframes = (normalizedPlayerKeyframes && normalizedPlayerKeyframes.length > 0) ||
                          (normalizedBallKeyframes && normalizedBallKeyframes.length > 0) ||
                          (normalizedRunnerKeyframes && normalizedRunnerKeyframes.length > 0);
      
      if (hasKeyframes) {
      try {
        // Compress player keyframes
        const compressedPlayerKeyframes: PlayerKeyframe[] = [];
        const playerKeys = normalizedPlayerKeyframes ? new Set(normalizedPlayerKeyframes.map(kf => kf.key)) : new Set();
        
        playerKeys.forEach(key => {
          try {
            if (!normalizedPlayerKeyframes) return;
            const entityKeyframes = normalizedPlayerKeyframes
              .filter(kf => kf && kf.key === key)
              .sort((a, b) => a.timestamp - b.timestamp);
            
            if (entityKeyframes.length === 0) return;
            
            // Get anchor keyframe at t=0 (or closest to 0)
            const anchorKf = entityKeyframes.find(kf => Math.abs(kf.timestamp) < 0.01) || entityKeyframes[0];
            if (!anchorKf || !anchorKf.position) return;
            const anchorPos = anchorKf.position;
            
            // Get final keyframe (last one)
            const finalKf = entityKeyframes[entityKeyframes.length - 1];
            if (!finalKf || !finalKf.position) return;
            const finalPos = finalKf.position;
            
            // Check if entity moved (compare final position to anchor)
            const moved = Math.abs(finalPos.x - anchorPos.x) > MOVEMENT_TOLERANCE || 
                         Math.abs(finalPos.y - anchorPos.y) > MOVEMENT_TOLERANCE;
            
            if (moved) {
              // Entity moved: replace with exactly two keyframes
              compressedPlayerKeyframes.push({
                key,
                position: { x: anchorPos.x, y: anchorPos.y },
                timestamp: 0,
              });
              compressedPlayerKeyframes.push({
                key,
                position: { x: finalPos.x, y: finalPos.y },
                timestamp: MOVE_DURATION,
              });
            } else {
              // Entity didn't move: keep only t=0 anchor
              compressedPlayerKeyframes.push({
                key,
                position: { x: anchorPos.x, y: anchorPos.y },
                timestamp: 0,
              });
            }
          } catch (err) {
            console.error('Error compressing player keyframes for', key, err);
          }
        });
        
        // Compress ball keyframes
        const compressedBallKeyframes: BallKeyframe[] = [];
        if (normalizedBallKeyframes && normalizedBallKeyframes.length > 0) {
          try {
            const sortedBallKfs = [...normalizedBallKeyframes].sort((a, b) => a.timestamp - b.timestamp);
            const anchorKf = sortedBallKfs.find(kf => Math.abs(kf.timestamp) < 0.01) || sortedBallKfs[0];
            if (anchorKf && anchorKf.position) {
              const anchorPos = anchorKf.position;
              const finalKf = sortedBallKfs[sortedBallKfs.length - 1];
              if (finalKf && finalKf.position) {
                const finalPos = finalKf.position;
                
                const moved = Math.abs(finalPos.x - anchorPos.x) > MOVEMENT_TOLERANCE || 
                             Math.abs(finalPos.y - anchorPos.y) > MOVEMENT_TOLERANCE;
                
                if (moved) {
                  compressedBallKeyframes.push({
                    position: { x: anchorPos.x, y: anchorPos.y },
                    timestamp: 0,
                  });
                  compressedBallKeyframes.push({
                    position: { x: finalPos.x, y: finalPos.y },
                    timestamp: MOVE_DURATION,
                  });
                } else {
                  compressedBallKeyframes.push({
                    position: { x: anchorPos.x, y: anchorPos.y },
                    timestamp: 0,
                  });
                }
              }
            }
          } catch (err) {
            console.error('Error compressing ball keyframes', err);
          }
        }
        
        // Compress runner keyframes
        const compressedRunnerKeyframes: RunnerKeyframe[] = [];
        const runnerIds = normalizedRunnerKeyframes ? new Set(normalizedRunnerKeyframes.map(kf => kf.id)) : new Set();
        
        runnerIds.forEach(id => {
          try {
            if (!normalizedRunnerKeyframes) return;
            const entityKeyframes = normalizedRunnerKeyframes
              .filter(kf => kf && kf.id === id)
              .sort((a, b) => a.timestamp - b.timestamp);
            
            if (entityKeyframes.length === 0) return;
            
            const anchorKf = entityKeyframes.find(kf => Math.abs(kf.timestamp) < 0.01) || entityKeyframes[0];
            if (!anchorKf || !anchorKf.position) return;
            const anchorPos = anchorKf.position;
            const finalKf = entityKeyframes[entityKeyframes.length - 1];
            if (!finalKf || !finalKf.position) return;
            const finalPos = finalKf.position;
            
            const moved = Math.abs(finalPos.x - anchorPos.x) > MOVEMENT_TOLERANCE || 
                         Math.abs(finalPos.y - anchorPos.y) > MOVEMENT_TOLERANCE;
            
            if (moved) {
              compressedRunnerKeyframes.push({
                id,
                position: { x: anchorPos.x, y: anchorPos.y },
                timestamp: 0,
              });
              compressedRunnerKeyframes.push({
                id,
                position: { x: finalPos.x, y: finalPos.y },
                timestamp: MOVE_DURATION,
              });
            } else {
              compressedRunnerKeyframes.push({
                id,
                position: { x: anchorPos.x, y: anchorPos.y },
                timestamp: 0,
              });
            }
          } catch (err) {
            console.error('Error compressing runner keyframes for', id, err);
          }
        });
        
        // Use compressed keyframes if compression succeeded
        finalPlayerKeyframes = compressedPlayerKeyframes.length > 0 ? compressedPlayerKeyframes : normalizedPlayerKeyframes;
        finalBallKeyframes = compressedBallKeyframes.length > 0 ? compressedBallKeyframes : normalizedBallKeyframes;
        finalRunnerKeyframes = compressedRunnerKeyframes.length > 0 ? compressedRunnerKeyframes : normalizedRunnerKeyframes;
        
        // Recalculate phase duration: at least MOVE_DURATION if any entity moved, otherwise 0
        const hasAnyMovement = finalPlayerKeyframes.some(kf => kf.timestamp === MOVE_DURATION) ||
                              finalBallKeyframes.some(kf => kf.timestamp === MOVE_DURATION) ||
                              finalRunnerKeyframes.some(kf => kf.timestamp === MOVE_DURATION);
        finalPhaseDuration = hasAnyMovement ? MOVE_DURATION : 0;
      } catch (err) {
        console.error('Error in keyframe compression, using original keyframes', err);
        // Fallback to original keyframes if compression fails
        finalPlayerKeyframes = normalizedPlayerKeyframes;
        finalBallKeyframes = normalizedBallKeyframes;
        finalRunnerKeyframes = normalizedRunnerKeyframes;
        finalPhaseDuration = phaseDuration;
      }
      }
      
      // Create normalized phase with absolute timestamps for storage
      const normalizedPhase: MovementPhase = {
        phaseStartTime: cumulativeTime,
        phaseDuration: finalPhaseDuration, // Duration of longest movement (after compression)
        // Store with absolute timestamps for playback
        playerKeyframes: finalPlayerKeyframes.map(kf => ({
          ...kf,
          timestamp: cumulativeTime + kf.timestamp,
        })),
        ballKeyframes: finalBallKeyframes.map(kf => ({
          ...kf,
          timestamp: cumulativeTime + kf.timestamp,
        })),
        runnerKeyframes: finalRunnerKeyframes.map(kf => ({
          ...kf,
          timestamp: cumulativeTime + kf.timestamp,
        })),
      };
      
      normalizedPhases.push(normalizedPhase);
      cumulativeTime += finalPhaseDuration;
      // Add gap after each phase (except the last one)
      if (i < phases.length - 1) {
        cumulativeTime += PHASE_GAP_SECONDS;
      }
    }
    
    // If no phases were recorded, create a single phase with initial positions
    if (normalizedPhases.length === 0) {
      normalizedPhases.push({
        phaseStartTime: 0,
        phaseDuration: 0,
        playerKeyframes: currentPlayerPositions.current.map(player => ({
          key: player.key,
          position: { x: player.x, y: player.y },
          timestamp: 0,
        })),
        ballKeyframes: [{
          position: { x: currentBallPos.current.x, y: currentBallPos.current.y },
          timestamp: 0,
        }],
        runnerKeyframes: currentRunners.current.map(runner => ({
          id: runner.id,
          position: { x: runner.x, y: runner.y },
          timestamp: 0,
        })),
      });
    }

    // Compute playback duration from phases: sum of phase durations + gaps
    let computedPlaybackDuration = 0;
    for (let i = 0; i < normalizedPhases.length; i++) {
      const phase = normalizedPhases[i];
      computedPlaybackDuration += phase.phaseDuration;
      // Add gap after each phase (except the last one)
      if (i < normalizedPhases.length - 1) {
        computedPlaybackDuration += PHASE_GAP_SECONDS;
      }
    }
    
    // Safety: Ensure playback duration is never 0 (fallback to 1 second minimum)
    if (computedPlaybackDuration <= 0) {
      computedPlaybackDuration = 1.0;
    }

    const scenario: FieldScenario = {
      id: generateScenarioId(),
      name: scenarioName.trim(),
      description: scenarioDescription.trim() || undefined,
      duration: computedPlaybackDuration, // Playback duration (computed from phases)
      recordingTimeLimitSeconds: recordingTimeLimitSeconds.current, // Recording limit (for reference only)
      fieldSize,
      initialPlayers: currentPlayerPositions.current.map(p => ({
        key: p.key,
        label: p.label,
        x: p.x,
        y: p.y,
        color: p.color,
      })),
      initialBall: { x: currentBallPos.current.x, y: currentBallPos.current.y },
      initialRunners: currentRunners.current.map(r => ({ id: r.id, x: r.x, y: r.y })),
      phases: normalizedPhases,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(scenario);
  }, [
    scenarioName,
    scenarioDescription,
    fieldSize,
    phases,
    onSave,
  ]);

  const clearKeyframes = useCallback(() => {
    setPhases([]);
    currentPhaseIndex.current = 0;
    setCurrentTime(0);
  }, []);

  return (
    <View style={{ width: '100%', marginTop: 20 }}>
      {/* Compact recording indicator when recording */}
          {isRecording && (
            <View style={{
              backgroundColor: '#ff4444',
              padding: 12,
              borderRadius: 8,
              alignItems: 'center',
              marginBottom: 15,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 5,
              elevation: 5,
            }}>
              <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold', marginBottom: 3 }}>
                ● RECORDING
              </Text>
              <Text style={{ color: 'white', fontSize: 14 }}>
                {currentTime.toFixed(1)}s / {recordingTimeLimitSeconds.current.toFixed(0)}s
              </Text>
                <Text style={{ color: '#ffd700', fontSize: 12, marginTop: 5 }}>
                Phase {currentPhaseIndex.current + 1} of {phases.length || 1}
                </Text>
            </View>
          )}
      
      <View style={{ 
        backgroundColor: '#f5f5f5', 
        borderRadius: 12,
        padding: 20,
        borderWidth: 2,
        borderColor: '#9b59b6',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 3,
      }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>
          Record Scenario
        </Text>

        <ScrollView>
          <View style={{ marginBottom: 15 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 5 }}>
              Scenario Name *
            </Text>
            <TextInput
              style={{
                backgroundColor: 'white',
                padding: 12,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: '#ddd',
                fontSize: 16,
              }}
              value={scenarioName}
              onChangeText={setScenarioName}
              placeholder="Enter scenario name"
              editable={!isRecording}
            />
          </View>

          <View style={{ marginBottom: 15 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 5 }}>
              Description (Optional)
            </Text>
            <TextInput
              style={{
                backgroundColor: 'white',
                padding: 12,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: '#ddd',
                fontSize: 16,
                minHeight: 80,
                textAlignVertical: 'top',
              }}
              value={scenarioDescription}
              onChangeText={setScenarioDescription}
              placeholder="Enter description"
              multiline
              editable={!isRecording}
            />
          </View>

          <View style={{ marginBottom: 15 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 5 }}>
              Recording Time Limit (seconds) *
            </Text>
            <Text style={{ fontSize: 12, color: '#666', marginBottom: 5 }}>
              Maximum recording time. Playback duration is computed automatically from phases.
            </Text>
            <TextInput
              style={{
                backgroundColor: 'white',
                padding: 12,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: '#ddd',
                fontSize: 16,
              }}
              value={recordingTimeLimit}
              onChangeText={setRecordingTimeLimit}
              placeholder="120"
              keyboardType="numeric"
              editable={!isRecording}
            />
          </View>

          {/* Recording indicator removed from here - now shown at top of screen */}

          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 15 }}>
            {!isRecording ? (
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: '#4CAF50',
                  padding: 15,
                  borderRadius: 8,
                  alignItems: 'center',
                }}
                onPress={startRecording}
              >
                <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>
                  Start Recording
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: '#ff4444',
                  padding: 15,
                  borderRadius: 8,
                  alignItems: 'center',
                }}
                onPress={stopRecording}
              >
                <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>
                  Stop Recording
                </Text>
              </TouchableOpacity>
            )}

            {isRecording && (
              <>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    backgroundColor: '#2196F3',
                    padding: 15,
                    borderRadius: 8,
                    alignItems: 'center',
                  }}
                  onPress={addKeyframe}
                >
                  <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>
                    Capture Keyframe
                  </Text>
                </TouchableOpacity>
                
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      backgroundColor: '#ff9800',
                      padding: 15,
                      borderRadius: 8,
                      alignItems: 'center',
                    }}
                    onPress={() => {
                    // Capture final keyframe for current phase
                    captureKeyframe(currentTime);
                    
                    // Finalize current phase and start a new one
                    setPhases(prev => {
                      const newPhases = [...prev];
                      const currentPhase = newPhases[currentPhaseIndex.current];
                      
                      if (currentPhase) {
                        // Update current phase duration before moving to next
                        const allTimestamps = [
                          ...currentPhase.playerKeyframes.map(kf => kf.timestamp),
                          ...currentPhase.ballKeyframes.map(kf => kf.timestamp),
                          ...currentPhase.runnerKeyframes.map(kf => kf.timestamp),
                        ];
                        const maxTimestamp = allTimestamps.length > 0 ? Math.max(...allTimestamps) : 0;
                        newPhases[currentPhaseIndex.current] = {
                          ...currentPhase,
                          phaseDuration: maxTimestamp,
                        };
                        
                        // Calculate phase start time for next phase (sum of all previous phase durations)
                        let nextPhaseStartTime = 0;
                        for (let i = 0; i <= currentPhaseIndex.current; i++) {
                          nextPhaseStartTime += newPhases[i]?.phaseDuration || 0;
                        }
                        
                        // Create new phase
                        currentPhaseIndex.current += 1;
                        newPhases[currentPhaseIndex.current] = {
                          playerKeyframes: [],
                          ballKeyframes: [],
                          runnerKeyframes: [],
                          phaseStartTime: nextPhaseStartTime,
                          phaseDuration: 0,
                        };
                      }
                      
                      return newPhases;
                    });
                    }}
                  >
                    <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>
                      Players Stop Here
                    </Text>
                  </TouchableOpacity>
              </>
            )}
          </View>

          <View style={{ marginBottom: 15 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 5 }}>
              Phases Recorded
            </Text>
            <View style={{ backgroundColor: 'white', padding: 10, borderRadius: 8 }}>
              <Text style={{ fontSize: 14 }}>
                Total Phases: {phases.length || 0}
              </Text>
              {phases.length > 0 && (
                <Text style={{ fontSize: 12, color: '#666', marginTop: 5 }}>
                  Current Phase: {currentPhaseIndex.current + 1}
              </Text>
              )}
              {phases.length > 0 && (
                <Text style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
                  Total Keyframes: {phases.reduce((sum, p) => 
                    sum + p.playerKeyframes.length + p.ballKeyframes.length + p.runnerKeyframes.length, 0
                  )}
              </Text>
              )}
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 15 }}>
            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: '#666',
                padding: 15,
                borderRadius: 8,
                alignItems: 'center',
              }}
              onPress={clearKeyframes}
            >
              <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>
                Clear Keyframes
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: '#999',
              padding: 15,
              borderRadius: 8,
              alignItems: 'center',
            }}
            onPress={onCancel}
          >
            <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>
              Cancel
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: '#2196F3',
              padding: 15,
              borderRadius: 8,
              alignItems: 'center',
            }}
            onPress={handleSave}
          >
            <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>
              Save Scenario
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

