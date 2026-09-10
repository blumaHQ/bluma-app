import React, { useState, useCallback, memo, useMemo } from 'react';
import {
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Gesture, GestureDetector, ScrollView } from 'react-native-gesture-handler';
import { useTranslation } from 'react-i18next';
import { router, useFocusEffect } from 'expo-router';
import { getDB, getSetting } from '../db';
import { parseTempUnit } from '../contexts/TemperatureContext';
import { formatTemperature } from '../utils/temperatureUtils';
import { healthLogs } from '../db/schema';
import { eq } from 'drizzle-orm';
import { useTheme } from '../styles/theme';
import { useAppStyles } from '../hooks/useStyles';
import dayjs from 'dayjs';
import { CustomIcon } from './icons/health';
import { NoteIcon } from './icons/health/Note';
import { TemperatureIcon } from './icons/health/Temperature';
import {
  SYMPTOMS,
  MOODS,
  FLOWS,
  DISCHARGES,
  SEX,
} from '../constants/healthTracking';
import { FAB } from './FAB';

const getIconComponent = (log: any) => {
  const { item_id, type } = log;

  if (type === 'notes') return <NoteIcon size={54} />;
  if (type === 'temperature') return <TemperatureIcon size={54} />;

  let iconName: string | undefined;
  if (type === 'symptom') iconName = SYMPTOMS.find(s => s.id === item_id)?.icon;
  else if (type === 'mood') iconName = MOODS.find(m => m.id === item_id)?.icon;
  else if (type === 'flow') iconName = FLOWS.find(f => f.id === item_id)?.icon;
  else if (type === 'discharge')
    iconName = DISCHARGES.find(d => d.id === item_id)?.icon;
  else if (type === 'sex') iconName = SEX.find(s => s.id === item_id)?.icon;

  return <CustomIcon name={(iconName ?? 'im-okay') as any} size={54} />;
};

const getDisplayText = (
  log: any,
  tempUnit: 'C' | 'F',
  t: (key: string) => string
) => {
  const { type, item_id } = log;

  if (type === 'notes') return t('healthLogPreview.note');

  if (type === 'temperature') {
    const celsius = parseFloat(log.name || '');
    if (isNaN(celsius)) return t('tracking.basalTemperature');
    return `${formatTemperature(celsius, tempUnit)} °${tempUnit}`;
  }

  if (type === 'symptom') return t(`symptoms.${item_id}`);
  if (type === 'mood') return t(`moods.${item_id}`);
  if (type === 'flow') return t(`flows.${item_id}`);
  if (type === 'discharge') return t(`discharge.${item_id}`);
  if (type === 'sex') return t(`sex.${item_id}`);

  return item_id;
};

type HealthLogItemProps = {
  log: any;
  selectedDate?: string;
  tempUnit: 'C' | 'F';
  textColor: string;
  t: (key: string) => string;
};

const HealthLogItem = memo(
  ({ log, selectedDate, tempUnit, textColor, t }: HealthLogItemProps) => {
    const icon = useMemo(() => getIconComponent(log), [log]);
    const text = useMemo(
      () => getDisplayText(log, tempUnit, t),
      [log, tempUnit, t]
    );

    return (
      <TouchableOpacity
        style={styles.itemContainer}
        onPress={() => {
          const params: any = {};
          if (selectedDate) params.date = selectedDate;

          if (log.type === 'notes') params.scrollTo = 'notes';
          else if (log.type === 'symptom') params.scrollTo = 'symptoms';
          else if (log.type === 'mood') params.scrollTo = 'moods';
          else if (log.type === 'discharge') params.scrollTo = 'discharge';
          else if (log.type === 'sex') params.scrollTo = 'sex';
          else if (log.type === 'flow') params.scrollTo = 'flow';
          else if (log.type === 'temperature') params.scrollTo = 'temperature';

          router.push({ pathname: '/health-tracking', params });
        }}
        activeOpacity={0.7}
      >
        <View style={styles.itemIconContainer}>{icon}</View>
        <Text
          style={{ fontSize: 12, textAlign: 'center', color: textColor }}
          numberOfLines={2}
        >
          {text}
        </Text>
      </TouchableOpacity>
    );
  }
);

HealthLogItem.displayName = 'HealthLogItem';

const healthTrackingHref = (selectedDate?: string) =>
  selectedDate ? `/health-tracking?date=${selectedDate}` : '/health-tracking';

type HealthLogPreviewProps = {
  selectedDate?: string;
  isInSheet?: boolean;
};

export const HealthLogPreview = ({
  selectedDate,
  isInSheet = false,
}: HealthLogPreviewProps) => {
  const { colors } = useTheme();
  const { typography } = useAppStyles();
  const { t } = useTranslation('health');
  const stripNativeGesture = useMemo(() => {
    if (!isInSheet) {
      return null;
    }

    return Gesture.Native()
      .shouldActivateOnStart(true)
      .disallowInterruption(true)
      .cancelsTouchesInView(false);
  }, [isInSheet]);
  const [healthLogsForDate, setHealthLogsForDate] = useState<any[]>([]);
  const [tempUnit, setTempUnit] = useState<'C' | 'F'>('C');

  // Load health logs when component is focused or selectedDate changes
  useFocusEffect(
    useCallback(() => {
      const loadHealthLogs = async () => {
        try {
          const db = getDB();
          // Use the selected date or default to today
          const dateToUse = selectedDate || dayjs().format('YYYY-MM-DD');
          const logs = await db
            .select()
            .from(healthLogs)
            .where(eq(healthLogs.date, dateToUse));

          const savedUnit = parseTempUnit(await getSetting('temp_unit'));
          setTempUnit(savedUnit);
          setHealthLogsForDate(logs);
        } catch (error) {
          console.error('Error loading health logs:', error);
        }
      };

      loadHealthLogs();
    }, [selectedDate])
  );

  if (healthLogsForDate.length === 0) {
    return (
      <TouchableOpacity
        style={styles.container}
        onPress={() => router.push(healthTrackingHref(selectedDate))}
        activeOpacity={0.7}
      >
        <View pointerEvents="none">
          <FAB
            onPress={() => {}}
            containerStyle={styles.fabContainer}
            label={t('healthLogPreview.add')}
          />
        </View>
        <Text
          style={[
            typography.caption,
            {
              color: colors.textSecondary,
              fontSize: 15,
              flex: 1,
              alignSelf: 'center',
            },
          ]}
        >
          {selectedDate && selectedDate !== dayjs().format('YYYY-MM-DD')
            ? t('healthLogPreview.noSymptomsThisDate')
            : t('healthLogPreview.noSymptomsToday')}
        </Text>
      </TouchableOpacity>
    );
  }

  const strip = (
    <View style={styles.container} collapsable={false}>
      <FAB
        onPress={() => router.push(healthTrackingHref(selectedDate))}
        containerStyle={styles.fabContainer}
        label={t('healthLogPreview.add')}
      />

      <ScrollView
        horizontal
        nestedScrollEnabled
        directionalLockEnabled
        showsHorizontalScrollIndicator={false}
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
      >
        {healthLogsForDate.map(log => (
          <HealthLogItem
            key={`${log.type}_${log.item_id}`}
            log={log}
            selectedDate={selectedDate}
            tempUnit={tempUnit}
            textColor={colors.textSecondary}
            t={t}
          />
        ))}
      </ScrollView>
    </View>
  );

  if (!stripNativeGesture) {
    return strip;
  }

  return (
    <GestureDetector gesture={stripNativeGesture}>{strip}</GestureDetector>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingRight: 16,
  },
  itemContainer: {
    alignItems: 'center',
    width: 80,
    paddingHorizontal: 6,
  },
  fabContainer: {
    alignSelf: 'flex-start',
    width: 54,
  },
  itemIconContainer: {
    width: 54,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
});
