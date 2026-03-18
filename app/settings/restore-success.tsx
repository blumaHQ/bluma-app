import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../styles/theme';
import { useAppStyles } from '../../hooks/useStyles';
import { Button } from '../../components/Button';
import { AnimatedCheckmark } from '../../components/AnimatedCheckmark';

export default function RestoreSuccessScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { typography, commonStyles, scrollContentContainerWithSafeArea } = useAppStyles();
  const { t } = useTranslation('settings');

  return (
    <View style={[styles.root]}>
      <ScrollView
        style={[commonStyles.scrollView, { backgroundColor: colors.panel }]}
        contentContainerStyle={[scrollContentContainerWithSafeArea, styles.contentContainer]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.contentSection}>
          <View style={styles.illustrationWrapper}>
            <AnimatedCheckmark
              backgroundColor={colors.accentPink}
              iconColor={colors.white}
              size={120}
              iconSize={80}
            />
          </View>

          <Text
            style={[
              typography.headingMd,
              {
                color: colors.textPrimary,
                fontSize: 28,
                lineHeight: 34,
                fontWeight: '600',
                textAlign: 'center',
                marginBottom: 16,
              },
            ]}
          >
            {t('backup.restore.successTitle')}
          </Text>

          <Button
            title={t('backup.backToSettings')}
            onPress={() => router.replace('/(tabs)/settings')}
            fullWidth
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  contentSection: {
    alignItems: 'center',
    gap: 24,
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  illustrationWrapper: {
    alignItems: 'center',
    marginBottom: 8,
  },
});

