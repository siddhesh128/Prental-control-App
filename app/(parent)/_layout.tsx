import { Stack } from 'expo-router';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { Redirect } from 'expo-router';

export default function ParentLayout() {
  const user = useSelector((state: RootState) => state.auth.user);
  const isChild = useSelector((state: RootState) => state.device.isChild);

  // Protect parent routes
  if (!user || isChild) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: '#0A1B35',
        },
        headerTintColor: '#E8F2FF',
        headerTitleStyle: {
          color: '#E8F2FF',
          fontWeight: '700',
        },
        headerShadowVisible: false,
        headerBackButtonDisplayMode: 'minimal',
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Dashboard',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="family-setup"
        options={{
          title: 'Family Setup',
        }}
      />
      <Stack.Screen
        name="homework-review"
        options={{
          title: 'Homework Review',
        }}
      />
      <Stack.Screen
        name="rewards-setup"
        options={{
          title: 'Rewards Setup',
        }}
      />
      <Stack.Screen
        name="exercise-settings"
        options={{
          title: 'Exercise Settings',
        }}
      />
      <Stack.Screen
        name="wellness-dashboard"
        options={{
          title: 'Wellness Dashboard',
        }}
      />
      <Stack.Screen
        name="location/index"
        options={{
          title: 'Location Tracking',
        }}
      />
      <Stack.Screen
        name="call-logs/index"
        options={{
          title: 'Call Logs',
        }}
      />
      <Stack.Screen
        name="messages/index"
        options={{
          title: 'Messages',
        }}
      />
      <Stack.Screen
        name="devices/index"
        options={{
          title: 'Devices',
        }}
      />
      <Stack.Screen
        name="device-restrictions/index"
        options={{
          title: 'Restrictions',
        }}
      />
      <Stack.Screen
        name="reports/index"
        options={{
          title: 'Reports',
        }}
      />
      <Stack.Screen
        name="reports/[type]"
        options={{
          title: 'Report Detail',
        }}
      />
      <Stack.Screen
        name="add-device/index"
        options={{
          title: 'Add Device',
        }}
      />
      <Stack.Screen
        name="settings"
        options={{
          title: 'Settings',
        }}
      />
      <Stack.Screen
        name="profile"
        options={{
          title: 'Profile',
        }}
      />
    </Stack>
  );
}
