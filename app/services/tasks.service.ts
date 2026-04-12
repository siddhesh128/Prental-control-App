/**
 * Tasks and Routines Service
 * Manages task creation, submission, verification, and routine scheduling
 */

import { Task, TaskType, Routine, DailyTaskProgress } from '../../types/tasks';

export class TasksService {
  /**
   * Create a new task
   */
  static createTask(
    childId: string,
    familyId: string,
    title: string,
    description: string,
    taskType: TaskType,
    pointsValue: number,
    createdBy: string,
    dueDate?: number,
    verificationRequired: boolean = true
  ): Task {
    return {
      taskId: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      childId,
      familyId,
      title,
      description,
      taskType,
      dueDate,
      createdBy,
      status: 'PENDING',
      priority: 'MEDIUM',
      pointsValue,
      verificationRequired,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }

  /**
   * Create a daily routine
   */
  static createRoutine(childId: string, familyId: string, name: string, tasks: Task[]): Routine {
    return {
      routineId: `routine_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      childId,
      familyId,
      name,
      description: '',
      frequency: 'DAILY',
      tasks,
      active: true,
      createdAt: Date.now(),
    };
  }

  /**
   * Mark task as submitted
   */
  static submitTask(task: Task): Task {
    return {
      ...task,
      status: 'SUBMITTED',
      updatedAt: Date.now(),
    };
  }

  /**
   * Mark task as approved with points
   */
  static approveTask(task: Task, pointsAwarded?: number): Task {
    return {
      ...task,
      status: 'APPROVED',
      completedAt: Date.now(),
      updatedAt: Date.now(),
      // Points were already deducted during creation
    };
  }

  /**
   * Mark task as rejected
   */
  static rejectTask(task: Task): Task {
    return {
      ...task,
      status: 'REJECTED',
      updatedAt: Date.now(),
    };
  }

  /**
   * Check if task is overdue
   */
  static isOverdue(task: Task): boolean {
    if (!task.dueDate || task.status === 'COMPLETED' || task.status === 'APPROVED') {
      return false;
    }
    return task.dueDate < Date.now();
  }

  /**
   * Check if task can be submitted now
   */
  static canSubmit(task: Task): boolean {
    return task.status === 'PENDING' || task.status === 'REJECTED';
  }

  /**
   * Filter tasks that need parent approval
   */
  static getTasksNeedingApproval(tasks: Task[]): Task[] {
    return tasks.filter((t) => t.status === 'SUBMITTED' && t.verificationRequired);
  }

  /**
   * Get overdue tasks
   */
  static getOverdueTasks(tasks: Task[]): Task[] {
    return tasks.filter((t) => this.isOverdue(t));
  }

  /**
   * Get pending tasks
   */
  static getPendingTasks(tasks: Task[]): Task[] {
    return tasks.filter((t) => t.status === 'PENDING');
  }

  /**
   * Get completed tasks
   */
  static getCompletedTasks(tasks: Task[]): Task[] {
    return tasks.filter((t) => t.status === 'APPROVED' || t.status === 'COMPLETED');
  }

  /**
   * Calculate daily progress
   */
  static calculateDailyProgress(tasks: Task[], date: string): DailyTaskProgress {
    const dayTasks = tasks.filter((t) => {
      if (!t.dueDate) return false;
      const taskDate = new Date(t.dueDate).toISOString().split('T')[0];
      return taskDate === date;
    });

    const completed = dayTasks.filter((t) => t.status === 'APPROVED').length;
    const pointsEarned = dayTasks
      .filter((t) => t.status === 'APPROVED')
      .reduce((sum, t) => sum + t.pointsValue, 0);

    return {
      progressId: `progress_${date}_${Date.now()}`,
      childId: dayTasks[0]?.childId || '',
      date,
      tasksAssigned: dayTasks.length,
      tasksCompleted: completed,
      pointsEarned,
      completionPercentage: dayTasks.length > 0 ? (completed / dayTasks.length) * 100 : 0,
    };
  }

  /**
   * Get tasks for a child in date range
   */
  static getTasksForDateRange(tasks: Task[], startDate: Date, endDate: Date): Task[] {
    const startTime = startDate.getTime();
    const endTime = endDate.getTime();

    return tasks.filter((t) => {
      if (!t.dueDate) return false;
      return t.dueDate >= startTime && t.dueDate <= endTime;
    });
  }

  /**
   * Filter tasks by type
   */
  static filterByType(tasks: Task[], type: TaskType): Task[] {
    return tasks.filter((t) => t.taskType === type);
  }

  /**
   * Filter tasks by priority
   */
  static filterByPriority(tasks: Task[], priority: Task['priority']): Task[] {
    return tasks.filter((t) => t.priority === priority);
  }

  /**
   * Sort tasks by due date
   */
  static sortByDueDate(tasks: Task[]): Task[] {
    return [...tasks].sort((a, b) => {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate - b.dueDate;
    });
  }

  /**
   * Sort tasks by priority (HIGH > MEDIUM > LOW)
   */
  static sortByPriority(tasks: Task[]): Task[] {
    const priorityOrder: Record<Task['priority'], number> = {
      HIGH: 0,
      MEDIUM: 1,
      LOW: 2,
    };

    return [...tasks].sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  }

  /**
   * Get task completion percentage for a child
   */
  static getCompletionPercentage(tasks: Task[]): number {
    if (tasks.length === 0) return 0;
    const completed = tasks.filter((t) => t.status === 'APPROVED').length;
    return (completed / tasks.length) * 100;
  }
}
