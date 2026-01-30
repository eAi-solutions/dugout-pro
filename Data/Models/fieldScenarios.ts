// Data models for field scenarios and keyframes

export interface Position {
  x: number;
  y: number;
}

export interface PlayerKeyframe {
  key: string; // Player key (P, C, 1B, etc.)
  position: Position;
  timestamp: number; // Time in seconds from start
}

export interface BallKeyframe {
  position: Position;
  timestamp: number;
}

export interface RunnerKeyframe {
  id: string;
  position: Position;
  timestamp: number;
}

// Phase structure: groups keyframes that should play concurrently
export interface MovementPhase {
  // Keyframes within this phase - all movements start at phaseStartTime
  // Timestamps within phase are relative to phaseStartTime (0 = start of phase)
  playerKeyframes: PlayerKeyframe[];
  ballKeyframes: BallKeyframe[];
  runnerKeyframes: RunnerKeyframe[];
  // Start time of this phase (absolute time from scenario start)
  phaseStartTime: number;
  // Duration of this phase (determined by longest movement in phase)
  phaseDuration: number;
}

export interface FieldScenario {
  id: string;
  name: string;
  description?: string;
  duration: number; // Playback duration in seconds (computed from phases + gaps)
  recordingTimeLimitSeconds?: number; // Optional: recording time limit used during recording (not used for playback)
  fieldSize: number; // Field size when scenario was created (for scaling)
  
  // Phase timing - when players stop moving and ball-only phase begins
  // DEPRECATED: Use phases array instead. Kept for backward compatibility.
  playerMovementPhaseEnd?: number; // Time (in seconds) when players finish moving
  
  // Initial positions
  initialPlayers: Array<{
    key: string;
    label: string;
    x: number;
    y: number;
    color: string;
  }>;
  initialBall: Position;
  initialRunners: Array<{
    id: string;
    x: number;
    y: number;
  }>;
  
  // New phase-based structure (preferred)
  phases?: MovementPhase[];
  
  // Legacy flat keyframes (for backward compatibility)
  // If phases is undefined, these will be used and treated as a single phase
  playerKeyframes?: PlayerKeyframe[];
  ballKeyframes?: BallKeyframe[];
  runnerKeyframes?: RunnerKeyframe[];
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}

