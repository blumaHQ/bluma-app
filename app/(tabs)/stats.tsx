import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Text, Image } from 'react-native';
import { Button } from '../../components/Button';
import { router } from 'expo-router';
import { StatCard } from '../../components/StatCard';
import { CycleHistory } from '../../components/CycleHistory';
import { SymptomPatternCard } from '../../components/SymptomPatternCard';
import { DropIcon } from '../../components/icons/general/Drop';
import { CycleIcon } from '../../components/icons/general/Cycle';
import { getCycleStatus, getPeriodStatus } from '../../utils/cycleUtils';
import { useTheme } from '../../styles/theme';
import { useAppStyles } from '../../hooks/useStyles';
import { useTranslation } from 'react-i18next';
import { useCycleHistory } from '../../hooks/useCycleHistory';

export default function Stats() {
  const { colors } = useTheme();
  const { typography, commonStyles } = useAppStyles();
  const { t } = useTranslation('stats');
  const { cycles, averageCycleLength, averagePeriodLength, hasNoPeriodData, isInitialLoad } =
    useCycleHistory();
  const [hasPatterns, setHasPatterns] = useState(false);

  const renderEmptyState = () => (
    <View style={styles.emptyStateContainer}>
      <View style={styles.emptyStateIconContainer}>
        <Image
          source={require('../../assets/icons/stats-icon.png')}
          style={styles.emptyStateIcon}
        />
      </View>
      <Text style={[typography.headingLg, styles.emptyStateTitle]}>
        {t('emptyState.title')}
      </Text>
      <Text style={[typography.bodyXl, styles.emptyStateSubtitle]}>
        {t('emptyState.subtitle')}
      </Text>
      <Button
        title={t('emptyState.logPeriodButton')}
        onPress={() => router.push('/edit-period')}
      />
    </View>
  );

  if (isInitialLoad) {
    return (
      <View style={[commonStyles.container, { backgroundColor: colors.background }]} />
    );
  }

  if (hasNoPeriodData) {
    return (
      <ScrollView
        style={[commonStyles.container, { backgroundColor: colors.background }]}
      >
        {renderEmptyState()}
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={[commonStyles.scrollView]}
      contentContainerStyle={commonStyles.scrollContentContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={[commonStyles.sectionContainer]}>
        <Text style={[commonStyles.sectionTitleContainer, typography.headingMd]}>
          {t('cycleStatistics')}
        </Text>
        <View style={styles.cardsContainer}>
          <StatCard
            title={t('averages.cycleLength')}
            value={`${averageCycleLength} ${t('common:time.days')}`}
            icon={<CycleIcon size={32} />}
            status={getCycleStatus(averageCycleLength).status}
            type="cycle"
          />
          <StatCard
            title={t('averages.periodLength')}
            value={`${averagePeriodLength} ${t('common:time.days')}`}
            icon={<DropIcon size={40} />}
            status={getPeriodStatus(averagePeriodLength).status}
            type="period"
          />
        </View>
      </View>
      {hasPatterns && <SymptomPatternCard onLoad={setHasPatterns} />}
      <CycleHistory cycles={cycles} maxItems={3} />
      {!hasPatterns && <SymptomPatternCard onLoad={setHasPatterns} />}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  cardsContainer: {
    gap: 12,
  },
  emptyStateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 120,
  },
  emptyStateIconContainer: {
    marginBottom: 32,
  },
  emptyStateIcon: {
    width: 120,
    height: 120,
  },
  emptyStateTitle: {
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyStateSubtitle: {
    textAlign: 'center',
    marginBottom: 32,
    opacity: 0.7,
  },
});
