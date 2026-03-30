import React from 'react';
import { View, ScrollView, Text, Image, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../styles/theme';
import { useAppStyles } from '../../hooks/useStyles';

export default function SymptomPatternInfo() {
  const { colors } = useTheme();
  const { typography, commonStyles, scrollContentContainerWithSafeArea } = useAppStyles();
  const { t } = useTranslation('info');

  return (
    <ScrollView
      style={[commonStyles.scrollView, { backgroundColor: colors.panel }]}
      contentContainerStyle={scrollContentContainerWithSafeArea}
      showsVerticalScrollIndicator={false}
    >
      <Image
        source={require('../../assets/images/patterns.png')}
        style={{
          width: '100%',
          height: 200,
          resizeMode: 'cover',
          marginBottom: 24,
          borderRadius: 16,
        }}
      />

      <View style={styles.contentSection}>
+        <Text style={typography.headingMd}>
+          {t('symptomPattern.howItWorks.title')}
+        </Text>
+        <Text style={typography.body}>
+          {t('symptomPattern.howItWorks.description')}
+        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contentSection: {
    marginBottom: 32,
    gap: 16,
  },
});

