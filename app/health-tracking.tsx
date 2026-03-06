import { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Button } from '../components/Button';
import { router, useLocalSearchParams } from 'expo-router';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import { getDB, getSetting } from '../db';
import { healthLogs, periodDates } from '../db/schema';
import { and, eq } from 'drizzle-orm';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../styles/theme';
import { useAppStyles } from '../hooks/useStyles';
import { useNotes } from '../contexts/NotesContext';
import { useTemperature, parseTempUnit } from '../contexts/TemperatureContext';
import { useAuth } from '../contexts/AuthContext';
import Toast from 'react-native-toast-message';
import { formatTodayOrDate } from '../utils/localeUtils';
import { toFahrenheit } from '../utils/temperatureUtils';
import { useTranslation } from 'react-i18next';
import {
  SYMPTOMS,
  MOODS,
  FLOWS,
  DISCHARGES,
  SELECTION_COLORS,
} from '../constants/healthTracking';
import { HealthItemGrid } from '../components/HealthItemGrid';
import { DateNavigator } from '../components/DateNavigator';
import { DeleteIcon } from '../components/icons/general/delete';
import { EditIcon } from '../components/icons/general/edit';
import { PlusIcon } from '../components/icons/general/plus';

dayjs.extend(isoWeek);

export default function HealthTracking() {
  const { colors } = useTheme();
  const { typography, commonStyles, scrollContentContainerWithSafeArea, insets } = useAppStyles();
  const { t } = useTranslation(['common', 'health']);
  const params = useLocalSearchParams();
  const { notes, setNotes } = useNotes();
  const { tempCelsius, setTempCelsius, tempUnit, setTempUnit } = useTemperature();
  const { isLocked } = useAuth();
  const ICON_SIZE = 50;

  const [selectedDate, setSelectedDate] = useState<string>(
    typeof params.date === 'string' ? params.date : dayjs().format('YYYY-MM-DD')
  );

  const [selectedSymptoms, setSelectedSymptoms] = useState<Set<string>>(
    new Set()
  );
  const [selectedMoods, setSelectedMoods] = useState<Set<string>>(new Set());
  const [selectedFlows, setSelectedFlows] = useState<Set<string>>(new Set());
  const [selectedDischarges, setSelectedDischarges] = useState<Set<string>>(
    new Set()
  );

  const [originalSymptoms, setOriginalSymptoms] = useState<Set<string>>(
    new Set()
  );
  const [originalMoods, setOriginalMoods] = useState<Set<string>>(new Set());
  const [originalFlows, setOriginalFlows] = useState<Set<string>>(new Set());
  const [originalDischarges, setOriginalDischarges] = useState<Set<string>>(
    new Set()
  );
  const [originalNotes, setOriginalNotes] = useState<string>('');
  const [originalTemp, setOriginalTemp] = useState<string>('');
  const [hasChanges, setHasChanges] = useState<boolean>(false);

  const [isPeriodDate, setIsPeriodDate] = useState<boolean>(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const flowSectionRef = useRef<View>(null);
  const symptomsSectionRef = useRef<View>(null);
  const moodsSectionRef = useRef<View>(null);
  const dischargeSectionRef = useRef<View>(null);
  const tempSectionRef = useRef<View>(null);
  const notesSectionRef = useRef<View>(null);

  // Update header title on focused
  useFocusEffect(
    useCallback(() => {
      const formattedDate = formatTodayOrDate(selectedDate);

      // If possible, update the header title
      if (router.canGoBack()) {
        router.setParams({ title: formattedDate });
      }

      return () => {};
    }, [selectedDate])
  );

  // Handle date change from DateNavigator
  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate);
  };

  const checkIsPeriodDate = async (date: string): Promise<boolean | null> => {
    try {
      const db = getDB();
      const result = await db
        .select()
        .from(periodDates)
        .where(eq(periodDates.date, date));
      const isPeriod = result.length > 0;
      setIsPeriodDate(isPeriod);
      return isPeriod;
    } catch (error) {
      console.error('Error checking period date:', error);
      return null;
    }
  };

  useEffect(() => {
    let cancelled = false;

    const syncAndLoadHealthLogs = async () => {
      try {
        const isPeriod = await checkIsPeriodDate(selectedDate);
        const db = getDB();

        if (isPeriod === false) {
          await db
            .delete(healthLogs)
            .where(
              and(
                eq(healthLogs.date, selectedDate),
                eq(healthLogs.type, 'flow')
              )
            );
        }

        const existingEntries = await db
          .select()
          .from(healthLogs)
          .where(eq(healthLogs.date, selectedDate));

        if (cancelled) return;

        const symptomIds = new Set<string>();
        const moodIds = new Set<string>();
        const flowIds = new Set<string>();
        const dischargeIds = new Set<string>();
        let notesText = '';
        let tempValue = '';

        existingEntries.forEach(entry => {
          if (entry.type === 'symptom') {
            symptomIds.add(entry.item_id);
          } else if (entry.type === 'mood') {
            moodIds.add(entry.item_id);
          } else if (entry.type === 'flow') {
            flowIds.add(entry.item_id);
          } else if (entry.type === 'discharge') {
            dischargeIds.add(entry.item_id);
          } else if (entry.type === 'notes') {
            notesText = entry.name || '';
          } else if (entry.type === 'temperature') {
            tempValue = entry.name || '';
          }
        });

        const savedUnit = parseTempUnit(await getSetting('temp_unit'));
        setTempUnit(savedUnit);

        const nextFlows = isPeriod === false ? new Set<string>() : flowIds;

        setSelectedSymptoms(symptomIds);
        setSelectedMoods(moodIds);
        setSelectedFlows(nextFlows);
        setSelectedDischarges(dischargeIds);
        setNotes(notesText);
        setTempCelsius(tempValue);

        setOriginalSymptoms(new Set(symptomIds));
        setOriginalMoods(new Set(moodIds));
        setOriginalFlows(new Set(nextFlows));
        setOriginalDischarges(new Set(dischargeIds));
        setOriginalNotes(notesText);
        setOriginalTemp(tempValue);
        setHasChanges(false);
      } catch (error) {
        console.error('Error loading health logs:', error);
      }
    };

    void syncAndLoadHealthLogs();
    return () => {
      cancelled = true;
    };
  }, [selectedDate, setNotes, setTempCelsius, setTempUnit]);

  // Handle scrollTo parameter to navigate to specific sections
  useEffect(() => {
    if (!params.scrollTo || !scrollViewRef.current) return;

    const sectionRefs: Record<string, React.RefObject<View | null>> = {
      flow: flowSectionRef,
      symptoms: symptomsSectionRef,
      moods: moodsSectionRef,
      discharge: dischargeSectionRef,
      temperature: tempSectionRef,
      notes: notesSectionRef,
    };

    const targetRef = sectionRefs[params.scrollTo as string];
    
    if (targetRef?.current) {
      setTimeout(() => {
        targetRef.current?.measureLayout(
          scrollViewRef.current as any,
          (x, y) => {
            scrollViewRef.current?.scrollTo({ y, animated: true });
          },
          () => {}
        );
      }, 100);
    }
  }, [params.scrollTo]);

  useEffect(() => {
    const areSetsEqual = (a: Set<string>, b: Set<string>) => {
      if (a.size !== b.size) return false;
      for (const item of a) {
        if (!b.has(item)) return false;
      }
      return true;
    };

    const symptomsChanged = !areSetsEqual(selectedSymptoms, originalSymptoms);
    const moodsChanged = !areSetsEqual(selectedMoods, originalMoods);
    const flowsChanged = !areSetsEqual(selectedFlows, originalFlows);
    const dischargesChanged = !areSetsEqual(
      selectedDischarges,
      originalDischarges
    );
    const notesChanged = notes !== originalNotes;
    const tempChanged = tempCelsius !== originalTemp;

    setHasChanges(
      symptomsChanged ||
        moodsChanged ||
        flowsChanged ||
        dischargesChanged ||
        notesChanged ||
        tempChanged
    );
  }, [
    selectedSymptoms,
    selectedMoods,
    selectedFlows,
    selectedDischarges,
    notes,
    tempCelsius,
    originalSymptoms,
    originalMoods,
    originalFlows,
    originalDischarges,
    originalNotes,
    originalTemp,
  ]);

  // Clear sensitive health data when app is locked
  useEffect(() => {
    if (isLocked) {
      setSelectedSymptoms(new Set());
      setSelectedMoods(new Set());
      setSelectedFlows(new Set());
      setSelectedDischarges(new Set());
      setOriginalSymptoms(new Set());
      setOriginalMoods(new Set());
      setOriginalFlows(new Set());
      setOriginalDischarges(new Set());
      setOriginalNotes('');
      setOriginalTemp('');
      setHasChanges(false);
    }
  }, [isLocked]);

  const toggleSymptom = useCallback((id: string) => {
    setSelectedSymptoms(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleMood = useCallback((id: string) => {
    setSelectedMoods(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleFlow = useCallback((id: string) => {
    setSelectedFlows(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleDischarge = useCallback((id: string) => {
    setSelectedDischarges(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Navigate to notes editor
  const openNotesEditor = () => {
    router.push({
      pathname: '/notes-editor',
      params: { notes: notes },
    });
  };

  const saveChanges = async () => {
    try {
      const db = getDB();
      await db.delete(healthLogs).where(eq(healthLogs.date, selectedDate));

      const allRecords = [];

      for (const id of selectedSymptoms) {
        allRecords.push({
          date: selectedDate,
          type: 'symptom',
          item_id: id,
        });
      }

      for (const id of selectedMoods) {
        allRecords.push({
          date: selectedDate,
          type: 'mood',
          item_id: id,
        });
      }

      for (const id of selectedFlows) {
        allRecords.push({
          date: selectedDate,
          type: 'flow',
          item_id: id,
        });
      }

      for (const id of selectedDischarges) {
        allRecords.push({
          date: selectedDate,
          type: 'discharge',
          item_id: id,
        });
      }

      if (tempCelsius) {
        allRecords.push({
          date: selectedDate,
          type: 'temperature',
          item_id: 'basal-temp',
          name: tempCelsius,
        });
      }

      if (notes.trim()) {
        allRecords.push({
          date: selectedDate,
          type: 'notes',
          item_id: 'note',
          name: notes.trim(),
        });
      }

      if (allRecords.length > 0) {
        await db.insert(healthLogs).values(allRecords);
      }

      Toast.show({
        type: 'success',
        text1: t('health:tracking.successMessage'),
        visibilityTime: 3000,
      });

      router.back();
    } catch (error) {
      console.error('Error saving health logs:', error);

      Toast.show({
        type: 'error',
        text1: t('health:tracking.errorMessage'),
        visibilityTime: 3000,
      });
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <DateNavigator
        selectedDate={selectedDate}
        onDateChange={handleDateChange}
        maxDate={dayjs().format('YYYY-MM-DD')}
      />

      <ScrollView
        ref={scrollViewRef}
        style={commonStyles.scrollView}
        contentContainerStyle={[scrollContentContainerWithSafeArea, { paddingBottom: 80 + insets.bottom}]}
        showsVerticalScrollIndicator={false}
      >
        {isPeriodDate && (
          <View
            ref={flowSectionRef}
            style={[commonStyles.sectionContainer]}
          >
            <View style={commonStyles.sectionTitleContainer}>
              <Text style={[typography.headingMd]}>
                {t('health:tracking.flow')}
              </Text>
            </View>

            <HealthItemGrid
              items={FLOWS}
              selectedIds={selectedFlows}
              onToggle={toggleFlow}
              translationKey="health:flows"
              selectionColor={SELECTION_COLORS.flow}
              iconSize={ICON_SIZE}
            />
          </View>
        )}
        <View
          ref={symptomsSectionRef}
          style={[commonStyles.sectionContainer]}
        >
          <View style={commonStyles.sectionTitleContainer}>
            <Text style={[typography.headingMd]}>
              {t('health:tracking.symptoms')}
            </Text>
          </View>

          <HealthItemGrid
            items={SYMPTOMS}
            selectedIds={selectedSymptoms}
            onToggle={toggleSymptom}
            translationKey="health:symptoms"
            selectionColor={SELECTION_COLORS.symptom}
            iconSize={ICON_SIZE}
          />
        </View>

        <View
          ref={moodsSectionRef}
          style={[commonStyles.sectionContainer]}
        >
          <View style={commonStyles.sectionTitleContainer}>
            <Text style={[typography.headingMd]}>
              {t('health:tracking.moods')}
            </Text>
          </View>

          <HealthItemGrid
            items={MOODS}
            selectedIds={selectedMoods}
            onToggle={toggleMood}
            translationKey="health:moods"
            selectionColor={SELECTION_COLORS.mood}
            iconSize={ICON_SIZE}
          />
        </View>

        <View
          ref={dischargeSectionRef}
          style={[commonStyles.sectionContainer]}
        >
          <View style={commonStyles.sectionTitleContainer}>
            <Text style={[typography.headingMd]}>
              {t('health:tracking.discharge')}
            </Text>
          </View>

          <HealthItemGrid
            items={DISCHARGES}
            selectedIds={selectedDischarges}
            onToggle={toggleDischarge}
            translationKey="health:discharge"
            selectionColor={SELECTION_COLORS.discharge}
            iconSize={ICON_SIZE}
          />
        </View>

        {/* Basal temperature */}
        <View
          ref={tempSectionRef}
          style={[commonStyles.sectionContainer]}
        >
          <View style={commonStyles.sectionTitleContainer}>
            <Text style={[typography.headingMd]}>
              {t('health:tracking.basalTemperature')}
            </Text>
            <View style={styles.notesIconsContainer}>
              {tempCelsius && (
                <TouchableOpacity
                  style={styles.notesIcon}
                  onPress={() => setTempCelsius('')}
                  activeOpacity={0.7}
                >
                  <DeleteIcon color={colors.neutral400} />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.notesIcon}
                onPress={() => router.push('/temperature-editor')}
                activeOpacity={0.7}
              >
                {tempCelsius ? (
                  <EditIcon color={colors.neutral400} />
                ) : (
                  <PlusIcon color={colors.neutral400} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={styles.notesContainer}
            onPress={() => router.push('/temperature-editor')}
            activeOpacity={0.7}
          >
            {tempCelsius && !Number.isNaN(parseFloat(tempCelsius)) ? (
                <Text style={[typography.body, { flex: 1, fontSize: 22 }]}>
                <Text>
                  {tempUnit === 'F'
                    ? toFahrenheit(parseFloat(tempCelsius)).toFixed(1)
                    : parseFloat(tempCelsius).toFixed(1)}
                </Text>
                <Text style={{ fontSize: 16 }}>{` °${tempUnit}`}</Text>
              </Text>
            ) : (
              <Text
                style={[
                  typography.body,
                  { flex: 1, color: colors.placeholder},
                ]}
              >
                {t('health:tracking.basalTemperaturePlaceholder')}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Notes */}
        <View
          ref={notesSectionRef}
          style={[commonStyles.sectionContainer]}
        >
          <View style={commonStyles.sectionTitleContainer}>
            <Text style={[typography.headingMd]}>{t('health:tracking.notes')}</Text>
            <View style={styles.notesIconsContainer}>
              {notes.trim() && (
                <TouchableOpacity
                  style={styles.notesIcon}
                  onPress={() => setNotes('')}
                  activeOpacity={0.7}
                >
                  <DeleteIcon
                    color={colors.neutral400}
                  />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.notesIcon}
                onPress={openNotesEditor}
                activeOpacity={0.7}
              >
                {notes.trim() ? (
                  <EditIcon color={colors.neutral400} />
                ) : (
                  <PlusIcon color={colors.neutral400} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={styles.notesContainer}
            onPress={openNotesEditor}
            activeOpacity={0.7}
          >
            {notes.trim() ? (
              <Text
                style={[typography.body, { flex: 1 }]}
                numberOfLines={3}
              >
                {notes}
              </Text>
            ) : (
              <Text
                style={[
                  typography.body,
                  { flex: 1, color: colors.placeholder },
                ]}
              >
                {t('health:tracking.notesPlaceholder')}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Save button that appears only when changes are made */}
      {hasChanges && (
        <View style={[styles.saveButtonContainer, { bottom: 30 + insets.bottom }]}>
          <Button title={t('buttons.save')} onPress={saveChanges} fullWidth />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  notesContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  notesIconsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notesIcon: {
    marginLeft: 16,
  },
  saveButtonContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
  },
});
