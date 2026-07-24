import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { MonthView } from './MonthView';
import { MonthData, getLocalizedDayNames } from '../../utils/customCalendarHelpers';

const DAY_NAMES = getLocalizedDayNames();

interface SingleMonthCalendarProps {
  selectedDate?: string;
  onDayPress: (dateString: string) => void;
  colors: any;
  current?: string;
  maxDate?: string;
  minDate?: string;
  disableFuture?: boolean;
}

export function SingleMonthCalendar({
  selectedDate,
  onDayPress,
  colors,
  current,
  maxDate,
  minDate,
  disableFuture = false,
}: SingleMonthCalendarProps) {
  const currentDate = current ? new Date(current) : new Date();
  const [displayMonth, setDisplayMonth] = useState(currentDate.getMonth());
  const [displayYear, setDisplayYear] = useState(currentDate.getFullYear());

  const firstDay = new Date(displayYear, displayMonth, 1).getDay();
  const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1;
  const daysInMonth = new Date(displayYear, displayMonth + 1, 0).getDate();
  const totalDays = adjustedFirstDay + daysInMonth;
  const weekCount = totalDays <= 35 ? 5 : 6;

  const monthData: MonthData = {
    month: displayMonth,
    year: displayYear,
    key: `${displayYear}-${displayMonth}`,
    firstDay: adjustedFirstDay,
    daysInMonth,
    weekCount,
  };

  const markedDates = selectedDate
  ? {
      [selectedDate]: {
        selected: true,
        selectedColor: colors.primary,
        customStyles: {
          container: {
            backgroundColor: colors.primary,
          },
          text: {
            color: colors.white,
          },
        },
      },
    }
  : {};

  const maxDateObj = maxDate ? new Date(maxDate) : null;
  const minDateObj = minDate ? new Date(minDate) : null;

  const canGoNext = () => {
    if (!maxDateObj) return true;
    const nextMonth = new Date(displayYear, displayMonth + 1, 1);
    return nextMonth <= maxDateObj;
  };

  const canGoPrev = () => {
    if (!minDateObj) return true;
    const prevMonth = new Date(displayYear, displayMonth - 1, 1);
    return prevMonth >= minDateObj;
  };

  const handlePrevMonth = () => {
    if (!canGoPrev()) return;
    
    if (displayMonth === 0) {
      setDisplayMonth(11);
      setDisplayYear(displayYear - 1);
    } else {
      setDisplayMonth(displayMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (!canGoNext()) return;
    
    if (displayMonth === 11) {
      setDisplayMonth(0);
      setDisplayYear(displayYear + 1);
    } else {
      setDisplayMonth(displayMonth + 1);
    }
  };

  const monthName = new Date(displayYear, displayMonth, 1).toLocaleDateString(
    'default',
    {
      month: 'long',
      year: 'numeric',
    }
  );

  const swipeGesture = Gesture.Pan()
    .runOnJS(true)
    .onEnd((event) => {
      if (event.translationX > 50) {
        handlePrevMonth();
      } else if (event.translationX < -50) {
        handleNextMonth();
      }
    });

  return (
    <View style={styles.container}>
      <View
        style={[styles.header, { borderBottomColor: colors.neutral150}]}
      >
        <TouchableOpacity
          onPress={handlePrevMonth}
          style={[styles.arrowButton, !canGoPrev() && { opacity: 0.38 }]}
          disabled={!canGoPrev()}
        >
          <Ionicons
            name="chevron-back"
            size={24}
            color={colors.textPrimary}
          />
        </TouchableOpacity>
        
        <Text style={[styles.monthText, { color: colors.textPrimary }]}>
          {monthName}
        </Text>
        
        <TouchableOpacity
          onPress={handleNextMonth}
          style={[styles.arrowButton, !canGoNext() && { opacity: 0.38 }]}
          disabled={!canGoNext()}
        >
          <Ionicons
            name="chevron-forward"
            size={24}
            color={colors.textPrimary}
          />
        </TouchableOpacity>
      </View>

      <GestureDetector gesture={swipeGesture}>
        <View>
          <View style={styles.dayNamesRow}>
            {DAY_NAMES.map((name, index) => (
              <View key={index} style={styles.dayNameCell}>
                <Text style={[styles.dayNameText, { color: colors.textPrimary, fontWeight: '600' }]}>
                  {name}
                </Text>
              </View>
            ))}
          </View>

          <View>
            <MonthView
              key={monthData.key}
              monthData={monthData}
              markedDates={markedDates}
              onDayPress={onDayPress}
              colors={colors}
              mode="selection"
              disableFuture={disableFuture}
              showDayNames={false}
              showMonthHeader={false}
              cellHeight={44}
            />
          </View>
        </View>
      </GestureDetector>
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderBottomWidth: 1.5,
  },
  monthText: {
    fontSize: 18,
    fontWeight: '500',
  },
  arrowButton: {
    padding: 8,
  },
  dayNamesRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  dayNameCell: {
    flex: 1,
    alignItems: 'center',
  },
  dayNameText: {
    fontSize: 12,
    fontWeight: '500',
  },
});

