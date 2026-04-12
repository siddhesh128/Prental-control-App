/**
 * Health, posture, and sedentary activity monitoring types
 */

export interface PostureEvent {
  eventId: string;
  childId: string;
  timestamp: number;
  postureQuality: 'GOOD' | 'SLOUCHING' | 'NECK_STRAIN' | 'UNCLEAR';
  confidenceScore: number; // 0-100
  userFrameData?: string; // Base64 encoded frame (minimal retention)
  shoulderAngle?: number; // degrees
  neckAngle?: number; // degrees
}

export interface SedentaryAlert {
  alertId: string;
  childId: string;
  startTime: number;
  duration: number; // minutes
  alertType: 'SEDENTARY' | 'STAND_UP' | 'STRETCH' | 'MOVEMENT_BREAK';
  dismissed: boolean;
  dismissedAt?: number;
}

export interface WellnessGoal {
  goalId: string;
  childId: string;
  familyId: string;
  goalType: 'MAX_DAILY_SCREEN_TIME' | 'MOVEMENT_BREAKS' | 'POSTURE_QUALITY' | 'EXERCISE_SESSIONS';
  targetValue: number;
  unit: string; // minutes, count, percentage
  active: boolean;
  createdAt: number;
}

export interface WellnessDashboard {
  childId: string;
  date: string; // YYYY-MM-DD
  totalScreenTime: number; // minutes
  postureAlerts: number;
  sedentaryPeriods: SedentaryAlert[];
  positivePosturePercent: number; // percentage of frames with good posture
  movementBreaksTaken: number;
  exerciseSessions: number;
  overallWellnessScore: number; // 0-100
}

export interface ActivityLog {
  logId: string;
  childId: string;
  timestamp: number;
  activityType: 'MOVEMENT' | 'EXERCISE' | 'POSTURE_CHECK' | 'BREAK';
  duration?: number; // minutes
  details?: string;
}

export interface BreakReminder {
  reminderId: string;
  childId: string;
  remindType: 'EYE_REST' | 'HYDRATION' | 'STRETCH' | 'MOVEMENT';
  lastSentAt?: number;
  interval: number; // minutes between reminders
  active: boolean;
}

export interface PoseEstimationFrame {
  frameId: string;
  timestamp: number;
  landmarks?: Record<string, [number, number, number]>; // keypoint -> [x, y, confidence]
  bodyPostureType: string;
  confidence: number;
}

export interface WellnessStats {
  childId: string;
  period: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  avgPostureQuality: number; // 0-100
  sedentaryMinutes: number;
  exerciseMinutes: number;
  movementBreaketsTaken: number;
  posturAlertsReceived: number;
  improvementTrend: 'IMPROVING' | 'STABLE' | 'DECLINING';
}
