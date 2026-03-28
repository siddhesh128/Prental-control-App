import { Stack } from 'expo-router';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { Redirect } from 'expo-router';

export default function ChildLayout() {
  const user = useSelector((state: RootState) => state.auth.user);
  const isChild = useSelector((state: RootState) => state.device.isChild);

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
        name="pair-with-parent"
        options={{
          title: 'Pair with Parent',
          presentation: 'modal',
        }}
      />
    </Stack>
  );
}
