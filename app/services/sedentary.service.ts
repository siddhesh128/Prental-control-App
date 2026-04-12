/**
 * Sedentary and Activity Monitoring Service
 * Tracks inactivity periods and triggers reminders
 */

import { SedentaryAlert, BreakReminder } from '../../types/wellness';

export class SedentaryMonitorService {
  private static readonly DEFAULT_SEDENTARY_THRESHOLD = 30; // minutes
  private static readonly DEFAULT_BREAK_INTERVAL = 30; // minutes

  /**
   * Create a sedentary alert
   */
  static createSedentaryAlert(
    childId: string,
    startTime: number,
    duration: number,
    alertType: SedentaryAlert['alertType'] = 'SEDENTARY'
  ): SedentaryAlert {
    return {
      alertId: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      childId,
      startTime,
      duration,
      alertType,
      dismissed: false,
    };
  }

  /**
   * Check if activity exceeds sedentary threshold
   */
  static isExcessivelySedentary(
    duration: number,
    threshold: number = this.DEFAULT_SEDENTARY_THRESHOLD
  ): boolean {
    return duration >= threshold;
  }

  /**
   * Get recommended break type based on duration
   */
  static getRecommendedBreakType(duration: number): SedentaryAlert['alertType'] {
    if (duration >= 60) return 'STAND_UP'; // Move around
    if (duration >= 45) return 'STRETCH'; // Stretch
    if (duration >= 30) return 'MOVEMENT_BREAK'; // Walk or light activity
    return 'SEDENTARY';
  }

  /**
   * Create break reminder
   */
  static createBreakReminder(
    childId: string,
    remindType: BreakReminder['remindType'],
    interval: number = this.DEFAULT_BREAK_INTERVAL
  ): BreakReminder {
    return {
      reminderId: `reminder_${Date.now()}`,
      childId,
      remindType,
      interval,
      active: true,
    };
  }

  /**
   * Check if reminder should be sent
   */
  static shouldSendReminder(reminder: BreakReminder, currentTime: number): boolean {
    if (!reminder.active) return false;
    if (!reminder.lastSentAt) return true;

    const timeSinceLast = currentTime - reminder.lastSentAt;
    const intervalMs = reminder.interval * 60 * 1000;

    return timeSinceLast >= intervalMs;
  }

  /**
   * Get personalized break message
   */
  static getBreakMessage(remindType: BreakReminder['remindType']): string {
    const messages: Record<BreakReminder['remindType'], string> = {
      EYE_REST: 'Time to rest your eyes! Look away from the screen for 20 seconds.',
      HYDRATION: 'Drink some water to stay hydrated!',
      STRETCH: 'Take a stretch break! Stretch your arms, legs, and back.',
      MOVEMENT: 'Time to move! Walk around or do some light exercise.',
    };
    return messages[remindType];
  }

  /**
   * Calculate wellness score based on activity
   */
  static calculateWellnessScore(
    sedentaryMinutes: number,
    exerciseMinutes: number,
    breaksTaken: number,
    targetScreenTime: number = 120
  ): number {
    let score = 100;

    // Penalize excessive sedentary time
    if (sedentaryMinutes > 30) {
      score -= (sedentaryMinutes - 30) * 0.5;
    }

    // Reward exercise
    score += Math.min(20, exerciseMinutes * 0.5);

    // Reward taking breaks
    score += Math.min(15, breaksTaken * 2);

    // Adjust for total screen time
    if (sedentaryMinutes + exerciseMinutes > targetScreenTime) {
      const excess = sedentaryMinutes + exerciseMinutes - targetScreenTime;
      score -= excess * 0.3;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Detect sedentary periods from activity log
   */
  static detectSedentaryPeriods(
    timestamps: number[],
    threshold: number = this.DEFAULT_SEDENTARY_THRESHOLD * 60 * 1000
  ): { start: number; duration: number }[] {
    const periods: { start: number; duration: number }[] = [];

    if (timestamps.length < 2) return periods;

    for (let i = 0; i < timestamps.length - 1; i++) {
      const duration = timestamps[i + 1] - timestamps[i];
      if (duration >= threshold) {
        periods.push({
          start: timestamps[i],
          duration: duration / (60 * 1000), // Convert to minutes
        });
      }
    }

    return periods;
  }
}
