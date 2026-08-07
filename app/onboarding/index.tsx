import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/Button';
import { LoadingScreen } from '../../components/LoadingScreen';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { useAppStyles } from '../../hooks/useStyles';
import { createOnboardingStyles } from '../../styles/onboarding';
import { Ionicons } from '@expo/vector-icons';
import { Shape1, Shape2 } from '../../components/illustrations';
import { useFonts, BricolageGrotesque_700Bold } from '@expo-google-fonts/bricolage-grotesque';

export default function WelcomeScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { typography } = useAppStyles();
  const onboardingStyles: ReturnType<typeof createOnboardingStyles> =
    createOnboardingStyles(colors);
  const { t } = useTranslation('onboarding');
  const [fontsLoaded, fontError] = useFonts({ BricolageGrotesque_700Bold });

  if (!fontsLoaded && !fontError) {
    return <LoadingScreen />;
  }

  if (fontError) {
    console.error('Failed to load custom fonts:', fontError);
  }

  const handleNext = () => {
    router.push({ pathname: '/onboarding/period-length' });
  };

  return (
    <SafeAreaView
      style={[onboardingStyles.container, { backgroundColor: colors.panel }]}
    >
      <Shape1 style={styles.shape1} color={colors.shape1} />
      <Shape2 style={styles.shape2} color={colors.shape2} />

      <View
        style={[
          onboardingStyles.content,
          { justifyContent: 'center', alignItems: 'center' },
        ]}
      >
        <Image
          source={require('../../assets/icons/bluma-logo.png')}
          style={{ width: 200, height: 55, marginBottom: 32}}
          resizeMode="contain"
        />
        <Text
          style={[
            { color: colors.textPrimary },
            {
              fontSize: 27,
              lineHeight: 35,
              marginBottom: 36,
              textAlign: 'center',
              fontFamily: 'BricolageGrotesque_700Bold',
            },
          ]}
        >
          {t('welcome.title')}
        </Text>
        <View style={styles.trustBadgesContainer}>
          <View style={styles.badge}>
            <View style={styles.badgeIconSlot}>
              <Ionicons name="lock-closed-outline" size={24} color={colors.accentPink} />
            </View>
            <Text style={[typography.body, { color: colors.textSecondary, fontSize: 18, lineHeight: 24 }]}>
              {t('welcome.badgeStorage')}
            </Text>
          </View>
          <View style={styles.badge}>
            <View style={styles.badgeIconSlot}>
              <Ionicons name="shield-checkmark-outline" size={24} color={colors.accentPink} />
            </View>
            <Text style={[typography.body, { color: colors.textSecondary, fontSize: 18, lineHeight: 24 }]}>
              {t('welcome.badgeNoTracking')}
            </Text>
          </View>
          <View style={styles.badge}>
            <View style={styles.badgeIconSlot}>
              <Ionicons name="ban-outline" size={24} color={colors.accentPink} />
            </View>
            <Text style={[typography.body, { color: colors.textSecondary, fontSize: 18, lineHeight: 24 }]}>
              {t('welcome.badgeNoAds')}
            </Text>
          </View>
          <View style={styles.badge}>
            <View style={styles.badgeIconSlot}>
              <Ionicons name="code-slash-outline" size={24} color={colors.accentPink} />
            </View>
            <Text style={[typography.body, { color: colors.textSecondary, fontSize: 18, lineHeight: 24 }]}>
              {t('welcome.badgeOpenSource')}
            </Text>
          </View>
        </View>
      </View>

      <View style={onboardingStyles.footer}>
        <Button title={t('common:buttons.getStarted')} onPress={handleNext} fullWidth />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  trustBadgesContainer: {
    flexDirection: 'column',
    gap: 16,
    alignItems: 'flex-start',
    paddingHorizontal: 16,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badgeIconSlot: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shape1: {
    position: 'absolute',
    top: 0,
    left: -20,
    width: 325,
    height: 325,
  },
  shape2: {
    position: 'absolute',
    bottom: -80,
    right: -100,
    width: 381,
    height: 291,
  },
});
