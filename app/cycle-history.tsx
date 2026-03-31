import React from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { CycleHistory } from '../components/CycleHistory';
import { Button } from '../components/Button';
import { useAppStyles } from '../hooks/useStyles';
import { useCycleHistory } from '../hooks/useCycleHistory';
import { useTheme } from '../styles/theme';

export default function CycleHistoryScreen() {
  const { colors } = useTheme();
  const { commonStyles } = useAppStyles();
  const { typography, scrollContentContainerWithSafeArea } = useAppStyles();
  const { t } = useTranslation('stats');
  const { cycles, hasNoPeriodData, isInitialLoad } = useCycleHistory();

  const renderEmptyState = () => (
    <View style={styles.emptyStateContainer}>
      <View style={styles.emptyStateIconContainer}>
        <Image
          source={require('../assets/icons/stats-icon.png')}
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
    return <View style={[commonStyles.container, { backgroundColor: colors.background }]} />;
  }

  if (hasNoPeriodData) {
    return (
      <ScrollView 
      style={[commonStyles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ flexGrow: 1 }}
      >
        {renderEmptyState()}
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={[
        commonStyles.scrollView,
      ]}
      contentContainerStyle={scrollContentContainerWithSafeArea}
      showsVerticalScrollIndicator={false}
    >
      <CycleHistory cycles={cycles} showTitle={false} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
