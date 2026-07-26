import { useState, useCallback } from 'react';
import { MarkedDates, formatDateString } from '../types/calendarTypes';
import { useCalendarPredictions } from './useCalendarPredictions';
import { useHealthLogDates } from './useHealthLogDates';
import {
  getCalendarDateStyle,
  getPeriodDateStyle,
  getTodayDateStyle,
  getDayCategory,
} from '../utils/calendarStyles';
import { ColorScheme } from '../styles/colors';

interface UseCalendarMarkedDatesProps {
  colors: ColorScheme;
  userCycleLength: number;
  userPeriodLength: number;
  showOvulation?: boolean;
  showFuturePeriods?: boolean;
}

/**
 * Hook that combines data from predictions and applies styling to create marked dates
 */
export function useCalendarMarkedDates({
  colors,
  userCycleLength,
  userPeriodLength,
  showOvulation = true,
  showFuturePeriods = true,
}: UseCalendarMarkedDatesProps) {
  const [baseMarkedDates, setBaseMarkedDates] = useState<MarkedDates>({});

  const { generatePredictions } = useCalendarPredictions({
    userCycleLength,
    userPeriodLength,
  });

  const { loadHealthLogDates } = useHealthLogDates();

  // Generate all marked dates including predictions with styling
  const generateMarkedDates = useCallback(
    async (
      periodDates: string[],
      startDate: string | null,
      allPeriods: string[][]
    ) => {
      // Load health log dates
      const healthLogDates = await loadHealthLogDates();
      const today = formatDateString(new Date());

      // If no period data, still show health log indicators
      const allMarkedDates: MarkedDates = {};

      if (startDate && periodDates.length > 0) {
        const periodDateSet = new Set(periodDates);

        // Apply styling to actual period dates
        periodDates.forEach(dateString => {
          allMarkedDates[dateString] = {
            ...getPeriodDateStyle(colors),
            dayCategory: getDayCategory('period', dateString, today),
          };
        });

        // Generate predictions
        const { fertilityDates, predictedDates } = generatePredictions(
          periodDates,
          startDate,
          allPeriods
        );

        // Apply styling to fertility dates (past and present cycles) - only if ovulation is enabled
        if (showOvulation) {
          Object.entries(fertilityDates).forEach(([dateString, prediction]) => {
            if (!periodDateSet.has(dateString)) {
              allMarkedDates[dateString] = {
                ...getCalendarDateStyle(prediction.type, colors),
                dayCategory: getDayCategory(prediction.type, dateString, today),
              };
            }
          });
        }

        // Apply styling to predicted dates (future cycles only) - filter based on settings
        Object.entries(predictedDates).forEach(([dateString, prediction]) => {
          if (
            !showOvulation &&
            (prediction.type === 'ovulation' || prediction.type === 'fertile')
          ) {
            return;
          }

          if (!showFuturePeriods && prediction.type === 'period') {
            return;
          }

          if (!periodDateSet.has(dateString) && !allMarkedDates[dateString]) {
            allMarkedDates[dateString] = {
              ...getCalendarDateStyle(prediction.type, colors),
              dayCategory: getDayCategory(prediction.type, dateString, today),
            };
          }
        });
      }

      // Add health log indicators to all dates that have health logs
      healthLogDates.forEach(dateString => {
        if (allMarkedDates[dateString]) {
          // Add health log indicator to existing marked date
          allMarkedDates[dateString].hasHealthLogs = true;
        } else {
          // Create new marked date for health log only
          allMarkedDates[dateString] = {
            hasHealthLogs: true,
          };
        }
      });

      // Apply today style to current date (but period style takes precedence)
      const isPeriodDate = periodDates.includes(today);
      
      if (!isPeriodDate) {
        const existingMarking = allMarkedDates[today];
        const todayStyle = getTodayDateStyle(colors);
        
        if (existingMarking) {
          allMarkedDates[today] = {
            ...existingMarking,
            customStyles: {
              container: {
                ...existingMarking.customStyles?.container,
                ...todayStyle.customStyles.container,
              },
              text: existingMarking.customStyles?.text ?? todayStyle.customStyles.text,
            },
          };
        } else {
          // Apply today style to unmarked date
          allMarkedDates[today] = todayStyle;
        }
      }

      // Store base marked dates (without selection highlight)
      setBaseMarkedDates(allMarkedDates);
    },
    [
      colors,
      generatePredictions,
      loadHealthLogDates,
      showOvulation,
      showFuturePeriods,
    ]
  );

  // Generate marked dates with highlighting for a specific selected date
  const getMarkedDatesWithSelection = useCallback(
    (selectedDateParam: string) => {
      // Create a copy of base marked dates and add selection indicator
      const markedDatesWithSelection = { ...baseMarkedDates };

      // Add selection indicator to the selected date
      if (selectedDateParam) {
        markedDatesWithSelection[selectedDateParam] = {
          ...markedDatesWithSelection[selectedDateParam],
          selected: true,
        };
      }

      return markedDatesWithSelection;
    },
    [baseMarkedDates]
  );

  const getSelectionMarkedDates = useCallback(
    (selectedDate: string) =>
      selectedDate
        ? getMarkedDatesWithSelection(selectedDate)
        : baseMarkedDates,
    [baseMarkedDates, getMarkedDatesWithSelection]
  );

  // Look up the semantic category (period/fertile/ovulation, past or future) for a date
  const getDayCategoryForDate = useCallback(
    (date: string) => baseMarkedDates[date]?.dayCategory,
    [baseMarkedDates]
  );

  return {
    baseMarkedDates,
    generateMarkedDates,
    getMarkedDatesWithSelection,
    getSelectionMarkedDates,
    getDayCategoryForDate,
  };
}
