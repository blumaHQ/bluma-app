import React from 'react';
import { Text, View, StyleSheet, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../styles/theme';
import { useAppStyles } from '../../hooks/useStyles';
import * as Localization from 'expo-localization';

const PRIVACY_POLICY_REVISED = '2026-04-02'; // bump when policy content changes
const [policyYear, policyMonth, policyDay] = PRIVACY_POLICY_REVISED.split('-').map(Number);
const privacyPolicyLastUpdatedAt = new Date(policyYear, policyMonth - 1, policyDay);

export default function PrivacyPolicy() {
  const { colors } = useTheme();
  const { typography, commonStyles, scrollContentContainerWithSafeArea } = useAppStyles();
  const { t } = useTranslation('settings');

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
          {t('privacyPolicyScreen.title')}
        </Text>
        <Text style={[typography.body, { color: colors.textSecondary }]}>
          {t('privacyPolicyScreen.lastUpdated')}{' '}
          {privacyPolicyLastUpdatedAt.toLocaleDateString(Localization.getLocales()[0].languageTag)}
        </Text>
        <Text style={[typography.body]}>
          {t('privacyPolicyScreen.introduction.description')}
        </Text>
      </View>

      <View style={[styles.contentSection]}>
        <View style={styles.sectionHeader}>
          <Text style={[typography.headingMd]}>
            {t('privacyPolicyScreen.dataUse.title')}
          </Text>
        </View>
        <Text style={[typography.body, { marginBottom: 12 }]}>
          {t('privacyPolicyScreen.dataUse.descriptionPrefix')}{' '}
          <Text style={typography.bodyBold}>{t('privacyPolicyScreen.dataUse.descriptionBold')}</Text>
          {t('privacyPolicyScreen.dataUse.descriptionSuffix')}
        </Text>
        {['periodDates', 'cycleLength', 'symptoms', 'notes', 'settings'].map((item, index) => (
          <View
            key={item}
            style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              marginBottom: index === 8 ? 0 : 0,
              marginLeft: 8,
            }}
          >
            <Text style={{ marginRight: 8, color: colors.textPrimary, fontSize: 18 }}>{'\u2022'}</Text>
            <Text style={[typography.body, { flex: 1 }]}>
              {t(`privacyPolicyScreen.dataUse.${item}`)}
            </Text>
          </View>
        ))}
        <Text style={[typography.body, { marginVertical: 12 }]}>
          {t('privacyPolicyScreen.dataUse.usage')}
        </Text>
      </View>

      <View style={[styles.contentSection]}>
        <View style={styles.sectionHeader}>
          <Text style={[typography.headingMd]}>
            {t('privacyPolicyScreen.dataDeletion.title')}
          </Text>
        </View>
        <Text style={[typography.body]}>
          {t('privacyPolicyScreen.dataDeletion.description')}
        </Text>
      </View>

      <View style={[styles.contentSection]}>
        <View style={styles.sectionHeader}>
          <Text style={[typography.headingMd]}>
            {t('privacyPolicyScreen.permissions.title')}
          </Text>
        </View>
        <Text style={[typography.body]}>
          {t('privacyPolicyScreen.permissions.description')}
        </Text>
        {['reminders', 'biometric'].map((permission, index) => (
          <View
            key={permission}
            style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              marginLeft: 8,
            }}
          >
            <Text style={{ marginRight: 8, color: colors.textPrimary, fontSize: 18 }}>{'\u2022'}</Text>
            <Text style={[typography.body, { flex: 1 }]}>
              {t(`privacyPolicyScreen.permissions.${permission}`)}
              <Text style={typography.bodyBold}>{t(`privacyPolicyScreen.permissions.${permission}Bold`)}</Text>
              {t(`privacyPolicyScreen.permissions.${permission}Suffix`)}
            </Text>
          </View>
        ))}
        <Text style={[typography.body]}>
          {t('privacyPolicyScreen.permissions.revoke')}
        </Text>
      </View>

      <View style={[styles.contentSection]}>
        <View style={styles.sectionHeader}>
          <Text style={[typography.headingMd]}>
            {t('privacyPolicyScreen.transparency.title')}
          </Text>
        </View>
        <Text style={[typography.body]}>
          {t('privacyPolicyScreen.transparency.description')}
        </Text>
        {['localStorage', 'noTransmission', 'noAnalytics', 'noAds'].map((item, index) => (
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
              {t(`privacyPolicyScreen.transparency.${item}`)}
            </Text>
          </View>
        ))}
        <Text style={[typography.body]}>
          {t('privacyPolicyScreen.transparency.control')}
        </Text>
      </View>

      <View style={[styles.contentSection]}>
        <View style={styles.sectionHeader}>
          <Text style={[typography.headingMd]}>
            {t('privacyPolicyScreen.dataRetention.title')}
          </Text>
        </View>
        <Text style={[typography.body]}>
          {t('privacyPolicyScreen.dataRetention.description')}
        </Text>
      </View>

      <View style={[commonStyles.sectionContainer, {backgroundColor: colors.surfaceVariant}]}>
        <Text
          style={[
            typography.body,
            {
              color: colors.textSecondary,
              textAlign: 'center',
            },
          ]}
        >
          {t('privacyPolicyScreen.footer.prefix')}
          <Text style={typography.bodyBold}>{t('privacyPolicyScreen.footer.email')}</Text>
          {t('privacyPolicyScreen.footer.suffix')}
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
