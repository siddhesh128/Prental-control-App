/**
 * Role-Based Access Control Service
 * Manages family hierarchy, role assignment, and permission checking
 */

import { FamilyRole, ROLE_PERMISSIONS, FamilyMember, Permission } from '../../types/roles';

export class RBACService {
  /**
   * Check if a user has a specific permission
   */
  static hasPermission(userRole: FamilyRole, permission: keyof Permission): boolean {
    const permissions = ROLE_PERMISSIONS[userRole];
    return permissions[permission] || false;
  }

  /**
   * Get all permissions for a role
   */
  static getPermissions(userRole: FamilyRole): Permission {
    return ROLE_PERMISSIONS[userRole];
  }

  /**
   * Check if user can set policies
   */
  static canSetPolicies(userRole: FamilyRole): boolean {
    return this.hasPermission(userRole, 'canSetPolicies');
  }

  /**
   * Check if user can override policies (emergency)
   */
  static canOverridePolicies(userRole: FamilyRole): boolean {
    return this.hasPermission(userRole, 'canOverridePolicies');
  }

  /**
   * Check if user can approve rewards
   */
  static canApproveRewards(userRole: FamilyRole): boolean {
    return this.hasPermission(userRole, 'canApproveRewards');
  }

  /**
   * Check if user can view analytics
   */
  static canViewAnalytics(userRole: FamilyRole): boolean {
    return this.hasPermission(userRole, 'canViewAnalytics');
  }

  /**
   * Check if user can manage family members
   */
  static canManageFamilyMembers(userRole: FamilyRole): boolean {
    return this.hasPermission(userRole, 'canManageFamilyMembers');
  }

  /**
   * Check if user can set tasks
   */
  static canSetTasks(userRole: FamilyRole): boolean {
    return this.hasPermission(userRole, 'canSetTasks');
  }

  /**
   * Check if user can review homework
   */
  static canReviewHomework(userRole: FamilyRole): boolean {
    return this.hasPermission(userRole, 'canReviewHomework');
  }

  /**
   * Check if user can set wellness goals
   */
  static canSetWellnessGoals(userRole: FamilyRole): boolean {
    return this.hasPermission(userRole, 'canSetWellnessGoals');
  }

  /**
   * Get safe role for a family member based on age (for auto-role assignment)
   */
  static getRoleForAge(dateOfBirth: string): FamilyRole {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    if (age >= 65) return FamilyRole.SENIOR_CITIZEN;
    if (age >= 13 && age < 18) return FamilyRole.TEEN;
    if (age >= 5 && age < 13) return FamilyRole.CHILD;
    return FamilyRole.CHILD;
  }

  /**
   * Validate if a role change is allowed
   */
  static canChangeRole(currentUserRole: FamilyRole, targetRole: FamilyRole): boolean {
    // Only primary guardian can change roles
    if (currentUserRole !== FamilyRole.PRIMARY_GUARDIAN) {
      return false;
    }

    // Cannot change primary guardian to something else (prevents orphaning)
    if (targetRole === FamilyRole.PRIMARY_GUARDIAN) {
      return false;
    }

    return true;
  }

  /**
   * Get role hierarchy level (for determining override authority)
   */
  static getRoleHierarchyLevel(role: FamilyRole): number {
    const hierarchy: Record<FamilyRole, number> = {
      [FamilyRole.PRIMARY_GUARDIAN]: 5,
      [FamilyRole.CO_GUARDIAN]: 4,
      [FamilyRole.CAREGIVER]: 3,
      [FamilyRole.TEEN]: 2,
      [FamilyRole.CHILD]: 1,
      [FamilyRole.SENIOR_CITIZEN]: 1,
    };
    return hierarchy[role];
  }

  /**
   * Check if one role has authority over another
   */
  static hasAuthorityOver(userRole: FamilyRole, targetRole: FamilyRole): boolean {
    return this.getRoleHierarchyLevel(userRole) > this.getRoleHierarchyLevel(targetRole);
  }

  /**
   * Get all guardians (primary + co-guardians) from a family
   */
  static getGuardians(members: FamilyMember[]): FamilyMember[] {
    return members.filter(
      (m) => m.role === FamilyRole.PRIMARY_GUARDIAN || m.role === FamilyRole.CO_GUARDIAN
    );
  }

  /**
   * Get all children/teens from a family
   */
  static getChildren(members: FamilyMember[]): FamilyMember[] {
    return members.filter((m) => m.role === FamilyRole.CHILD || m.role === FamilyRole.TEEN);
  }

  /**
   * Validate family structure (must have at least one primary guardian)
   */
  static isValidFamilyStructure(members: FamilyMember[]): boolean {
    const primaryGuardians = members.filter((m) => m.role === FamilyRole.PRIMARY_GUARDIAN);
    return primaryGuardians.length === 1;
  }
}
