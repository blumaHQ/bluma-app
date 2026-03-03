import React, { useState, useCallback, memo, useMemo } from 'react';
import {
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextStyle,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { router, useFocusEffect } from 'expo-router';
import { getDB, getSetting } from '../db';
import { parseTempUnit } from '../contexts/TemperatureContext';
import { healthLogs } from '../db/schema';
import { eq } from 'drizzle-orm';
import { useTheme } from '../styles/theme';
import { useAppStyles } from '../hooks/useStyles';
import dayjs from 'dayjs';
import { CustomIcon } from './icons/health';
import { NoteIcon } from './icons/health/Note';
import { TemperatureIcon } from './icons/health/Temperature';
import { SYMPTOMS, MOODS, FLOWS, DISCHARGES } from '../constants/healthTracking';
import { FAB } from './FAB';

type QuickHealthSelectorProps = {
  selectedDate?: string;
  titleStyle?: TextStyle;
};

export const QuickHealthSelector = ({
  selectedDate,
  titleStyle,
}: QuickHealthSelectorProps) => {
  const { colors } = useTheme();
  const { typography } = useAppStyles();
  const { t } = useTranslation('health');
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

  const getIconComponent = (log: any) => {
    const { item_id, type } = log;

    if (type === 'notes') {
      return <NoteIcon size={54} />;
    }

    if (type === 'temperature') {
      return <TemperatureIcon size={54} />;
    }

    let iconName: string | undefined;

    if (type === 'symptom') {
      iconName = SYMPTOMS.find(s => s.id === item_id)?.icon;
    } else if (type === 'mood') {
      iconName = MOODS.find(m => m.id === item_id)?.icon;
    } else if (type === 'flow') {
      iconName = FLOWS.find(f => f.id === item_id)?.icon;
    } else if (type === 'discharge') {
      iconName = DISCHARGES.find(d => d.id === item_id)?.icon;
    }

    if (iconName) {
      return <CustomIcon name={iconName as any} size={54} />;
    }

    return <CustomIcon name="im-okay" size={54} />;
  };

  const getDisplayText = (log: any) => {
    const { type, item_id } = log;

    if (type === 'notes') {
      return t('quickHealthSelector.note');
    }

    if (type === 'temperature') {
      const celsius = parseFloat(log.name || '');
      if (isNaN(celsius)) return t('tracking.basalTemperature');
      return tempUnit === 'F'
        ? `${(Math.round((celsius * 9 / 5 + 32) * 10) / 10).toFixed(1)} °F`
        : `${celsius.toFixed(1)} °C`;
    }

    if (type === 'symptom') {
      return t(`symptoms.${item_id}`);
    } else if (type === 'mood') {
      return t(`moods.${item_id}`);
    } else if (type === 'flow') {
      return t(`flows.${item_id}`);
    } else if (type === 'discharge') {
      return t(`discharge.${item_id}`);
    }

    return item_id;
  };

  const formatDisplayText = (log: any) => {
    return getDisplayText(log);
  };

  // Memoized component for individual health log items
  const HealthLogItem = memo(({ log, selectedDate }: { log: any; selectedDate?: string }) => {
    const icon = useMemo(() => getIconComponent(log), [log]);
    const text = useMemo(() => formatDisplayText(log), [log]);

    return (
      <TouchableOpacity
        key={`${log.type}_${log.item_id}`}
        style={styles.itemContainer}
        onPress={() => {
          const params: any = {};
          if (selectedDate) {
            params.date = selectedDate;
          }
          
          if (log.type === 'notes') {
            params.scrollTo = 'notes';
          } else if (log.type === 'symptom') {
            params.scrollTo = 'symptoms';
          } else if (log.type === 'mood') {
            params.scrollTo = 'moods';
          } else if (log.type === 'discharge') {
            params.scrollTo = 'discharge';
          } else if (log.type === 'flow') {
            params.scrollTo = 'flow';
          } else if (log.type === 'temperature') {
            params.scrollTo = 'temperature';
          }

          router.push({
            pathname: '/health-tracking',
            params,
          });
        }}
        activeOpacity={0.7}
      >
        <View style={styles.itemIconContainer}>
          {icon}
        </View>
        <Text
          style={[
            {
              fontSize: 12,
              textAlign: 'center',
              color: colors.textSecondary,
            },
          ]}
          numberOfLines={2}
        >
          {text}
        </Text>
      </TouchableOpacity>
    );
  });

  HealthLogItem.displayName = 'HealthLogItem';

  if (healthLogsForDate.length === 0) {
    return (
      <TouchableOpacity
        style={styles.container}
        onPress={() =>
          router.push(
            selectedDate
              ? `/health-tracking?date=${selectedDate}`
              : '/health-tracking'
          )
        }
        activeOpacity={0.7}
      >
        <View pointerEvents="none">
          <FAB
            onPress={() => {}}
            containerStyle={styles.fabContainer}
            label={t('quickHealthSelector.add')}
          />
        </View>
        <Text style={[typography.caption, { color: colors.placeholder, flex: 1, alignSelf: 'center' }]}>
          {selectedDate && selectedDate !== dayjs().format('YYYY-MM-DD')
            ? t('quickHealthSelector.noSymptomsThisDate')
            : t('quickHealthSelector.noSymptomsToday')}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      {/* Fixed FAB - always visible */}
      <FAB
        onPress={() =>
          router.push(
            selectedDate
              ? `/health-tracking?date=${selectedDate}`
              : '/health-tracking'
          )
        }
        containerStyle={styles.fabContainer}
        label={t('quickHealthSelector.add')}
      />
      
      {/* Scrollable content */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
      >
        {healthLogsForDate.map(log => (
          <HealthLogItem key={`${log.type}_${log.item_id}`} log={log} selectedDate={selectedDate} />
        ))}
      </ScrollView>
    </View>
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

export default QuickHealthSelector;
