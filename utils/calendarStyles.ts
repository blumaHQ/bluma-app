interface CalendarColors {
  accentBlue: string;
  accentPinkLight: string;
  accentPink: string;
  white: string;
  neutral300: string;
  textPrimary: string;
}

export type PredictionType = 'ovulation' | 'fertile' | 'period';

export type CalendarDayCategory =
  | 'period'
  | 'futurePeriod'
  | 'fertile'
  | 'futureFertile'
  | 'ovulation'
  | 'futureOvulation';

/**
 * Pure function mapping a prediction type + date into the semantic category
 * shown in the calendar bottom sheet (e.g. "Fertile day", "Future ovulation day").
 * A date is "future" when it hasn't happened yet relative to `today`.
 */
export function getDayCategory(
  type: PredictionType,
  dateString: string,
  today: string
): CalendarDayCategory {
  const isFuture = dateString > today;

  switch (type) {
    case 'period':
      return isFuture ? 'futurePeriod' : 'period';
    case 'fertile':
      return isFuture ? 'futureFertile' : 'fertile';
    case 'ovulation':
      return isFuture ? 'futureOvulation' : 'ovulation';
  }
}

export interface CalendarDateStyle {
  customStyles: {
    container: {
      borderRadius?: number;
      backgroundColor?: string;
      borderWidth?: number;
      borderColor?: string;
      borderStyle?: string;
    };
    text: {
      color: string;
    };
  };
  selected?: boolean;
}

/**
 * Pure function that returns styling for different calendar prediction types (used in view mode)
 */
export function getCalendarDateStyle(
  predictionType: PredictionType,
  colors: CalendarColors
): CalendarDateStyle {
  switch (predictionType) {
    case 'ovulation':
      return {
        customStyles: {
          container: {
            borderRadius: 16,
            borderWidth: 2,
            borderColor: colors.accentBlue,
            borderStyle: 'dotted',
          },
          text: {
            color: colors.accentBlue,
          },
        },
      };
    case 'fertile':
      return {
        customStyles: {
          container: {},
          text: {
            color: colors.accentBlue,
          },
        },
      };
    case 'period':
      return {
        customStyles: {
          container: {
            borderRadius: 16,
            borderWidth: 2,
            borderColor: colors.accentPink,
            borderStyle: 'dotted',
          },
          text: {
            color: colors.accentPink,
          },
        },
      };
  }
}

/**
 * Returns styling for actual logged period dates (used in view mode)
 */
export function getPeriodDateStyle(colors: CalendarColors): CalendarDateStyle {
  return {
    customStyles: {
      container: {
        backgroundColor: colors.accentPink,
      },
      text: {
        color: colors.white,
      },
    },
  };
}

/**
 * Returns styling for selected period dates (used in edit mode)
 */
export function createSelectedStyle(colors: CalendarColors): CalendarDateStyle {
  return {
    selected: true,
    customStyles: {
      container: {
        borderRadius: 16,
        backgroundColor: colors.accentPinkLight,
        borderWidth: 2,
        borderColor: colors.accentPink,
      },
      text: {
        color: colors.accentPink,
      },
    },
  };
}

/**
 * Returns styling for today's date
 */
export function getTodayDateStyle(colors: CalendarColors): CalendarDateStyle {
  return {
    customStyles: {
      container: {
        borderRadius: 34,
        backgroundColor: colors.neutral300,
      },
      text: {
        color: colors.textPrimary,
      },
    },
  };
}

/**
 * Returns styling for EditDayCell component (used in edit mode)
 */
export function getEditDayCellStyles(colors: CalendarColors) {
  return {
    dayContainer: {
      alignItems: 'center' as const,
      width: '14.28%' as const,
      height: 64,
    },
    container: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      position: 'relative' as const,
    },
    text: {
      fontSize: 16,
      textAlign: 'center' as const,
      marginBottom: 1,
    },
    checkmark: {
      position: 'absolute' as const,
      marginTop: 0,
    },
    todayLabel: {
      marginTop: 2,
    },
    selectedDayIndicator: {
      backgroundColor: colors.accentPink,
      borderColor: colors.accentPink,
    },
    futureDayIndicator: {
      borderWidth: 1,
    },
    futureSelectedDayIndicator: {
      backgroundColor: 'transparent',
      borderColor: colors.accentPink,
      borderWidth: 2,
      borderStyle: 'dotted',
    },
    disabledDayText: {
      opacity: 0.38,
    },
  };
}
