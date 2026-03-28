import { useRef, type PropsWithChildren, type ReactElement } from 'react';
import { Animated, StyleSheet } from 'react-native';
import ThemedView from './ThemedView';
import { useBottomTabOverflow } from './ui/TabBarBackground';
import { useColorScheme } from 'react-native';

const HEADER_HEIGHT = 250;

type Props = PropsWithChildren<{
  headerImage: ReactElement;
  headerBackgroundColor: { light: string; dark: string };
}>;

export default function ParallaxScrollView({
  children,
  headerImage,
  headerBackgroundColor,
}: Props) {
  const theme = useColorScheme() ?? 'light';
  const scrollOffset = useRef(new Animated.Value(0)).current;
  const bottom = useBottomTabOverflow();

  const headerTranslateY = scrollOffset.interpolate({
    inputRange: [-HEADER_HEIGHT, 0, HEADER_HEIGHT],
    outputRange: [-HEADER_HEIGHT / 2, 0, HEADER_HEIGHT * 0.75],
    extrapolate: 'clamp',
  });

  const headerScale = scrollOffset.interpolate({
    inputRange: [-HEADER_HEIGHT, 0, HEADER_HEIGHT],
    outputRange: [2, 1, 1],
    extrapolate: 'clamp',
  });

  return (
    <ThemedView style={styles.container}>
      <Animated.ScrollView
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollOffset } } }], {
          useNativeDriver: true,
        })}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottom }]}
        style={styles.scrollView}
      >
        <Animated.View
          style={[
            styles.header,
            {
              transform: [{ translateY: headerTranslateY }, { scale: headerScale }],
            },
            {
              backgroundColor:
                theme === 'light' ? headerBackgroundColor.light : headerBackgroundColor.dark,
            },
          ]}
        >
          {headerImage}
        </Animated.View>
        {children}
      </Animated.ScrollView>
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
  scrollContent: {
    paddingTop: HEADER_HEIGHT,
  },
  header: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: HEADER_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
