import React, { useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { addRewardRule, setRewardRules } from '../store/slices/rewardsSlice';
import { RewardRule } from '../../types/rewards';

const REWARD_TYPES: RewardRule['rewardType'][] = ['SCREEN_TIME', 'PRIVILEGE', 'BADGE', 'CUSTOM'];

export default function RewardsSetupScreen() {
  const dispatch = useDispatch();
  const familyId = useSelector((state: RootState) => state.family.family?.familyId);
  const rewardRules = useSelector((state: RootState) => state.rewards.rewardRules);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [pointsRequired, setPointsRequired] = useState('50');
  const [rewardType, setRewardType] = useState<RewardRule['rewardType']>('SCREEN_TIME');
  const [rewardValue, setRewardValue] = useState('30');

  const activeCount = useMemo(
    () => rewardRules.filter((rule) => rule.active).length,
    [rewardRules]
  );

  const addRule = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert('Missing name', 'Give the reward a short name.');
      return;
    }

    const nextRule: RewardRule = {
      ruleId: `rule_${Date.now()}`,
      familyId: familyId ?? 'demo-family',
      name: trimmedName,
      description: description.trim() || 'Family reward rule',
      pointsRequired: Number(pointsRequired) || 0,
      rewardType,
      rewardValue: rewardType === 'SCREEN_TIME' ? Number(rewardValue) || 0 : rewardValue,
      active: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    dispatch(addRewardRule(nextRule));
    setName('');
    setDescription('');
    setPointsRequired('50');
    setRewardType('SCREEN_TIME');
    setRewardValue('30');
    Alert.alert('Reward added', 'The new reward rule is now available in the wallet.');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.heroCard}>
        <View style={styles.heroHeader}>
          <View style={styles.heroIcon}>
            <Ionicons name="gift-outline" size={24} color="#0B4A9A" />
          </View>
          <View style={styles.heroBadge}>
            <Ionicons name="sparkles-outline" size={12} color="#0B4A9A" />
            <Text style={styles.heroBadgeText}>Phase 2</Text>
          </View>
        </View>

        <Text style={styles.title}>Rewards Setup</Text>
        <Text style={styles.subtitle}>
          Define what points can unlock and keep the child reward wallet visible.
        </Text>

        <View style={styles.metricsRow}>
          <View style={styles.metricPill}>
            <Ionicons name="pricetag-outline" size={14} color="#0B4A9A" />
            <Text style={styles.metricText}>{rewardRules.length} rules</Text>
          </View>
          <View style={styles.metricPill}>
            <Ionicons name="checkmark-circle-outline" size={14} color="#0B4A9A" />
            <Text style={styles.metricText}>{activeCount} active</Text>
          </View>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Create reward rule</Text>

        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="30 min screen time"
          style={styles.input}
        />
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Reward description"
          style={styles.input}
        />
        <TextInput
          value={pointsRequired}
          onChangeText={setPointsRequired}
          placeholder="Points required"
          keyboardType="number-pad"
          style={styles.input}
        />
        <TextInput
          value={rewardValue}
          onChangeText={setRewardValue}
          placeholder="Reward value"
          keyboardType="default"
          style={styles.input}
        />

        <View style={styles.typeRow}>
          {REWARD_TYPES.map((type) => {
            const active = rewardType === type;
            return (
              <TouchableOpacity
                key={type}
                style={[styles.typeChip, active && styles.typeChipActive]}
                onPress={() => setRewardType(type)}
                activeOpacity={0.88}
              >
                <Text style={[styles.typeChipText, active && styles.typeChipTextActive]}>
                  {type}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity style={styles.primaryButton} onPress={addRule} activeOpacity={0.9}>
          <Ionicons name="add-circle-outline" size={16} color="#FFFFFF" />
          <Text style={styles.primaryButtonText}>Add reward rule</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Current reward rules</Text>
        {rewardRules.length === 0 ? (
          <Text style={styles.emptyText}>No reward rules yet. Add the first one above.</Text>
        ) : (
          rewardRules.map((rule) => (
            <View key={rule.ruleId} style={styles.ruleCard}>
              <View style={styles.ruleHeader}>
                <Text style={styles.ruleTitle}>{rule.name}</Text>
                <Text style={styles.rulePoints}>{rule.pointsRequired} pts</Text>
              </View>
              <Text style={styles.ruleText}>{rule.description}</Text>
              <Text style={styles.ruleMeta}>
                {rule.rewardType} •{' '}
                {typeof rule.rewardValue === 'number' ? `${rule.rewardValue}` : rule.rewardValue}
              </Text>
            </View>
          ))
        )}

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => dispatch(setRewardRules(rewardRules))}
          activeOpacity={0.9}
        >
          <Ionicons name="save-outline" size={16} color="#0B4A9A" />
          <Text style={styles.secondaryButtonText}>Refresh preview</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A1B35',
  },
  content: {
    padding: 18,
    paddingBottom: 28,
  },
  heroCard: {
    borderRadius: 22,
    backgroundColor: 'rgba(15, 35, 72, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    padding: 18,
    marginBottom: 14,
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
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(143, 212, 255, 0.15)',
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E8F2FF',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  heroBadgeText: {
    color: '#0B4A9A',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 30,
    color: '#F6FAFF',
    fontFamily: 'SpaceMono',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: '#C2D5F2',
  },
  metricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  metricPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E8F2FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  metricText: {
    color: '#0B4A9A',
    fontSize: 12,
    fontWeight: '700',
  },
  sectionCard: {
    borderRadius: 20,
    backgroundColor: '#F4F7FD',
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  sectionTitle: {
    color: '#1A2B48',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DCE5F3',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#1A2B48',
    marginBottom: 10,
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  typeChip: {
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#DCE5F3',
  },
  typeChipActive: {
    backgroundColor: '#E8F2FF',
    borderColor: '#0B4A9A',
  },
  typeChipText: {
    color: '#61718D',
    fontSize: 11,
    fontWeight: '700',
  },
  typeChipTextActive: {
    color: '#0B4A9A',
  },
  primaryButton: {
    marginTop: 14,
    backgroundColor: '#0B4A9A',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  secondaryButton: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#0B4A9A',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryButtonText: {
    color: '#0B4A9A',
    fontWeight: '700',
  },
  emptyText: {
    color: '#61718D',
    fontSize: 13,
  },
  ruleCard: {
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderWidth: 1,
    borderColor: '#DCE5F3',
    marginBottom: 10,
  },
  ruleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ruleTitle: {
    color: '#1A2B48',
    fontSize: 15,
    fontWeight: '700',
  },
  rulePoints: {
    color: '#0B4A9A',
    fontSize: 12,
    fontWeight: '700',
  },
  ruleText: {
    marginTop: 6,
    color: '#61718D',
    fontSize: 13,
    lineHeight: 18,
  },
  ruleMeta: {
    marginTop: 6,
    color: '#2B4C7D',
    fontSize: 12,
    fontWeight: '600',
  },
});
