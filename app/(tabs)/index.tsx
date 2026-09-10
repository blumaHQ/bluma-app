import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, Text } from 'react-native';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { CycleOverviewWidget } from '../../components/CycleOverviewWidget';
import { CycleInsights } from '../../components/CycleInsights';
import { HealthLogPreview } from '../../components/HealthLogPreview';
import { getDB, getSetting } from '../../db';
import { PeriodDate, periodDates } from '../../db/schema';
import { PeriodPredictionService } from '../../services/periodPredictions';
import { NotificationService } from '../../services/notificationService';
import { useAppStyles } from '../../hooks/useStyles';

export default function Index() {
  const { typography, commonStyles } = useAppStyles();
  const { t } = useTranslation('health');
  
  const [selectedDates, setSelectedDates] = useState<{ [date: string]: any }>(
    {}
  );
  const [firstPeriodDate, setFirstPeriodDate] = useState<string | null>(null);
  const [currentCycleDay, setCurrentCycleDay] = useState<number | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());

  const [isPeriodDay, setIsPeriodDay] = useState(false);
  const [periodDayNumber, setPeriodDayNumber] = useState(0);
  const params = useLocalSearchParams();

  useEffect(() => {
    const setup = async () => {
      await loadSavedDates();
    };
    setup();

    const scheduleMidnightTick = () => {
      const now = new Date();
      const next = new Date(now);
      next.setHours(24, 0, 0, 0);
      const delay = next.getTime() - now.getTime();
      const timeoutId = setTimeout(() => {
        setCurrentDate(new Date());
        setInterval(() => setCurrentDate(new Date()), 24 * 60 * 60 * 1000);
      }, delay);
      return () => clearTimeout(timeoutId);
    };
    return scheduleMidnightTick();
  }, []);

  // Reload data whenever the screen is focused (after returning from edit-period)
  useFocusEffect(
    useCallback(() => {
      const reloadData = async () => {
        await loadSavedDates();
      };
      reloadData();
      return () => {};
    }, [])
  );

  // Check if we should navigate to the period calendar (when coming from calendar screen)
  useEffect(() => {
    if (params.openPeriodModal === 'true') {
      router.push('/edit-period');
    }
  }, [params.openPeriodModal]);

  const loadSavedDates = async () => {
    const db = getDB();
    const saved = await db.select().from(periodDates);

    const dates = saved.reduce(
      (acc: { [key: string]: any }, curr: PeriodDate) => {
        acc[curr.date] = { selected: true, selectedColor: '#FF597B' };
        return acc;
      },
      {} as { [key: string]: any }
    );

    setSelectedDates(dates);

    if (saved.length > 0) {
      // Use the service to group dates into periods
      const sortedDates = saved.map(s => s.date);
      const periods = PeriodPredictionService.groupDateIntoPeriods(sortedDates);

      // Get the start date of the most recent period
      const mostRecentPeriod = periods[0];
      const mostRecentStart = mostRecentPeriod[mostRecentPeriod.length - 1]; // Get the earliest date in the period

      setFirstPeriodDate(mostRecentStart);
      setCurrentCycleDay(
        PeriodPredictionService.getCurrentCycleDay(mostRecentStart)
      );

      // Calculate if today is a period day
      const periodDayResult = PeriodPredictionService.calculatePeriodDay(dates);
      setIsPeriodDay(periodDayResult.isPeriodDay);
      setPeriodDayNumber(periodDayResult.dayNumber);

      // Schedule period notifications if enabled
      try {
        // The schedulePeriodReminder function will check if notifications are enabled
        await NotificationService.schedulePeriodReminder(
          mostRecentStart,
          sortedDates
        );
      } catch (error) {
        console.error(
          'Failed to schedule period notifications on app load:',
          error
        );
      }
    } else {
      // Explicitly set to null when no data exists
      setFirstPeriodDate(null);
      setCurrentCycleDay(null);
      setIsPeriodDay(false);
      setPeriodDayNumber(0);
    }
  };

  // Update period day check when current date changes
  useEffect(() => {
    const periodDayResult =
      PeriodPredictionService.calculatePeriodDay(selectedDates);
    setIsPeriodDay(periodDayResult.isPeriodDay);
    setPeriodDayNumber(periodDayResult.dayNumber);
  }, [currentDate, selectedDates]);

  const [userCycleLength, setUserCycleLength] = useState<number>(28);
  const [userPeriodLength, setUserPeriodLength] = useState<number>(5);

  const prediction = firstPeriodDate
    ? PeriodPredictionService.getPrediction(
        firstPeriodDate,
        Object.keys(selectedDates),
        userCycleLength
      )
    : null;

  // Load user settings
  useEffect(() => {
    const loadUserSettings = async () => {
      try {
        const cycleLength = await getSetting('userCycleLength');
        if (cycleLength) {
          setUserCycleLength(parseInt(cycleLength, 10));
        }
        const periodLength = await getSetting('userPeriodLength');
        if (periodLength) {
          setUserPeriodLength(parseInt(periodLength, 10));
        }
      } catch {}
    };
    loadUserSettings();
  }, []);

  const averageCycleLength =
    Object.keys(selectedDates).length > 0
      ? PeriodPredictionService.getAverageCycleLength(
          Object.keys(selectedDates),
          userCycleLength
        )
      : userCycleLength;

  const averagePeriodLength = Object.keys(selectedDates).length > 0
    ? PeriodPredictionService.getAveragePeriodLength(
        PeriodPredictionService.groupDateIntoPeriods(Object.keys(selectedDates)),
        userPeriodLength
      )
    : userPeriodLength;

  return (
    <ScrollView
      style={[commonStyles.scrollView, { paddingTop: 0 }]}
      contentContainerStyle={[commonStyles.scrollContentContainer, { paddingTop: 0 }]}
      showsVerticalScrollIndicator={false}
    >
      <CycleOverviewWidget
        currentDate={currentDate}
        isPeriodDay={isPeriodDay}
        periodDayNumber={periodDayNumber}
        prediction={prediction}
        selectedDates={selectedDates}
        currentCycleDay={currentCycleDay}
        averageCycleLength={averageCycleLength}
      />

      <CycleInsights
        currentCycleDay={currentCycleDay}
        averageCycleLength={averageCycleLength}
        averagePeriodLength={averagePeriodLength}
      />

      <View style={[commonStyles.sectionContainer]}>
        <Text style={[typography.headingMd, { marginBottom: 16 }]}>
          {t('healthLogPreview.title')}
        </Text>
        <HealthLogPreview />
      </View>

      <View />
    </ScrollView>
  );
}
