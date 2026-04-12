/**
 * Exercise verification and activity-to-screen-time conversion types
 */

export interface ExerciseSession {
  sessionId: string;
  childId: string;
  familyId: string;
  exerciseType: ExerciseType;
  startTime: number;
  endTime?: number;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';
  repsPerformed?: number;
  durationSeconds?: number;
  confidenceScore?: number;
  livenessScore?: number; // 0-100, based on frame variance and pose consistency
  bonusMinutesEarned?: number;
  verified: boolean;
  verifiedBy?: string; // userId who verified (AI or parent)
  frames?: PoseFrame[];
}

export enum ExerciseType {
  PUSH_UPS = 'PUSH_UPS',
  SQUATS = 'SQUATS',
  JUMPING_JACKS = 'JUMPING_JACKS',
  STRETCHES = 'STRETCHES',
  WALKING = 'WALKING',
  RUNNING = 'RUNNING',
  PLANKS = 'PLANKS',
  LUNGES = 'LUNGES',
  BURPEES = 'BURPEES',
  CUSTOM = 'CUSTOM',
}

export interface ExerciseRoutine {
  routineId: string;
  name: string;
  description: string;
  exerciseType: ExerciseType;
  targetReps?: number;
  targetDurationSeconds?: number;
  instructions: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  minRepCountForVerification?: number;
  difficultyMultiplier: number; // bonus multiplier: easy=1.0, medium=1.5, hard=2.0
}

export interface PoseFrame {
  frameId: string;
  timestamp: number;
  pose: PoseData;
  repCount?: number;
  repState?: 'UP' | 'DOWN'; // For counting reps
}

export interface PoseData {
  keypoints: Keypoint[];
  confidence: number; // overall pose confidence
  isLive: boolean; // Based on frame-to-frame variance
  movementDetected: boolean;
}

export interface Keypoint {
  name: string; // e.g., "nose", "left_shoulder", "right_knee"
  x: number;
  y: number;
  z?: number;
  score: number; // confidence for this keypoint
}

export interface ExerciseBonusRule {
  ruleId: string;
  familyId: string;
  exerciseType: ExerciseType;
  minutesPerRep?: number; // e.g., 1 push-up = 1 minute
  minutesPerSecond?: number; // e.g., 1 second of running = 0.5 minutes
  dailyMaxMinutes: number; // Safe cap
  weeklyMaxMinutes: number; // Safe cap
  active: boolean;
}

export interface AntiSpoofingCheck {
  checkId: string;
  sessionId: string;
  frameVarianceScore: number; // Detects static/repeated frames
  poseConsistencyScore: number; // Validates pose transitions
  faceLivenessScore?: number; // Optional face liveness
  passedCheck: boolean;
  timestamp: number;
}

export interface ExerciseVerificationResult {
  status: 'VERIFIED' | 'PENDING_REVIEW' | 'FAILED';
  repsCountedAccurately: boolean;
  livenessConfirmed: boolean;
  bonusMinutesAwarded?: number;
  reasons: string[]; // Explainable AI reasons
  confidenceScore: number;
}

export interface ExerciseHistory {
  childId: string;
  date: string; // YYYY-MM-DD
  sessions: ExerciseSession[];
  totalMinutesEarned: number;
  exercisesCompleted: number;
  bonusMinutesRemaining: number;
}

export interface MovementSensorReading {
  readingId: string;
  childId: string;
  timestamp: number;
  accelerationX: number;
  accelerationY: number;
  accelerationZ: number;
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  movementIntensity: number; // 0-100
}
