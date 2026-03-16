import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image } from 'react-native';
import { Button } from '../../components/Button';
import { ConfirmDialog } from '../../components/ConfirmDialog';
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

  const [showConfirm, setShowConfirm] = useState(false);
  const [fileErrorDialog, setFileErrorDialog] = useState<{ title: string; message: string } | null>(null);

  const pickFile = useCallback(async () => {
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
        setFileErrorDialog({ title: t('backup.error.title'), message: msg });
        return;
      }

      router.push(`/settings/restore-key?fileUri=${encodeURIComponent(fileUri)}`);
    } catch {
      setFileErrorDialog({ title: t('backup.error.title'), message: t('backup.restore.error.pickFailed') });
    }
  }, [t, router]);

  return (
    <View style={[styles.root, { backgroundColor: colors.panel }]}>
      <ScrollView
        style={commonStyles.scrollView}
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
            onPress={() => setShowConfirm(true)}
            fullWidth
          />
        </View>
      </ScrollView>

      <ConfirmDialog
        visible={showConfirm}
        title={t('backup.restore.confirmTitle')}
        message={t('backup.restore.confirmMessage')}
        confirmLabel={t('backup.restore.continue')}
        cancelLabel={t('backup.restore.cancel')}
        onConfirm={() => {
          setShowConfirm(false);
          pickFile();
        }}
        onCancel={() => setShowConfirm(false)}
      />

      <ConfirmDialog
        visible={!!fileErrorDialog}
        title={fileErrorDialog?.title ?? ''}
        message={fileErrorDialog?.message ?? ''}
        confirmLabel={t('backup.restoreButton')}
        onConfirm={() => setFileErrorDialog(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
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
