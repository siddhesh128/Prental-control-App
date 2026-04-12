# Service API Reference

Quick reference for all available services and how to use them.

---

## RBAC Service

**File**: `app/services/rbac.service.ts`
◊
Check what a user can do based on their role.

### Available Methods

```typescript
import { RBACService } from '../services/rbac.service';

// Check if role can set policies (create rules, enable restrictions)
RBACService.canSetPolicies(role); // → boolean
RBACService.canSetPolicies('PRIMARY_GUARDIAN'); // → true
RBACService.canSetPolicies('CHILD'); // → false

// Check if role can override family decisions (emergencies)
RBACService.canOverridePolicies(role); // → boolean

// Check if role can approve completed tasks/homework for points
RBACService.canApproveRewards(role); // → boolean

// Get all family members with target role
RBACService.getGuardians(members); // → FamilyMember[]
RBACService.getCaregivers(members); // → FamilyMember[]
RBACService.getChildren(members); // → FamilyMember[]

// Check family hierarchy level (for override authority)
RBACService.getRoleHierarchyLevel(role); // → number (5=primary, 1=child)

// Validate member status in family
RBACService.isActiveMember(member); // → boolean
```

### Example Usage

```typescript
const canApprove = RBACService.canApproveRewards(currentUserRole);

if (canApprove) {
  // Show approve homework button
}

const guardians = RBACService.getGuardians(familyMembers);
// Use to notify guardians of new submissions
```

---

## Rewards Service

**File**: `app/services/rewards.service.ts`

Manage points, streaks, achievements, and redemptions.

### Available Methods

```typescript
import { RewardsService } from '../services/rewards.service';

// Calculate current streak multiplier
// Returns 1.0 to 2.0x based on consecutive days
RewardsService.calculateStreakMultiplier(streak);
// → 1.0 (no streak), 1.25 (3+ days), 1.5 (7+ days), 2.0 (30+ days)

// Add transaction to wallet
RewardsService.addPointTransaction(wallet, points, reason);
// → Updated wallet with transaction logged

// Get wallet with all historical transactions
RewardsService.getWalletWithHistory(childId);
// → { totalPoints, transactions: [], achievements: [] }

// Update daily streak (call after successful task)
RewardsService.updateDailyStreak(streakData);
// → Updated streak with day count, multiplier, last completion date

// Check if reward can be redeemed
RewardsService.canRedeemReward(wallet, rewardCost);
// → true if wallet.totalPoints >= rewardCost

// Apply redemption
RewardsService.applyRedemption(wallet, rewardId, cost);
// → Updated wallet with points deducted
```

### Example Usage

```typescript
// After child completes homework
const basePoints = 100;
const multiplier = RewardsService.calculateStreakMultiplier(childStreak);
const finalPoints = Math.round(basePoints * multiplier);

dispatch(addPoints(finalPoints));

// Check before showing redeem button
if (RewardsService.canRedeemReward(wallet, 200)) {
  // Show redeem button for item costing 200 points
}
```

---

## Tasks Service

**File**: `app/services/tasks.service.ts`

Create, manage, submit, and track tasks.

### Available Methods

```typescript
import { TasksService } from '../services/tasks.service';

// Get tasks matching criteria
TasksService.filterTasksByStatus(tasks, ['PENDING', 'SUBMITTED']);
// → Task[]

TasksService.filterTasksByType(tasks, 'HOMEWORK');
// → Task[]

TasksService.filterTasksByPriority(tasks, 'HIGH');
// → Task[]

// Check if task is overdue
TasksService.isTaskOverdue(task);
// → boolean

// Get daily completion percentage
TasksService.calculateDailyProgress(tasks);
// → { completed: 3, total: 5, percentage: 60 }

// Sort tasks intelligently
TasksService.sortTasksByDueDate(tasks);
// → Task[] sorted nearest deadline first

TasksService.sortTasksByPriority(tasks);
// → Task[] sorted HIGH → MEDIUM → LOW
```

### Example Usage

```typescript
// Show only pending tasks
const pending = TasksService.filterTasksByStatus(allTasks, ['PENDING']);

// Show daily progress bar
const progress = TasksService.calculateDailyProgress(todaysTasks);
// progress.percentage = 60

// Highlight overdue
const isOverdue = TasksService.isTaskOverdue(task);
if (isOverdue) {
  // Show red accent
}
```

---

## Homework Service

**File**: `app/services/homework.service.ts`

Manage homework pre/post images and analysis workflows.

### Available Methods

```typescript
import { HomeworkService } from '../services/homework.service';

// Upload notebook image to Storage
HomeworkService.uploadHomeworkImage(
  familyId,
  childId,
  sessionId,
  imageUri,
  'pre' | 'post'
)
  // → { downloadUrl, storageRef }

// Trigger AI analysis
HomeworkService.analyzeHomeworkSession(sessionId, familyId)
  // → Call Cloud Function 'analyzeHomework'

// Submit parent review
HomeworkService.submitParentReview(
  familyId,
  sessionId,
  approved: boolean,
  pointsAwarded: number
)
  // → Call Cloud Function 'reviewHomework'

// Get session by ID
HomeworkService.getHomeworkSession(sessionId)
  // → HomeworkSession with images, analysis, review
```

### Example Usage

```typescript
// Child captures notebook before homework
const preImageUri = await takePhoto(); // Camera API
const preResult = await HomeworkService.uploadHomeworkImage(
  familyId,
  childId,
  sessionId,
  preImageUri,
  'pre'
);
// Save preResult.downloadUrl to session

// After homework, capture post image
const postImageUri = await takePhoto();
const postResult = await HomeworkService.uploadHomeworkImage(
  familyId,
  childId,
  sessionId,
  postImageUri,
  'post'
);

// Trigger analysis
const analysis = await HomeworkService.analyzeHomeworkSession(sessionId, familyId);
// Shows confidence score to parent

// Parent reviews analysis
await HomeworkService.submitParentReview(
  familyId,
  sessionId,
  true, // approved
  150 // points
);
```

---

## Homework Analyzer (AI Service)

**File**: `app/services/ai/homework-analyzer.ts`

Analyze homework using Genkit Vision API.

### Available Methods

```typescript
import { HomeworkAnalyzer } from '../services/ai/homework-analyzer';

// Analyze pre and post homework images
HomeworkAnalyzer.analyzeHomeworkSession(preImageUri, postImageUri);
// → HomeworkAnalysisResult {
//     preText: string,
//     postText: string,
//     writingDensityDifference: number (0-100),
//     isDuplicate: boolean,
//     completionEstimate: number (0-100),
//     confidence: number (0-100),
//     explanation: string
//   }

// Check for duplicate images
HomeworkAnalyzer.detectDuplicateImages(image1Uri, image2Uri);
// → boolean (true if >95% similar)
```

### Confidence Score Interpretation

```
< 40  : Likely incomplete, reject recommended
40-85 : Ambiguous, parent review recommended
> 85  : Likely complete, auto-approve safe
```

### Example Usage

```typescript
const analysis = await HomeworkAnalyzer.analyzeHomeworkSession(preImageUri, postImageUri);

if (analysis.isDuplicate) {
  alert('Same image uploaded twice');
  return;
}

if (analysis.confidence > 85) {
  // Auto-approve
  await reviewHomework(sessionId, true, 100);
} else {
  // Show parent review UI with confidence
  showParentReview({
    confidence: analysis.confidence,
    explanation: analysis.explanation,
  });
}
```

---

## Pose Detection (AI Service)

**File**: `app/services/ai/pose-detection.ts`

Analyze posture and movement from video frames.

### Available Methods

```typescript
import { PoseDetectionService } from '../services/ai/pose-detection';

// Analyze single frame for posture
PoseDetectionService.analyzePoseFrame(frameUri)
  // → PoseFrame {
  //     shoulderAngle: number (degrees),
  //     neckAngle: number (degrees),
  //     postureQuality: number (0-100),
  //     keypoints: Keypoint[],
  //     hasSlouchDetected: boolean,
  //     hasHighNeckStrain: boolean
  //   }

// Check multiple frames for movement variance (liveness check)
PoseDetectionService.calculateFrameVariance(frames: PoseFrame[])
  // → number (0-100, higher = more movement)
```

### Example Usage

```typescript
// Use in background monitoring
const frame = await PoseDetectionService.analyzePoseFrame(frameUri);

if (frame.hasSlouchDetected) {
  dispatch(
    addPostureAlert({
      type: 'SLOUCHING',
      timestamp: new Date(),
      recommendation: 'Sit up straight',
    })
  );
}

if (frame.postureQuality < 40) {
  // Show posture correction feedback to child
}
```

---

## Exercise Verification (AI Service)

**File**: `app/services/ai/exercise-verification.ts`

Verify exercise form and count repetitions.

### Available Methods

```typescript
import { ExerciseVerificationService } from '../services/ai/exercise-verification';

// Count reps from pose sequence
ExerciseVerificationService.countReps(
  poseFrames: PoseFrame[],
  exerciseType: 'PUSH_UPS' | 'SQUATS' | 'JUMPING_JACKS'
)
  // → { reps: number, confidence: number (0-100) }

// Check if frames show real movement (anti-spoofing)
ExerciseVerificationService.detectLiveness(frames: PoseFrame[])
  // → { isLive: boolean, variance: number }

// Validate exercise form
ExerciseVerificationService.validateExerciseForm(
  poseFrames,
  exerciseType
)
  // → { isValid: boolean, feedback: string, repsValid: number }
```

### Example Usage

```typescript
// During exercise session, collect pose frames
const frames: PoseFrame[] = [];
// ... collect frames from camera ...

// After workout
const repCount = await ExerciseVerificationService.countReps(frames, 'PUSH_UPS');

const liveness = await ExerciseVerificationService.detectLiveness(frames);

if (!liveness.isLive) {
  alert('Video must show real movement');
  return;
}

// Calculate bonus minutes (1 rep = 1 minute, capped at 30/day)
const bonusMinutes = Math.min(repCount.reps, 30);

// Award points
dispatch(addPoints(bonusMinutes * 2)); // 2 points per minute
```

---

## Exercise Service

**File**: `app/services/exercise.service.ts`

Manage exercise routines and bonus calculations.

### Available Methods

```typescript
import { ExerciseService } from '../services/exercise.service';

// Get predefined routines
ExerciseService.getExerciseRoutines()
  // → ExerciseRoutine[] {
  //     type: 'PUSH_UPS' | 'SQUATS' | ...,
  //     targetReps: 20,
  //     difficulty: 'EASY' | 'MEDIUM' | 'HARD',
  //     difficultyMultiplier: 1.0 | 1.5 | 2.0
  //   }

// Calculate bonus minutes earned
ExerciseService.calculateBonusMinutes(
  repsCompleted: number,
  difficulty: string
)
  // → number (capped at daily max 30)

// Check daily bonus cap
ExerciseService.checkDailyBonusCap(exerciseSessions: ExerciseSession[])
  // → { minutesUsed: number, cap: 30, remainingMinutes: number }
```

### Example Usage

```typescript
const routines = ExerciseService.getExerciseRoutines();
// Show child to pick from available exercises

// After completing reps
const bonus = ExerciseService.calculateBonusMinutes(
  repCount,
  'MEDIUM' // difficulty
);
// bonus might be 45, but capped to remaining daily cap

const cap = ExerciseService.checkDailyBonusCap(todaysSessions);
// cap.minutesUsed = 20, cap.remainingMinutes = 10
```

---

## Sedentary Service

**File**: `app/services/sedentary.service.ts`

Track inactivity and wellness gaps.

### Available Methods

```typescript
import { SedentaryService } from '../services/sedentary.service';

// Check if child has been inactive too long
SedentaryService.checkSedentaryTime(
  lastActivityTime: Date,
  thresholdMinutes: number = 30
)
  // → boolean (true if inactive > threshold)

// Generate wellness recommendations
SedentaryService.generateBreakReminder()
  // → BreakReminder {
  //     type: 'EYE_REST' | 'HYDRATION' | 'STRETCH' | 'MOVEMENT',
  //     message: string,
  //     durationMinutes: number
  //   }

// Update wellness score
SedentaryService.calculateWellnessScore(
  postureSessions,
  exerciseSessions,
  breaksTaken
)
  // → number (0-100)
```

### Example Usage

```typescript
// Check during background monitoring
const isSedentary = SedentaryService.checkSedentaryTime(
  lastActivityTime,
  30 // 30 minute threshold
);

if (isSedentary) {
  const reminder = SedentaryService.generateBreakReminder();
  dispatch(addSedentaryAlert(reminder));
  // Show notification: "Time to stretch - look away for 20 seconds"
}

// Update daily score
const score = SedentaryService.calculateWellnessScore(
  postureSessions,
  exerciseSessions,
  breaksTaken
);
```

---

## Child Wellness Monitor

**File**: `app/services/child-wellness-monitor.ts`

Background service for periodic wellness checks.

### Available Methods

```typescript
import { ChildWellnessMonitor } from '../services/child-wellness-monitor';

// Start background monitoring
ChildWellnessMonitor.startMonitoring(
  familyId,
  childId,
  intervalSeconds: number = 60
)
  // → Starts background timer, runs wellness checks every interval

// Stop monitoring
ChildWellnessMonitor.stopMonitoring()
  // → Stops background timer

// Dispatch specific check
ChildWellnessMonitor.performWellnessCheck()
  // → Runs one check cycle
```

### Example Usage

```typescript
// Start when child app launches
useEffect(() => {
  ChildWellnessMonitor.startMonitoring(familyId, childId, 60);

  return () => {
    ChildWellnessMonitor.stopMonitoring();
  };
}, [familyId, childId]);

// Background service will:
// 1. Check posture every 60 seconds
// 2. Detect sedentary time
// 3. Generate reminders
// 4. Update wellness dashboard
```

---

## Redux Slices Reference

### Family Slice

```typescript
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import {
  setFamily,
  addFamilyMember,
  updateFamilyMember,
  removeFamilyMember,
} from '../store/slices/familySlice';

// Read state
const family = useSelector((state: RootState) => state.family.family);
const members = useSelector((state: RootState) => state.family.members);
const role = useSelector((state: RootState) => state.family.currentUserRole);

// Dispatch actions
dispatch(setFamily(familyData));
dispatch(addFamilyMember({ userId, email, name, role }));
dispatch(updateFamilyMember({ userId, role }));
dispatch(removeFamilyMember(userId));
```

### Rewards Slice

```typescript
import { useSelector, useDispatch } from 'react-redux';
import {
  addPoints,
  deductPoints,
  unlockAchievement,
  updateStreak,
} from '../store/slices/rewardsSlice';

const wallet = useSelector((state: RootState) => state.rewards.wallet);
const achievements = useSelector((state: RootState) => state.rewards.achievements);

dispatch(addPoints(100));
dispatch(deductPoints(50));
dispatch(unlockAchievement({ id: 'first_task', name: 'First Task Completed' }));
dispatch(updateStreak({ dayCount: 5, multiplier: 1.25 }));
```

### Tasks Slice

```typescript
import { useSelector, useDispatch } from 'react-redux';
import { addTask, updateTask, setDailyProgress } from '../store/slices/tasksSlice';

const tasks = useSelector((state: RootState) => state.tasks.tasks);
const progress = useSelector((state: RootState) => state.tasks.dailyProgress);

dispatch(addTask(newTask));
dispatch(updateTask(updatedTask));
dispatch(setDailyProgress({ completed: 3, total: 5 }));
```

### Wellness Slice

```typescript
import { useSelector, useDispatch } from 'react-redux';
import { addPostureEvent, addSedentaryAlert, dismissAlert } from '../store/slices/wellnessSlice';

const events = useSelector((state: RootState) => state.wellness.recentPostureEvents);
const alerts = useSelector((state: RootState) => state.wellness.sedentaryAlerts);

dispatch(addPostureEvent({ angle: 25, quality: 85 }));
dispatch(addSedentaryAlert({ type: 'BREAK_REMINDER', message: '...' }));
dispatch(dismissAlert(alertId));
```

---

## Cloud Functions Reference

All Cloud Functions are called from the client using Firebase SDK:

```typescript
import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';

const addFamilyMember = httpsCallable(functions, 'addFamilyMember');
const result = await addFamilyMember({ familyId, email, role });
```

### List of Available Functions

```
✅ addFamilyMember(familyId, email, role) → { userId, name }
✅ updateFamilyMemberRole(familyId, userId, newRole) → { success }
✅ analyzeHomework(familyId, sessionId) → { analysis }
✅ reviewHomework(familyId, sessionId, approved, points) → { success }
✅ completeTask(familyId, taskId, childId) → { pointsAwarded }
✅ approveTask(familyId, taskId) → { success }
✅ verifyExerciseSession(familyId, sessionId, repCount) → { bonusMinutes }

Plus 8 existing functions for device pairing and monitoring
```

---

## Error Handling Pattern

All services can throw errors. Always wrap in try-catch:

```typescript
try {
  const result = await SomeService.method();
  dispatch(updateState(result));
} catch (error: any) {
  if (error.code === 'PERMISSION_DENIED') {
    alert("You don't have permission");
  } else if (error.code === 'NOT_FOUND') {
    alert('Item not found');
  } else {
    console.error('Error:', error);
    alert(error.message);
  }
}
```

---

## Testing Services Individually

```typescript
// Test RBAC
import { RBACService } from '../services/rbac.service';

console.log(RBACService.canSetPolicies('PRIMARY_GUARDIAN')); // ✅ true
console.log(RBACService.canSetPolicies('CHILD')); // ❌ false

// Test Rewards
import { RewardsService } from '../services/rewards.service';

const multiplier = RewardsService.calculateStreakMultiplier({ dayCount: 7 });
console.log(multiplier); // ✅ 1.5

// Test Tasks
import { TasksService } from '../services/tasks.service';

const pending = TasksService.filterTasksByStatus(allTasks, ['PENDING']);
console.log(pending.length); // ✅ number
```

---

**Last Updated**: April 12, 2026  
**Services Available**: 12  
**Cloud Functions Deployed**: 16  
**Redux Slices**: 4
