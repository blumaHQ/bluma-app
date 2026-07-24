import React, { useMemo, useRef, useImperativeHandle, forwardRef, useCallback } from 'react';
import { FlatList, View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../styles/theme';
import { MarkedDates } from '../../types/calendarTypes';
import {
  generateMonthsArray,
  findMonthIndex,
  getLocalizedDayNames,
  MonthData,
} from '../../utils/customCalendarHelpers';
import { MonthView } from './MonthView';

export interface CustomCalendarProps {
  mode: 'view' | 'selection';
  markedDates: MarkedDates;
  onDayPress: (dateString: string) => void;
  current?: string;
  pastScrollRange?: number;
  futureScrollRange?: number;
  disableFuture?: boolean;
  onMonthChange?: (dateString: string) => void;
  renderDay?: (props: any) => React.ReactNode;
}

export interface CustomCalendarRef {
  scrollToToday: () => void;
}

const DAY_NAMES = getLocalizedDayNames();
const HEADER_HEIGHT = 50;
const DAY_CELL_HEIGHT = 64;
const MONTH_PADDING = 10;

function getMonthHeight(weekCount: number): number {
  return HEADER_HEIGHT + (weekCount * DAY_CELL_HEIGHT) + MONTH_PADDING;
}

export const CustomCalendar = forwardRef<CustomCalendarRef, CustomCalendarProps>(
  ({
    mode,
    markedDates,
    onDayPress,
    current,
    pastScrollRange = 32,
    futureScrollRange = 12,
    disableFuture = false,
    onMonthChange,
    renderDay,
  }, ref) => {
    const { colors } = useTheme();
    const flatListRef = useRef<FlatList>(null);

  const baseDate = useMemo(() => new Date(), []);

  const currentDate = useMemo(
    () => (current ? new Date(current) : new Date()),
    [current]
  );

  const months = useMemo(
    () => generateMonthsArray(baseDate, pastScrollRange, futureScrollRange),
    [baseDate, pastScrollRange, futureScrollRange]
  );

  const monthOffsets = useMemo(() => {
    const SEPARATOR_HEIGHT = 1;
    let offset = 0;
    return months.map((month, index) => {
      const currentOffset = offset;
      offset += getMonthHeight(month.weekCount);
      if (index < months.length - 1) {
        offset += SEPARATOR_HEIGHT;
      }
      return currentOffset;
    });
  }, [months]);

  const initialIndex = useMemo(
    () => findMonthIndex(months, currentDate),
    [months, currentDate]
  );

  const renderMonth = useCallback(({ item }: { item: MonthData }) => (
    <MonthView
      monthData={item}
      markedDates={markedDates}
      onDayPress={onDayPress}
      colors={colors}
      mode={mode}
      disableFuture={disableFuture}
      showDayNames={false}
      renderDay={renderDay}
    />
  ), [markedDates, onDayPress, colors, mode, disableFuture, renderDay]);

  const renderSeparator = useCallback(() => (
    <View style={[styles.separator, { backgroundColor: colors.border }]} />
  ), [colors.border]);

  const getItemLayout = (_: any, index: number) => ({
    length: getMonthHeight(months[index].weekCount),
    offset: monthOffsets[index],
    index,
  });

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0 && onMonthChange) {
      const visibleMonth = viewableItems[0].item as MonthData;
      const dateString = `${visibleMonth.year}-${String(visibleMonth.month + 1).padStart(2, '0')}-01`;
      onMonthChange(dateString);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  useImperativeHandle(ref, () => ({
    scrollToToday: () => {
      const todayIndex = findMonthIndex(months, baseDate);
      flatListRef.current?.scrollToIndex({
        index: todayIndex,
        animated: true,
      });
    },
  }));

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.dayNamesHeader,
          {
            borderBottomColor: colors.border,
            backgroundColor: colors.panel,
          },
        ]}
      >
        {DAY_NAMES.map((day, index) => (
          <View key={index} style={styles.dayNameCell}>
            <Text style={[styles.dayNameText, { color: colors.textPrimary }]}>
              {day}
            </Text>
          </View>
        ))}
      </View>

      <FlatList
        ref={flatListRef}
        data={months}
        renderItem={renderMonth}
        keyExtractor={item => item.key}
        ItemSeparatorComponent={renderSeparator}
        initialScrollIndex={initialIndex}
        initialNumToRender={3}
        maxToRenderPerBatch={2}
        windowSize={3}
        removeClippedSubviews={false}
        getItemLayout={getItemLayout}
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        onScrollToIndexFailed={info => {
          setTimeout(() => {
            flatListRef.current?.scrollToIndex({
              index: info.index,
              animated: false,
            });
          }, 100);
        }}
      />
    </View>
  );
});

CustomCalendar.displayName = 'CustomCalendar';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  dayNamesHeader: {
    flexDirection: 'row',
    paddingVertical: 5,
    borderBottomWidth: 1,
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
  separator: {
    height: 1,
  },
});

