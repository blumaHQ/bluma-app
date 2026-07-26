import { useState, useEffect, useCallback } from 'react';
import { getDB, getSetting } from '../db';
import { periodDates } from '../db/schema';
import { PeriodPredictionService } from '../services/periodPredictions';

export function useCalendarData() {
  const [firstPeriodDate, setFirstPeriodDate] = useState<string | null>(null);
  const [allPeriodDates, setAllPeriodDates] = useState<string[]>([]);
  const [userCycleLength, setUserCycleLength] = useState<number>(28);
  const [userPeriodLength, setUserPeriodLength] = useState<number>(5);

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
      } catch (error) {
        console.error('Error loading user settings:', error);
      }
    };
    loadUserSettings();
  }, []);

  // Load period dates from database
  const loadData = useCallback(async () => {
    const db = getDB();
    const saved = await db.select().from(periodDates);

    // Return raw period dates without styling
    const periodDateStrings = saved.map(s => s.date);

    if (saved.length > 0) {
      setAllPeriodDates(periodDateStrings);
      const periods =
        PeriodPredictionService.groupDateIntoPeriods(periodDateStrings);

      // Get the start date of the most recent period
      const mostRecentPeriod = periods[0];
      const mostRecentStart = mostRecentPeriod[mostRecentPeriod.length - 1];

      setFirstPeriodDate(mostRecentStart);

      return {
        periodDates: periodDateStrings,
        mostRecentStart,
        periods,
      };
    } else {
      setFirstPeriodDate(null);
      setAllPeriodDates([]);
      return {
        periodDates: [],
        mostRecentStart: null,
        periods: [],
      };
    }
  }, []);

  return {
    firstPeriodDate,
    allPeriodDates,
    userCycleLength,
    userPeriodLength,
    loadData,
  };
}
