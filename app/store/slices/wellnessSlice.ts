/**
 * Wellness Redux Slice
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  PostureEvent,
  SedentaryAlert,
  WellnessDashboard,
  WellnessStats,
} from '../../../types/wellness';

interface WellnessState {
  recentPostureEvents: PostureEvent[];
  sedentaryAlerts: SedentaryAlert[];
  dashboard: WellnessDashboard | null;
  stats: WellnessStats | null;
  loading: boolean;
  error: string | null;
  monitoringActive: boolean;
}

const initialState: WellnessState = {
  recentPostureEvents: [],
  sedentaryAlerts: [],
  dashboard: null,
  stats: null,
  loading: false,
  error: null,
  monitoringActive: false,
};

export const wellnessSlice = createSlice({
  name: 'wellness',
  initialState,
  reducers: {
    addPostureEvent: (state, action: PayloadAction<PostureEvent>) => {
      state.recentPostureEvents.unshift(action.payload);
      // Keep only last 100 events in state
      state.recentPostureEvents = state.recentPostureEvents.slice(0, 100);
    },
    setPostureEvents: (state, action: PayloadAction<PostureEvent[]>) => {
      state.recentPostureEvents = action.payload;
    },
    addSedentaryAlert: (state, action: PayloadAction<SedentaryAlert>) => {
      state.sedentaryAlerts.push(action.payload);
    },
    dismissSedentaryAlert: (state, action: PayloadAction<string>) => {
      const alert = state.sedentaryAlerts.find((a) => a.alertId === action.payload);
      if (alert) {
        alert.dismissed = true;
        alert.dismissedAt = Date.now();
      }
    },
    setSedentaryAlerts: (state, action: PayloadAction<SedentaryAlert[]>) => {
      state.sedentaryAlerts = action.payload;
    },
    setWellnessDashboard: (state, action: PayloadAction<WellnessDashboard>) => {
      state.dashboard = action.payload;
    },
    setWellnessStats: (state, action: PayloadAction<WellnessStats>) => {
      state.stats = action.payload;
    },
    setMonitoringActive: (state, action: PayloadAction<boolean>) => {
      state.monitoringActive = action.payload;
    },
    setWellnessLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setWellnessError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const {
  addPostureEvent,
  setPostureEvents,
  addSedentaryAlert,
  dismissSedentaryAlert,
  setSedentaryAlerts,
  setWellnessDashboard,
  setWellnessStats,
  setMonitoringActive,
  setWellnessLoading,
  setWellnessError,
} = wellnessSlice.actions;

export default wellnessSlice.reducer;
