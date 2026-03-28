import React from 'react';
import { StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import ThemedView from '@/_components/ThemedView';
import ThemedText from '@/_components/ThemedText';

type NavigationProp = NativeStackNavigationProp<any>;

export default function ReportDetailScreen() {
  const { type } = useLocalSearchParams();
  const navigation = useNavigation<NavigationProp>();

  React.useLayoutEffect(() => {
    navigation.setOptions({
      title: `${type?.toString().charAt(0).toUpperCase()}${type?.toString().slice(1)} Report`,
    });
  }, [navigation, type]);

  return (
    <ThemedView style={styles.container}>
      <ScrollView style={styles.content}>
        <ThemedText style={styles.text}>
          Detailed report for {type} will be displayed here
        </ThemedText>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  text: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
  },
});
