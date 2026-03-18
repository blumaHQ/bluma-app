import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/Button';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { useAppStyles } from '../../hooks/useStyles';
import { AnimatedCheckmark } from '../../components/AnimatedCheckmark';

export default function SuccessScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { typography } = useAppStyles();
  const { t } = useTranslation('onboarding');

  const handleStartTracking = () => {
    router.replace('/');
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={styles.content}>
        <AnimatedCheckmark
          backgroundColor={colors.accentPink}
          iconColor={colors.white}
        />

        <Text
          style={[
            typography.headingLg,
            { marginTop: 32, marginBottom: 16, textAlign: 'center' },
          ]}
        >
          {t('success.title')}
        </Text>

        <Text
          style={[
            typography.body,
            {
              textAlign: 'center',
              color: colors.textSecondary,
              paddingHorizontal: 16,
              fontSize: 18,
              lineHeight: 24,
            },
          ]}
        >
          {t('success.subtitle')}
        </Text>
      </View>

      <View style={styles.footer}>
        <Button
          title={t('success.button')}
          onPress={handleStartTracking}
          fullWidth
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  footer: {
    padding: 24,
    paddingBottom: 10,
  },
});
