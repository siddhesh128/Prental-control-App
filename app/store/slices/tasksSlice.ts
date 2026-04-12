/**
 * Tasks Redux Slice
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Task, Routine, DailyTaskProgress } from '../../../types/tasks';

interface TasksState {
  tasks: Task[];
  routines: Routine[];
  dailyProgress: DailyTaskProgress | null;
  loading: boolean;
  error: string | null;
}

const initialState: TasksState = {
  tasks: [],
  routines: [],
  dailyProgress: null,
  loading: false,
  error: null,
};

export const tasksSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {
    setTasks: (state, action: PayloadAction<Task[]>) => {
      state.tasks = action.payload;
    },
    addTask: (state, action: PayloadAction<Task>) => {
      state.tasks.push(action.payload);
    },
    updateTask: (state, action: PayloadAction<Task>) => {
      const index = state.tasks.findIndex((t) => t.taskId === action.payload.taskId);
      if (index !== -1) {
        state.tasks[index] = action.payload;
      }
    },
    removeTask: (state, action: PayloadAction<string>) => {
      state.tasks = state.tasks.filter((t) => t.taskId !== action.payload);
    },
    setRoutines: (state, action: PayloadAction<Routine[]>) => {
      state.routines = action.payload;
    },
    addRoutine: (state, action: PayloadAction<Routine>) => {
      state.routines.push(action.payload);
    },
    updateRoutine: (state, action: PayloadAction<Routine>) => {
      const index = state.routines.findIndex((r) => r.routineId === action.payload.routineId);
      if (index !== -1) {
        state.routines[index] = action.payload;
      }
    },
    setDailyProgress: (state, action: PayloadAction<DailyTaskProgress>) => {
      state.dailyProgress = action.payload;
    },
    setTasksLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setTasksError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const {
  setTasks,
  addTask,
  updateTask,
  removeTask,
  setRoutines,
  addRoutine,
  updateRoutine,
  setDailyProgress,
  setTasksLoading,
  setTasksError,
} = tasksSlice.actions;

export default tasksSlice.reducer;
