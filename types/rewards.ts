/**
 * Rewards, achievements, and behavior reinforcement types
 */

export interface RewardRule {
  ruleId: string;
  familyId: string;
  name: string;
  description: string;
  pointsRequired: number;
  rewardType: 'SCREEN_TIME' | 'PRIVILEGE' | 'BADGE' | 'CUSTOM';
  rewardValue: string | number; // e.g., "30" for 30 minutes of screen time
  active: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Achievement {
  achievementId: string;
  name: string;
  description: string;
  icon: string;
  pointsValue: number;
  condition: string; // e.g., "complete_homework_7_days", "exercise_30_times"
  unlockedAt?: number;
}

export interface ChildRewardWallet {
  walletId: string;
  childId: string;
  familyId: string;
  totalPoints: number;
  pointsHistory: PointTransaction[];
  achievements: Achievement[];
  currentStreak: StreakData;
  lastUpdated: number;
}

export interface PointTransaction {
  transactionId: string;
  amount: number;
  source: 'TASK_COMPLETION' | 'EXERCISE' | 'HOMEWORK' | 'BEHAVIOR' | 'BONUS' | 'PENALTY';
  sourceId: string; // References the task/exercise/homework id
  description: string;
  timestamp: number;
}

export interface StreakData {
  currentDayStreak: number;
  currentWeekStreak: number;
  bestDayStreak: number;
  bestWeekStreak: number;
  lastStreakDate: number;
}

export interface RewardRedemption {
  redemptionId: string;
  childId: string;
  ruleId: string;
  pointsSpent: number;
  rewardGained: string | number;
  timestamp: number;
  approvedBy: string;
}

export interface BadgeDefinition {
  badgeId: string;
  name: string;
  description: string;
  icon: string;
  pointsReward: number;
  condition: string;
}

export interface BehaviorModifier {
  modifierId: string;
  familyId: string;
  type: 'REWARD' | 'PENALTY';
  description: string;
  pointsValue: number;
  triggerCondition: string;
  active: boolean;
}
