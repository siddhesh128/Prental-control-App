/**
 * Rewards Redux Slice
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ChildRewardWallet, RewardRule, Achievement, StreakData } from '../../../types/rewards';

interface RewardsState {
  wallet: ChildRewardWallet | null;
  rewardRules: RewardRule[];
  achievements: Achievement[];
  loading: boolean;
  error: string | null;
}

const initialState: RewardsState = {
  wallet: null,
  rewardRules: [],
  achievements: [],
  loading: false,
  error: null,
};

export const rewardsSlice = createSlice({
  name: 'rewards',
  initialState,
  reducers: {
    setWallet: (state, action: PayloadAction<ChildRewardWallet>) => {
      state.wallet = action.payload;
    },
    addPoints: (state, action: PayloadAction<number>) => {
      if (state.wallet) {
        state.wallet.totalPoints += action.payload;
      }
    },
    deductPoints: (state, action: PayloadAction<number>) => {
      if (state.wallet) {
        state.wallet.totalPoints = Math.max(0, state.wallet.totalPoints - action.payload);
      }
    },
    setRewardRules: (state, action: PayloadAction<RewardRule[]>) => {
      state.rewardRules = action.payload;
    },
    addRewardRule: (state, action: PayloadAction<RewardRule>) => {
      state.rewardRules.push(action.payload);
    },
    updateRewardRule: (state, action: PayloadAction<RewardRule>) => {
      const index = state.rewardRules.findIndex((r) => r.ruleId === action.payload.ruleId);
      if (index !== -1) {
        state.rewardRules[index] = action.payload;
      }
    },
    setAchievements: (state, action: PayloadAction<Achievement[]>) => {
      state.achievements = action.payload;
    },
    unlockAchievement: (state, action: PayloadAction<Achievement>) => {
      const index = state.achievements.findIndex(
        (a) => a.achievementId === action.payload.achievementId
      );
      if (index !== -1) {
        state.achievements[index] = {
          ...action.payload,
          unlockedAt: Date.now(),
        };
      }
    },
    updateStreak: (state, action: PayloadAction<StreakData>) => {
      if (state.wallet) {
        state.wallet.currentStreak = action.payload;
      }
    },
    setRewardsLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setRewardsError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const {
  setWallet,
  addPoints,
  deductPoints,
  setRewardRules,
  addRewardRule,
  updateRewardRule,
  setAchievements,
  unlockAchievement,
  updateStreak,
  setRewardsLoading,
  setRewardsError,
} = rewardsSlice.actions;

export default rewardsSlice.reducer;
