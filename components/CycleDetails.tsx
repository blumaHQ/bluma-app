import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { QuickHealthSelector } from './QuickHealthSelector';
import { formatDateString } from '../types/calendarTypes';
import { CalendarDayCategory } from '../utils/calendarStyles';
import { useTheme } from '../styles/theme';
import { useAppStyles } from '../hooks/useStyles';
import { formatDateShort } from '../utils/localeUtils';

interface CycleDetailsProps {
  selectedDate: string;
  cycleDay: number | null;
  dayCategory?: CalendarDayCategory;
  onClose?: () => void;
}

export function CycleDetails({
  selectedDate,
  cycleDay,
  dayCategory,
  onClose,
}: CycleDetailsProps) {
  const { colors } = useTheme();
  const { typography } = useAppStyles();
  const { t } = useTranslation('common');
  const { t: tCalendar } = useTranslation('calendar');
  const { t: tHealth } = useTranslation('health');
  const selectedDateFormatted = selectedDate
    ? formatDateShort(selectedDate)
    : '';

  const isDateInPastOrToday = () => {
    const today = formatDateString(new Date());
    return selectedDate <= today;
  };

  return (
    <>
      <View>
        <View style={styles.headerRow}>
          <View style={styles.titleContainer}>
            <Text
              style={[
                typography.headingMd,
                { fontSize: 23, fontWeight: 'bold', marginBottom: 6 },
              ]}
            >
              {selectedDateFormatted}
              {cycleDay ? ` • ${t('cycleDetails.cycleDay', { number: cycleDay })}` : ''}
            </Text>
            {dayCategory && (
              <Text style={[typography.body, { color: colors.textSecondary }]}>
                {tCalendar(`dayInfo.${dayCategory}`)}
              </Text>
            )}
          </View>
          {onClose && (
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={28} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {isDateInPastOrToday() && (
        <>
          <Text style={[typography.headingMd, { fontSize: 20, fontWeight: '500', marginBottom: 12, marginTop: 16, }]}>
            {tHealth('quickHealthSelector.title')}
          </Text>
          <QuickHealthSelector
            selectedDate={selectedDate}
          />
        </>
      )}
    </>
  );
}

const styles = StyleSheet.create({

  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleContainer: {
    flex: 1,
  },
  closeButton: {
    padding: 8,
    marginTop: -9,
  },
});

export default CycleDetails;
