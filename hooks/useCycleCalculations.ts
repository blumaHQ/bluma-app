import { useCallback } from 'react';
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
  return useCallback(
    (date: string): number | null => {
      if (!firstPeriodDate || allPeriodDates.length === 0) return null;

      const cycleLength = PeriodPredictionService.getAverageCycleLength(
        allPeriodDates,
        userCycleLength
      );

      if (date >= firstPeriodDate) {
        return PeriodPredictionService.getCycleDayForDate(
          firstPeriodDate,
          date,
          cycleLength,
          formatDateString(new Date())
        );
      }

      const periods =
        PeriodPredictionService.groupDateIntoPeriods(allPeriodDates);

      for (let i = 0; i < periods.length; i++) {
        const period = periods[i];
        const periodStart = period[period.length - 1];
        const periodEnd = period[0];

        if (date >= periodStart && date <= periodEnd) {
          return PeriodPredictionService.getCurrentCycleDay(periodStart, date);
        }

        if (date < periodStart) {
          const prevCycleStart = parseLocalDate(periodStart);
          prevCycleStart.setDate(prevCycleStart.getDate() - cycleLength);
          const prevCycleStartStr = formatDateString(prevCycleStart);

          if (date >= prevCycleStartStr) {
            return PeriodPredictionService.getCurrentCycleDay(
              prevCycleStartStr,
              date
            );
          }
        }
      }

      return null;
    },
    [firstPeriodDate, allPeriodDates, userCycleLength]
  );
}
