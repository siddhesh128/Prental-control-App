import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { ChildRewardWallet, RewardRule } from '../../types/rewards';
import { RewardsService } from '../services/rewards.service';

const DEMO_REWARD_RULES: RewardRule[] = [
  {
    ruleId: 'rule-screen-time-30',
    familyId: 'demo-family',
    name: '30 minutes of screen time',
    description: 'Unlock a short bonus break after finishing your work.',
    pointsRequired: 50,
    rewardType: 'SCREEN_TIME',
    rewardValue: 30,
    active: true,
    createdAt: Date.now() - 1000 * 60 * 60,
    updatedAt: Date.now() - 1000 * 60 * 60,
  },
  {
    ruleId: 'rule-choice-night',
    familyId: 'demo-family',
    name: 'Choose tonight’s movie',
    description: 'Pick the family movie for the evening.',
    pointsRequired: 120,
    rewardType: 'PRIVILEGE',
    rewardValue: 'Movie choice',
    active: true,
    createdAt: Date.now() - 1000 * 60 * 60 * 2,
    updatedAt: Date.now() - 1000 * 60 * 60 * 2,
  },
  {
    ruleId: 'rule-badge-helper',
    familyId: 'demo-family',
    name: 'Helpful helper badge',
    description: 'Earn a badge for a strong completion streak.',
    pointsRequired: 200,
    rewardType: 'BADGE',
    rewardValue: 'Helpful Helper',
    active: true,
    createdAt: Date.now() - 1000 * 60 * 60 * 3,
    updatedAt: Date.now() - 1000 * 60 * 60 * 3,
  },
];

const DEMO_WALLET: ChildRewardWallet = {
  walletId: 'demo-wallet',
  childId: 'demo-child',
  familyId: 'demo-family',
  totalPoints: 96,
  pointsHistory: [
    {
      transactionId: 'txn-1',
      amount: 40,
      source: 'TASK_COMPLETION',
      sourceId: 'demo-task-1',
      description: 'Finished homework',
      timestamp: Date.now() - 1000 * 60 * 60 * 24,
    },
    {
      transactionId: 'txn-2',
      amount: 20,
      source: 'EXERCISE',
      sourceId: 'demo-exercise-1',
      description: 'Completed exercise routine',
      timestamp: Date.now() - 1000 * 60 * 60 * 6,
    },
    {
      transactionId: 'txn-3',
      amount: 36,
      source: 'BONUS',
      sourceId: 'streak-bonus',
      description: 'Streak bonus',
      timestamp: Date.now() - 1000 * 60 * 30,
    },
  ],
  achievements: [
    {
      achievementId: 'ach-1',
      name: 'Homework Hero',
      description: 'Completed 3 homework sessions in a row.',
      icon: 'school-outline',
      pointsValue: 25,
      condition: 'complete_homework_3_days',
      unlockedAt: Date.now() - 1000 * 60 * 60 * 12,
    },
    {
      achievementId: 'ach-2',
      name: 'Movement Builder',
      description: 'Finished 5 exercise challenges.',
      icon: 'fitness-outline',
      pointsValue: 50,
      condition: 'exercise_5_times',
    },
  ],
  currentStreak: {
    currentDayStreak: 4,
    currentWeekStreak: 2,
    bestDayStreak: 7,
    bestWeekStreak: 3,
    lastStreakDate: Date.now() - 1000 * 60 * 60 * 10,
  },
  lastUpdated: Date.now(),
};

export default function ChildRewardsScreen() {
  const storeWallet = useSelector((state: RootState) => state.rewards.wallet);
  const storeAchievements = useSelector((state: RootState) => state.rewards.achievements);
  const storeRules = useSelector((state: RootState) => state.rewards.rewardRules);

  const wallet = storeWallet ?? DEMO_WALLET;
  const rewardRules = storeRules.length > 0 ? storeRules : DEMO_REWARD_RULES;
  const achievements = storeAchievements.length > 0 ? storeAchievements : wallet.achievements;
  const [previewedRuleId, setPreviewedRuleId] = useState<string | null>(null);

  const streakMultiplier = useMemo(
    () => RewardsService.getStreakMultiplier(wallet.currentStreak),
    [wallet.currentStreak]
  );

  const recentTransactions = useMemo(
    () => [...wallet.pointsHistory].slice(-3).reverse(),
    [wallet.pointsHistory]
  );

  const bestDeal = useMemo(
    () =>
      rewardRules
        .filter((rule) => rule.active)
        .map((rule) => ({ rule, progress: RewardsService.getRedemptionProgress(wallet, rule) }))
        .sort((a, b) => a.progress.pointsNeeded - b.progress.pointsNeeded)[0],
    [rewardRules, wallet]
  );

  const handlePreviewRedemption = (rule: RewardRule) => {
    setPreviewedRuleId(rule.ruleId);

    if (RewardsService.canRedeemRule(wallet, rule)) {
      Alert.alert('Reward unlocked', `You can redeem ${rule.name} right now.`);
      return;
    }

    const progress = RewardsService.getRedemptionProgress(wallet, rule);
    Alert.alert('Keep going', `${progress.pointsNeeded} more points needed for ${rule.name}.`);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.heroCard}>
        <View style={styles.heroHeader}>
          <View style={styles.heroIcon}>
            <Ionicons name="trophy-outline" size={24} color="#0B4A9A" />
          </View>
          <View style={styles.heroBadge}>
            <Ionicons name="sparkles-outline" size={12} color="#0B4A9A" />
            <Text style={styles.heroBadgeText}>Phase 2</Text>
          </View>
        </View>

        <Text style={styles.title}>Rewards Wallet</Text>
        <Text style={styles.subtitle}>
          Track points, streaks, achievements, and what you can unlock next.
        </Text>

        <View style={styles.balanceRow}>
          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Current points</Text>
            <Text style={styles.balanceValue}>{wallet.totalPoints}</Text>
          </View>
          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Streak bonus</Text>
            <Text style={styles.balanceValue}>{streakMultiplier.toFixed(2)}x</Text>
          </View>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Best next reward</Text>
          <Ionicons name="arrow-forward-outline" size={18} color="#2B4C7D" />
        </View>

        {bestDeal ? (
          <TouchableOpacity
            style={styles.rewardRow}
            activeOpacity={0.9}
            onPress={() => handlePreviewRedemption(bestDeal.rule)}
          >
            <View style={styles.rewardIcon}>
              <Ionicons
                name={
                  previewedRuleId === bestDeal.rule.ruleId
                    ? 'checkmark-circle-outline'
                    : 'gift-outline'
                }
                size={24}
                color="#0B4A9A"
              />
            </View>
            <View style={styles.rewardCopy}>
              <Text style={styles.rewardTitle}>{bestDeal.rule.name}</Text>
              <Text style={styles.rewardDesc}>{bestDeal.rule.description}</Text>
              <View style={styles.progressTrack}>
                <View
                  style={[styles.progressFill, { width: `${bestDeal.progress.percentComplete}%` }]}
                />
              </View>
              <Text style={styles.progressText}>
                {bestDeal.progress.pointsOwned}/{bestDeal.rule.pointsRequired} points
              </Text>
            </View>
          </TouchableOpacity>
        ) : (
          <Text style={styles.emptyText}>No active reward rules yet.</Text>
        )}
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Available rewards</Text>
        {rewardRules.map((rule) => {
          const progress = RewardsService.getRedemptionProgress(wallet, rule);
          const canRedeem = RewardsService.canRedeemRule(wallet, rule);
          return (
            <TouchableOpacity
              key={rule.ruleId}
              style={[styles.listItem, canRedeem && styles.listItemReady]}
              activeOpacity={0.9}
              onPress={() => handlePreviewRedemption(rule)}
            >
              <View style={styles.listItemTopRow}>
                <View style={styles.listItemCopy}>
                  <Text style={styles.listItemTitle}>{rule.name}</Text>
                  <Text style={styles.listItemDesc}>{rule.description}</Text>
                </View>
                <View style={[styles.tag, canRedeem && styles.tagReady]}>
                  <Text style={styles.tagText}>{rule.pointsRequired} pts</Text>
                </View>
              </View>
              <View style={styles.listItemBottomRow}>
                <Text style={styles.listItemMeta}>
                  {rule.rewardType}{' '}
                  {typeof rule.rewardValue === 'number'
                    ? `• ${rule.rewardValue}`
                    : `• ${rule.rewardValue}`}
                </Text>
                <Text style={styles.listItemMeta}>
                  {canRedeem ? 'Ready now' : `${progress.pointsNeeded} to go`}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Recent points</Text>
        {recentTransactions.map((transaction) => (
          <View key={transaction.transactionId} style={styles.transactionRow}>
            <View style={styles.transactionIcon}>
              <Ionicons
                name={transaction.amount >= 0 ? 'add-circle-outline' : 'remove-circle-outline'}
                size={20}
                color={transaction.amount >= 0 ? '#0DA67A' : '#D04D8A'}
              />
            </View>
            <View style={styles.transactionCopy}>
              <Text style={styles.transactionTitle}>{transaction.description}</Text>
              <Text style={styles.transactionMeta}>{transaction.source.replace('_', ' ')}</Text>
            </View>
            <Text
              style={[
                styles.transactionAmount,
                transaction.amount >= 0 ? styles.amountPositive : styles.amountNegative,
              ]}
            >
              {transaction.amount >= 0 ? '+' : ''}
              {transaction.amount}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Achievements</Text>
        <View style={styles.achievementGrid}>
          {achievements.map((achievement) => (
            <View key={achievement.achievementId} style={styles.achievementCard}>
              <Ionicons
                name={(achievement.icon as any) ?? 'ribbon-outline'}
                size={22}
                color="#0B4A9A"
              />
              <Text style={styles.achievementTitle}>{achievement.name}</Text>
              <Text style={styles.achievementDesc}>{achievement.description}</Text>
              <Text style={styles.achievementMeta}>
                {achievement.unlockedAt ? 'Unlocked' : 'Locked'} • {achievement.pointsValue} pts
              </Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#091A35',
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
    color: '#BFD2F4',
  },
  balanceRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  balanceCard: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: '#F4F7FD',
    padding: 14,
  },
  balanceLabel: {
    color: '#5E6D86',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  balanceValue: {
    marginTop: 8,
    color: '#1A2B48',
    fontSize: 28,
    fontWeight: '800',
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    color: '#1A2B48',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  rewardRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  rewardIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F2FF',
  },
  rewardCopy: {
    flex: 1,
  },
  rewardTitle: {
    color: '#1A2B48',
    fontSize: 16,
    fontWeight: '700',
  },
  rewardDesc: {
    marginTop: 4,
    color: '#61718D',
    fontSize: 13,
    lineHeight: 18,
  },
  progressTrack: {
    marginTop: 10,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#DCE5F3',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#0DA67A',
  },
  progressText: {
    marginTop: 6,
    color: '#4E5F7B',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyText: {
    color: '#61718D',
    fontSize: 13,
  },
  listItem: {
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E0E8F3',
  },
  listItemReady: {
    borderColor: '#BFE9D9',
    backgroundColor: '#F5FFFA',
  },
  listItemTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  listItemCopy: {
    flex: 1,
  },
  listItemTitle: {
    color: '#1A2B48',
    fontSize: 15,
    fontWeight: '700',
  },
  listItemDesc: {
    marginTop: 4,
    color: '#61718D',
    fontSize: 13,
    lineHeight: 18,
  },
  tag: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#E8F2FF',
  },
  tagReady: {
    backgroundColor: '#DDF7E9',
  },
  tagText: {
    color: '#0B4A9A',
    fontSize: 11,
    fontWeight: '700',
  },
  listItemBottomRow: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  listItemMeta: {
    color: '#4E5F7B',
    fontSize: 12,
    fontWeight: '600',
  },
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F2',
    gap: 10,
  },
  transactionIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  transactionCopy: {
    flex: 1,
  },
  transactionTitle: {
    color: '#1A2B48',
    fontSize: 14,
    fontWeight: '700',
  },
  transactionMeta: {
    marginTop: 2,
    color: '#61718D',
    fontSize: 12,
  },
  transactionAmount: {
    fontSize: 14,
    fontWeight: '800',
  },
  amountPositive: {
    color: '#0DA67A',
  },
  amountNegative: {
    color: '#D04D8A',
  },
  achievementGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  achievementCard: {
    width: '48%',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderWidth: 1,
    borderColor: '#E0E8F3',
  },
  achievementTitle: {
    marginTop: 8,
    color: '#1A2B48',
    fontSize: 14,
    fontWeight: '700',
  },
  achievementDesc: {
    marginTop: 4,
    color: '#61718D',
    fontSize: 12,
    lineHeight: 16,
  },
  achievementMeta: {
    marginTop: 8,
    color: '#0B4A9A',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
});
