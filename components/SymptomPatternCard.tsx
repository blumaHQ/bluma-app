import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../styles/theme';
import { useAppStyles } from '../hooks/useStyles';
import { getDB, getSetting } from '../db';
import { healthLogs as healthLogsTable, periodDates } from '../db/schema';
import { PeriodPredictionService } from '../services/periodPredictions';
import { CustomIcon } from './icons/health';
import { InfoIcon } from './icons/general/info';
import { SYMPTOMS, MOODS } from '../constants/healthTracking';
import { computeSymptomPatterns } from '../utils/symptomPatternUtils';

const MAX_CARD_ITEMS = 4;
const ICON_SIZE = 44;

interface SymptomPatternCardProps {
  onLoad?: (hasPatterns: boolean) => void;
}

export function SymptomPatternCard({ onLoad }: SymptomPatternCardProps) {
  const { colors } = useTheme();
  const { typography } = useAppStyles();
  const { t } = useTranslation(['stats', 'health']);
  const [topItems, setTopItems] = useState<
    { itemId: string; type: 'symptom' | 'mood' }[]
  >([]);
  const [loaded, setLoaded] = useState(false);

  useFocusEffect(
    useCallback(() => {
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
          if (allDates.length === 0) return;

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

          const patterns = computeSymptomPatterns(
            allDates,
            logs,
            avgCycle,
            avgPeriod
          );

          const seen = new Set<string>();
          const top: { itemId: string; type: 'symptom' | 'mood' }[] = [];
          for (const p of patterns) {
            if (!seen.has(p.itemId)) {
              seen.add(p.itemId);
              top.push({ itemId: p.itemId, type: p.type });
              if (top.length === MAX_CARD_ITEMS) break;
            }
          }

          if (!cancelled) {
            setTopItems(top);
            setLoaded(true);
            onLoad?.(top.length > 0);
          }
        } catch (e) {
          console.error('Error loading symptom patterns:', e);
        }
      })();

      return () => {
        cancelled = true;
      };
    }, [onLoad])
  );

  const isEmpty = topItems.length === 0;

  if (!loaded) return null;

  const getIconName = (item: { itemId: string; type: 'symptom' | 'mood' }) => {
    const list = item.type === 'symptom' ? SYMPTOMS : MOODS;
    return list.find(i => i.id === item.itemId)?.icon ?? item.itemId;
  };

  if (isEmpty) {
    return (
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <View style={styles.header}>
          <Text style={typography.headingMd}>{t('stats:symptomPattern.title')}</Text>
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              router.push('/(info)/symptom-pattern-info');
            }}
            style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1, padding: 8 }]}
            hitSlop={10}
          >
            <InfoIcon size={24} color={colors.textSecondary} />
          </Pressable>
        </View>
        <Text style={[typography.body, { color: colors.textSecondary }]}>
          {t('stats:symptomPattern.noPatterns')}
        </Text>
        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            router.push('/health-tracking');
          }}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.logSymptomsButton,
            pressed && { opacity: 0.7 },
          ]}
          hitSlop={8}
        >
          <Ionicons name="add-circle" size={22} color={colors.primary} />
          <Text style={[typography.bodyBold, { color: colors.primary, marginLeft: 8 }]}>
            {t('stats:symptomPattern.logSymptomsButton')}
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <Pressable
      onPress={() => router.push('/symptom-pattern')}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.surface },
        pressed && { opacity: 0.7 },
      ]}
    >
      <View style={styles.header}>
        <Text style={typography.headingMd}>{t('stats:symptomPattern.title')}</Text>
        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
      </View>
      <Text style={[typography.body, { color: colors.textSecondary, marginBottom: 16 }]}>
        {t('stats:symptomPattern.subtitle')}
      </Text>
      <View style={styles.iconsRow}>
        {topItems.map(item => (
          <View key={item.itemId} style={styles.iconItem}>
            <CustomIcon name={getIconName(item) as any} size={ICON_SIZE} />
            <Text
              style={[
                typography.caption,
                {
                  color: colors.textSecondary,
                  textAlign: 'center',
                  marginTop: 4,
                  fontSize: 12,
                  lineHeight: 16,
                },
              ]}
            >
              {t(`health:${item.type === 'symptom' ? 'symptoms' : 'moods'}.${item.itemId}`)}
            </Text>
          </View>
        ))}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    marginBottom: 16,
    padding: 16,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  iconsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4.5,
  },
  iconItem: {
    width: '24%',
    alignItems: 'center',
    marginBottom: 4,
    paddingHorizontal: 6,
  },
  logSymptomsButton: {
    marginTop: 16,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
});
