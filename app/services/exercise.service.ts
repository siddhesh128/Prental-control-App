/**
 * Exercise Session Management Service
 * Handles exercise session creation, verification, and bonus calculation
 */

import { ExerciseSession, ExerciseRoutine, ExerciseBonusRule } from '../../types/exercise';

export class ExerciseService {
  /**
   * Create an exercise session
   */
  static createSession(
    childId: string,
    familyId: string,
    exerciseType: ExerciseSession['exerciseType']
  ): ExerciseSession {
    return {
      sessionId: `exercise_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      childId,
      familyId,
      exerciseType,
      startTime: Date.now(),
      status: 'IN_PROGRESS',
      verified: false,
    };
  }

  /**
   * Complete an exercise session
   */
  static completeSession(session: ExerciseSession, repsPerformed: number): ExerciseSession {
    return {
      ...session,
      endTime: Date.now(),
      status: 'COMPLETED',
      repsPerformed,
      durationSeconds: Math.floor((Date.now() - session.startTime) / 1000),
    };
  }

  /**
   * Mark session as verified with points
   */
  static verifySession(session: ExerciseSession, bonusMinutes: number): ExerciseSession {
    return {
      ...session,
      status: 'COMPLETED',
      verified: true,
      bonusMinutesEarned: bonusMinutes,
      verifiedBy: 'AI',
    };
  }

  /**
   * Get exercise routine by type
   */
  static getExerciseRoutine(exerciseType: string): ExerciseRoutine {
    const routines: Record<string, ExerciseRoutine> = {
      PUSH_UPS: {
        routineId: 'routine_push_ups',
        name: 'Push-ups',
        description: 'Classic upper body exercise',
        exerciseType: 'PUSH_UPS' as any,
        targetReps: 20,
        instructions:
          '1. Start in plank position. 2. Lower your body. 3. Push back up. Count each rep.',
        difficulty: 'MEDIUM',
        difficultyMultiplier: 1.5,
        minRepCountForVerification: 5,
      },
      SQUATS: {
        routineId: 'routine_squats',
        name: 'Squats',
        description: 'Lower body exercise',
        exerciseType: 'SQUATS' as any,
        targetReps: 25,
        instructions:
          '1. Stand with feet shoulder-width apart. 2. Lower your hips. 3. Push back up.',
        difficulty: 'MEDIUM',
        difficultyMultiplier: 1.5,
        minRepCountForVerification: 5,
      },
      JUMPING_JACKS: {
        routineId: 'routine_jj',
        name: 'Jumping Jacks',
        description: 'Full body cardio',
        exerciseType: 'JUMPING_JACKS' as any,
        targetReps: 30,
        instructions: '1. Stand straight. 2. Jump while opening legs and raising arms.',
        difficulty: 'EASY',
        difficultyMultiplier: 1.0,
        minRepCountForVerification: 5,
      },
      STRETCHES: {
        routineId: 'routine_stretches',
        name: 'Stretching',
        description: 'Flexibility and mobility',
        exerciseType: 'STRETCHES' as any,
        targetDurationSeconds: 180,
        instructions: '1. Touch your toes. 2. Holdfor 15s. 3. Side stretches. 4. Arm circles.',
        difficulty: 'EASY',
        difficultyMultiplier: 0.8,
      },
      WALKING: {
        routineId: 'routine_walking',
        name: 'Walking',
        description: 'Light cardio',
        exerciseType: 'WALKING' as any,
        targetDurationSeconds: 600, // 10 minutes
        instructions: '1. Walk at a comfortable pace. 2. Keep moving for the duration.',
        difficulty: 'EASY',
        difficultyMultiplier: 1.0,
      },
    };

    return routines[exerciseType] || routines.WALKING;
  }

  /**
   * Calculate bonus minutes from exercise
   */
  static calculateBonusMinutes(
    exerciseType: string,
    repsOrDuration: number,
    rule: ExerciseBonusRule
  ): number {
    let bonusMinutes = 0;

    if (rule.minutesPerRep) {
      bonusMinutes = repsOrDuration * rule.minutesPerRep;
    } else if (rule.minutesPerSecond) {
      // Convert to seconds if needed
      bonusMinutes = (repsOrDuration / 60) * rule.minutesPerSecond;
    }

    // Cap at daily maximum
    return Math.min(bonusMinutes, rule.dailyMaxMinutes);
  }

  /**
   * Validate bonus minute cap
   */
  static validateBonusMinutes(
    bonusMinutes: number,
    dailyMax: number,
    weeklyMax?: number,
    weeklyUsed?: number
  ): boolean {
    if (bonusMinutes > dailyMax) return false;
    if (weeklyMax && weeklyUsed && weeklyUsed + bonusMinutes > weeklyMax) {
      return false;
    }
    return true;
  }

  /**
   * Get difficulty multiplier for bonus calculation
   */
  static getDifficultyMultiplier(difficulty: 'EASY' | 'MEDIUM' | 'HARD'): number {
    const multipliers: Record<'EASY' | 'MEDIUM' | 'HARD', number> = {
      EASY: 1.0,
      MEDIUM: 1.5,
      HARD: 2.0,
    };
    return multipliers[difficulty];
  }

  /**
   * Format exercise session for display
   */
  static formatSessionForDisplay(session: ExerciseSession): string {
    const duration = session.durationSeconds
      ? `${Math.floor(session.durationSeconds / 60)} min`
      : 'In progress';
    const reps = session.repsPerformed ? `${session.repsPerformed} reps` : '';
    const bonus = session.bonusMinutesEarned
      ? ` - Earned ${session.bonusMinutesEarned} bonus minutes`
      : '';

    return `${session.exerciseType}: ${duration} ${reps}${bonus}`;
  }
}
