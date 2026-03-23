import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { and, gte, lte } from 'drizzle-orm';
import dayjs from 'dayjs';
import { useTheme } from '../styles/theme';
import { useAppStyles } from '../hooks/useStyles';
import { formatDateShort } from '../utils/localeUtils';
import { getCycleStatus, getPeriodStatus } from '../utils/cycleUtils';
import { parseLocalDate } from '../utils/dateUtils';
import { InfoIcon } from '../components/icons/general/info';
import { CycleIcon } from '../components/icons/general/Cycle';
import { getDB } from '../db';
import { healthLogs } from '../db/schema';
import { PeriodPredictionService, CyclePhase } from '../services/periodPredictions';
import { CustomIcon } from '../components/icons/health';
import { SYMPTOMS, MOODS, FLOWS, DISCHARGES } from '../constants/healthTracking';

export default function CycleDetails() {
  const { colors } = useTheme();
  const { typography, commonStyles } = useAppStyles();
  const { t } = useTranslation(['stats', 'common', 'health', 'home']);
  const params = useLocalSearchParams();

  const startDate = params.startDate as string;
  const endDate = params.endDate as string;
  const cycleLength = parseInt(params.cycleLength as string, 10);
  const periodLength = parseInt(params.periodLength as string, 10);
  const isCurrentCycle = params.isCurrentCycle === 'true';

  const cycleStatus = getCycleStatus(cycleLength);
  const periodStatus = getPeriodStatus(periodLength);

  type PhaseItem = { item_id: string; type: string; count: number };
  const [phaseLogs, setPhaseLogs] = useState<Record<CyclePhase, PhaseItem[]>>({
    menstrual: [],
    follicular: [],
    ovulatory: [],
    luteal: [],
  });

  useEffect(() => {
    const load = async () => {
      try {
        const db = getDB();
        const queryEnd = isCurrentCycle ? dayjs().format('YYYY-MM-DD') : endDate;
        const logs = await db
          .select()
          .from(healthLogs)
          .where(and(gte(healthLogs.date, startDate), lte(healthLogs.date, queryEnd)));

        const countMap: Record<CyclePhase, Record<string, { type: string; count: number }>> = {
          menstrual: {},
          follicular: {},
          ovulatory: {},
          luteal: {},
        };

        for (const log of logs) {
          if (log.type === 'notes' || log.type === 'temperature') continue;
          const cycleDay = dayjs(log.date).diff(dayjs(startDate), 'days') + 1;
          const phase = PeriodPredictionService.getCyclePhase(cycleDay, cycleLength, periodLength);
          const key = `${log.type}:${log.item_id}`;
          if (!countMap[phase][key]) countMap[phase][key] = { type: log.type, count: 0 };
          countMap[phase][key].count++;
        }

        const result = {} as Record<CyclePhase, PhaseItem[]>;
        for (const phase of Object.keys(countMap) as CyclePhase[]) {
          result[phase] = Object.entries(countMap[phase])
            .map(([key, { type, count }]) => ({ item_id: key.split(':')[1], type, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 2);
        }
        setPhaseLogs(result);
      } catch (e) {
        console.error('Error loading phase logs:', e);
      }
    };
    load();
  }, [startDate, endDate, cycleLength, periodLength, isCurrentCycle]);

  const getItemIcon = (type: string, item_id: string) => {
    let iconName: string | undefined;
    if (type === 'symptom') iconName = SYMPTOMS.find(s => s.id === item_id)?.icon;
    else if (type === 'mood') iconName = MOODS.find(m => m.id === item_id)?.icon;
    else if (type === 'flow') iconName = FLOWS.find(f => f.id === item_id)?.icon;
    else if (type === 'discharge') iconName = DISCHARGES.find(d => d.id === item_id)?.icon;
    return <CustomIcon name={(iconName ?? 'im-okay') as any} size={28} />;
  };

  const getItemLabel = (type: string, item_id: string) => {
    if (type === 'symptom') return t(`health:symptoms.${item_id}`);
    if (type === 'mood') return t(`health:moods.${item_id}`);
    if (type === 'flow') return t(`health:flows.${item_id}`);
    if (type === 'discharge') return t(`health:discharge.${item_id}`);
    return item_id;
  };

  const PHASE_ORDER: CyclePhase[] = ['menstrual', 'follicular', 'ovulatory', 'luteal'];
  const phasesWithLogs = PHASE_ORDER.filter(p => phaseLogs[p].length > 0);

  const formattedStartDate = formatDateShort(parseLocalDate(startDate));
  const formattedEndDate = isCurrentCycle
    ? t('common:time.today')
    : formatDateShort(parseLocalDate(endDate));

  const handleInfoPress = (type: 'cycle' | 'period') => {
    if (type === 'cycle') {
      router.push('/(info)/cycle-length-info');
    } else {
      router.push('/(info)/period-length-info');
    }
  };

  return (
    <ScrollView
      style={[commonStyles.scrollView]}
      contentContainerStyle={commonStyles.scrollContentContainer}
      showsVerticalScrollIndicator={false}
    >
      {isCurrentCycle ? (
        <View style={[styles.headerCard, { backgroundColor: colors.surface }]}>
          <Text style={[typography.headingSm, { marginBottom: 4 }]}>
            {t('stats:cycleHistory.currentCycle')}: {cycleLength} {cycleLength === 1 ? t('common:time.day') : t('common:time.days')}
          </Text>
          <Text style={[typography.body, { color: colors.textSecondary}]}>
            {formattedStartDate} - {formattedEndDate}
          </Text>
          {cycleLength > 35 && (
            <View style={[styles.warningContainer, { backgroundColor: colors.warningLight }]}>
              <Ionicons name="alert-circle-outline" size={20} color={colors.warning} />
              <View style={{ flex: 1 }}>
                <Text style={[typography.body, { color: colors.textPrimary, marginBottom: 8 }]}>
                  {t('stats:cycleDetails.periodOverdueBefore')}
                  <Text style={[typography.body, { color: colors.textPrimary, fontWeight: '600' }]}>
                    {cycleLength - 35} {cycleLength - 35 === 1 ? t('common:time.day') : t('common:time.days')}
                  </Text>
                  {t('stats:cycleDetails.periodOverdueAfter')}
                </Text>
                <Pressable
                  onPress={() => router.push('/(info)/late-period-info')}
                  style={({ pressed }) => [
                    { opacity: pressed ? 0.6 : 1 }
                  ]}
                >
                  <Text style={[typography.body, { color: colors.primary, fontWeight: '600' }]}>
                    {t('stats:cycleDetails.learnAboutLatePeriod')}
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      ) : (
        <>
          <View style={[styles.headerCard, { backgroundColor: colors.surface }]}>
            <View style={styles.cycleHeaderRow}>
              <CycleIcon size={32} />
              <Text style={[typography.body, { flex: 1, marginLeft: 10 }]}>
                {t('stats:cycleDetails.cycleLastedBefore')}
                <Text style={typography.bodyBold}>{formattedStartDate}</Text>
                {t('stats:cycleDetails.cycleLastedMiddle')}
                <Text style={typography.bodyBold}>{formattedEndDate}</Text>
              </Text>
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.detailCard,
              { backgroundColor: colors.surface },
              pressed && styles.cardPressed,
            ]}
            onPress={() => handleInfoPress('cycle')}
          >
            <View style={styles.cardHeader}>
              <Text style={[typography.body, { color: colors.textSecondary, fontWeight: '500' }]}>
                {t('stats:cycleHistory.cycleLength')}
              </Text>
              <View style={styles.infoIcon}>
                <InfoIcon size={20} color={colors.textSecondary} />
              </View>
            </View>

            <View style={styles.valueStatusRow}>
              <Text style={[typography.headingLg, { lineHeight: 32}]}>
                {cycleLength} {cycleLength === 1 ? t('common:time.day') : t('common:time.days')}
              </Text>
              <View style={styles.statusContainer}>
                <Ionicons
                  name={cycleStatus.status === 'normal' ? 'checkmark-circle' : 'alert-circle'}
                  size={20}
                  color={cycleStatus.status === 'normal' ? colors.success : colors.warning}
                />
                <Text style={[typography.body, { color: colors.textSecondary }]}>
                  {cycleStatus.status === 'normal'
                    ? t('common:status.normal')
                    : t('common:status.irregular')}
                </Text>
              </View>
            </View>

            <Text style={[typography.body, { color: colors.textSecondary, marginTop: 8 }]}>
              {cycleStatus.status === 'normal'
                ? t('stats:cycleDetails.cycleNormalRange')
                : t('stats:cycleDetails.cycleIrregularRange')}
            </Text>
          </Pressable>
        </>
      )}

      {!isCurrentCycle && (
        <Pressable
          style={({ pressed }) => [
            styles.detailCard,
            { backgroundColor: colors.surface },
            pressed && styles.cardPressed,
          ]}
          onPress={() => handleInfoPress('period')}
        >
          <View style={styles.cardHeader}>
            <Text style={[typography.body, { color: colors.textSecondary, fontWeight: '500' }]}>
              {t('stats:cycleHistory.periodLength')}
            </Text>
            <View style={styles.infoIcon}>
              <InfoIcon size={20} color={colors.textSecondary} />
            </View>
          </View>

          <View style={styles.valueStatusRow}>
            <Text style={[typography.headingLg, { lineHeight: 32}]}>
              {periodLength} {periodLength === 1 ? t('common:time.day') : t('common:time.days')}
            </Text>
            <View style={styles.statusContainer}>
              <Ionicons
                name={periodStatus.status === 'normal' ? 'checkmark-circle' : 'alert-circle'}
                size={20}
                color={periodStatus.status === 'normal' ? colors.success : colors.warning}
              />
              <Text style={[typography.body, { color: colors.textSecondary }]}>
                {periodStatus.status === 'normal'
                  ? t('common:status.normal')
                  : t('common:status.irregular')}
              </Text>
            </View>
          </View>

          <Text style={[typography.body, { color: colors.textSecondary, marginTop: 8 }]}>
            {periodStatus.status === 'normal'
              ? t('stats:cycleDetails.periodNormalRange')
              : t('stats:cycleDetails.periodIrregularRange')}
          </Text>
        </Pressable>
      )}
      <View style={[styles.detailCard, { backgroundColor: colors.surface, padding: 0, overflow: 'hidden' }]}>
        <View style={[styles.sectionHeader, { borderBottomColor: colors.border }]}>
          <Text style={[typography.headingMd, { marginBottom: 4 }]}>
            {t('stats:symptomsLogged.title')}
          </Text>
          <Text style={[typography.body, { color: colors.textSecondary }]}>
            {t('stats:symptomsLogged.subtitle')}
          </Text>
        </View>

        <View style={styles.sectionContent}>
          {phasesWithLogs.length === 0 ? (
            <Text style={[typography.body, { color: colors.placeholder }]}>
              {t('stats:symptomsLogged.noLogs')}
            </Text>
          ) : (
            phasesWithLogs.map((phase, phaseIndex) => {
              const isLastPhase = phaseIndex === phasesWithLogs.length - 1;
              return (
              <View
                key={phase}
                style={[
                  styles.phaseSection,
                  {
                    borderBottomWidth: isLastPhase ? 0 : 1,
                    borderBottomColor: colors.border,
                    paddingBottom: isLastPhase ? 0 : 16,
                    marginBottom: isLastPhase ? 0 : 16,
                  },
                ]}
              >
                <Text style={[typography.bodyBold, { color: colors.textSecondary, fontSize: 17, fontWeight: '600', marginBottom: 12 }]}>
                  {t(`home:cycleInsights.${phase}`)}
                </Text>
                {phaseLogs[phase].map(item => (
                  <View key={`${item.type}:${item.item_id}`} style={styles.logRow}>
                    <View style={styles.logIcon}>{getItemIcon(item.type, item.item_id)}</View>
                    <Text style={[typography.body, { flex: 1 }]}>
                      {getItemLabel(item.type, item.item_id)}
                    </Text>
                    <Text style={[typography.bodyBold, { color: colors.textSecondary, fontSize: 17, letterSpacing: 0.45 }]}>
                      {item.count}
                    </Text>
                  </View>
                ))}
              </View>
              );
            })
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  headerCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  detailCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  sectionContent: {
    padding: 16,
    paddingTop: 16,
  },
  cardPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  infoIcon: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
  },
  cycleHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  phaseSection: {
    marginBottom: 16,
  },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  logIcon: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
});