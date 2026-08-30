import { parseLocalDate } from '../utils/dateUtils';

export type CyclePhase = 'menstrual' | 'follicular' | 'ovulatory' | 'luteal';

export type PregnancyChanceLevel = 'high' | 'medium' | 'low';

interface PredictionResult {
  days: number;
  date: string;
  cycleLength: number;
}

export class PeriodPredictionService {
  // Utility function to group consecutive dates into periods
  static groupDateIntoPeriods(dates: string[]): string[][] {
    if (dates.length === 0) return [];

    const sortedDates = dates.sort(
      (a, b) => new Date(b).getTime() - new Date(a).getTime()
    );
    const periods: string[][] = [];
    let currentPeriod: string[] = [sortedDates[0]];

    for (let i = 1; i < sortedDates.length; i++) {
      const dayDiff = Math.abs(
        (new Date(sortedDates[i]).getTime() -
          new Date(sortedDates[i - 1]).getTime()) /
          (1000 * 60 * 60 * 24)
      );
      if (dayDiff <= 1) {
        currentPeriod.push(sortedDates[i]);
      } else {
        periods.push(currentPeriod);
        currentPeriod = [sortedDates[i]];
      }
    }
    periods.push(currentPeriod);
    return periods;
  }

  static getAveragePeriodLength(
    periods: string[][],
    userPeriodLength?: number
  ): number {
    if (periods.length === 0) return userPeriodLength || 5;

    const recentPeriods = periods.slice(0, 6);
    const avg =
      recentPeriods.reduce((sum, p) => sum + p.length, 0) /
      recentPeriods.length;
    return Math.round(avg);
  }

  static getAverageCycleLength(
    dates: string[],
    userCycleLength?: number
  ): number {
    if (dates.length < 2) return userCycleLength || 28;

    const periods = this.groupDateIntoPeriods(dates);

    // Calculate weighted average
    let weightedTotal = 0;
    let weightSum = 0;
    let cycles = 0;

    for (let i = 1; i < Math.min(periods.length, 6); i++) {
      const currentPeriodStart = new Date(
        periods[i - 1][periods[i - 1].length - 1]
      );
      const prevPeriodStart = new Date(periods[i][periods[i].length - 1]);

      const dayDiff = Math.floor(
        (currentPeriodStart.getTime() - prevPeriodStart.getTime()) /
          (1000 * 60 * 60 * 24)
      );

      const weight = Math.max(1 - cycles * 0.2, 0.2);
      weightedTotal += dayDiff * weight;
      weightSum += weight;
      cycles++;
    }

    return cycles > 0
      ? Math.round(weightedTotal / weightSum)
      : userCycleLength || 28;
  }

  // Calculate if today is a period day and which day it is
  static calculatePeriodDay(periodDates: { [date: string]: any }): {
    isPeriodDay: boolean;
    dayNumber: number;
  } {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;

    if (!periodDates[todayStr]) {
      return { isPeriodDay: false, dayNumber: 0 };
    }

    // It's a period day, calculate which day it is
    let dayCount = 1;
    const tempDate = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      12,
      0,
      0
    );

    // Look back day by day to find consecutive period days
    while (true) {
      tempDate.setDate(tempDate.getDate() - 1);
      const prevDateStr = `${tempDate.getFullYear()}-${(tempDate.getMonth() + 1).toString().padStart(2, '0')}-${tempDate.getDate().toString().padStart(2, '0')}`;

      if (periodDates[prevDateStr]) {
        dayCount++;
      } else {
        break;
      }
    }

    return { isPeriodDay: true, dayNumber: dayCount };
  }

  static getPrediction(
    startDate: string,
    allDates: string[],
    userCycleLength?: number
  ): PredictionResult {
    const cycleLength = this.getAverageCycleLength(allDates, userCycleLength);
    const now = new Date();
    const today = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      12,
      0,
      0
    );
    const nextPeriod = parseLocalDate(startDate);

    nextPeriod.setDate(nextPeriod.getDate() + cycleLength);

    const daysUntil = Math.round(
      (nextPeriod.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    const dateStr = `${nextPeriod.getFullYear()}-${(nextPeriod.getMonth() + 1).toString().padStart(2, '0')}-${nextPeriod.getDate().toString().padStart(2, '0')}`;
    return { days: daysUntil, date: dateStr, cycleLength };
  }

  static getCurrentCycleDay(startDate: string, currentDate?: string): number {
    const start = parseLocalDate(startDate);
    let current: Date;
    if (currentDate) {
      current = parseLocalDate(currentDate);
    } else {
      const now = new Date();
      current = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        12,
        0,
        0
      );
    }

    const dayDiff = Math.round(
      (current.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    );

    return dayDiff + 1;
  }

  static wrapCycleDay(cycleDay: number, cycleLength: number): number {
    if (cycleLength <= 0 || cycleDay <= cycleLength) return cycleDay;
    return ((cycleDay - 1) % cycleLength) + 1;
  }

  static getCycleDayForDate(
    startDate: string,
    targetDate: string,
    cycleLength: number,
    today: string
  ): number {
    const cycleDay = this.getCurrentCycleDay(startDate, targetDate);
    return targetDate > today
      ? this.wrapCycleDay(cycleDay, cycleLength)
      : cycleDay;
  }

  static getOvulationCycleDay(cycleLength: number = 28): number {
    // Ovulation is 14 days before next period (offset from start), and
    // cycle days are 1-based, so: (cycleLength - 14) + 1 = cycleLength - 13
    return cycleLength - 13;
  }

  static getOvulationDay(startDate: string, cycleLength?: number): string {
    const start = parseLocalDate(startDate);
    const length = cycleLength || 28;

    // Ovulation day offset is 0-based: cycleDay - 1
    const ovulationDayOffset = this.getOvulationCycleDay(length) - 1;
    const ovulationDate = new Date(start);
    ovulationDate.setDate(ovulationDate.getDate() + ovulationDayOffset);

    return `${ovulationDate.getFullYear()}-${(ovulationDate.getMonth() + 1).toString().padStart(2, '0')}-${ovulationDate.getDate().toString().padStart(2, '0')}`;
  }

  static getCyclePhase(
    cycleDay: number,
    averageCycleLength: number = 28,
    averagePeriodLength: number = 5
  ): CyclePhase {
    if (cycleDay <= averagePeriodLength) return 'menstrual';

    const ovulationCycleDay = this.getOvulationCycleDay(averageCycleLength);

    if (cycleDay < ovulationCycleDay) return 'follicular';
    if (cycleDay === ovulationCycleDay) return 'ovulatory';
    return 'luteal';
  }

  static getPregnancyChance(
    cycleDay: number,
    averageCycleLength: number = 28
  ): PregnancyChanceLevel {
    const ovulationDay = this.getOvulationCycleDay(averageCycleLength);
    const fertilityStart = ovulationDay - 5;
    const fertilityEnd = ovulationDay + 1;

    if (cycleDay >= fertilityStart && cycleDay <= fertilityEnd) return 'high';
    if (cycleDay >= fertilityStart - 2 && cycleDay < fertilityStart)
      return 'medium';
    return 'low';
  }

  // Generate fertile windows and ovulation for actual logged periods
  static generateFertilityForLoggedPeriods(
    periodStartDates: string[],
    userCycleLength: number
  ): { [date: string]: { type: 'fertile' | 'ovulation' } } {
    const fertilityDates: {
      [date: string]: { type: 'fertile' | 'ovulation' };
    } = {};

    // Skip the first (earliest) period since we have no data about the cycle before it
    if (periodStartDates.length === 0) return fertilityDates;

    const sortedDates = [...periodStartDates].sort(
      (a, b) => new Date(a).getTime() - new Date(b).getTime()
    );

    // Skip the first period and only calculate fertility for subsequent periods
    const datesWithPreviousCycle = sortedDates.slice(1);

    datesWithPreviousCycle.forEach(startDate => {
      // Calculate ovulation date (14 days before period start)
      const periodDate = parseLocalDate(startDate);
      const ovulationDate = new Date(periodDate);
      ovulationDate.setDate(ovulationDate.getDate() - 14);
      const ovulationDateString = `${ovulationDate.getFullYear()}-${(ovulationDate.getMonth() + 1).toString().padStart(2, '0')}-${ovulationDate.getDate().toString().padStart(2, '0')}`;

      // Calculate fertile window (5 days before ovulation + ovulation day + 1 day after)
      const fertileStart = new Date(ovulationDate);
      fertileStart.setDate(fertileStart.getDate() - 5);

      const fertileEnd = new Date(ovulationDate);
      fertileEnd.setDate(fertileEnd.getDate() + 1);

      // Add fertile window dates
      for (
        let d = new Date(fertileStart);
        d <= fertileEnd;
        d.setDate(d.getDate() + 1)
      ) {
        const fertileDateString = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;

        if (fertileDateString === ovulationDateString) {
          // This is the ovulation day - mark it as ovulation
          fertilityDates[fertileDateString] = { type: 'ovulation' };
        } else {
          // This is a fertile window day (not ovulation)
          fertilityDates[fertileDateString] = { type: 'fertile' };
        }
      }
    });

    return fertilityDates;
  }

  // Generate all predicted dates (periods, fertile window, and ovulation) for multiple cycles
  static generatePredictedDates(
    startDate: string,
    userCycleLength: number,
    userPeriodLength: number,
    numCycles: number = 3
  ): { [date: string]: { type: 'period' | 'fertile' | 'ovulation' } } {
    const predictedDates: {
      [date: string]: { type: 'period' | 'fertile' | 'ovulation' };
    } = {};

    for (let i = 0; i < numCycles; i++) {
      // Calculate next period start date
      const baseDate = parseLocalDate(startDate);
      const nextPeriodDate = new Date(baseDate);
      nextPeriodDate.setDate(baseDate.getDate() + userCycleLength * (i + 1));

      // Calculate ovulation date (14 days before period start)
      const ovulationDate = new Date(nextPeriodDate);
      ovulationDate.setDate(ovulationDate.getDate() - 14);
      const ovulationDateString = `${ovulationDate.getFullYear()}-${(ovulationDate.getMonth() + 1).toString().padStart(2, '0')}-${ovulationDate.getDate().toString().padStart(2, '0')}`;

      // Calculate fertile window (5 days before ovulation + ovulation day + 1 day after)
      const fertileStart = new Date(ovulationDate);
      fertileStart.setDate(fertileStart.getDate() - 5);

      const fertileEnd = new Date(ovulationDate);
      fertileEnd.setDate(fertileEnd.getDate() + 1);

      // Add fertile window dates
      for (
        let d = new Date(fertileStart);
        d <= fertileEnd;
        d.setDate(d.getDate() + 1)
      ) {
        const fertileDateString = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;

        // Don't override period dates with fertile window
        if (
          !predictedDates[fertileDateString] ||
          predictedDates[fertileDateString].type !== 'period'
        ) {
          if (fertileDateString === ovulationDateString) {
            // This is the ovulation day - mark it as ovulation (will get special styling)
            predictedDates[fertileDateString] = { type: 'ovulation' };
          } else {
            // This is a fertile window day (not ovulation)
            predictedDates[fertileDateString] = { type: 'fertile' };
          }
        }
      }

      // Add period dates
      for (let j = 0; j < userPeriodLength; j++) {
        const periodDay = new Date(nextPeriodDate);
        periodDay.setDate(periodDay.getDate() + j);
        const periodDayString = `${periodDay.getFullYear()}-${(periodDay.getMonth() + 1).toString().padStart(2, '0')}-${periodDay.getDate().toString().padStart(2, '0')}`;
        predictedDates[periodDayString] = { type: 'period' };
      }
    }

    return predictedDates;
  }
}
