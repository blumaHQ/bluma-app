import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { QuickHealthSelector } from './QuickHealthSelector';
import { PeriodPredictionService } from '../services/periodPredictions';
import { formatDateString } from '../types/calendarTypes';
import { useTheme } from '../styles/theme';
import { useAppStyles } from '../hooks/useStyles';
import { formatDateShort } from '../utils/localeUtils';

interface CycleDetailsProps {
  selectedDate: string;
  cycleDay: number | null;
  averageCycleLength?: number;
  onClose?: () => void;
}

export function CycleDetails({
  selectedDate,
  cycleDay,
  averageCycleLength = 28,
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

  const getConceptionChance = () => {
    if (!cycleDay) return '';
    const chance = PeriodPredictionService.getPregnancyChance(
      cycleDay,
      averageCycleLength
    ).toLowerCase();
    
    // Map the chance to translation key
    return t(`cycleDetails.conceptionChance.${chance}`);
  };

  const isOvulationDay = cycleDay !== null && PeriodPredictionService.getCyclePhase(cycleDay, averageCycleLength) === 'ovulatory';

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
            {cycleDay && (
              <Text style={[typography.body, { color: colors.textSecondary }]}>
                {getConceptionChance()}
                {isOvulationDay ? ` • ${tCalendar('legend.ovulationDay')}` : ''}
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
