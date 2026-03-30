import React from 'react';
import { ScrollView } from 'react-native';
import { CycleHistory } from '../components/CycleHistory';
import { useAppStyles } from '../hooks/useStyles';
import { useCycleHistory } from '../hooks/useCycleHistory';

export default function CycleHistoryScreen() {
  const { commonStyles } = useAppStyles();
  const { cycles } = useCycleHistory();

  return (
    <ScrollView
      style={commonStyles.scrollView}
      contentContainerStyle={commonStyles.scrollContentContainer}
      showsVerticalScrollIndicator={false}
    >
      <CycleHistory cycles={cycles} showTitle={false} />
    </ScrollView>
  );
}
