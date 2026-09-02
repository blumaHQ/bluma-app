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
    getSelectionMarkedDates,
    getDayCategoryForDate,
  } = useCalendarMarkedDates({
    colors,
    userCycleLength,
    userPeriodLength,
    showOvulation,
    showFuturePeriods,
  });

  const calculateCycleDay = useCycleCalculations({
    firstPeriodDate,
    allPeriodDates,
    userCycleLength,
  });

  const [selectedDate, setSelectedDate] = useState(
    formatDateString(new Date())
  );
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);
  const params = useLocalSearchParams();

  const loadCalendarViewSettings = useCallback(async () => {
    const ovulationSetting = await getSetting('show_ovulation');
    const futurePeriodsSetting = await getSetting('show_future_periods');
    setShowOvulation(ovulationSetting !== 'false');
    setShowFuturePeriods(futurePeriodsSetting !== 'false');
  }, []);

  const refreshCalendar = useCallback(async () => {
    const result = await loadData();
    await generateMarkedDates(
      result?.periodDates ?? [],
      result?.mostRecentStart ?? null,
      result?.periods ?? []
    );
  }, [loadData, generateMarkedDates]);

  useEffect(() => {
    loadCalendarViewSettings();
  }, [loadCalendarViewSettings]);

  useEffect(() => {
    const listener = DeviceEventEmitter.addListener(
      'calendarSettingsChanged',
      async () => {
        await loadCalendarViewSettings();
        await refreshCalendar();
      }
    );

    return () => listener.remove();
  }, [loadCalendarViewSettings, refreshCalendar]);

  useEffect(() => {
    if (params.openPeriodModal === 'true') {
      router.push('/edit-period');
    }
  }, [params.openPeriodModal]);

  useEffect(() => {
    const listener = DeviceEventEmitter.addListener('dataDeleted', async () => {
      await refreshCalendar();
      setSelectedDate(formatDateString(new Date()));
    });

    return () => listener.remove();
  }, [refreshCalendar]);

  const selectionMarkedDates = useMemo(
    () => getSelectionMarkedDates(selectedDate),
    [selectedDate, getSelectionMarkedDates]
  );

  const selectedDayCategory = useMemo(
    () => getDayCategoryForDate(selectedDate),
    [selectedDate, getDayCategoryForDate]
  );

  const cycleDay = useMemo(
    () => calculateCycleDay(selectedDate),
    [selectedDate, calculateCycleDay]
  );

  useFocusEffect(
    useCallback(() => {
      refreshCalendar();
    }, [refreshCalendar])
  );

  const onDayPress = useCallback((dateString: string) => {
    setSelectedDate(dateString);
    setIsDrawerOpen(true);
  }, []);

  const handleBottomSheetChange = useCallback((isOpen: boolean) => {
    setIsDrawerOpen(isOpen);
    if (!isOpen) {
      setSelectedDate('');
    }
  }, []);

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
          markedDates={selectionMarkedDates}
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
