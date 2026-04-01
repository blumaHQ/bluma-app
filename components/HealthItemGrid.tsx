import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../styles/theme';
import { useAppStyles } from '../hooks/useStyles';
import { CustomIcon } from './icons/health';
import { HealthItem } from '../constants/healthTracking';
import { useTranslation } from 'react-i18next';

interface HealthItemGridProps {
  items: readonly HealthItem[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  translationKey: string;
  selectionColor: string;
  iconSize?: number;
}

export const HealthItemGrid = memo<HealthItemGridProps>(function HealthItemGrid({
  items,
  selectedIds,
  onToggle,
  translationKey,
  selectionColor,
  iconSize = 50,
}) {
  const { colors } = useTheme();
  const { typography } = useAppStyles();
  const { t } = useTranslation();

  const selectedItemStyle = useMemo(
    () => ({
      ...styles.selectedItemIcon,
      borderColor: selectionColor,
    }),
    [selectionColor]
  );

  const checkmarkContainerStyle = useMemo(
    () => [
      styles.checkmarkContainer,
      {
        borderColor: colors.surface,
        backgroundColor: selectionColor,
      },
    ],
    [colors.surface, selectionColor]
  );

  const labelStyle = useMemo(
    () => [typography.caption, { fontSize: 12, textAlign: 'center' as const, lineHeight: 16 }],
    [typography.caption]
  );

  return (
    <View style={styles.itemsGrid}>
      {items.map(item => {
        const isSelected = selectedIds.has(item.id);

        return (
          <TouchableOpacity
            key={item.id}
            style={styles.itemButton}
            onPress={() => onToggle(item.id)}
          >
            <View
              style={[
                styles.itemIcon,
                isSelected && selectedItemStyle,
              ]}
            >
              <CustomIcon name={item.icon as any} size={iconSize} />
              {isSelected && (
                <View style={checkmarkContainerStyle}>
                  <Ionicons name="checkmark" size={16} color={colors.white} />
                </View>
              )}
            </View>
            <Text style={labelStyle}>
              {t(`${translationKey}.${item.id}`)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  itemsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4.5,
  },
  itemButton: {
    width: '24%',
    alignItems: 'center',
    marginBottom: 4,
    paddingHorizontal: 6,
  },
  itemIcon: {
    width: 64,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 3,
  },
  selectedItemIcon: {
    borderWidth: 2,
    borderRadius: 40,
  },
  checkmarkContainer: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    zIndex: 1,
  },
});

