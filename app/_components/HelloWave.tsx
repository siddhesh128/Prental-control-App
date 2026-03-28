import React from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';

import ThemedText from '@/_components/ThemedText';

export function HelloWave() {
  const rotation = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(rotation, {
          toValue: 1,
          duration: 150,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(rotation, {
          toValue: 0,
          duration: 150,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ]),
      { iterations: 4 }
    );

    animation.start();
    return () => animation.stop();
  }, [rotation]);

  const animatedStyle = {
    transform: [
      {
        rotate: rotation.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', '25deg'],
        }),
      },
    ],
  };

  return (
    <Animated.View style={animatedStyle}>
      <ThemedText style={styles.text}>👋</ThemedText>
    </Animated.View>
  );
}

export default HelloWave;

const styles = StyleSheet.create({
  text: {
    fontSize: 28,
    lineHeight: 32,
    marginTop: -6,
  },
});
