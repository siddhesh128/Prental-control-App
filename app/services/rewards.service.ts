/**
 * Rewards and Points Management Service
 * Manages reward rules, point transactions, streaks, and achievement tracking
 */

import {
  RewardRule,
  ChildRewardWallet,
  PointTransaction,
  StreakData,
  RewardRedemption,
} from '../../types/rewards';

export class RewardsService {
  /**
   * Calculate new streak data after a completion
   */
  static updateStreak(currentStreak: StreakData, completionDate: Date): StreakData {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    completionDate.setHours(0, 0, 0, 0);

    const lastStreakDate = new Date(currentStreak.lastStreakDate);
    lastStreakDate.setHours(0, 0, 0, 0);

    const dayDiff = Math.floor(
      (completionDate.getTime() - lastStreakDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    let newDayStreak = currentStreak.currentDayStreak;
    let newWeekStreak = currentStreak.currentWeekStreak;

    if (dayDiff === 0) {
      // Same day, no change
      return currentStreak;
    } else if (dayDiff === 1) {
      // Consecutive day
      newDayStreak = currentStreak.currentDayStreak + 1;
      newWeekStreak = currentStreak.currentWeekStreak + 1;
    } else {
      // Streak broken
      newDayStreak = 1;
      newWeekStreak = dayDiff > 7 ? 1 : 1; // Reset week if more than 7 days
    }

    return {
      currentDayStreak: newDayStreak,
      currentWeekStreak: newWeekStreak,
      bestDayStreak: Math.max(newDayStreak, currentStreak.bestDayStreak),
      bestWeekStreak: Math.max(newWeekStreak, currentStreak.bestWeekStreak),
      lastStreakDate: completionDate.getTime(),
    };
  }

  /**
   * Create a point transaction
   */
  static createTransaction(
    amount: number,
    source: PointTransaction['source'],
    sourceId: string,
    description: string
  ): PointTransaction {
    return {
      transactionId: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      amount,
      source,
      sourceId,
      description,
      timestamp: Date.now(),
    };
  }

  /**
   * Apply reward rule to wallet
   */
  static applyRewardRule(wallet: ChildRewardWallet, rule: RewardRule): ChildRewardWallet {
    if (wallet.totalPoints >= rule.pointsRequired) {
      return {
        ...wallet,
        totalPoints: wallet.totalPoints - rule.pointsRequired,
        lastUpdated: Date.now(),
      };
    }
    return wallet;
  }

  /**
   * Add points to wallet
   */
  static addPoints(
    wallet: ChildRewardWallet,
    points: number,
    source: PointTransaction['source'],
    sourceId: string,
    description: string
  ): ChildRewardWallet {
    const transaction = this.createTransaction(points, source, sourceId, description);
    return {
      ...wallet,
      totalPoints: wallet.totalPoints + points,
      pointsHistory: [...wallet.pointsHistory, transaction],
      currentStreak: this.updateStreak(wallet.currentStreak, new Date()),
      lastUpdated: Date.now(),
    };
  }

  /**
   * Deduct points from wallet (penalty)
   */
  static deductPoints(
    wallet: ChildRewardWallet,
    points: number,
    reason: string
  ): ChildRewardWallet {
    const transaction = this.createTransaction(-points, 'PENALTY', `penalty_${Date.now()}`, reason);
    return {
      ...wallet,
      totalPoints: Math.max(0, wallet.totalPoints - points),
      pointsHistory: [...wallet.pointsHistory, transaction],
      lastUpdated: Date.now(),
    };
  }

  /**
   * Check if wallet has enough points to redeem a rule
   */
  static canRedeemRule(wallet: ChildRewardWallet, rule: RewardRule): boolean {
    return wallet.totalPoints >= rule.pointsRequired;
  }

  /**
   * Get point multiplier based on streak
   */
  static getStreakMultiplier(streak: StreakData): number {
    const dayStreak = streak.currentDayStreak;
    if (dayStreak >= 30) return 2.0; // 2x multiplier at 30-day streak
    if (dayStreak >= 14) return 1.75;
    if (dayStreak >= 7) return 1.5;
    if (dayStreak >= 3) return 1.25;
    return 1.0;
  }

  /**
   * Add bonus points based on streak
   */
  static addStreakBonus(wallet: ChildRewardWallet, basePoints: number): ChildRewardWallet {
    const multiplier = this.getStreakMultiplier(wallet.currentStreak);
    const bonus = Math.floor(basePoints * (multiplier - 1));

    if (bonus > 0) {
      return this.addPoints(
        wallet,
        bonus,
        'BONUS',
        `streak_bonus_${wallet.currentStreak.currentDayStreak}`,
        `Streak bonus (${wallet.currentStreak.currentDayStreak} day streak)`
      );
    }
    return wallet;
  }

  /**
   * Calculate total points from history for a time period
   */
  static calculatePointsForPeriod(
    wallet: ChildRewardWallet,
    startDate: Date,
    endDate: Date
  ): number {
    const startTime = startDate.getTime();
    const endTime = endDate.getTime();

    return wallet.pointsHistory
      .filter(
        (transaction: PointTransaction) =>
          transaction.timestamp >= startTime && transaction.timestamp <= endTime
      )
      .reduce((sum: number, transaction: PointTransaction) => sum + transaction.amount, 0);
  }

  /**
   * Reset daily streaks (call once per day)
   */
  static resetDailyStreaks(wallet: ChildRewardWallet): ChildRewardWallet {
    const today = new Date();
    const lastStreakDate = new Date(wallet.currentStreak.lastStreakDate);

    const dayDiff = Math.floor(
      (today.getTime() - lastStreakDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (dayDiff > 1) {
      // More than 1 day has passed, reset streak
      return {
        ...wallet,
        currentStreak: {
          ...wallet.currentStreak,
          currentDayStreak: 0,
        },
        lastUpdated: Date.now(),
      };
    }

    return wallet;
  }

  /**
   * Get achievement progress (how many more points needed)
   */
  static getRedemptionProgress(
    wallet: ChildRewardWallet,
    rule: RewardRule
  ): {
    pointsNeeded: number;
    pointsOwned: number;
    percentComplete: number;
  } {
    const pointsNeeded = Math.max(0, rule.pointsRequired - wallet.totalPoints);
    const percentComplete = (wallet.totalPoints / rule.pointsRequired) * 100;

    return {
      pointsNeeded,
      pointsOwned: wallet.totalPoints,
      percentComplete: Math.min(100, percentComplete),
    };
  }
}
