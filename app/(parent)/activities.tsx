import React from 'react';
import { StyleSheet, ScrollView, View, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import ThemedText from '../_components/ThemedText';
import ThemedView from '../_components/ThemedView';
import { IconSymbol } from '../_components/ui/IconSymbol';
import Colors from '../constants/Colors';

type NavigationProp = NativeStackNavigationProp<any>;

type Activity = {
  id: string;
  type: 'app' | 'web' | 'location' | 'screen';
  title: string;
  description: string;
  timestamp: string;
  icon: 'play.circle.fill' | 'safari.fill' | 'location.fill' | 'timer';
};

const recentActivities: Activity[] = [
  {
    id: '1',
    type: 'app',
    title: 'YouTube',
    description: 'App used for 2 hours',
    timestamp: '2 hours ago',
    icon: 'play.circle.fill',
  },
  {
    id: '2',
    type: 'web',
    title: 'Web Browsing',
    description: 'Visited educational websites',
    timestamp: '3 hours ago',
    icon: 'safari.fill',
  },
  {
    id: '3',
    type: 'location',
    title: 'Location Update',
    description: 'Device location changed',
    timestamp: '4 hours ago',
    icon: 'location.fill',
  },
  {
    id: '4',
    type: 'screen',
    title: 'Screen Time',
    description: 'Screen time limit reached',
    timestamp: '5 hours ago',
    icon: 'timer',
  },
];

export default function ActivitiesScreen() {
  const navigation = useNavigation<NavigationProp>();

  React.useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Recent Activities',
      headerLargeTitle: true,
    });
  }, [navigation]);

  return (
    <ThemedView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {recentActivities.map((activity) => (
          <TouchableOpacity key={activity.id} style={styles.activityItem}>
            <View style={styles.iconContainer}>
              <IconSymbol name={activity.icon} size={24} color={Colors.light.tint} />
            </View>
            <View style={styles.activityContent}>
              <ThemedText type="defaultSemiBold">{activity.title}</ThemedText>
              <ThemedText style={styles.description}>{activity.description}</ThemedText>
              <ThemedText style={styles.timestamp}>{activity.timestamp}</ThemedText>
            </View>
            <IconSymbol
              name="chevron.right"
              size={20}
              color={Colors.light.text}
              style={styles.chevron}
            />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  chevron: {
    marginLeft: 8,
  },
});
