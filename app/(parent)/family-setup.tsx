import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { httpsCallable } from 'firebase/functions';
import ThemedText from '../_components/ThemedText';
import ThemedView from '../_components/ThemedView';
import { functions } from '../config/firebase';
import { RootState } from '../store';
import {
  addFamilyMember as addFamilyMemberToStore,
  setFamilyError,
  setFamilyLoading,
} from '../store/slices/familySlice';
import { FamilyRole, ROLE_PERMISSIONS } from '../../types/roles';
import { RBACService } from '../services/rbac.service';

type InvitableRole =
  | FamilyRole.CO_GUARDIAN
  | FamilyRole.CAREGIVER
  | FamilyRole.TEEN
  | FamilyRole.CHILD
  | FamilyRole.SENIOR_CITIZEN;

const ROLE_OPTIONS: Array<{
  role: InvitableRole;
  title: string;
  subtitle: string;
  color: string;
}> = [
  {
    role: FamilyRole.CO_GUARDIAN,
    title: 'Co-Guardian',
    subtitle: 'Can approve homework, tasks, and reward rules.',
    color: '#2E7CF6',
  },
  {
    role: FamilyRole.CAREGIVER,
    title: 'Caregiver',
    subtitle: 'Can help manage routines and view analytics.',
    color: '#0DA67A',
  },
  {
    role: FamilyRole.TEEN,
    title: 'Teen',
    subtitle: 'Receives tasks and rewards with no policy access.',
    color: '#E67912',
  },
  {
    role: FamilyRole.CHILD,
    title: 'Child',
    subtitle: 'Completes homework, chores, and exercise goals.',
    color: '#D04D8A',
  },
  {
    role: FamilyRole.SENIOR_CITIZEN,
    title: 'Senior Citizen',
    subtitle: 'Wellness-first support profile.',
    color: '#6A5DF2',
  },
];

const PERMISSION_LABELS: Array<{
  key:
    | 'canSetPolicies'
    | 'canOverridePolicies'
    | 'canApproveRewards'
    | 'canViewAnalytics'
    | 'canManageFamilyMembers'
    | 'canSetTasks'
    | 'canReviewHomework'
    | 'canSetWellnessGoals';
  label: string;
}> = [
  { key: 'canSetPolicies', label: 'Policies' },
  { key: 'canManageFamilyMembers', label: 'Family' },
  { key: 'canApproveRewards', label: 'Rewards' },
  { key: 'canReviewHomework', label: 'Homework' },
  { key: 'canSetWellnessGoals', label: 'Wellness' },
];

export default function FamilySetupScreen() {
  const router = useRouter();
  const dispatch = useDispatch();

  const user = useSelector((state: RootState) => state.auth.user);
  const family = useSelector((state: RootState) => state.family.family);
  const members = useSelector((state: RootState) => state.family.members);
  const currentUserRole = useSelector((state: RootState) => state.family.currentUserRole);
  const loading = useSelector((state: RootState) => state.family.loading);

  const [email, setEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState<InvitableRole>(FamilyRole.CO_GUARDIAN);
  const [submitting, setSubmitting] = useState(false);

  const effectiveRole = currentUserRole ?? FamilyRole.PRIMARY_GUARDIAN;
  const canManageFamily = RBACService.canManageFamilyMembers(effectiveRole);
  const guardians = useMemo(() => RBACService.getGuardians(members), [members]);
  const children = useMemo(() => RBACService.getChildren(members), [members]);
  const permissionState = ROLE_PERMISSIONS[effectiveRole];

  const handleInvite = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      Alert.alert('Missing email', 'Enter an email address before inviting a member.');
      return;
    }

    if (!family?.familyId) {
      Alert.alert('Missing family', 'Load or create a family before inviting members.');
      return;
    }

    try {
      dispatch(setFamilyLoading(true));
      setSubmitting(true);

      const inviteMember = httpsCallable(functions, 'addFamilyMember');
      const response = await inviteMember({
        familyId: family.familyId,
        email: trimmedEmail,
        role: selectedRole,
        invitedBy: user?.uid ?? null,
      });

      const payload = (response.data ?? {}) as {
        userId?: string;
        displayName?: string;
        email?: string;
        role?: FamilyRole;
      };

      dispatch(
        addFamilyMemberToStore({
          userId: payload.userId ?? `member_${Date.now()}`,
          displayName: payload.displayName ?? trimmedEmail.split('@')[0],
          email: payload.email ?? trimmedEmail,
          role: payload.role ?? selectedRole,
        })
      );

      setEmail('');
      setSelectedRole(FamilyRole.CO_GUARDIAN);
      Alert.alert('Member added', 'The invited member was added to the family.');
    } catch (error) {
      console.error('Invite family member failed:', error);
      dispatch(setFamilyError('Unable to add family member right now.'));
      Alert.alert('Invite failed', 'Could not add the family member. Please try again.');
    } finally {
      dispatch(setFamilyLoading(false));
      setSubmitting(false);
    }
  };

  return (
    <ThemedView style={styles.container} darkColor="#0A1B35">
      <View style={styles.bgOrbTop} />
      <View style={styles.bgOrbBottom} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <View style={styles.heroIcon}>
              <Ionicons name="people-outline" size={24} color="#0B4A9A" />
            </View>
            <View style={styles.heroBadge}>
              <Ionicons name="sparkles-outline" size={12} color="#0B4A9A" />
              <ThemedText style={styles.heroBadgeText}>Phase 2</ThemedText>
            </View>
          </View>

          <ThemedText type="title" style={styles.title} darkColor="#F6FAFF">
            Family Setup
          </ThemedText>
          <ThemedText style={styles.subtitle} darkColor="#C2D5F2">
            Invite guardians, caregivers, and child profiles from one screen.
          </ThemedText>

          <View style={styles.metricRow}>
            <View style={styles.metricPill}>
              <Ionicons name="people" size={14} color="#0B4A9A" />
              <ThemedText style={styles.metricText} darkColor="#0B4A9A">
                {members.length} members
              </ThemedText>
            </View>
            <View style={styles.metricPill}>
              <Ionicons name="shield-checkmark" size={14} color="#0B4A9A" />
              <ThemedText style={styles.metricText} darkColor="#0B4A9A">
                {guardians.length} guardians
              </ThemedText>
            </View>
            <View style={styles.metricPill}>
              <Ionicons name="school" size={14} color="#0B4A9A" />
              <ThemedText style={styles.metricText} darkColor="#0B4A9A">
                {children.length} children
              </ThemedText>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <ThemedText type="subtitle" style={styles.sectionTitle} darkColor="#1A2B48">
              Permission Snapshot
            </ThemedText>
            <TouchableOpacity activeOpacity={0.8} onPress={() => router.back()}>
              <ThemedText style={styles.backAction} darkColor="#2B4C7D">
                Back
              </ThemedText>
            </TouchableOpacity>
          </View>

          <View style={styles.permissionGrid}>
            {PERMISSION_LABELS.map((permission) => {
              const allowed = permissionState[permission.key];
              return (
                <View
                  key={permission.key}
                  style={[styles.permissionChip, allowed && styles.permissionChipActive]}
                >
                  <Ionicons
                    name={allowed ? 'checkmark-circle' : 'remove-circle-outline'}
                    size={14}
                    color={allowed ? '#0DA67A' : '#7C8AA5'}
                  />
                  <ThemedText
                    style={[styles.permissionText, allowed && styles.permissionTextActive]}
                  >
                    {permission.label}
                  </ThemedText>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.card}>
          <ThemedText type="subtitle" style={styles.sectionTitle} darkColor="#1A2B48">
            Invite Family Member
          </ThemedText>

          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            placeholder="guardian@example.com"
            placeholderTextColor="#8090AC"
            style={styles.input}
          />

          <ThemedText style={styles.inputLabel} darkColor="#4E5F7B">
            Role
          </ThemedText>

          <View style={styles.roleList}>
            {ROLE_OPTIONS.map((option) => {
              const isSelected = selectedRole === option.role;
              return (
                <TouchableOpacity
                  key={option.role}
                  style={[styles.roleCard, isSelected && styles.roleCardActive]}
                  activeOpacity={0.85}
                  onPress={() => setSelectedRole(option.role)}
                >
                  <View style={[styles.roleDot, { backgroundColor: option.color }]} />
                  <View style={styles.roleCopy}>
                    <ThemedText type="defaultSemiBold" style={styles.roleTitle} darkColor="#1A2B48">
                      {option.title}
                    </ThemedText>
                    <ThemedText style={styles.roleSubtitle} darkColor="#61718D">
                      {option.subtitle}
                    </ThemedText>
                  </View>
                  <Ionicons
                    name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                    size={20}
                    color={isSelected ? option.color : '#B2BECE'}
                  />
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={[
              styles.primaryButton,
              (!canManageFamily || submitting || loading) && styles.primaryButtonDisabled,
            ]}
            onPress={handleInvite}
            activeOpacity={0.9}
            disabled={!canManageFamily || submitting || loading}
          >
            <Ionicons name="person-add-outline" size={16} color="#FFFFFF" />
            <ThemedText style={styles.primaryButtonText}>
              {submitting ? 'Inviting...' : 'Invite Member'}
            </ThemedText>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <ThemedText type="subtitle" style={styles.sectionTitle} darkColor="#1A2B48">
            Current Family
          </ThemedText>

          {members.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={28} color="#8AA0C0" />
              <ThemedText style={styles.emptyTitle} darkColor="#5E6F89">
                No family members yet
              </ThemedText>
              <ThemedText style={styles.emptyText} darkColor="#7A8AA5">
                Invite a co-guardian or caregiver to start building your household.
              </ThemedText>
            </View>
          ) : (
            members.map((member) => (
              <View key={member.userId} style={styles.memberRow}>
                <View style={styles.memberAvatar}>
                  <Ionicons name="person-circle-outline" size={32} color="#2B4C7D" />
                </View>
                <View style={styles.memberInfo}>
                  <ThemedText type="defaultSemiBold" style={styles.memberName} darkColor="#1A2B48">
                    {member.displayName}
                  </ThemedText>
                  <ThemedText style={styles.memberEmail} darkColor="#61718D">
                    {member.email}
                  </ThemedText>
                </View>
                <View style={styles.roleBadge}>
                  <ThemedText style={styles.roleBadgeText} darkColor="#2B4C7D">
                    {member.role.replace('_', ' ')}
                  </ThemedText>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  bgOrbTop: {
    position: 'absolute',
    top: -90,
    right: -70,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(61, 181, 255, 0.2)',
  },
  bgOrbBottom: {
    position: 'absolute',
    bottom: -120,
    left: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(126, 119, 255, 0.16)',
  },
  scrollContent: {
    padding: 18,
    paddingBottom: 28,
  },
  heroCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: 'rgba(17, 40, 79, 0.92)',
    padding: 18,
    marginBottom: 16,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  heroIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D8E9FF',
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E8F2FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  heroBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0B4A9A',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  title: {
    fontSize: 30,
    color: '#F6FAFF',
    letterSpacing: 0.3,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
  },
  metricRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  metricPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E8F2FF',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  metricText: {
    color: '#0B4A9A',
    fontSize: 12,
    fontWeight: '700',
  },
  card: {
    borderRadius: 22,
    backgroundColor: '#F4F7FD',
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    color: '#1A2B48',
    marginBottom: 12,
  },
  backAction: {
    color: '#2B4C7D',
    fontWeight: '700',
  },
  permissionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  permissionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#DCE5F3',
  },
  permissionChipActive: {
    borderColor: '#C8EFD8',
    backgroundColor: '#F0FBF5',
  },
  permissionText: {
    color: '#7C8AA5',
    fontSize: 12,
    fontWeight: '600',
  },
  permissionTextActive: {
    color: '#0DA67A',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D8E2F0',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#1A2B48',
    fontSize: 15,
  },
  inputLabel: {
    marginTop: 14,
    marginBottom: 10,
    fontWeight: '700',
    color: '#4E5F7B',
  },
  roleList: {
    gap: 10,
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#DFE6F2',
    backgroundColor: '#FFFFFF',
  },
  roleCardActive: {
    borderColor: '#11A7B8',
    backgroundColor: '#F0FBFD',
  },
  roleDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  roleCopy: {
    flex: 1,
  },
  roleTitle: {
    color: '#1A2B48',
  },
  roleSubtitle: {
    marginTop: 3,
    color: '#61718D',
    fontSize: 13,
    lineHeight: 18,
  },
  primaryButton: {
    marginTop: 16,
    backgroundColor: '#0B4A9A',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 10,
  },
  emptyTitle: {
    marginTop: 10,
    color: '#5E6F89',
    fontWeight: '700',
  },
  emptyText: {
    marginTop: 6,
    color: '#7A8AA5',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F2',
  },
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#E8F2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    color: '#1A2B48',
  },
  memberEmail: {
    marginTop: 2,
    color: '#61718D',
    fontSize: 13,
  },
  roleBadge: {
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#DCE5F3',
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2B4C7D',
    textTransform: 'uppercase',
  },
});
