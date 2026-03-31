import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
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

type CycleFilter = 'all' | 3 | 6;

const FILTERS: CycleFilter[] = ['all', 3, 6];

export function CycleHistory({ cycles, maxItems, showTitle = true }: CycleHistoryProps) {
  const { colors } = useTheme();
  const { typography, commonStyles } = useAppStyles();
  const { t } = useTranslation(['stats', 'common']);
  const [filter, setFilter] = useState<CycleFilter>('all');

  const isCompact = maxItems !== undefined;
  const showSeeAll = isCompact && cycles.length > maxItems!;

  const availableFilters = FILTERS.filter((f) => {
    if (f === 'all') return true;
    if (f === 3) return cycles.length > 3;
    return cycles.length >= 6;
  });
  const filteredCycles = useMemo(() => {
    if (isCompact) {
      return cycles.slice(0, maxItems);
    }
    return filter === 'all' ? cycles : cycles.slice(0, filter);
  }, [cycles, filter, isCompact, maxItems]);

  if (cycles.length === 0) {
    return null;
  }

  return (
    <View>
      <View style={[styles.headerContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border}]}>
        {showTitle && (
          <View style={styles.headerTopRow}>
            <Text
              style={[
                typography.headingMd,
                commonStyles.sectionTitleContainer,
                { marginBottom: 0}
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
        )}

        {!isCompact && availableFilters.length > 1 && (
          <View style={styles.filterRow}>
            {availableFilters.map((f) => {
              const isActive = filter === f;
              const label =
                f === 'all'
                  ? t('stats:cycleHistory.filterAll')
                  : f === 3
                    ? t('stats:cycleHistory.filterLast3')
                    : t('stats:cycleHistory.filterLast6');
              return (
                <Pressable
                  key={String(f)}
                  onPress={() => setFilter(f)}
                  style={[
                    styles.filterPill,
                    {
                      backgroundColor: isActive ? colors.primary : colors.surfaceVariant,
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
              );
            })}
          </View>
        )}
      </View>

      <View style={[styles.cycleHistoryContainer, { backgroundColor: colors.surface}]}>
        {filteredCycles.map((cycle, index) => {
          const isCurrentCycle = index === 0;
          const cycleYear = parseLocalDate(cycle.startDate).getFullYear();
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
                      {isCurrentCycle
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
  },
  filterPill: {
    paddingHorizontal: 16,
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
