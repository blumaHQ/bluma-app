import React, { memo, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { DayData } from '../../utils/customCalendarHelpers';
import { CustomMarking, formatDateString } from '../../types/calendarTypes';
import { parseLocalDate } from '../../utils/dateUtils';
import { useTypography } from '../../hooks/useStyles';

interface DayCellProps {
  day: DayData;
  marking?: CustomMarking;
  onPress: (dateString: string) => void;
  colors: {
    textPrimary: string;
    textSecondary: string;
    primary: string;
    primaryLight: string;
    white: string;
    accentPink: string;
  };
  mode: 'view' | 'selection';
  disableFuture?: boolean;
  cellHeight?: number;
}

export const DayCell = memo<DayCellProps>(
  ({ day, marking, onPress, colors, mode, disableFuture, cellHeight = 64 }) => {
    const { dateString, day: dayNum, isCurrentMonth } = day;
    const typography = useTypography();
    const { t } = useTranslation('calendar');

    const dayContainerStyle = useMemo(
      () => [styles.dayContainer, { height: cellHeight }],
      [cellHeight]
    );

    const selectionIndicatorStyle = useMemo(
      () => [styles.selectionIndicator, { borderColor: colors.primary }],
      [colors.primary]
    );

    const healthLogDotStyle = useMemo(
      () => [styles.healthLogDot, { backgroundColor: colors.primary }],
      [colors.primary]
    );

    // Render empty cell for days not in current month to maintain grid layout
    if (!isCurrentMonth) {
      return <View style={dayContainerStyle} />;
    }

    const cellDate = parseLocalDate(dateString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);
    const isFutureDate = cellDate > today;
    const isDisabled = disableFuture && isFutureDate;
    const isSelected = marking?.selected;
    const hasHealthLogs = marking?.hasHealthLogs;
    const isToday = dateString === formatDateString(new Date());

    const handlePress = () => {
      if (!isDisabled) {
        onPress(dateString);
      }
    };

    const date = new Date(dateString);
    const accessibilityLabel = `${date.toLocaleDateString(undefined, {
      month: 'long',
      day: 'numeric',
    })}${hasHealthLogs ? `, ${t('accessibility.hasHealthLogs')}` : ''}${isSelected ? `, ${t('accessibility.selected')}` : ''}`;
    const accessibilityHint = isDisabled ? undefined : t('accessibility.tapToView');

    const containerStyle = [
      styles.container,
      marking?.customStyles?.container,
    ];

    const textStyle = [
      styles.text,
      { color: colors.textPrimary },
      marking?.customStyles?.text,
      isDisabled && { opacity: 0.38 },
    ];

    return (
      <View style={dayContainerStyle}>
        <View style={styles.dayContent}>
          <TouchableOpacity
            style={containerStyle}
            onPress={handlePress}
            disabled={isDisabled}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel}
            accessibilityHint={accessibilityHint}
            accessibilityState={{
              disabled: isDisabled,
              selected: isSelected,
            }}
          >
            <Text style={textStyle}>{dayNum}</Text>
          </TouchableOpacity>

          {isSelected && mode === 'view' && (
            <View style={selectionIndicatorStyle} />
          )}
        </View>

        {isToday && (
          <Text style={[typography.labelXs, styles.todayLabel]}>
            {t('today')}
          </Text>
        )}

        {hasHealthLogs && (
          <View style={healthLogDotStyle} />
        )}
      </View>
    );
  },
  (prev, next) =>
    prev.day.dateString === next.day.dateString &&
    prev.marking === next.marking &&
    prev.colors === next.colors &&
    prev.mode === next.mode &&
    prev.disableFuture === next.disableFuture &&
    prev.cellHeight === next.cellHeight
);

DayCell.displayName = 'DayCell';

const styles = StyleSheet.create({
  dayContainer: {
    alignItems: 'center',
    width: '14.28%',
    height: 64,
    position: 'relative',
  },
  dayContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  container: {
    width: 34,
    height: 34,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 16,
    textAlign: 'center',
  },
  selectionIndicator: {
    position: 'absolute',
    alignSelf: 'center',
    width: 40,
    height: 40,
    borderRadius: 40,
    borderWidth: 1.5,
    backgroundColor: 'transparent',
  },
  healthLogDot: {
    alignSelf: 'center',
    width: 7,
    height: 7,
    borderRadius: 8,
    marginTop: 2,
  },
  todayLabel: {
    marginTop: 2,
  },
});