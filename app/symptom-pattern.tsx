import React, { useEffect, useLayoutEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { router } from 'expo-router';
import { useTheme } from '../styles/theme';
import { useAppStyles } from '../hooks/useStyles';
import { getDB, getSetting } from '../db';
import { healthLogs as healthLogsTable, periodDates } from '../db/schema';
import { PeriodPredictionService, CyclePhase } from '../services/periodPredictions';
import { CustomIcon } from '../components/icons/health';
import { InfoIcon } from '../components/icons/general/info';
import { SYMPTOMS, MOODS } from '../constants/healthTracking';
import {
  computeSymptomPatterns,
  SymptomPattern,
  PHASE_ORDER,
} from '../utils/symptomPatternUtils';

export default function SymptomPatternScreen() {
  const { colors } = useTheme();
  const { typography, commonStyles } = useAppStyles();
  const { t } = useTranslation(['stats', 'health']);
  const [patterns, setPatterns] = useState<SymptomPattern[]>([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          onPress={() => router.push('/(info)/symptom-pattern-info')}
          style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1, padding: 10 }]}
          hitSlop={10}
        >
          <InfoIcon size={24} color={colors.textSecondary} />
        </Pressable>
      ),
    });
  }, [colors.textSecondary, navigation]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const db = getDB();
        const [savedDates, logs] = await Promise.all([
          db.select().from(periodDates),
          db.select().from(healthLogsTable),
        ]);

        if (cancelled) return;

        const allDates = savedDates.map(s => s.date);
        const [cycleLengthStr, periodLengthStr] = await Promise.all([
          getSetting('userCycleLength'),
          getSetting('userPeriodLength'),
        ]);

        if (cancelled) return;

        const avgCycle = PeriodPredictionService.getAverageCycleLength(
          allDates,
          parseInt(cycleLengthStr || '28', 10)
        );
        const avgPeriod = PeriodPredictionService.getAveragePeriodLength(
          PeriodPredictionService.groupDateIntoPeriods(allDates),
          parseInt(periodLengthStr || '5', 10)
        );

        const result = computeSymptomPatterns(allDates, logs, avgCycle, avgPeriod);

        if (!cancelled) {
          setPatterns(result);
          setLoading(false);
        }
      } catch (e) {
        console.error('Error loading symptom patterns:', e);
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const getIconName = (type: 'symptom' | 'mood', itemId: string) => {
    const list = type === 'symptom' ? SYMPTOMS : MOODS;
    return list.find(i => i.id === itemId)?.icon ?? itemId;
  };

  const getItemLabel = (type: 'symptom' | 'mood', itemId: string) =>
    t(`health:${type === 'symptom' ? 'symptoms' : 'moods'}.${itemId}`);

  const byPhase = PHASE_ORDER.reduce<Record<CyclePhase, SymptomPattern[]>>(
    (acc, phase) => {
      acc[phase] = patterns.filter(p => p.phase === phase);
      return acc;
    },
    {} as Record<CyclePhase, SymptomPattern[]>
  );

  const phasesWithPatterns = PHASE_ORDER.filter(phase => byPhase[phase].length > 0);

  if (loading) return <View style={[commonStyles.container, { backgroundColor: colors.background }]} />;

  return (
    <ScrollView
      style={commonStyles.scrollView}
      contentContainerStyle={commonStyles.scrollContentContainer}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[typography.body, { color: colors.textSecondary, marginBottom: 20 }]}>
        {t('stats:symptomPattern.detailSubtitle')}
      </Text>

      {phasesWithPatterns.length === 0 ? (
        <Text style={[typography.body, { color: colors.placeholder }]}>
          {t('stats:symptomPattern.noPatterns')}
        </Text>
      ) : (
        phasesWithPatterns.map(phase => (
          <View key={phase} style={[styles.phaseCard, { backgroundColor: colors.surface }]}>
            <Text style={[typography.bodyBold, styles.phaseTitle]}>
              {t(`stats:symptomPattern.phases.${phase}`)}
            </Text>

            {byPhase[phase].map((pattern, index) => {
              return (
                <View
                  key={`${pattern.itemId}:${pattern.phase}`}
                  style={styles.patternRow}
                >
                  <CustomIcon
                    name={getIconName(pattern.type, pattern.itemId) as any}
                    size={28}
                  />
                  <Text style={[typography.body, styles.patternName]}>
                    {getItemLabel(pattern.type, pattern.itemId)}
                  </Text>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>
                    {t('stats:symptomPattern.cyclesCount', {
                      logCount: pattern.logCount,
                      count: pattern.count,
                    })}
                  </Text>
                </View>
              );
            })}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  phaseCard: {
    borderRadius: 14,
    marginBottom: 16,
    overflow: 'hidden',
    padding: 16,
  },
  phaseTitle: {
    marginBottom: 8,
  },
  patternRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  patternName: {
    flex: 1,
  },
});
