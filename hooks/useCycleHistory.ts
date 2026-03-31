import { useState, useCallback, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { getDB, getSetting } from '../db';
import { periodDates } from '../db/schema';
import { PeriodPredictionService } from '../services/periodPredictions';
import { cycleEndDateIso } from '../utils/dateUtils';

export interface CycleData {
  startDate: string;
  /** Undefined for the current in-progress cycle. */
  cycleLength: number | undefined;
  periodLength: number;
  /** Set for completed cycles; omitted while the current cycle is in progress. */
  endDate?: string;
}

interface HistoryEntryWithDate extends CycleData {
  originalDate: string;
}

export function useCycleHistory() {
  const [averageCycleLength, setAverageCycleLength] = useState(0);
  const [averagePeriodLength, setAveragePeriodLength] = useState(0);
  const [cycles, setCycles] = useState<CycleData[]>([]);
  const [userCycleLength, setUserCycleLength] = useState(28);
  const [hasNoPeriodData, setHasNoPeriodData] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    getSetting('userCycleLength')
      .then(value => { if (value) setUserCycleLength(parseInt(value, 10)); })
      .catch(err => console.error('Error loading user settings:', err));
  }, []);

  const load = useCallback(async () => {
    try {
      const db = getDB();
      const saved = await db.select().from(periodDates);
      const sortedDates = saved.map(s => s.date);
      const periods = PeriodPredictionService.groupDateIntoPeriods(sortedDates);

      if (saved.length === 0) {
        setAverageCycleLength(0);
        setAveragePeriodLength(0);
        setCycles([]);
        setHasNoPeriodData(true);
        return;
      }

      setHasNoPeriodData(false);

      setAverageCycleLength(
        PeriodPredictionService.getAverageCycleLength(sortedDates, userCycleLength)
      );

      const periodLengths = periods.map(p => p.length);
      setAveragePeriodLength(
        Math.round(periodLengths.reduce((sum, l) => sum + l, 0) / periodLengths.length)
      );

      const chronologicalPeriods = [...periods].reverse();
      const periodStartDates = chronologicalPeriods
        .map(p => [...p].sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0])
        .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

      const history: HistoryEntryWithDate[] = chronologicalPeriods.map((period, i) => {
        const startDate = [...period].sort(
          (a, b) => new Date(a).getTime() - new Date(b).getTime()
        )[0];

        const cycleLengthValue: number | undefined =
          i === chronologicalPeriods.length - 1
            ? undefined
            : Math.round(
                Math.abs(
                  (new Date(periodStartDates[i + 1]).getTime() -
                    new Date(periodStartDates[i]).getTime()) /
                    (1000 * 60 * 60 * 24)
                )
              );

        const entry: HistoryEntryWithDate = {
          startDate,
          originalDate: startDate,
          cycleLength: cycleLengthValue,
          periodLength: period.length,
        };
        if (cycleLengthValue !== undefined && cycleLengthValue > 0) {
          entry.endDate = cycleEndDateIso(startDate, cycleLengthValue);
        }
        return entry;
      });

      history.sort((a, b) => new Date(b.originalDate).getTime() - new Date(a.originalDate).getTime());
      setCycles(history.map(({ originalDate, ...rest }) => rest));
    } catch (error) {
      console.error('Error loading statistics:', error);
    }
  }, [userCycleLength]);

  useFocusEffect(
    useCallback(() => {
      load().then(() => setIsInitialLoad(false));
      return () => {};
    }, [load])
  );

  return { cycles, averageCycleLength, averagePeriodLength, hasNoPeriodData, isInitialLoad };
}
