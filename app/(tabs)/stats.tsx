import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Text, Image } from 'react-native';
import { Button } from '../../components/Button';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { getDB, getSetting } from '../../db';
import { periodDates } from '../../db/schema';
import { PeriodPredictionService } from '../../services/periodPredictions';
import { StatCard } from '../../components/StatCard';
import { CycleHistory } from '../../components/CycleHistory';
import { SymptomPatternCard } from '../../components/SymptomPatternCard';
import { DropIcon } from '../../components/icons/general/Drop';
import { CycleIcon } from '../../components/icons/general/Cycle';
import { getCycleStatus, getPeriodStatus } from '../../utils/cycleUtils';
import { useTheme } from '../../styles/theme';
import { useAppStyles } from '../../hooks/useStyles';
import { useTranslation } from 'react-i18next';
interface CycleData {
  startDate: string;
  cycleLength: string | number;
  periodLength: number;
}

interface HistoryEntryWithDate extends CycleData {
  originalDate: string;
}

export default function Stats() {
  const { colors } = useTheme();
  const { typography, commonStyles } = useAppStyles();
  const { t } = useTranslation('stats');
  const [averageCycleLength, setAverageCycleLength] = useState<number>(0);
  const [averagePeriodLength, setAveragePeriodLength] = useState<number>(0);
  const [cycleHistory, setCycleHistory] = useState<CycleData[]>([]);
  const [userCycleLength, setUserCycleLength] = useState<number>(28);
  const [hasNoPeriodData, setHasNoPeriodData] = useState<boolean>(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [hasPatterns, setHasPatterns] = useState(false);

  const loadStatistics = useCallback(async () => {
    try {
      const db = getDB();
      // Load period dates from the database
      const saved = await db.select().from(periodDates);

      const sortedDates = saved.map(s => s.date);
      const periods = PeriodPredictionService.groupDateIntoPeriods(sortedDates);

      // Only show stats if we have at least 2 periods (to calculate real averages)
      if (saved.length === 0 || periods.length < 2) {
        // Reset all states when there's insufficient data
        setAverageCycleLength(0);
        setAveragePeriodLength(0);
        setCycleHistory([]);
        setHasNoPeriodData(true);
        return;
      }

      // We have sufficient period data, so hide empty state
      setHasNoPeriodData(false);

      // Calculate average cycle length
      const cycleLength = PeriodPredictionService.getAverageCycleLength(
        sortedDates,
        userCycleLength
      );
      setAverageCycleLength(cycleLength);

      // Calculate average period length
      const periodLengths = periods.map(period => period.length);
      const totalPeriodLength = periodLengths.reduce(
        (sum, length) => sum + length,
        0
      );
      const avgPeriodLength = Math.round(
        totalPeriodLength / periodLengths.length
      );
      setAveragePeriodLength(avgPeriodLength);

      // Generate cycle history data
      const history: HistoryEntryWithDate[] = [];

      // console.log removed

      // The periods array is in descending order (newest to oldest)
      // We need to reverse it to get chronological order (oldest to newest)
      const chronologicalPeriods = [...periods].reverse();

      // console.log removed

      // Create an array of period start dates (first day of each period)
      const periodStartDates = chronologicalPeriods.map(period => {
        const sortedPeriod = [...period].sort(
          (a, b) => new Date(a).getTime() - new Date(b).getTime()
        );
        return sortedPeriod[0];
      });

      // Sort period start dates in chronological order (oldest to newest)
      periodStartDates.sort(
        (a, b) => new Date(a).getTime() - new Date(b).getTime()
      );

      // console.log removed

      // For each period, calculate its data
      for (let i = 0; i < chronologicalPeriods.length; i++) {
        const period = chronologicalPeriods[i];
        // Get the start date for this period
        const sortedPeriod = [...period].sort(
          (a, b) => new Date(a).getTime() - new Date(b).getTime()
        );
        const startDate = sortedPeriod[0];

        // Calculate cycle length
        let cycleLengthValue: string | number;

        // Check if this is the most recent period (last in the array after sorting)
        if (i === chronologicalPeriods.length - 1) {
          cycleLengthValue = t('cycleHistory.inProgress');
        } else {
          const currentStartDate = periodStartDates[i];
          const nextStartDate = periodStartDates[i + 1];

          const daysBetween = Math.round(
            Math.abs(
              (new Date(nextStartDate).getTime() -
                new Date(currentStartDate).getTime()) /
                (1000 * 60 * 60 * 24)
            )
          );
          cycleLengthValue = daysBetween;
        }

        // Add to history with ISO date (keep it unformatted)
        const historyEntry = {
          startDate: startDate, // Keep as ISO string for the component
          originalDate: startDate, // Store original date for sorting
          cycleLength: cycleLengthValue,
          periodLength: period.length,
        };
        history.push(historyEntry);
      }

      // Sort history from most recent to oldest
      history.sort((a, b) => {
        const dateA = new Date(a.originalDate);
        const dateB = new Date(b.originalDate);
        return dateB.getTime() - dateA.getTime();
      });

      // Remove originalDate field before setting state
      const cleanHistory = history.map(({ originalDate, ...rest }) => rest);
      setCycleHistory(cleanHistory);
    } catch (error) {
      console.error('Error loading statistics:', error);
    }
  }, [userCycleLength, t]);

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        await loadStatistics();
        setIsInitialLoad(false);
      };
      load();
      return () => {};
    }, [loadStatistics])
  );

  // Load user settings
  useEffect(() => {
    const loadUserSettings = async () => {
      try {
        const cycleLength = await getSetting('userCycleLength');
        if (cycleLength) {
          setUserCycleLength(parseInt(cycleLength, 10));
        }
      } catch (error) {
        console.error('Error loading user settings:', error);
      }
    };
    loadUserSettings();
  }, []);

  const renderEmptyState = () => (
    <View style={styles.emptyStateContainer}>
      <View style={styles.emptyStateIconContainer}>
        <Image
          source={require('../../assets/icons/stats-icon.png')}
          style={styles.emptyStateIcon}
        />
      </View>
      <Text style={[typography.headingLg, styles.emptyStateTitle]}>
        {t('emptyState.title')}
      </Text>
      <Text style={[typography.bodyXl, styles.emptyStateSubtitle]}>
        {t('emptyState.subtitle')}
      </Text>
      <Button
        title={t('emptyState.logPeriodButton')}
        onPress={() => router.push('/edit-period')}
      />
    </View>
  );

  if (isInitialLoad) {
    return (
      <View style={[commonStyles.container, { backgroundColor: colors.background }]} />
    );
  }

  // Show empty state if no period data
  if (hasNoPeriodData) {
    return (
      <ScrollView
        style={[
          commonStyles.container,
          { backgroundColor: colors.background },
        ]}
      >
        {renderEmptyState()}
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={[commonStyles.scrollView]}
      contentContainerStyle={commonStyles.scrollContentContainer}
      showsVerticalScrollIndicator={false}
    >
      <View
        style={[commonStyles.sectionContainer]}
      >
        <Text
          style={[
            commonStyles.sectionTitleContainer,
            typography.headingMd,
          ]}
        >
          {t('cycleStatistics')}
        </Text>
        <View style={styles.cardsContainer}>
          <StatCard
            title={t('averages.cycleLength')}
            value={`${averageCycleLength} ${t('common:time.days')}`}
            icon={<CycleIcon size={32}/>}
            status={getCycleStatus(averageCycleLength).status}
            type="cycle"
          />
          <StatCard
            title={t('averages.periodLength')}
            value={`${averagePeriodLength} ${t('common:time.days')}`}
            icon={<DropIcon size={40}/>}
            status={getPeriodStatus(averagePeriodLength).status}
            type="period"
          />
        </View>
      </View>
      {hasPatterns && <SymptomPatternCard onLoad={setHasPatterns} />}
      <CycleHistory cycles={cycleHistory} />
      {!hasPatterns && <SymptomPatternCard onLoad={setHasPatterns} />}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  myCyclesContainer: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'red'
  },
  cardsContainer: {
    gap: 12,
  },
  emptyStateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 120,
  },
  emptyStateIconContainer: {
    marginBottom: 32,
  },
  emptyStateIcon: {
    width: 120,
    height: 120,
  },
  emptyStateTitle: {
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyStateSubtitle: {
    textAlign: 'center',
    marginBottom: 32,
    opacity: 0.7,
  },
});
