import React, { useMemo, useState, useEffect } from 'react';
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
import { CustomIcon } from '../components/icons/health';
import { NoteIcon } from '../components/icons/health/Note';
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

  type DayLog = {
    date: string;
    items: { type: string; item_id: string }[];
    note: string | null;
  };
  const [logsByDate, setLogsByDate] = useState<DayLog[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const db = getDB();
        const queryEnd = isCurrentCycle ? dayjs().format('YYYY-MM-DD') : endDate;
        const logs = await db
          .select()
          .from(healthLogs)
          .where(and(gte(healthLogs.date, startDate), lte(healthLogs.date, queryEnd)));

        const map: Record<
          string,
          { items: { type: string; item_id: string }[]; note: string | null }
        > = {};
        for (const log of logs) {
          if (log.type === 'temperature') continue;
          if (!map[log.date]) map[log.date] = { items: [], note: null };
          if (log.type === 'notes') {
            map[log.date].note = log.name ?? null;
          } else {
            map[log.date].items.push({ type: log.type, item_id: log.item_id });
          }
        }

        const result = Object.entries(map)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, { items, note }]) => ({ date, items, note }));

        if (!cancelled) setLogsByDate(result);
      } catch (e) {
        console.error('Error loading health logs:', e);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [startDate, endDate, isCurrentCycle]);

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

  type CategoryType = 'flow' | 'symptom' | 'mood' | 'discharge';

  const categoryMeta: Record<CategoryType, { label: string; iconItemId: string }> = useMemo(
    () => ({
      flow: { label: t('health:flows.title'), iconItemId: 'medium' },
      symptom: { label: t('health:tracking.symptoms'), iconItemId: 'headache' },
      mood: { label: t('health:tracking.moods'), iconItemId: 'happy' },
      discharge: { label: t('health:discharge.title'), iconItemId: 'watery' },
    }),
    [t]
  );

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
              <Text style={[typography.body, { color: colors.textPrimary }]}>
                {t('stats:cycleHistory.cycleLength')}
              </Text>
              <View style={styles.infoIcon}>
                <InfoIcon size={20} color={colors.textSecondary} />
              </View>
            </View>

            <View style={styles.valueStatusRow}>
              <Text style={typography.headingMd}>
                {cycleLength} {cycleLength === 1 ? t('common:time.day') : t('common:time.days')}
              </Text>
              <View style={styles.statusContainer}>
                <Ionicons
                  name={cycleStatus.status === 'normal' ? 'checkmark-circle' : 'alert-circle'}
                  size={20}
                  color={cycleStatus.status === 'normal' ? colors.success : colors.warning}
                />
                <Text style={[typography.caption, { color: colors.textSecondary }]}>
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
            <Text style={[typography.body, { color: colors.textPrimary }]}>
              {t('stats:cycleHistory.periodLength')}
            </Text>
            <View style={styles.infoIcon}>
              <InfoIcon size={20} color={colors.textSecondary} />
            </View>
          </View>

          <View style={styles.valueStatusRow}>
            <Text style={typography.headingMd}>
              {periodLength} {periodLength === 1 ? t('common:time.day') : t('common:time.days')}
            </Text>
            <View style={styles.statusContainer}>
              <Ionicons
                name={periodStatus.status === 'normal' ? 'checkmark-circle' : 'alert-circle'}
                size={20}
                color={periodStatus.status === 'normal' ? colors.success : colors.warning}
              />
              <Text style={[typography.caption, { color: colors.textSecondary }]}>
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
          <Text style={[typography.headingMd]}>
            {t('stats:symptomsLogged.title')}
          </Text>
        </View>

        <View style={styles.sectionContent}>
          {logsByDate.length === 0 ? (
            <Text style={[typography.body, { color: colors.placeholder }]}>
              {t('stats:symptomsLogged.noLogs')}
            </Text>
          ) : (
            logsByDate.map((dayLog, index) => {
              const isLast = index === logsByDate.length - 1;

              const itemsByType = dayLog.items.reduce<Record<string, string[]>>(
                (acc, item) => {
                  if (!acc[item.type]) acc[item.type] = [];
                  acc[item.type].push(item.item_id);
                  return acc;
                },
                {}
              );

              const flowIds = itemsByType.flow ?? [];
              const symptomIds = itemsByType.symptom ?? [];
              const moodIds = itemsByType.mood ?? [];
              const dischargeIds = itemsByType.discharge ?? [];
              const dischargeId =
                dischargeIds.length > 0 ? dischargeIds[dischargeIds.length - 1] : null;

              const rows: {
                type: CategoryType;
                label: string;
                iconItemId: string;
                ids: string[];
              }[] = [];

              if (flowIds.length > 0) {
                rows.push({
                  type: 'flow',
                  label: categoryMeta.flow.label,
                  iconItemId: categoryMeta.flow.iconItemId,
                  ids: flowIds,
                });
              }

              if (symptomIds.length > 0) {
                rows.push({
                  type: 'symptom',
                  label: categoryMeta.symptom.label,
                  iconItemId: categoryMeta.symptom.iconItemId,
                  ids: symptomIds,
                });
              }

              if (moodIds.length > 0) {
                rows.push({
                  type: 'mood',
                  label: categoryMeta.mood.label,
                  iconItemId: categoryMeta.mood.iconItemId,
                  ids: moodIds,
                });
              }

              if (dischargeId) {
                rows.push({
                  type: 'discharge',
                  label: categoryMeta.discharge.label,
                  iconItemId: categoryMeta.discharge.iconItemId,
                  ids: [dischargeId],
                });
              }

              if (rows.length === 0 && !dayLog.note) return null;

              return (
                <View
                  key={dayLog.date}
                  style={[
                    styles.dateSection,
                    {
                      borderBottomWidth: isLast ? 0 : 1,
                      borderBottomColor: colors.border,
                      paddingBottom: isLast ? 0 : 8,
                      marginBottom: isLast ? 0 : 16,
                    },
                  ]}
                >
                  <Text style={[typography.bodyXl, { marginBottom: 12, fontWeight: '600'}]}>
                    {formatDateShort(parseLocalDate(dayLog.date))}
                  </Text>
                  {rows.map(row => (
                    <View key={row.type} style={styles.categoryRow}>
                      <View style={styles.categoryLabelWrap}>
                        <View style={styles.categoryLabelIcon}>
                          {getItemIcon(row.type, row.iconItemId)}
                        </View>
                        <Text style={[typography.bodyBold, styles.categoryLabelText]}>
                          {row.label}:
                        </Text>
                      </View>
                      <View style={styles.chipsContainer}>
                        {row.ids.map((id, i) => (
                          <View key={`${row.type}:${id}:${i}`} style={[styles.chip, { borderColor: colors.neutral250 }]}>
                            <Text style={[typography.caption, styles.chipText]}>
                              {getItemLabel(row.type, id)}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  ))}
                  {dayLog.note && (
                    <View style={[styles.categoryRow, styles.noteRow]}>
                      <View style={styles.categoryLabelWrap}>
                        <View style={styles.categoryLabelIcon}>
                          <NoteIcon size={24} color={colors.textSecondary} />
                        </View>
                        <Text style={[typography.bodyBold, styles.categoryLabelText]}>
                          {t('health:tracking.notes')}:
                        </Text>
                      </View>
                      <View style={styles.noteContainer}>
                        <Text style={[typography.body, { color: colors.textSecondary }]}>
                          {dayLog.note}
                        </Text>
                      </View>
                    </View>
                  )}
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
    marginBottom: 2,
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
  dateSection: {
    marginBottom: 8,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 6,
  },
  categoryLabelWrap: {
    minWidth: 120,
    maxWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    paddingTop: 2,
  },
  categoryLabelText: {
    flexShrink: 1,
  },
  categoryLabelIcon: {
    width: 20,
    height: 20,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipsContainer: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: {
    lineHeight: 18,
  },
  noteContainer: {
    flex: 1,
    marginTop: 3,
  },
  noteRow: {
    alignItems: 'center',
  },
});