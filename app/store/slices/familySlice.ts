/**
 * Family Hierarchy Redux Slice
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { FamilyMember, FamilyHierarchy, FamilyRole } from '../../../types/roles';

interface FamilyState {
  family: FamilyHierarchy | null;
  members: FamilyMember[];
  currentUserRole: FamilyRole | null;
  loading: boolean;
  error: string | null;
}

const initialState: FamilyState = {
  family: null,
  members: [],
  currentUserRole: null,
  loading: false,
  error: null,
};

export const familySlice = createSlice({
  name: 'family',
  initialState,
  reducers: {
    setFamily: (state, action: PayloadAction<FamilyHierarchy>) => {
      state.family = action.payload;
      state.members = action.payload.members;
    },
    setFamilyLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    addFamilyMember: (state, action: PayloadAction<FamilyMember>) => {
      state.members.push(action.payload);
    },
    updateFamilyMember: (state, action: PayloadAction<FamilyMember>) => {
      const index = state.members.findIndex((m) => m.userId === action.payload.userId);
      if (index !== -1) {
        state.members[index] = action.payload;
      }
    },
    removeFamilyMember: (state, action: PayloadAction<string>) => {
      state.members = state.members.filter((m) => m.userId !== action.payload);
    },
    setCurrentUserRole: (state, action: PayloadAction<FamilyRole>) => {
      state.currentUserRole = action.payload;
    },
    setFamilyError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const {
  setFamily,
  setFamilyLoading,
  addFamilyMember,
  updateFamilyMember,
  removeFamilyMember,
  setCurrentUserRole,
  setFamilyError,
} = familySlice.actions;

export default familySlice.reducer;
