import React, { useMemo } from 'react';
import { Text, Pressable, StyleSheet, ActivityIndicator, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../styles/theme';
import { useAppStyles } from '../hooks/useStyles';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'contained' | 'text' | 'outlined';
  shadow?: boolean;
  fullWidth?: boolean;
  style?: any;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  color?: string;
}

export function Button({
  title,
  onPress,
  variant = 'contained',
  shadow = false,
  fullWidth = false,
  style,
  disabled = false,
  loading = false,
  icon,
  color,
}: ButtonProps) {
  const { colors } = useTheme();
  const { typography } = useAppStyles();

  // The filled (primary) button uses its own token; text/outlined buttons
  // stay on the brand colour so they read like the app's links.
  const resolvedColor =
    color ?? (variant === 'contained' ? colors.buttonPrimary : colors.primary);

  const buttonStyle = useMemo(() => {
    switch (variant) {
      case 'text':
        return { backgroundColor: 'transparent' };
      case 'outlined':
        return {
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: resolvedColor,
        };
      case 'contained':
      default:
        return { backgroundColor: resolvedColor };
    }
  }, [variant, resolvedColor]);

  const textColor = useMemo(() => {
    switch (variant) {
      case 'text':
      case 'outlined':
        return resolvedColor;
      case 'contained':
      default:
        return colors.white;
    }
  }, [variant, resolvedColor, colors.white]);

  const textStyle = useMemo(
    () => [typography.body, { fontWeight: '500', color: textColor }],
    [typography.body, textColor]
  );

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        buttonStyle,
        fullWidth && styles.fullWidth,
        (disabled || loading) && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <View style={styles.content}>
          {icon && <Ionicons name={icon} size={16} color={textColor} />}
          <Text style={textStyle}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: 12,
    paddingHorizontal: 16,
    borderRadius: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  disabled: {
    opacity: 0.38,
  },
  pressed: {
    opacity: 0.7,
  },
  fullWidth: {
    width: '100%',
  },
});
