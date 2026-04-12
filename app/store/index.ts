import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import monitoringReducer from './monitoring.slice';
import deviceReducer from './slices/deviceSlice';
import familyReducer from './slices/familySlice';
import rewardsReducer from './slices/rewardsSlice';
import tasksReducer from './slices/tasksSlice';
import wellnessReducer from './slices/wellnessSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    monitoring: monitoringReducer,
    device: deviceReducer,
    family: familyReducer,
    rewards: rewardsReducer,
    tasks: tasksReducer,
    wellness: wellnessReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
