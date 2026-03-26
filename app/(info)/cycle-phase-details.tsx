import React, { useEffect, useRef } from 'react';
import { Text, View, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { PeriodPredictionService } from '../../services/periodPredictions';
import { useTheme } from '../../styles/theme';
import { useAppStyles } from '../../hooks/useStyles';
import { CycleIcon } from '../../components/icons/general/Cycle';
import { FertilityIcon } from '../../components/icons/general/fertility';
import { SymptomsIcon } from '../../components/icons/general/Symptoms';
import { formatTodayShort, formatDateShort } from '../../utils/localeUtils';
import { useTranslation } from 'react-i18next';

const getFormattedDate = (date: Date): string => {
  return formatTodayShort(date);
};

const getCycleStartDate = (cycleDay: number): Date => {
  const today = new Date();
  const cycleStartDate = new Date(today);
  cycleStartDate.setDate(today.getDate() - (cycleDay - 1));
  return cycleStartDate;
};

const getFormattedCycleStart = (cycleDay: number, t: any): string => {
  if (cycleDay === 1) {
    return t('info:cyclePhase.cycleStartedToday');
  }

  const cycleStartDate = getCycleStartDate(cycleDay);
  const today = new Date();
  const isToday = cycleStartDate.toDateString() === today.toDateString();

  if (isToday) {
    return t('info:cyclePhase.cycleStartedToday');
  }

  return `${t('info:cyclePhase.cycleStartedOn')} ${formatDateShort(cycleStartDate)}`;
};

export default function CyclePhaseDetails() {
  const { colors } = useTheme();
  const { typography, commonStyles, scrollContentContainerWithSafeArea } = useAppStyles();
  const { t } = useTranslation('info');
  const params = useLocalSearchParams();
  const cycleDay = parseInt(params.cycleDay as string) || 0;
  const averageCycleLength =
    parseInt(params.averageCycleLength as string) || 28;
  const averagePeriodLength =
    parseInt(params.averagePeriodLength as string) || 5;
  const currentDate = new Date();

  const cyclePhaseKey = PeriodPredictionService.getCyclePhase(cycleDay, averageCycleLength, averagePeriodLength);
  const pregnancyChanceKey = PeriodPredictionService.getPregnancyChance(
    cycleDay,
    averageCycleLength
  );

  const noteLabel = t('cyclePhase.noteLabel', { defaultValue: 'Note' });
  const phaseNote = t(`cyclePhase.phaseNotes.${cyclePhaseKey}`, { defaultValue: '' });

  const scrollViewRef = useRef<ScrollView>(null);
  const cyclePhaseSectionRef = useRef<View>(null);
  const chanceToConceiveSectionRef = useRef<View>(null);
  const symptomsSectionRef = useRef<View>(null);

  useEffect(() => {
    const scrollTo = params.scrollTo as string | undefined;
    if (!scrollTo || !scrollViewRef.current) return;

    const sectionRefs: Record<string, React.RefObject<View | null>> = {
      cyclePhase: cyclePhaseSectionRef,
      chanceToConceive: chanceToConceiveSectionRef,
      symptoms: symptomsSectionRef,
    };
    const targetRef = sectionRefs[scrollTo];
    if (!targetRef?.current) return;

    setTimeout(() => {
      targetRef.current?.measureLayout(
        scrollViewRef.current as any,
        (x, y) => {
          scrollViewRef.current?.scrollTo({ y, animated: true });
        },
        () => {}
      );
    }, 100);
  }, [params.scrollTo]);

  return (
      <ScrollView
        ref={scrollViewRef}
        style={commonStyles.scrollView}
        contentContainerStyle={[scrollContentContainerWithSafeArea, { paddingTop: 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text
          style={[
            typography.body,
            { fontWeight: '500', marginBottom: 8, textAlign: 'center' },
          ]}
        >
          {getFormattedDate(currentDate)}
        </Text>

        <Text
          style={[
            typography.headingLg,
            { textAlign: 'center', marginBottom: 8 },
          ]}
        >
          {t('cyclePhase.cycleDay')} {cycleDay}
        </Text>

        <Text
          style={[
            typography.body,
            {
              textAlign: 'center',
              marginBottom: 24,
              color: colors.textSecondary,
              fontSize: 16,
            },
          ]}
        >
          {getFormattedCycleStart(cycleDay, t)}
        </Text>

        <View ref={cyclePhaseSectionRef} style={[commonStyles.sectionContainer]}>
          <View style={styles.phaseHeader}>
              <CycleIcon size={32} />
            <Text style={[typography.headingMd, { marginLeft: 12 }]}>
              {t('cyclePhase.cyclePhaseTitle')}
            </Text>
          </View>

          <Text
            style={[
              typography.bodyXl,     
                       { marginBottom: 8, fontWeight: '600',},
            ]}
          >
            {t(`cyclePhase.phases.${cyclePhaseKey}`)}
          </Text>

          <Text style={[typography.body]}>
            {t(`cyclePhase.phaseDescriptions.${cyclePhaseKey}`)}
          </Text>

          {!!phaseNote && (
            <Text style={[typography.body, { marginTop: 16 }]}>
              <Text style={{ fontWeight: '600' }}>{noteLabel}: </Text>
              {phaseNote}
            </Text>
          )}
        </View>

        <View ref={chanceToConceiveSectionRef} style={[commonStyles.sectionContainer]}>
          <View style={styles.phaseHeader}>
              <FertilityIcon size={34}/>
            <Text style={[typography.headingMd, { marginLeft: 12 }]}>
              {t('cyclePhase.chanceToConceive')}
            </Text>
          </View>

          <Text
            style={[
              typography.bodyXl,
              { fontWeight: '600' },
              { marginBottom: 8 },
            ]}
          >
            {t(`cyclePhase.pregnancyChance.${pregnancyChanceKey}`)}
          </Text>

          <Text style={[typography.body]}>
            {t(`cyclePhase.pregnancyChanceDescriptions.${pregnancyChanceKey}`)}
          </Text>
        </View>

        {t(`cyclePhase.symptoms.${cyclePhaseKey}`) && (
          <View ref={symptomsSectionRef} style={[commonStyles.sectionContainer]}>
            <View style={styles.phaseHeader}>

              <SymptomsIcon size={34}/>
              <Text style={[typography.headingMd, { marginLeft: 12 }]}>
                {t('cyclePhase.commonSymptoms')}
              </Text>
            </View>
            {(() => {
              const symptomsData = t(`cyclePhase.symptoms.${cyclePhaseKey}`, { returnObjects: true }) as 
                string | { intro?: string; items?: string[]; note?: string };
              
              if (typeof symptomsData === 'string') {
                return <Text style={[typography.body]}>{symptomsData}</Text>;
              }
              
              return (
                <>
                  {symptomsData.intro && (
                    <Text style={[typography.body]}>{symptomsData.intro}</Text>
                  )}
                  
                  {symptomsData.items && symptomsData.items.map((symptom: string, i: number) => (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', marginTop: 8 }}>
                      <Text style={[typography.body, { marginRight: 8 }]}>{'\u2022'}</Text>
                      <Text style={[typography.body, { flex: 1 }]}>{symptom}</Text>
                    </View>
                  ))}
                  
                  {symptomsData.note && (
                    <Text style={[typography.body, { marginTop: 16 }]}>{symptomsData.note}</Text>
                  )}
                </>
              );
            })()}
          </View>
        )}
      </ScrollView>
  );
}

const styles = StyleSheet.create({
  phaseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
});
