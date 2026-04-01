import React from 'react';
import { Text, View, StyleSheet, ScrollView, Linking } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../styles/theme';
import { useAppStyles } from '../../hooks/useStyles';
import Constants from 'expo-constants';

const SECTION_ICON_SIZE = 24;

function SectionIcon({ name, ...props }: { name: keyof typeof Ionicons.glyphMap } & Partial<React.ComponentProps<typeof Ionicons>>) {
  const { colors } = useTheme();
  return <Ionicons name={name} size={SECTION_ICON_SIZE} color={colors.accentPink} {...props} />;
}

export default function About() {
  const { colors } = useTheme();
  const { typography, commonStyles, scrollContentContainerWithSafeArea } = useAppStyles();
  const { t } = useTranslation('settings');
  const GITHUB_URL = 'https://github.com/blumaHQ/bluma-app';
  const GPL_URL = 'https://www.gnu.org/licenses/gpl-3.0.en.html';

  return (
    <ScrollView
      style={[
        commonStyles.scrollView,
        { backgroundColor: colors.panel },
      ]}
      contentContainerStyle={[scrollContentContainerWithSafeArea, { paddingTop: 16 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.contentSection]}>
        <Text style={[typography.headingLg]}>
          {t('aboutScreen.title')}
        </Text>
        <Text style={[typography.body, { color: colors.textSecondary }]}>
  {t('aboutScreen.versionLabel')} {Constants.expoConfig?.version}
</Text>
        <Text style={[typography.body]}>
          {t('aboutScreen.whatIs.description')}
        </Text>
      </View>

      <View style={[styles.contentSection]}>
        <View style={styles.sectionHeader}>
          <SectionIcon name="calendar-outline" />
          <Text style={[typography.headingMd, { marginLeft: 12 }]}>
            {t('aboutScreen.features.title')}
          </Text>
        </View>
        {['predictions', 'symptomsTracking', 'statistics', 'backups', 'insights', 'reminders', 'lock', 'theme'].map((feature, index) => (
          <View
            key={feature}
            style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              marginLeft: 8,
            }}
          >
            <Text style={{ marginRight: 8, color: colors.textPrimary, fontSize: 18 }}>{'\u2022'}</Text>
            <Text style={[typography.body, { flex: 1 }]}>
              {t(`aboutScreen.features.${feature}`)}
            </Text>
          </View>
        ))}
      </View>

      <View style={[styles.contentSection]}>
        <View style={styles.sectionHeader}>
          <SectionIcon name="shield-checkmark-outline" />
          <Text style={[typography.headingMd, { marginLeft: 12 }]}>
            {t('aboutScreen.privacyFirst.title')}
          </Text>
        </View>
        <Text style={[typography.body]}>
          {t('aboutScreen.privacyFirst.description')}
        </Text>
        {['local', 'noTransmission', 'noTracking', 'noAds', 'noAccount'].map((item, index) => (
          <View
            key={item}
            style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              marginLeft: 8,
            }}
          >
            <Text style={{ marginRight: 8, color: colors.textPrimary, fontSize: 18 }}>{'\u2022'}</Text>
            <Text style={[typography.body, { flex: 1 }]}>
              {t(`aboutScreen.privacyFirst.${item}`)}
            </Text>
          </View>
        ))}
      </View>

      <View style={[styles.contentSection]}>
        <View style={styles.sectionHeader}>
          <SectionIcon name="document-text-outline" />
          <Text style={[typography.headingMd, { marginLeft: 12 }]}>
            {t('aboutScreen.openSource.title')}
          </Text>
        </View>
        <Text style={[typography.body]}>
          {t('aboutScreen.openSource.description')}{' '}
          <Text
            onPress={() => Linking.openURL(GPL_URL)}
            accessibilityRole="link"
            style={[
              typography.body,
              { color: colors.primary, textDecorationLine: 'underline' },
            ]}
          >
            GNU GPL v3
          </Text>
          .
        </Text>
        <Text style={[typography.body]}>
          {t('aboutScreen.openSource.warranty')}
        </Text>
        <Text
          onPress={() => Linking.openURL(GITHUB_URL)}
          accessibilityRole="link"
          style={[
            typography.body,
            { color: colors.primary, textDecorationLine: 'underline' },
          ]}
        >
          {t('aboutScreen.openSource.viewSource')}
        </Text>
      </View>

      <View style={[styles.contentSection]}>
        <View style={styles.sectionHeader}>
          <SectionIcon name="code-outline" />
          <Text style={[typography.headingMd, { marginLeft: 12 }]}>
            {t('aboutScreen.technical.title')}
          </Text>
        </View>
        <Text style={[typography.body]}>
          {t('aboutScreen.technical.description')}
        </Text>
        {['framework', 'database', 'encryption', 'architecture', 'language', 'platform'].map((item, index) => {
          const fullText = t(`aboutScreen.technical.${item}`);
          const colonIndex = fullText.indexOf(':');
          const label = fullText.substring(0, colonIndex + 1);
          const value = fullText.substring(colonIndex + 1);
          
          return (
            <View
              key={item}
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                marginLeft: 8,
              }}
            >
              <Text style={{ marginRight: 8, color: colors.textPrimary, fontSize: 18 }}>{'\u2022'}</Text>
              <Text style={[typography.body, { flex: 1 }]}>
                <Text style={typography.bodyBold}>{label}</Text>
                <Text>{value}</Text>
              </Text>
            </View>
          );
        })}
      </View>

      <View style={[styles.contentSection]}>
        <View style={styles.sectionHeader}>
          <SectionIcon name="person-outline" />
          <Text style={[typography.headingMd, { marginLeft: 12 }]}>
            {t('aboutScreen.developer.title')}
          </Text>
        </View>
        <Text style={[typography.body]}>
          {t('aboutScreen.developer.description')}
        </Text>
      </View>

      <View style={[commonStyles.sectionContainer, { backgroundColor: colors.surfaceVariant }]}>
        <Text
          style={[
            typography.body,
            {
              color: colors.textSecondary,
              textAlign: 'center',
            },
          ]}
        >
          {t('aboutScreen.footer.prefix')}
          <Text style={typography.bodyBold}>{t('aboutScreen.footer.email')}</Text>
          {t('aboutScreen.footer.suffix')}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contentSection: {
    marginBottom: 24,
    gap: 8,
  },
});
