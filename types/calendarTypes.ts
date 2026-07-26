import { CalendarDayCategory } from '../utils/calendarStyles';

// Custom type for marked dates with today style
export type CustomMarking = {
  selected?: boolean;
  selectedColor?: string;
  customContainerStyle?: any;
  customStyles?: {
    container?: any;
    text?: any;
  };
  marked?: boolean;
  todayStyle?: {
    backgroundColor: string;
  };
  hasHealthLogs?: boolean;
  dayCategory?: CalendarDayCategory;
};

// Type for date markers
export type MarkedDates = {
  [date: string]: CustomMarking;
};

// Rules for selection behavior
export type SelectionRules = {
  disableFuture?: boolean;
  autoSelectDays?: number;
};


// Helper function to create date string (YYYY-MM-DD)
export function formatDateString(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper function to generate a range of dates
export function generateDateRange(startDate: string, days: number): string[] {
  const dates: string[] = [];
  const [y, m, d] = startDate.split('-').map(Number);
  const start = new Date(y, m - 1, d, 12, 0, 0);

  for (let i = 0; i < days; i++) {
    const date = new Date(start);
    date.setDate(date.getDate() + i);
    dates.push(formatDateString(date));
  }

  return dates;
}

export default {} as never;
