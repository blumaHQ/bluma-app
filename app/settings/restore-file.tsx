import React, { useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Image } from 'react-native';
import { Button } from '../../components/Button';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../styles/theme';
import { useAppStyles } from '../../hooks/useStyles';
import { validateBackupFile } from '../../services/backupService';

export default function RestoreFileScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { typography, commonStyles, scrollContentContainerWithSafeArea } = useAppStyles();
  const { t } = useTranslation('settings');

  const handlePickFile = useCallback(async () => {
    Alert.alert(
      t('backup.restore.confirmTitle'),
      t('backup.restore.confirmMessage'),
      [
        { text: t('backup.restore.cancel'), style: 'cancel' },
        {
          text: t('backup.restore.continue'),
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await DocumentPicker.getDocumentAsync({
                type: 'application/octet-stream',
                copyToCacheDirectory: true,
              });
              if (result.canceled) return;

              const fileUri = result.assets[0].uri;
              try {
                await validateBackupFile(fileUri);
              } catch (err) {
                const msg =
                  err instanceof Error && err.message === 'UNSUPPORTED_VERSION'
                    ? t('backup.restore.error.unsupportedVersion')
                    : t('backup.restore.error.invalidFile');
                Alert.alert(t('backup.error.title'), msg);
                return;
              }

              router.push(`/settings/restore-key?fileUri=${encodeURIComponent(fileUri)}`);
            } catch {
              Alert.alert(t('backup.error.title'), t('backup.restore.error.pickFailed'));
            }
          },
        },
      ]
    );
  }, [t, router]);

  return (
    <ScrollView
      style={[commonStyles.scrollView, { backgroundColor: colors.panel}]}
      contentContainerStyle={scrollContentContainerWithSafeArea}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.contentSection}>
        <View style={styles.illustrationWrapper}>
          <Image
            source={require('../../assets/images/password.png')}
            style={styles.illustration}
            resizeMode="contain"
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
            },
          ]}
        >
          {t('backup.restore.chooseFileTitle')}
        </Text>
        <Button
          variant="outlined"
          icon="folder-open-outline"
          title={t('backup.restoreButton')}
          onPress={handlePickFile}
          fullWidth
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contentSection: {
    alignItems: 'center',
    gap: 32,
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  illustrationWrapper: {
    alignItems: 'center',
  },
  illustration: {
    width: 200,
    height: 200,
  },
});
