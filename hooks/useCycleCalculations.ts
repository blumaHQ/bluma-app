import { useState, useCallback } from 'react';
import { PeriodPredictionService } from '../services/periodPredictions';
import { formatDateString } from '../types/calendarTypes';
import { parseLocalDate } from '../utils/dateUtils';

interface UseCycleCalculationsProps {
  firstPeriodDate: string | null;
  allPeriodDates: string[];
  userCycleLength: number;
}

export function useCycleCalculations({
  firstPeriodDate,
  allPeriodDates,
  userCycleLength,
}: UseCycleCalculationsProps) {
  const [cycleDay, setCycleDay] = useState<number | null>(null);

  // Calculate cycle day for a given date
  const calculateCycleDay = useCallback(
    (date: string): number | null => {
      if (!firstPeriodDate || allPeriodDates.length === 0) return null;

      const selectedDateObj = new Date(date);
      const startDateObj = new Date(firstPeriodDate);

      if (selectedDateObj >= startDateObj) {
        const cycleLength = PeriodPredictionService.getAverageCycleLength(
          allPeriodDates,
          userCycleLength
        );
        const cycleInfo = PeriodPredictionService.getCycleInfo(
          firstPeriodDate,
          date,
          cycleLength
        );
        return cycleInfo.cycleDay;
      }

      // For dates before the current cycle, find the appropriate cycle start date
      const periods =
        PeriodPredictionService.groupDateIntoPeriods(allPeriodDates);
      const cycleLength = PeriodPredictionService.getAverageCycleLength(
        allPeriodDates,
        userCycleLength
      );

      // Find which cycle contains the target date
      for (let i = 0; i < periods.length; i++) {
        const period = periods[i];
        const periodStart = period[period.length - 1]; // Earliest date in the period
        const periodEnd = period[0]; // Latest date in the period

        // If target date is within this period, calculate cycle day from this period start
        if (date >= periodStart && date <= periodEnd) {
          const cycleInfo = PeriodPredictionService.getCycleInfo(
            periodStart,
            date
          );
          return cycleInfo.cycleDay;
        }

        // If target date is before this period, check if it's in the previous cycle
        if (date < periodStart) {
          // Calculate the previous cycle start date
          const prevCycleStart = parseLocalDate(periodStart);
          prevCycleStart.setDate(prevCycleStart.getDate() - cycleLength);
          const prevCycleStartStr = formatDateString(prevCycleStart);

          // If target date is after the previous cycle start, it's in that cycle
          if (date >= prevCycleStartStr) {
            const cycleInfo = PeriodPredictionService.getCycleInfo(
              prevCycleStartStr,
              date
            );
            return cycleInfo.cycleDay;
          }
        }
      }

      return null;
    },
    [firstPeriodDate, allPeriodDates, userCycleLength]
  );

  // Update cycle day info for selected date
  const updateSelectedDateInfo = useCallback(
    (date: string) => {
      setCycleDay(calculateCycleDay(date));
    },
    [calculateCycleDay]
  );

  return {
    cycleDay,
    setCycleDay,
    calculateCycleDay,
    updateSelectedDateInfo,
  };
}
