import { getLocales } from 'expo-localization';

export function getLocalizedDayNames(): string[] {
  const locale = getLocales()[0]?.languageTag ?? 'en';
  const formatter = new Intl.DateTimeFormat(locale, { weekday: 'narrow' });
  // 2026-01-05 (Mon) through 2026-01-11 (Sun)
  return Array.from({ length: 7 }, (_, i) =>
    formatter.format(new Date(2026, 0, 5 + i))
  );
}

export interface MonthData {
  year: number;
  month: number;
  firstDay: number;
  daysInMonth: number;
  weekCount: number;
  key: string;
}

export interface DayData {
  dateString: string;
  day: number;
  month: number;
  year: number;
  isCurrentMonth: boolean;
}

export function generateMonthsArray(
  startDate: Date,
  monthsBefore: number,
  monthsAfter: number
): MonthData[] {
  const months: MonthData[] = [];
  const baseDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);

  for (let i = -monthsBefore; i <= monthsAfter; i++) {
    const date = new Date(baseDate);
    date.setMonth(date.getMonth() + i);

    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1;
    
    const totalDays = adjustedFirstDay + daysInMonth;
    const weekCount = totalDays <= 35 ? 5 : 6;

    months.push({
      year,
      month,
      firstDay: adjustedFirstDay,
      daysInMonth,
      weekCount,
      key: `${year}-${month}`,
    });
  }

  return months;
}

export function generateDaysForMonth(monthData: MonthData): DayData[] {
  const days: DayData[] = [];
  const { year, month, firstDay, daysInMonth } = monthData;

  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;
  const daysInPrevMonth = new Date(prevYear, prevMonth + 1, 0).getDate();

  for (let i = firstDay - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    const dateString = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    days.push({
      dateString,
      day,
      month: prevMonth,
      year: prevYear,
      isCurrentMonth: false,
    });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    days.push({
      dateString,
      day,
      month,
      year,
      isCurrentMonth: true,
    });
  }

  const totalCells = monthData.weekCount * 7;
  const remainingDays = totalCells - days.length;
  const nextMonth = month === 11 ? 0 : month + 1;
  const nextYear = month === 11 ? year + 1 : year;

  for (let day = 1; day <= remainingDays; day++) {
    const dateString = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    days.push({
      dateString,
      day,
      month: nextMonth,
      year: nextYear,
      isCurrentMonth: false,
    });
  }

  return days;
}

export function formatDateString(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getMonthName(month: number, year: number): string {
  const date = new Date(year, month, 1);
  return date.toLocaleString('default', { month: 'long', year: 'numeric' });
}

export function findMonthIndex(
  months: MonthData[],
  targetDate: Date
): number {
  const targetYear = targetDate.getFullYear();
  const targetMonth = targetDate.getMonth();

  return months.findIndex(
    m => m.year === targetYear && m.month === targetMonth
  );
}

