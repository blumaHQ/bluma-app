import { parseLocalDate } from '../utils/dateUtils';

export function validatePeriodDate(date: string): boolean {
  const dateObj = parseLocalDate(date);

  const now = new Date();
  const maxFutureDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7, 12, 0, 0);

  return !isNaN(dateObj.getTime()) && dateObj <= maxFutureDate;
}

export function validatePeriodDates(dates: string[]): boolean {
  const now = new Date();
  const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate(), 12, 0, 0);

  return dates.every(date => {
    const dateObj = parseLocalDate(date);
    return validatePeriodDate(date) && dateObj >= oneYearAgo;
  });
}
