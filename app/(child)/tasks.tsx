import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';
import { RootState } from '../store';
import { addPoints } from '../store/slices/rewardsSlice';
import { updateTask } from '../store/slices/tasksSlice';
import { TasksService } from '../services/tasks.service';
import { Task } from '../../types/tasks';

const FILTERS = ['ALL', 'PENDING', 'SUBMITTED', 'APPROVED', 'REJECTED'] as const;

const DEMO_TASKS: Task[] = [
  {
    taskId: 'demo-task-1',
    childId: 'demo-child',
    familyId: 'demo-family',
    title: 'Finish math homework',
    description: 'Complete page 14 and show the final answers.',
    taskType: 'HOMEWORK',
    dueDate: Date.now() + 1000 * 60 * 60 * 4,
    createdBy: 'demo-parent',
    status: 'PENDING',
    priority: 'HIGH',
    pointsValue: 40,
    verificationRequired: true,
    createdAt: Date.now() - 1000 * 60 * 45,
    updatedAt: Date.now() - 1000 * 60 * 45,
  },
  {
    taskId: 'demo-task-2',
    childId: 'demo-child',
    familyId: 'demo-family',
    title: 'Clean study desk',
    description: 'Clear clutter and organize notebooks.',
    taskType: 'CHORE',
    dueDate: Date.now() + 1000 * 60 * 60 * 8,
    createdBy: 'demo-parent',
    status: 'PENDING',
    priority: 'MEDIUM',
    pointsValue: 20,
    verificationRequired: true,
    createdAt: Date.now() - 1000 * 60 * 90,
    updatedAt: Date.now() - 1000 * 60 * 90,
  },
  {
    taskId: 'demo-task-3',
    childId: 'demo-child',
    familyId: 'demo-family',
    title: '15 minutes of stretching',
    description: 'Complete a simple movement break routine.',
    taskType: 'EXERCISE',
    dueDate: Date.now() - 1000 * 60 * 30,
    createdBy: 'demo-parent',
    status: 'REJECTED',
    priority: 'LOW',
    pointsValue: 15,
    verificationRequired: false,
    createdAt: Date.now() - 1000 * 60 * 120,
    updatedAt: Date.now() - 1000 * 60 * 20,
  },
];

export default function ChildTasksScreen() {
  const dispatch = useDispatch();
  const familyId = useSelector((state: RootState) => state.family.family?.familyId);
  const childId = useSelector((state: RootState) => state.auth.user?.uid);
  const storeTasks = useSelector((state: RootState) => state.tasks.tasks);

  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('ALL');
  const [submittingTaskId, setSubmittingTaskId] = useState<string | null>(null);

  const tasks = storeTasks.length > 0 ? storeTasks : DEMO_TASKS;
  const visibleTasks = useMemo(() => {
    if (filter === 'ALL') {
      return tasks;
    }

    return tasks.filter((task) => task.status === filter);
  }, [filter, tasks]);

  const progress = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return TasksService.calculateDailyProgress(tasks, today);
  }, [tasks]);

  const handleSubmitTask = async (task: Task) => {
    if (!familyId) {
      Alert.alert('No family loaded', 'Pair the device with a parent account first.');
      return;
    }

    if (!childId) {
      Alert.alert('Missing child account', 'Please sign in again and try submitting the task.');
      return;
    }

    try {
      setSubmittingTaskId(task.taskId);

      const submitTask = httpsCallable(functions, 'completeTask');
      const response = await submitTask({
        taskId: task.taskId,
        familyId,
        childId,
        pointsValue: task.pointsValue,
      });

      dispatch(
        updateTask({
          ...task,
          status: 'SUBMITTED',
          updatedAt: Date.now(),
        })
      );

      dispatch(
        addPoints((response.data as { pointsAwarded?: number })?.pointsAwarded ?? task.pointsValue)
      );

      Alert.alert('Task submitted', 'Your parent will review it shortly.');
    } catch (error) {
      console.error('Task submission failed:', error);
      Alert.alert('Submission failed', 'Could not submit the task right now.');
    } finally {
      setSubmittingTaskId(null);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.heroCard}>
        <View style={styles.heroHeader}>
          <View style={styles.heroIcon}>
            <Ionicons name="checkbox-outline" size={24} color="#0B4A9A" />
          </View>
          <View style={styles.heroBadge}>
            <Ionicons name="flash-outline" size={12} color="#0B4A9A" />
            <Text style={styles.heroBadgeText}>Phase 2</Text>
          </View>
        </View>

        <Text style={styles.title}>My Tasks</Text>
        <Text style={styles.subtitle}>
          Submit chores, homework, and exercise goals for parent review.
        </Text>

        <View style={styles.metricsRow}>
          <View style={styles.metricPill}>
            <Ionicons name="checkmark-done-outline" size={14} color="#0B4A9A" />
            <Text style={styles.metricText}>
              {progress.tasksCompleted}/{progress.tasksAssigned} done
            </Text>
          </View>
          <View style={styles.metricPill}>
            <Ionicons name="trophy-outline" size={14} color="#0B4A9A" />
            <Text style={styles.metricText}>{progress.pointsEarned} points earned</Text>
          </View>
        </View>

        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${Math.max(10, progress.completionPercentage || 0)}%` },
            ]}
          />
        </View>
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map((item) => {
          const active = filter === item;
          return (
            <TouchableOpacity
              key={item}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => setFilter(item)}
              activeOpacity={0.85}
            >
              <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                {item}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.sectionCard}>
        {visibleTasks.map((task) => {
          const canSubmit = TasksService.canSubmit(task) || task.status === 'REJECTED';
          return (
            <View key={task.taskId} style={styles.taskCard}>
              <View style={styles.taskHeader}>
                <View style={styles.taskTitleWrap}>
                  <Text style={styles.taskTitle}>{task.title}</Text>
                  <Text style={styles.taskDesc}>{task.description}</Text>
                </View>
                <View style={[styles.statusBadge, statusStyles[task.status]]}>
                  <Text style={styles.statusBadgeText}>{task.status}</Text>
                </View>
              </View>

              <View style={styles.taskMetaRow}>
                <View style={styles.metaItem}>
                  <Ionicons name="gift-outline" size={14} color="#0B4A9A" />
                  <Text style={styles.metaText}>{task.pointsValue} pts</Text>
                </View>
                <View style={styles.metaItem}>
                  <Ionicons name="calendar-outline" size={14} color="#0B4A9A" />
                  <Text style={styles.metaText}>
                    {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}
                  </Text>
                </View>
              </View>

              <View style={styles.taskFooter}>
                <View style={styles.priorityPill}>
                  <Text style={styles.priorityText}>{task.priority}</Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.submitButton,
                    (!canSubmit || submittingTaskId === task.taskId) && styles.submitButtonDisabled,
                  ]}
                  onPress={() => handleSubmitTask(task)}
                  disabled={!canSubmit || submittingTaskId === task.taskId}
                  activeOpacity={0.9}
                >
                  <Text style={styles.submitButtonText}>
                    {submittingTaskId === task.taskId
                      ? 'Submitting...'
                      : task.status === 'SUBMITTED'
                        ? 'Submitted'
                        : 'Submit'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}

        {visibleTasks.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={28} color="#8AA0C0" />
            <Text style={styles.emptyTitle}>No tasks in this view</Text>
            <Text style={styles.emptyText}>
              Switch filters or wait for your parent to assign new tasks.
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const statusStyles: Record<Task['status'], object> = {
  PENDING: { backgroundColor: '#E8F2FF' },
  SUBMITTED: { backgroundColor: '#FFF4E6' },
  APPROVED: { backgroundColor: '#E8F9F1' },
  REJECTED: { backgroundColor: '#FCE8EC' },
  COMPLETED: { backgroundColor: '#EDF1F7' },
};

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
    letterSpacing: 0.5,
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
  progressTrack: {
    marginTop: 12,
    height: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(232, 242, 255, 0.16)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#4CD6A0',
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  filterChip: {
    backgroundColor: 'rgba(244, 247, 253, 0.95)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterChipActive: {
    backgroundColor: '#E8F2FF',
  },
  filterChipText: {
    color: '#5E6D86',
    fontSize: 12,
    fontWeight: '700',
  },
  filterChipTextActive: {
    color: '#0B4A9A',
  },
  sectionCard: {
    gap: 12,
  },
  taskCard: {
    borderRadius: 18,
    backgroundColor: '#F4F7FD',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  taskTitleWrap: {
    flex: 1,
  },
  taskTitle: {
    color: '#1A2B48',
    fontSize: 16,
    fontWeight: '700',
  },
  taskDesc: {
    marginTop: 4,
    color: '#61718D',
    fontSize: 13,
    lineHeight: 18,
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusBadgeText: {
    color: '#1A2B48',
    fontSize: 11,
    fontWeight: '700',
  },
  taskMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaText: {
    color: '#4E5F7B',
    fontSize: 12,
    fontWeight: '600',
  },
  taskFooter: {
    marginTop: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  priorityPill: {
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#DCE5F3',
  },
  priorityText: {
    color: '#2B4C7D',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  submitButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0B4A9A',
    borderRadius: 14,
    minHeight: 42,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    backgroundColor: '#F4F7FD',
    borderRadius: 18,
  },
  emptyTitle: {
    marginTop: 10,
    color: '#1A2B48',
    fontSize: 15,
    fontWeight: '700',
  },
  emptyText: {
    marginTop: 6,
    color: '#61718D',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
});
