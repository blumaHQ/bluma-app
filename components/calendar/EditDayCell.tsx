import React, { memo, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { DayData } from '../../utils/customCalendarHelpers';
import { CustomMarking, formatDateString } from '../../types/calendarTypes';
import { parseLocalDate } from '../../utils/dateUtils';
import { getEditDayCellStyles } from '../../utils/calendarStyles';
import { ColorScheme } from '../../styles/colors';
import { Typography } from '../../styles/typography';

interface EditDayCellProps {
  day: DayData;
  marking?: CustomMarking;
  onPress: (dateString: string) => void;
  colors: ColorScheme;
  typography: Typography;
}

export const EditDayCell = memo<EditDayCellProps>(
  ({ day, marking, onPress, colors, typography }) => {
    const { dateString, day: dayNum, isCurrentMonth } = day;
    const { t } = useTranslation('calendar');
    const styles = useMemo(() => StyleSheet.create(getEditDayCellStyles(colors)), [colors]);

    // Render empty cell for days not in current month to maintain grid layout
    if (!isCurrentMonth) {
      return <View style={styles.dayContainer} />;
    }

    const dayDate = parseLocalDate(dateString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);

    const isFuture = dayDate > today;
    const isDisabled = false;
    const isToday = dateString === formatDateString(new Date());

    const isSelected = marking?.selected;

    const handlePress = () => {
      if (!isDisabled) {
        onPress(dateString);
      }
    };

    const date = parseLocalDate(dateString);
    const accessibilityLabel = `${date.toLocaleDateString('default', { 
      month: 'long', 
      day: 'numeric' 
    })}${isSelected ? ', selected' : ''}`;
    const accessibilityHint = isDisabled 
      ? undefined 
      : isSelected 
        ? t('accessibility.tapToDeselect') 
        : t('accessibility.tapToSelectPeriod');
        
    return (
      <View style={styles.dayContainer}>
        <TouchableOpacity
          onPress={handlePress}
          disabled={isDisabled}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          accessibilityHint={accessibilityHint}
          accessibilityState={{
            disabled: isDisabled,
            selected: isSelected,
          }}
        >
          <Text
            style={[
              typography.body,
              styles.text,
              { color: colors.textPrimary },
              isDisabled && styles.disabledDayText,
              isSelected && { color: colors.accentPink },
              isToday && { fontWeight: 'bold' },
            ]}
          >
            {dayNum}
          </Text>

          <View
            style={[
              styles.container,
              { borderColor: colors.neutral100 },
              isSelected && !isFuture && styles.selectedDayIndicator,
              isSelected && isFuture && styles.futureSelectedDayIndicator,
              !isSelected && isFuture && styles.futureDayIndicator,
            ]}
          >
            {isSelected && !isFuture && (
              <Ionicons
                name="checkmark-sharp"
                size={16}
                color={colors.white}
                style={styles.checkmark}
              />
            )}
          </View>
        </TouchableOpacity>

        {isToday && (
          <Text style={[typography.labelXs, styles.todayLabel]}>
            {t('today')}
          </Text>
        )}
      </View>
    );
  },
  (prev, next) =>
    prev.day.dateString === next.day.dateString &&
    prev.marking === next.marking &&
    prev.colors === next.colors &&
    prev.typography === next.typography
);

EditDayCell.displayName = 'EditDayCell';