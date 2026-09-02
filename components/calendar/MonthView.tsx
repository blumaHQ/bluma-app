import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  MonthData,
  generateDaysForMonth,
  getLocalizedDayNames,
  getMonthName,
} from '../../utils/customCalendarHelpers';
import { MarkedDates } from '../../types/calendarTypes';
import { DayCell } from './DayCell';

interface MonthViewProps {
  monthData: MonthData;
  markedDates: MarkedDates;
  onDayPress: (dateString: string) => void;
  colors: any;
  mode: 'view' | 'selection';
  disableFuture?: boolean;
  showDayNames?: boolean;
  showMonthHeader?: boolean;
  renderDay?: (props: any) => React.ReactNode;
  cellHeight?: number;
}

const DAY_NAMES = getLocalizedDayNames();

export const MonthView = memo<MonthViewProps>(
  ({
    monthData,
    markedDates,
    onDayPress,
    colors,
    mode,
    disableFuture = false,
    showDayNames = false,
    showMonthHeader = true,
    renderDay,
    cellHeight,
  }) => {
    const days = useMemo(
      () => generateDaysForMonth(monthData),
      [monthData]
    );

    const monthName = getMonthName(monthData.month, monthData.year);

    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: showMonthHeader ? colors.panel : 'transparent',
          },
        ]}
      >
        {showMonthHeader && (
          <View style={styles.header}>
            <Text style={[styles.headerText, { color: colors.textPrimary }]}>
              {monthName}
            </Text>
          </View>
        )}

        {showDayNames && (
          <View style={styles.dayNamesRow}>
            {DAY_NAMES.map((name, index) => (
              <View key={index} style={styles.dayNameCell}>
                <Text style={[styles.dayNameText, { color: colors.textPrimary, }]}>
                  {name}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.daysGrid}>
          {days.map(day =>
            renderDay ? (
              <React.Fragment key={day.dateString}>
                {renderDay({
                  day,
                  marking: markedDates[day.dateString],
                  onPress: onDayPress,
                  colors,
                })}
              </React.Fragment>
            ) : (
              <DayCell
                key={day.dateString}
                day={day}
                marking={markedDates[day.dateString]}
                onPress={onDayPress}
                colors={colors}
                mode={mode}
                disableFuture={disableFuture}
                cellHeight={cellHeight}
              />
            )
          )}
        </View>
      </View>
    );
  },
  (prev, next) => {
    if (prev.monthData.key !== next.monthData.key) return false;
    if (prev.colors !== next.colors) return false;
    if (prev.mode !== next.mode) return false;
    if (prev.disableFuture !== next.disableFuture) return false;
    if (prev.showMonthHeader !== next.showMonthHeader) return false;
    if (prev.renderDay !== next.renderDay) return false;
    if (prev.onDayPress !== next.onDayPress) return false;
    if (prev.cellHeight !== next.cellHeight) return false;
    
    // Only check markedDates for dates in this month
    const days = generateDaysForMonth(prev.monthData);
    for (const day of days) {
      if (day.isCurrentMonth) {
        const prevMarking = prev.markedDates[day.dateString];
        const nextMarking = next.markedDates[day.dateString];
        if (prevMarking !== nextMarking) return false;
      }
    }
    
    return true;
  }
);

MonthView.displayName = 'MonthView';

const styles = StyleSheet.create({
  container: {
    paddingBottom: 0,
    paddingTop: 10,
  },
  header: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginBottom: 8,
  },
  headerText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  dayNamesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  dayNameCell: {
    flex: 1,
    alignItems: 'center',
  },
  dayNameText: {
    fontSize: 12,
    fontWeight: '500',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
  },
});

