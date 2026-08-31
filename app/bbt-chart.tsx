import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { and, eq, gte, lte } from 'drizzle-orm';
import dayjs from 'dayjs';
import { useTheme } from '../styles/theme';
import { useAppStyles } from '../hooks/useStyles';
import { useCycleHistory } from '../hooks/useCycleHistory';
import { getDB, getSetting } from '../db';
import { healthLogs } from '../db/schema';
import { parseTempUnit, type TempUnit } from '../contexts/TemperatureContext';
import { formatDateShort } from '../utils/localeUtils';
import {
  BbtLog,
  buildBbtChartModel,
  findCycleIndexForDate,
  getCycleDateRange,
  parseTemperatureLogs,
} from '../utils/bbtChartUtils';
import { BbtChart } from '../components/BbtChart';

export default function BbtChartScreen() {
  const { colors } = useTheme();
  const { typography, commonStyles, insets } = useAppStyles();
  const { t } = useTranslation('health');
  const params = useLocalSearchParams();
  const { cycles, hasNoPeriodData, isInitialLoad } = useCycleHistory();

  const dateParam =
    typeof params.date === 'string'
      ? params.date
      : dayjs().format('YYYY-MM-DD');
  const today = dayjs().format('YYYY-MM-DD');

  const [cycleIndex, setCycleIndex] = useState<number | null>(null);
  const didInitIndex = useRef(false);
  const [logs, setLogs] = useState<BbtLog[]>([]);
  const [unit, setUnit] = useState<TempUnit>('C');
  const [chartSize, setChartSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (didInitIndex.current || cycles.length === 0) return;
    setCycleIndex(findCycleIndexForDate(cycles, dateParam));
    didInitIndex.current = true;
  }, [cycles, dateParam]);

  const selectedCycle = cycleIndex !== null ? cycles[cycleIndex] : undefined;
  const range = useMemo(
    () => (selectedCycle ? getCycleDateRange(selectedCycle, today) : null),
    [selectedCycle, today]
  );
  const rangeStart = range?.startDate;
  const rangeEnd = range?.endDate;

  useFocusEffect(
    useCallback(() => {
      if (!rangeStart || !rangeEnd) {
        setLogs([]);
        return;
      }

      let cancelled = false;
      const load = async () => {
        try {
          const db = getDB();
          const [rows, savedUnit] = await Promise.all([
            db
              .select()
              .from(healthLogs)
              .where(
                and(
                  eq(healthLogs.type, 'temperature'),
                  gte(healthLogs.date, rangeStart),
                  lte(healthLogs.date, rangeEnd)
                )
              ),
            getSetting('temp_unit'),
          ]);
          if (cancelled) return;
          setUnit(parseTempUnit(savedUnit));
          setLogs(parseTemperatureLogs(rows));
        } catch (error) {
          console.error('Error loading temperature logs:', error);
        }
      };

      void load();
      return () => {
        cancelled = true;
      };
    }, [rangeStart, rangeEnd])
  );

  const model = useMemo(
    () =>
      range
        ? buildBbtChartModel(logs, range.startDate, range.endDate, unit)
        : null,
    [logs, range, unit]
  );

  const canGoOlder = cycleIndex !== null && cycleIndex < cycles.length - 1;
  const canGoNewer = cycleIndex !== null && cycleIndex > 0;

  if (isInitialLoad || (cycles.length > 0 && cycleIndex === null)) {
    return (
      <View
        style={[commonStyles.container, { backgroundColor: colors.background }]}
      />
    );
  }

  if (hasNoPeriodData || !range || !model) {
    return (
      <View style={commonStyles.container}>
        <Text
          style={[
            typography.body,
            styles.emptyText,
            { color: colors.textSecondary },
          ]}
        >
          {t('tracking.chartEmptyNoCycle')}
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[
        commonStyles.container,
        { paddingBottom: Math.max(insets.bottom, 16) },
      ]}
    >
      <View style={styles.cycleNavigator}>
        <Pressable
          onPress={() => setCycleIndex(index => (index ?? 0) + 1)}
          disabled={!canGoOlder}
          hitSlop={10}
          style={[styles.navButton, !canGoOlder && styles.navButtonDisabled]}
          accessibilityRole="button"
        >
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <View style={styles.cycleMeta}>
          <Text style={[typography.caption, { color: colors.textSecondary },{marginBottom: 8}]}>
            {t('tracking.chosenCycle')}
          </Text>
          <Text
            style={[typography.bodyBold, styles.cycleRange]}
            numberOfLines={1}
          >
            {`${formatDateShort(range.startDate)} — ${formatDateShort(range.endDate)}`}
          </Text>
        </View>
        <Pressable
          onPress={() => setCycleIndex(index => (index ?? 0) - 1)}
          disabled={!canGoNewer}
          hitSlop={10}
          style={[styles.navButton, !canGoNewer && styles.navButtonDisabled]}
          accessibilityRole="button"
        >
          <Ionicons
            name="chevron-forward"
            size={24}
            color={colors.textPrimary}
          />
        </Pressable>
      </View>

      <View style={[commonStyles.sectionContainer, styles.chartCard]}>
        {model.points.length === 0 ? (
          <View style={styles.emptyChart}>
            <Text style={[typography.body, { color: colors.textSecondary }]}>
              {t('tracking.chartEmpty')}
            </Text>
          </View>
        ) : (
          <View
            style={styles.chartWrap}
            onLayout={event => {
              const { width, height } = event.nativeEvent.layout;
              const next = {
                width: Math.round(width),
                height: Math.round(height),
              };
              setChartSize(size =>
                size.width === next.width && size.height === next.height
                  ? size
                  : next
              );
            }}
          >
            <BbtChart
              model={model}
              width={chartSize.width}
              height={chartSize.height}
              lineColor={colors.primary}
              gridColor={colors.neutral150}
              labelColor={colors.textSecondary}
            />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cycleNavigator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  navButton: {
    padding: 10,
  },
  cycleMeta: {
    flex: 1,
    alignItems: 'center',
  },
  cycleRange: {
    fontSize: 16,
    textAlign: 'center',
  },
  navButtonDisabled: {
    opacity: 0.38,
  },
  emptyChart: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  chartCard: {
    flex: 1,
    marginBottom: 0,
  },
  chartWrap: {
    flex: 1,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 48,
    paddingHorizontal: 16,
  },
});
