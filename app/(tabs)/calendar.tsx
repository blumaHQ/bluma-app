import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  StyleSheet,
  DeviceEventEmitter,
  TouchableOpacity,
  Text,
} from 'react-native';
import { useTheme } from '../../styles/theme';
import {
  useFocusEffect,
  useIsFocused,
  useNavigation,
} from '@react-navigation/native';
import { useLocalSearchParams, router } from 'expo-router';
import { CustomCalendar, CustomCalendarRef } from '../../components/calendar/CustomCalendar';
import { CalendarBottomSheet } from '../../components/CalendarBottomSheet';
import { formatDateString } from '../../types/calendarTypes';
import { useCalendarData } from '../../hooks/useCalendarData';
import { useCalendarMarkedDates } from '../../hooks/useCalendarMarkedDates';
import { useCycleCalculations } from '../../hooks/useCycleCalculations';
import { getSetting } from '../../db';
import { useTranslation } from 'react-i18next';

export default function CalendarScreen() {
  const { colors } = useTheme();
  const isFocused = useIsFocused();
  const navigation = useNavigation();
  const { t } = useTranslation('calendar');
  const [showOvulation, setShowOvulation] = useState(true);
  const [showFuturePeriods, setShowFuturePeriods] = useState(true);
  const [showTodayButton, setShowTodayButton] = useState(false);
  const calendarRef = useRef<CustomCalendarRef>(null);

  const {
    firstPeriodDate,
    allPeriodDates,
    userCycleLength,
    userPeriodLength,
    loadData,
  } = useCalendarData();

  const {
    generateMarkedDates,
    getMarkedDatesWithSelection,
    getSelectionMarkedDates,
    getDayCategoryForDate,
  } = useCalendarMarkedDates({
    colors,
    userCycleLength,
    userPeriodLength,
    showOvulation,
    showFuturePeriods,
  });

  const { cycleDay, setCycleDay, calculateCycleDay } = useCycleCalculations({
    firstPeriodDate,
    allPeriodDates,
    userCycleLength,
  });

  const [markedDates, setMarkedDates] = useState({});
  const [selectedDate, setSelectedDate] = useState(
    formatDateString(new Date())
  );
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);
  const params = useLocalSearchParams();

  // Load calendar view settings on mount
  useEffect(() => {
    async function loadCalendarSettings() {
      const ovulationSetting = await getSetting('show_ovulation');
      const futurePeriodsSetting = await getSetting('show_future_periods');

      setShowOvulation(ovulationSetting !== 'false');
      setShowFuturePeriods(futurePeriodsSetting !== 'false');
    }

    loadCalendarSettings();
  }, []);

  // Listen for calendar settings changes
  useEffect(() => {
    const listener = DeviceEventEmitter.addListener(
      'calendarSettingsChanged',
      async () => {
        const ovulationSetting = await getSetting('show_ovulation');
        const futurePeriodsSetting = await getSetting('show_future_periods');

        setShowOvulation(ovulationSetting !== 'false');
        setShowFuturePeriods(futurePeriodsSetting !== 'false');

        // Reload calendar data to apply new settings
        const result = await loadData();
        if (
          result &&
          result.periodDates &&
          result.mostRecentStart &&
          result.periods
        ) {
          await generateMarkedDates(
            result.periodDates,
            result.mostRecentStart,
            result.periods
          );
        }
      }
    );

    return () => listener.remove();
  }, [loadData, generateMarkedDates]);

  // Check if we should navigate to the period calendar screen from URL params
  useEffect(() => {
    if (params.openPeriodModal === 'true') {
      router.push('/edit-period');
    }
  }, [params.openPeriodModal]);

  // Listen for data deletion events to refresh calendar
  useEffect(() => {
    const listener = DeviceEventEmitter.addListener('dataDeleted', async () => {
      const result = await loadData();
      // Always call generateMarkedDates, even with empty data to clear the calendar
      await generateMarkedDates(
        result?.periodDates || [],
        result?.mostRecentStart || null,
        result?.periods || []
      );
      const today = formatDateString(new Date());
      setSelectedDate(today);
    });

    return () => listener.remove();
  }, [loadData, generateMarkedDates]);

  const selectionMarkedDates = useMemo(
    () => getSelectionMarkedDates(selectedDate),
    [selectedDate, getSelectionMarkedDates]
  );

  const selectedDayCategory = useMemo(
    () => getDayCategoryForDate(selectedDate),
    [selectedDate, getDayCategoryForDate]
  );

  // Reload data when tab is focused
  useFocusEffect(
    useCallback(() => {
      const reloadData = async () => {
        const result = await loadData();
        if (
          result &&
          result.periodDates &&
          result.mostRecentStart &&
          result.periods
        ) {
          await generateMarkedDates(
            result.periodDates,
            result.mostRecentStart,
            result.periods
          );
        }
      };
      reloadData();
      return () => {};
    }, [loadData, generateMarkedDates])
  );

  // Update cycle info when selected date changes
  useEffect(() => {
    setCycleDay(calculateCycleDay(selectedDate));
  }, [selectedDate, calculateCycleDay, setCycleDay]);

  // Update marked dates when base marked dates change (but not when selected date changes - handled in onDayPress)
  useEffect(() => {
    setMarkedDates(selectionMarkedDates);
  }, [selectionMarkedDates]);

  const openDrawer = useCallback(() => {
    setIsDrawerOpen(true);
  }, []);

  const onDayPress = useCallback(
    (dateString: string) => {
      setSelectedDate(dateString);

      setCycleDay(calculateCycleDay(dateString));
      setMarkedDates(getMarkedDatesWithSelection(dateString));

      openDrawer();
    },
    [calculateCycleDay, getMarkedDatesWithSelection, openDrawer, setCycleDay]
  );

  const handleBottomSheetChange = useCallback(
    (isOpen: boolean) => {
      setIsDrawerOpen(isOpen);
      if (!isOpen) {
        setSelectedDate('');
        setMarkedDates(getSelectionMarkedDates(''));
      }
    },
    [getSelectionMarkedDates]
  );

  const handleTodayPress = useCallback(() => {
    calendarRef.current?.scrollToToday();
  }, []);

  const onMonthChange = useCallback((dateString: string) => {
    const currentDate = new Date();
    const visibleDate = new Date(dateString);
    
    const isCurrentMonth = 
      currentDate.getMonth() === visibleDate.getMonth() &&
      currentDate.getFullYear() === visibleDate.getFullYear();
    
    setShowTodayButton(!isCurrentMonth);
  }, []);

  useEffect(() => {
    navigation.setOptions({
      headerRight: showTodayButton
        ? () => (
            <TouchableOpacity
              onPress={handleTodayPress}
              style={{ marginRight: 16 }}
            >
              <Text style={{ color: colors.primary, fontSize: 16, fontWeight: '500' }}>
                {t('todayButton')}
              </Text>
            </TouchableOpacity>
          )
        : undefined,
    });
  }, [showTodayButton, handleTodayPress, colors.primary, navigation, t]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.calendarContainer}>
        <CustomCalendar
          ref={calendarRef}
          mode="view"
          current={selectedDate}
          markedDates={markedDates}
          onDayPress={onDayPress}
          onMonthChange={onMonthChange}
        />
      </View>

      {isFocused && (
        <CalendarBottomSheet
          selectedDate={selectedDate}
          cycleDay={cycleDay}
          dayCategory={selectedDayCategory}
          isOpen={isDrawerOpen}
          onOpenChange={handleBottomSheetChange}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  calendarContainer: {
    flex: 1,
  },
});
