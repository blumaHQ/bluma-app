import { formatDateString } from '../types/calendarTypes';

export const parseLocalDate = (iso: string): Date => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
};

/** Last calendar day of a cycle when `inclusiveLengthDays` counts the start day as day 1. */
export function cycleEndDateIso(startIso: string, inclusiveLengthDays: number): string {
  const start = parseLocalDate(startIso);
  const end = new Date(start);
  end.setDate(start.getDate() + inclusiveLengthDays - 1);
  return formatDateString(end);
}

export const parseSafeHour = (raw: string, defaultValue = 10): number => {
  const n = parseInt(raw, 10);
  return n >= 0 && n <= 23 ? n : defaultValue;
};

export const parseSafeMinute = (raw: string, defaultValue = 0): number => {
  const n = parseInt(raw, 10);
  return n >= 0 && n <= 59 ? n : defaultValue;
};
