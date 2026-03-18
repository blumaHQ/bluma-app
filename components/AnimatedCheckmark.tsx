import React, { useEffect } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

type AnimatedCheckmarkProps = {
  backgroundColor: string;
  iconColor: string;
  size?: number;
  iconSize?: number;
  style?: StyleProp<ViewStyle>;
};

export function AnimatedCheckmark({
  backgroundColor,
  iconColor,
  size = 100,
  iconSize = 70,
  style,
}: AnimatedCheckmarkProps) {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withSequence(
      withSpring(1.2, { damping: 14, stiffness: 1000, mass: 4 }),
      withSpring(1.2, { damping: 16, stiffness: 1000, mass: 4 }),
    );
    opacity.value = withTiming(1, { duration: 300 });
  }, [opacity, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor,
        },
        animatedStyle,
        style,
      ]}
    >
      <Ionicons name="checkmark" size={iconSize} color={iconColor} />
    </Animated.View>
  );
}

