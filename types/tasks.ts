/**
 * Task and routine management types
 */

export interface Task {
  taskId: string;
  childId: string;
  familyId: string;
  title: string;
  description: string;
  taskType: TaskType;
  dueDate?: number;
  createdBy: string; // guardianId
  status: 'PENDING' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  pointsValue: number;
  verificationRequired: boolean;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
}

export enum TaskType {
  CHORE = 'CHORE',
  HOMEWORK = 'HOMEWORK',
  MEAL = 'MEAL',
  READING = 'READING',
  EXERCISE = 'EXERCISE',
  MEDITATION = 'MEDITATION',
  CUSTOM = 'CUSTOM',
}

export interface TaskVerification {
  verificationId: string;
  taskId: string;
  submittedAt: number;
  submittedBy: string; // childId
  evidenceUri?: string; // Photo/document proof
  parentNote?: string;
  manualVerification: boolean;
  autoVerified?: boolean;
  verifiedAt?: number;
  verifiedBy?: string; // guardianId
  decision: 'APPROVED' | 'REJECTED' | 'NEEDS_REVISION';
}

export interface Routine {
  routineId: string;
  childId: string;
  familyId: string;
  name: string;
  description: string;
  frequency: 'DAILY' | 'WEEKLY' | 'CUSTOM';
  tasks: Task[];
  scheduledTime?: string; // HH:MM format
  active: boolean;
  createdAt: number;
}

export interface DailyTaskProgress {
  progressId: string;
  childId: string;
  date: string; // YYYY-MM-DD
  tasksAssigned: number;
  tasksCompleted: number;
  pointsEarned: number;
  completionPercentage: number;
}

export interface TaskNotification {
  notificationId: string;
  taskId: string;
  childId: string;
  type: 'REMINDER' | 'OVERDUE' | 'APPROVAL_REQUIRED';
  sentAt: number;
  readAt?: number;
}
