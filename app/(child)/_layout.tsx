import { Stack } from 'expo-router';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { Redirect } from 'expo-router';
import { useEffect } from 'react';
import childBackgroundMonitorService from '../services/child-background-monitor.service';

export default function ChildLayout() {
  const user = useSelector((state: RootState) => state.auth.user);
  const isChild = useSelector((state: RootState) => state.device.isChild);

  useEffect(() => {
    const uid = user?.uid;
    if (uid && isChild) {
      childBackgroundMonitorService.start(uid);
      return () => {
        childBackgroundMonitorService.stop();
      };
    }

    childBackgroundMonitorService.stop();
    return undefined;
  }, [isChild, user?.uid]);

  // Protect child routes
  if (!user || !isChild) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: '#f5f5f5',
        },
        headerTintColor: '#007AFF',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen
        name="dashboard"
        options={{
          title: 'My Dashboard',
          headerLargeTitle: true,
        }}
      />
      <Stack.Screen
        name="rewards"
        options={{
          title: 'Rewards Wallet',
        }}
      />
      <Stack.Screen
        name="homework"
        options={{
          title: 'Homework Check-in',
        }}
      />
      <Stack.Screen
        name="exercise"
        options={{
          title: 'Exercise Bonus',
        }}
      />
      <Stack.Screen
        name="wellness"
        options={{
          title: 'Wellness Alerts',
        }}
      />
      <Stack.Screen
        name="tasks"
        options={{
          title: 'My Tasks',
        }}
      />
      <Stack.Screen
        name="pair-with-parent"
        options={{
          title: 'Pair with Parent',
          presentation: 'modal',
        }}
      />
    </Stack>
  );
}
