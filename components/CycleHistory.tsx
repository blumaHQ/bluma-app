import React, { useMemo, useState, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '../styles/theme';
import { useAppStyles } from '../hooks/useStyles';
import { formatDateShort } from '../utils/localeUtils';
import { formatDateString } from '../types/calendarTypes';
import { cycleEndDateIso, parseLocalDate } from '../utils/dateUtils';
import { PeriodPredictionService } from '../services/periodPredictions';
import type { CycleData } from '../hooks/useCycleHistory';

interface CycleHistoryProps {
  cycles: CycleData[];
  maxItems?: number;
  showTitle?: boolean;
}

// Helper to render the circles representing days
const DayCircles = React.memo(function DayCircles({
  totalDays,
  periodDays,
  isLast,
}: {
  totalDays: number;
  periodDays: number;
  isLast?: boolean;
}) {
  const { colors } = useTheme();
  const circles = [];

  for (let i = 0; i < totalDays; i++) {
    circles.push(
      <View
        key={i}
        style={[
          styles.circle,
          {
            backgroundColor:
              i < periodDays ? colors.accentPink : colors.neutral100,
          },
        ]}
      />
    );
  }

  return (
    <View 
      style={[
        styles.circleContainer,
        isLast && { marginBottom: 0 }
      ]}
    >
      {circles}
    </View>
  );
});

type CycleFilter = 'all' | 3 | 6 | number;

export function CycleHistory({ cycles, maxItems, showTitle = true }: CycleHistoryProps) {
  const { colors } = useTheme();
  const { typography, commonStyles } = useAppStyles();
  const { t } = useTranslation(['stats', 'common']);
  const [filter, setFilter] = useState<CycleFilter>('all');
  const scrollViewRef = useRef<ScrollView>(null);
  const filterRefs = useRef<Map<string, View>>(new Map());

  const isCompact = maxItems !== undefined;
  const showSeeAll = isCompact && cycles.length > maxItems!;

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    cycles.forEach((cycle) => {
      const year = parseLocalDate(cycle.startDate).getFullYear();
      years.add(year);
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [cycles]);

  const availableFilters = useMemo(() => {
    const filters: CycleFilter[] = ['all'];
    if (cycles.length > 3) filters.push(3);
    if (cycles.length > 6) filters.push(6);
    return [...filters, ...availableYears];
  }, [cycles.length, availableYears]);

  const filteredCycles = useMemo(() => {
    if (isCompact) {
      return cycles.slice(0, maxItems);
    }
    if (filter === 'all') return cycles;
    if (filter === 3 || filter === 6) return cycles.slice(0, filter);
    return cycles.filter((cycle) => {
      const year = parseLocalDate(cycle.startDate).getFullYear();
      return year === filter;
    });
  }, [cycles, filter, isCompact, maxItems]);

  if (cycles.length === 0) {
    return null;
  }

  return (
    <View>
      {showTitle && (
        <View style={[styles.headerContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <View style={styles.headerTopRow}>
            <Text
              style={[
                typography.headingMd,
                commonStyles.sectionTitleContainer,
                { marginBottom: 0 },
              ]}
            >
              {t('stats:cycleHistory.title')}
            </Text>

            {showSeeAll ? (
              <Pressable
                onPress={() => router.push('/cycle-history')}
                style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
                hitSlop={10}
              >
                <Text style={[typography.bodyBold, { color: colors.primary }]}>
                  {t('stats:cycleHistory.seeAll')}
                </Text>
              </Pressable>
            ) : (
              <View />
            )}
          </View>
        </View>
      )}

      {!isCompact && availableFilters.length > 1 && (
        <ScrollView
          ref={scrollViewRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {availableFilters.map((f) => {
            const isActive = filter === f;
            let label: string;
            if (f === 'all') {
              label = t('stats:cycleHistory.filterAll');
            } else if (f === 3) {
              label = t('stats:cycleHistory.filterLast3');
            } else if (f === 6) {
              label = t('stats:cycleHistory.filterLast6');
            } else {
              label = String(f);
            }
            return (
              <View
                key={String(f)}
                ref={(ref) => {
                  if (ref) {
                    filterRefs.current.set(String(f), ref);
                  } else {
                    filterRefs.current.delete(String(f));
                  }
                }}
                collapsable={false}
              >
                <Pressable
                  onPress={() => {
                    setFilter(f);
                    const filterView = filterRefs.current.get(String(f));
                    if (filterView && scrollViewRef.current) {
                      filterView.measureLayout(
                        scrollViewRef.current as any,
                        (x) => {
                          scrollViewRef.current?.scrollTo({ x: x - 16, animated: true });
                        },
                        () => {}
                      );
                    }
                  }}
                  style={[
                    styles.filterPill,
                    {
                      backgroundColor: isActive ? colors.primary : colors.surface,
                    },
                  ]}
                >
                  <Text
                    style={[
                      typography.caption,
                      { color: isActive ? '#fff' : colors.textPrimary },
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </ScrollView>
      )}

      <View
        style={[
          styles.cycleHistoryContainer,
          { backgroundColor: colors.surface },
          !showTitle && styles.cycleHistoryContainerStandalone,
        ]}
      >
        {filteredCycles.map((cycle, index) => {
          const isOngoingCycle = cycle.cycleLength === undefined && cycle.endDate === undefined;
          const cycleYear = parseLocalDate(cycle.startDate).getFullYear();
          const currentYear = new Date().getFullYear();
          const isCurrentCycle = isOngoingCycle;
          const showCurrentCycleLabel = isOngoingCycle && (
            filter === 'all' || 
            filter === 3 || 
            filter === 6 || 
            (typeof filter === 'number' && filter === currentYear)
          );
          const previousCycleYear =
            index > 0
              ? parseLocalDate(filteredCycles[index - 1].startDate).getFullYear()
              : null;
          const showYearHeader = index === 0 || cycleYear !== previousCycleYear;

          // Determine display values
          let displayCycleLength: string;
          let circleDays: number;

          if (isCurrentCycle) {
            const daysSoFar = PeriodPredictionService.getCurrentCycleDay(cycle.startDate);
            displayCycleLength = t('stats:cycleHistory.days', { count: daysSoFar });
            circleDays = daysSoFar;
          } else {
            circleDays = cycle.cycleLength ?? 28;
            displayCycleLength = t('stats:cycleHistory.days', { count: circleDays });
          }

          const formattedStartDate = formatDateShort(parseLocalDate(cycle.startDate));
          const endIsoForRow = cycle.endDate ?? cycleEndDateIso(cycle.startDate, circleDays);
          const formattedEndDate = formatDateShort(parseLocalDate(endIsoForRow));

          const handlePress = () => {
            const endDateISO = isCurrentCycle
              ? formatDateString(new Date())
              : (cycle.endDate ?? cycleEndDateIso(cycle.startDate, circleDays));

            router.push({
              pathname: '/cycle-details',
              params: {
                startDate: cycle.startDate,
                endDate: endDateISO,
                cycleLength: cycle.cycleLength ?? circleDays,
                periodLength: cycle.periodLength,
                isCurrentCycle: isCurrentCycle.toString(),
              },
            });
          };

          return (
            <React.Fragment key={cycle.startDate}>
              {!isCompact && showYearHeader && (
                <Text style={[typography.headingMd, {fontSize: 20}, styles.yearHeading]}>
                  {cycleYear}
                </Text>
              )}
              <Pressable
                onPress={handlePress}
                style={({ pressed }) => [
                  styles.cycleContainer,
                  { borderBottomColor: colors.border},
                  index === filteredCycles.length - 1 && {
                    borderBottomWidth: 0,
                    marginBottom: 0,
                  },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <View style={styles.cycleContent}>
                  <View style={styles.cycleInfoColumn}>
                    <Text style={[typography.bodyBold, {fontSize: 17, marginBottom: 4}]}>
                      {showCurrentCycleLabel
                        ? `${t('stats:cycleHistory.currentCycle')}: ${displayCycleLength}`
                        : displayCycleLength
                      }
                    </Text>
                    <Text style={[typography.labelSm, { color: colors.textSecondary, fontSize: 15}]}>
                      {isCurrentCycle
                        ? `${formattedStartDate} - ${t('common:time.today')}`
                        : `${formattedStartDate} - ${formattedEndDate}`
                      }
                    </Text>
                  </View>

                  <DayCircles
                    totalDays={circleDays}
                    periodDays={cycle.periodLength}
                    isLast={index === filteredCycles.length - 1}
                  />
                </View>

                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={colors.textSecondary}
                />
              </Pressable>
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cycleHistoryContainer: {
    padding: 16,
    paddingTop: 10,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  cycleHistoryContainerStandalone: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  headerContainer: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomWidth: 1,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 16,
    marginBottom: 24,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  yearHeading: {
    marginBottom: 10,
  },
  cycleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    marginBottom: 16,
  },
  cycleContent: {
    flex: 1,
  },
  cycleInfoColumn: {
    flexDirection: 'column',
    marginBottom: 8,
  },
  circleContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginBottom: 16,
    gap: 3,
  },
  circle: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});

export default CycleHistory;
