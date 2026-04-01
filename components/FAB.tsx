import React from 'react';
import {
  View,
  TouchableOpacity,
  TextStyle,
  ViewStyle,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../styles/theme';

type FABProps = {
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  iconSize?: number;
  label?: string;
  labelStyle?: TextStyle;
  containerStyle?: ViewStyle;
  fabStyle?: ViewStyle;
};

export const FAB = ({
  onPress,
  icon = 'add',
  iconSize = 34,
  label,
  labelStyle,
  containerStyle,
  fabStyle,
}: FABProps) => {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.container, containerStyle]}
      activeOpacity={0.7}
    >
      <View style={[styles.fab, { backgroundColor: colors.primary }, fabStyle]}>
        <Ionicons name={icon} size={iconSize} color={colors.white} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  fab: {
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
});

export default FAB;
