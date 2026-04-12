# Phase 2 Quick Start: Building UI Screens

This guide explains how to start building the UI screens using the completed backend services.

---

## Architecture Reminder

```
┌─────────────────┐
│   React Native  │
│   Component     │
└────────┬────────┘
         │
         ↓ (1) dispatch()
┌─────────────────┐
│  Redux Store    │
└────────┬────────┘
         │
         ↓ (2) selector()
┌─────────────────┐
│   Component     │ ← Render
└────────┬────────┘
         │
         ↓ (3) import Service
┌─────────────────┐
│    Service      │
└────────┬────────┘
         │
         ↓ (4) await Cloud Function
┌─────────────────┐
│  Cloud Functions│
│  (On Firebase)  │
└────────┬────────┘
         │
         ↓ (5) read/write
┌─────────────────┐
│   Firestore DB  │
└─────────────────┘
```

---

## Template: Create Your First Parent Screen

### Step 1: Create the file structure

Create `app/(parent)/family-setup.tsx`:

```typescript
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Modal, TextInput } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { setFamily, addFamilyMember } from '../store/slices/familySlice';
import { RBACService } from '../services/rbac.service';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';

export default function FamilySetupScreen() {
  const dispatch = useDispatch();
  const family = useSelector((state: RootState) => state.family.family);
  const members = useSelector((state: RootState) => state.family.members);
  const currentUserRole = useSelector((state: RootState) => state.family.currentUserRole);

  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState('CO_GUARDIAN');
  const [loading, setLoading] = useState(false);

  // Step 2: Get permissions based on current role
  const canAddMembers = RBACService.canSetPolicies(currentUserRole);

  // Step 3: Call Cloud Function to add family member
  const handleAddMember = async () => {
    if (!newMemberEmail.trim()) {
      alert('Email required');
      return;
    }

    try {
      setLoading(true);
      const addFamilyMember = httpsCallable(functions, 'addFamilyMember');
      const result = await addFamilyMember({
        familyId: family?.familyId,
        email: newMemberEmail,
        role: selectedRole,
      });

      // Step 4: Update Redux with response
      dispatch(addFamilyMember({
        userId: result.data.userId,
        email: newMemberEmail,
        name: result.data.name,
        role: selectedRole,
      }));

      setNewMemberEmail('');
      setShowAddMemberModal(false);
      alert('Member added successfully!');
    } catch (error: any) {
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, padding: 16 }}>
      {/* Header */}
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 16 }}>
        Family Management
      </Text>

      {/* Family Members List */}
      <FlatList
        data={members}
        keyExtractor={(item) => item.userId}
        renderItem={({ item }) => (
          <View style={{
            padding: 12,
            marginBottom: 8,
            backgroundColor: '#f5f5f5',
            borderRadius: 8,
          }}>
            <Text style={{ fontSize: 16, fontWeight: '600' }}>
              {item.name}
            </Text>
            <Text style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
              {item.email}
            </Text>
            <View style={{
              backgroundColor: getRoleColor(item.role),
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 4,
              alignSelf: 'flex-start',
              marginTop: 8,
            }}>
              <Text style={{ fontSize: 12, color: '#fff', fontWeight: '600' }}>
                {item.role}
              </Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <Text style={{ color: '#999', textAlign: 'center', marginTop: 20 }}>
            No family members yet
          </Text>
        }
      />

      {/* Add Member Button */}
      {canAddMembers && (
        <TouchableOpacity
          style={{
            backgroundColor: '#007AFF',
            paddingVertical: 12,
            paddingHorizontal: 16,
            borderRadius: 8,
            marginTop: 16,
          }}
          onPress={() => setShowAddMemberModal(true)}
        >
          <Text style={{ color: '#fff', fontWeight: '600', textAlign: 'center' }}>
            + Add Family Member
          </Text>
        </TouchableOpacity>
      )}

      {/* Add Member Modal */}
      <Modal visible={showAddMemberModal} animationType="slide">
        <View style={{ flex: 1, padding: 20, justifyContent: 'center' }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 16 }}>
            Add Family Member
          </Text>

          {/* Email Input */}
          <TextInput
            placeholder="Email address"
            value={newMemberEmail}
            onChangeText={setNewMemberEmail}
            keyboardType="email-address"
            style={{
              borderBottomWidth: 1,
              borderBottomColor: '#ddd',
              paddingBottom: 8,
              marginBottom: 16,
            }}
          />

          {/* Role Selector */}
          <Text style={{ fontWeight: '600', marginBottom: 8 }}>
            Role:
          </Text>
          {['CO_GUARDIAN', 'CAREGIVER', 'TEEN', 'CHILD'].map((role) => (
            <TouchableOpacity
              key={role}
              onPress={() => setSelectedRole(role)}
              style={{
                paddingVertical: 12,
                paddingHorizontal: 12,
                marginBottom: 8,
                backgroundColor: selectedRole === role ? '#e3f2fd' : '#f5f5f5',
                borderRadius: 8,
                borderLeftWidth: selectedRole === role ? 4 : 0,
                borderLeftColor: selectedRole === role ? '#007AFF' : 'transparent',
              }}
            >
              <Text style={{
                fontWeight: selectedRole === role ? '600' : '400',
              }}>
                {role}
              </Text>
            </TouchableOpacity>
          ))}

          {/* Action Buttons */}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 24 }}>
            <TouchableOpacity
              style={{
                flex: 1,
                paddingVertical: 12,
                backgroundColor: '#ddd',
                borderRadius: 8,
              }}
              onPress={() => {
                setShowAddMemberModal(false);
                setNewMemberEmail('');
              }}
            >
              <Text style={{ textAlign: 'center', fontWeight: '600' }}>
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                flex: 1,
                paddingVertical: 12,
                backgroundColor: '#007AFF',
                borderRadius: 8,
              }}
              onPress={handleAddMember}
              disabled={loading}
            >
              <Text style={{
                textAlign: 'center',
                fontWeight: '600',
                color: '#fff',
              }}>
                {loading ? 'Adding...' : 'Add Member'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function getRoleColor(role: string): string {
  const colors: Record<string, string> = {
    PRIMARY_GUARDIAN: '#FF6B6B',
    CO_GUARDIAN: '#4ECDC4',
    CAREGIVER: '#45B7D1',
    TEEN: '#FFA07A',
    CHILD: '#98D8C8',
  };
  return colors[role] || '#999';
}
```

---

## Template: Create Your First Child Screen

### Create `app/(child)/task-list.tsx`:

```typescript
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { updateTask } from '../store/slices/tasksSlice';
import { TasksService } from '../services/tasks.service';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';

export default function TaskListScreen() {
  const dispatch = useDispatch();
  const tasks = useSelector((state: RootState) => state.tasks.tasks);
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'COMPLETED'>('ALL');

  // Step 1: Filter tasks by status
  const filteredTasks = TasksService.filterTasksByStatus(tasks, filter === 'PENDING' ? ['PENDING'] : filter === 'COMPLETED' ? ['COMPLETED'] : undefined);

  // Step 2: Submit task for approval
  const handleSubmitTask = async (task: any) => {
    try {
      const completeTask = httpsCallable(functions, 'completeTask');

      const result = await completeTask({
        taskId: task.taskId,
        familyId: task.familyId,
        submissionTime: new Date().toISOString(),
      });

      // Step 3: Update Redux
      dispatch(updateTask({
        ...task,
        status: 'SUBMITTED',
        submittedAt: new Date().toISOString(),
      }));

      alert('Task submitted for approval!');
    } catch (error: any) {
      alert('Error submitting task: ' + error.message);
    }
  };

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 16 }}>
        My Tasks
      </Text>

      {/* Filter Tabs */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
        {(['ALL', 'PENDING', 'COMPLETED'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            onPress={() => setFilter(f)}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 8,
              backgroundColor: filter === f ? '#007AFF' : '#ddd',
              borderRadius: 16,
            }}
          >
            <Text style={{
              color: filter === f ? '#fff' : '#000',
              fontWeight: '600',
            }}>
              {f}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Task List */}
      <FlatList
        data={filteredTasks}
        keyExtractor={(item) => item.taskId}
        renderItem={({ item }) => (
          <View style={{
            padding: 12,
            marginBottom: 8,
            backgroundColor: getTaskColor(item.status),
            borderRadius: 8,
          }}>
            <Text style={{ fontSize: 16, fontWeight: '600' }}>
              {item.title}
            </Text>
            <Text style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
              {item.description}
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
              <View>
                <Text style={{ fontSize: 12, color: '#666' }}>
                  Points: {item.pointsValue}
                </Text>
                <Text style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                  Due: {new Date(item.dueDate).toLocaleDateString()}
                </Text>
              </View>

              {item.status === 'PENDING' && (
                <TouchableOpacity
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    backgroundColor: '#007AFF',
                    borderRadius: 6,
                  }}
                  onPress={() => handleSubmitTask(item)}
                >
                  <Text style={{ color: '#fff', fontWeight: '600', fontSize: 12 }}>
                    Submit
                  </Text>
                </TouchableOpacity>
              )}

              {item.status === 'COMPLETED' && (
                <Text style={{ color: '#999', fontStyle: 'italic', fontSize: 12 }}>
                  ✓ Done
                </Text>
              )}
            </View>
          </View>
        )}
        ListEmptyComponent={
          <Text style={{ color: '#999', textAlign: 'center', marginTop: 20 }}>
            No tasks for this view
          </Text>
        }
      />
    </View>
  );
}

function getTaskColor(status: string): string {
  const colors: Record<string, string> = {
    PENDING: '#FFF4E6',
    SUBMITTED: '#E8F5E9',
    COMPLETED: '#F5F5F5',
    REJECTED: '#FFEBEE',
  };
  return colors[status] || '#fff';
}
```

---

## Integration Checklist for Each Screen

When adding a new screen, follow this pattern:

### 1. **Define Types** (if new feature)

```typescript
import { Task } from '../types/tasks';
```

### 2. **Create Redux Reducer** (if new state)

```typescript
import { useDispatch, useSelector } from 'react-redux';
```

### 3. **Import Service**

```typescript
import { TasksService } from '../services/tasks.service';
```

### 4. **Call Cloud Function** (if server action needed)

```typescript
import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';

const completeTask = httpsCallable(functions, 'completeTask');
const result = await completeTask({
  /* params */
});
```

### 5. **Dispatch Redux Action**

```typescript
dispatch(updateTask(result.data));
```

### 6. **Handle Errors**

```typescript
catch (error: any) {
  console.error('Error:', error);
  alert(error.message);
}
```

---

## Common Patterns

### Pattern 1: Listen to Firestore in useEffect

```typescript
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';

useEffect(() => {
  const unsubscribe = onSnapshot(
    collection(db, 'families', familyId, 'tasks'),
    (snapshot) => {
      const tasksData = snapshot.docs.map((doc) => ({
        taskId: doc.id,
        ...doc.data(),
      }));
      dispatch(setTasks(tasksData));
    },
    (error) => console.error('Firestore error:', error)
  );

  return () => unsubscribe();
}, [familyId]);
```

### Pattern 2: Load Once on Mount

```typescript
useEffect(() => {
  const loadData = async () => {
    try {
      const data = await SomeService.getData();
      dispatch(setData(data));
    } catch (error) {
      console.error(error);
    }
  };

  loadData();
}, []); // No deps = run once
```

### Pattern 3: Handle Loading/Error States

```typescript
const loading = useSelector((state: RootState) => state.tasks.loading);
const error = useSelector((state: RootState) => state.tasks.error);

if (loading) return <Text>Loading...</Text>;
if (error) return <Text>Error: {error}</Text>;
```

---

## Screen Checklist (All 13 Screens)

### Parent Screens (5)

- [ ] `family-setup.tsx` — Add/remove members, assign roles
- [ ] `rewards-setup.tsx` — Create reward rules, set point values
- [ ] `homework-review.tsx` — Review student homework with confidence scores
- [ ] `wellness-dashboard.tsx` — View posture trends, sedentary alerts
- [ ] `exercise-settings.tsx` — Configure exercise routines, bonus caps

### Child Screens (8)

- [ ] `task-list.tsx` — Show pending tasks, submit for approval
- [ ] `rewards-wallet.tsx` — Show points, redeem privileges
- [ ] `homework-pre-capture.tsx` — Photo capture before homework
- [ ] `homework-post-capture.tsx` — Photo capture after homework
- [ ] `homework-results.tsx` — Show AI confidence, wait for parent review
- [ ] `wellness-alerts.tsx` — Show posture alerts, take breaks
- [ ] `exercise-select.tsx` — Choose exercise routine
- [ ] `exercise-perform.tsx` — Real-time rep counting, show results

---

## Testing Your Screen

Add this testing template to any screen to verify integration works:

```typescript
// At bottom of component file
const TEST_DATA = {
  sampleTask: {
    taskId: 'task-1',
    title: 'Clean Room',
    description: 'Organize toys and books',
    status: 'PENDING',
    pointsValue: 50,
    dueDate: new Date().toISOString(),
  },
};

// Add button to test screen:
<TouchableOpacity
  onPress={() => {
    console.log('Redux State:', {
      tasks: tasks,
      family: family,
    });
  }}
>
  <Text>📊 Log Redux State</Text>
</TouchableOpacity>
```

---

##Error Recovery

If a Cloud Function call fails:

```typescript
catch (error: any) {
  if (error.code === 'permission-denied') {
    alert('You don\'t have permission to do this');
  } else if (error.code === 'not-found') {
    alert('Item no longer exists');
  } else if (error.code === 'invalid-argument') {
    alert('Invalid input - check your data');
  } else {
    alert(`Error: ${error.message}`);
  }
}
```

---

##Next: Start Building!

1. **Pick the easiest screen first** → Family Setup (minimal external dependencies)
2. **Copy template code** → Adapt to your screen's needs
3. **Test with mock data** → Verify Redux/navigation works
4. **Connect to Firestore** → Add real data loading
5. **Call a Cloud Function** → Complete the E2E flow

The backend services are ready. Go build the UI! 🚀
