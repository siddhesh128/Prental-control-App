/**
 * Family hierarchy and role-based access control types
 */

export enum FamilyRole {
  PRIMARY_GUARDIAN = 'PRIMARY_GUARDIAN',
  CO_GUARDIAN = 'CO_GUARDIAN',
  CAREGIVER = 'CAREGIVER',
  TEEN = 'TEEN',
  CHILD = 'CHILD',
  SENIOR_CITIZEN = 'SENIOR_CITIZEN',
}

export interface Permission {
  canSetPolicies: boolean;
  canOverridePolicies: boolean;
  canApproveRewards: boolean;
  canViewAnalytics: boolean;
  canManageFamilyMembers: boolean;
  canSetTasks: boolean;
  canReviewHomework: boolean;
  canSetWellnessGoals: boolean;
}

export const ROLE_PERMISSIONS: Record<FamilyRole, Permission> = {
  [FamilyRole.PRIMARY_GUARDIAN]: {
    canSetPolicies: true,
    canOverridePolicies: true,
    canApproveRewards: true,
    canViewAnalytics: true,
    canManageFamilyMembers: true,
    canSetTasks: true,
    canReviewHomework: true,
    canSetWellnessGoals: true,
  },
  [FamilyRole.CO_GUARDIAN]: {
    canSetPolicies: true,
    canOverridePolicies: false,
    canApproveRewards: true,
    canViewAnalytics: true,
    canManageFamilyMembers: false,
    canSetTasks: true,
    canReviewHomework: true,
    canSetWellnessGoals: true,
  },
  [FamilyRole.CAREGIVER]: {
    canSetPolicies: false,
    canOverridePolicies: false,
    canApproveRewards: false,
    canViewAnalytics: true,
    canManageFamilyMembers: false,
    canSetTasks: true,
    canReviewHomework: false,
    canSetWellnessGoals: false,
  },
  [FamilyRole.TEEN]: {
    canSetPolicies: false,
    canOverridePolicies: false,
    canApproveRewards: false,
    canViewAnalytics: false,
    canManageFamilyMembers: false,
    canSetTasks: false,
    canReviewHomework: false,
    canSetWellnessGoals: false,
  },
  [FamilyRole.CHILD]: {
    canSetPolicies: false,
    canOverridePolicies: false,
    canApproveRewards: false,
    canViewAnalytics: false,
    canManageFamilyMembers: false,
    canSetTasks: false,
    canReviewHomework: false,
    canSetWellnessGoals: false,
  },
  [FamilyRole.SENIOR_CITIZEN]: {
    canSetPolicies: false,
    canOverridePolicies: false,
    canApproveRewards: false,
    canViewAnalytics: false,
    canManageFamilyMembers: false,
    canSetTasks: false,
    canReviewHomework: false,
    canSetWellnessGoals: false,
  },
};

export interface FamilyMember {
  userId: string;
  role: FamilyRole;
  displayName: string;
  email: string;
  dateOfBirth?: string;
  parentalConsentGiven?: boolean;
}

export interface FamilyHierarchy {
  familyId: string;
  members: FamilyMember[];
  primaryGuardianId: string;
  createdAt: number;
  updatedAt: number;
}

export interface EmergencyOverride {
  overrideId: string;
  guardianId: string;
  childId: string;
  reason: string;
  expiresAt: number;
  appliedAt: number;
}
