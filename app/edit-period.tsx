import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Button } from '../components/Button';
import { useTheme } from '../styles/theme';
import { useAppStyles } from '../hooks/useStyles';
import { useState, useEffect, useRef, useCallback } from 'react';
import { router } from 'expo-router';
import Toast from 'react-native-toast-message';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CustomCalendar, CustomCalendarRef } from '../components/calendar/CustomCalendar';
import { EditDayCell } from '../components/calendar/EditDayCell';
import {
  MarkedDates,
  formatDateString,
  generateDateRange,
} from '../types/calendarTypes';
import { createSelectedStyle } from '../utils/calendarStyles';
import { getDB, getSetting } from '../db';
import { healthLogs, periodDates } from '../db/schema';
import { and, eq } from 'drizzle-orm';

export default function PeriodCalendarScreen() {
  const { colors } = useTheme();
  const { typography } = useAppStyles();
  const { t } = useTranslation(['common', 'calendar']);
  const insets = useSafeAreaInsets();
  const [tempDates, setTempDates] = useState<MarkedDates>({});
  const [initialPeriodDates, setInitialPeriodDates] = useState<string[]>([]);
  const [userPeriodLength, setUserPeriodLength] = useState<number>(5);
  const [showTodayButton, setShowTodayButton] = useState(false);
  const calendarRef = useRef<CustomCalendarRef>(null);

  const today = formatDateString(new Date());

  // Load user settings and saved dates when the component mounts
  useEffect(() => {
    const loadData = async () => {
      try {
        const db = getDB();
        // Load user period length setting
        const periodLength = await getSetting('userPeriodLength');
        if (periodLength) {
          setUserPeriodLength(parseInt(periodLength, 10));
        }

        // Load saved period dates
        const saved = await db.select().from(periodDates);

        const dates = saved.reduce(
          (acc: { [key: string]: any }, curr) => {
            acc[curr.date] = createSelectedStyle(colors);
            return acc;
          },
          {} as { [key: string]: any }
        );

        setTempDates(dates);
        setInitialPeriodDates(Object.keys(dates));
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    loadData();
  }, [colors]);

  const onDayPress = useCallback((dateString: string) => {
    const selectedDate = new Date(dateString);
    const todayDate = new Date(today);

    setTempDates(prevDates => {
      const updatedDates = { ...prevDates };

      const prevDay = new Date(dateString);
      prevDay.setDate(prevDay.getDate() - 1);
      const prevDayString = formatDateString(prevDay);

      const isAlreadySelected = !!updatedDates[dateString];
      const isFuture = selectedDate > todayDate;
      const isStartOfSelection = !updatedDates[prevDayString];

      if (isFuture && !isAlreadySelected) {
        return prevDates;
      }

      if (isAlreadySelected) {
        delete updatedDates[dateString];
        
        if (dateString === today) {
          Object.keys(updatedDates).forEach(date => {
            if (new Date(date) > todayDate) {
              delete updatedDates[date];
            }
          });
        }
        
        return updatedDates;
      }

      if (isStartOfSelection) {
        const dateRange = generateDateRange(dateString, userPeriodLength);
        dateRange.forEach(date => {
          updatedDates[date] = createSelectedStyle(colors);
        });
        return updatedDates;
      }

      updatedDates[dateString] = createSelectedStyle(colors);
      return updatedDates;
    });
  }, [today, userPeriodLength, colors]);

  // Save dates and go back
  const handleSave = async () => {
    try {
      const db = getDB();
      const newDatesArray = Object.keys(tempDates);
      const newDateSet = new Set(newDatesArray);
      const removedDates = initialPeriodDates.filter(
        date => !newDateSet.has(date)
      );

      const dateInserts = newDatesArray.map(date => ({ date }));

      await db.transaction(async tx => {
        await tx.delete(periodDates);

        if (dateInserts.length > 0) {
          await tx.insert(periodDates).values(dateInserts);
        }

        for (const date of removedDates) {
          await tx
            .delete(healthLogs)
            .where(
              and(
                eq(healthLogs.date, date),
                eq(healthLogs.type, 'flow')
              )
            );
        }
      });

      // Show success toast
      Toast.show({
        type: 'success',
        text1: t('calendar:editPeriod.successMessage'),
        visibilityTime: 3000,
      });

      router.back();
    } catch (error) {
      console.error('Error saving dates:', error);

      // Show error toast
      Toast.show({
        type: 'error',
        text1: t('calendar:editPeriod.errorMessage'),
        visibilityTime: 3000,
      });

      router.back();
    }
  };

  // Go back without saving
  const handleCancel = () => {
    router.back();
  };

  const renderDay = useCallback((props: any) => (
    <EditDayCell {...props} colors={colors} typography={typography} />
  ), [colors, typography]);

  const handleMonthChange = useCallback((dateString: string) => {
    const currentDate = new Date();
    const visibleDate = new Date(dateString);
    
    const isCurrentMonth = 
      currentDate.getMonth() === visibleDate.getMonth() &&
      currentDate.getFullYear() === visibleDate.getFullYear();
    
    setShowTodayButton(!isCurrentMonth);
  }, []);

  const handleTodayPress = () => {
    calendarRef.current?.scrollToToday();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.panel }]}>
      {/* Header with padding for status bar, similar to HealthTracking.tsx */}
      <View style={styles.header}>
        <Text
          style={[
            typography.body,
            { fontSize: 18, fontWeight: '600', paddingTop: 63 },
          ]}
        >
          {t('calendar:editPeriod.title')}
        </Text>
        {showTodayButton && (
          <TouchableOpacity
            onPress={handleTodayPress}
            style={[styles.todayButton, { paddingTop: 63 }]}
          >
            <Text style={[typography.body, { color: colors.primary, fontWeight: '500' }]}>
              {t('calendar:todayButton')}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.calendarContainer}>
        <CustomCalendar
          ref={calendarRef}
          mode="selection"
          current={today}
          markedDates={tempDates}
          onDayPress={onDayPress}
          disableFuture={true}
          futureScrollRange={1}
          pastScrollRange={12}
          renderDay={renderDay}
          onMonthChange={handleMonthChange}
        />
      </View>

      {/* Footer with Save/Cancel buttons */}
      <View
        style={[
          styles.footer,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            paddingBottom: insets.bottom + 16,
          },
        ]}
      >
        <Button
          title={t('buttons.cancel')}
          variant="text"
          onPress={handleCancel}
          style={styles.cancelButton}
        />
        <Button
          title={t('buttons.save')}
          variant="contained"
          onPress={handleSave}
          style={styles.saveButton}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 18,
    height: 100,
  },
  todayButton: {
    paddingHorizontal: 8,
  },
  calendarContainer: {
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 16,
    paddingHorizontal: 16,
    borderTopWidth: 1,
  },
  cancelButton: {
    flex: 1,
    marginRight: 8,
  },
  saveButton: {
    flex: 1,
    marginLeft: 8,
  },
});
