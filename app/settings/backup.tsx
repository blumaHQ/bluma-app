import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Stack, useRouter } from 'expo-router';
import { Button } from '../../components/Button';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../styles/theme';
import { useAppStyles } from '../../hooks/useStyles';
import {
  generateBackupKey,
  createBackupForKey,
  shareBackup,
  cleanupBackupFile,
} from '../../services/backupService';

type BackupPhase =
  | { type: 'key_display'; key: string; filePath: string | null; keyCopied: boolean }
  | { type: 'save_file'; filePath: string | null }
  | { type: 'success' };

export default function BackupScreen() {
  const { colors } = useTheme();
  const { typography, commonStyles, scrollContentContainerWithSafeArea } = useAppStyles();
  const { t } = useTranslation('settings');
  const router = useRouter();

  const [backup, setBackup] = useState<BackupPhase>(() => ({
    type: 'key_display',
    key: generateBackupKey(),
    filePath: null,
    keyCopied: false,
  }));
  const [showCopiedFeedback, setShowCopiedFeedback] = useState(false);

  const copiedFeedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const filePathRef = useRef<string | null>(null);
  const completedRef = useRef(false);

  useEffect(() => {
    const key = (backup as Extract<BackupPhase, { type: 'key_display' }>).key;
    let cancelled = false;

    createBackupForKey(key)
      .then(filePath => {
        if (cancelled) {
          cleanupBackupFile(filePath).catch(() => {});
          return;
        }
        filePathRef.current = filePath;
        setBackup(prev => {
          if (prev.type === 'key_display') return { ...prev, filePath };
          if (prev.type === 'save_file') return { ...prev, filePath };
          return prev;
        });
      })
      .catch(() => {
        if (cancelled) return;
        Alert.alert(t('backup.error.title'), t('backup.error.createFailed'));
        router.back();
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      if (copiedFeedbackTimer.current) clearTimeout(copiedFeedbackTimer.current);
      if (!completedRef.current && filePathRef.current) {
        cleanupBackupFile(filePathRef.current).catch(() => {});
      }
    };
  }, []);

  const screenTitle =
    backup.type === 'key_display'
      ? t('screenTitles.backup')
      : t('screenTitles.backupDownload');

  const handleCopyKey = useCallback(async () => {
    if (backup.type !== 'key_display') return;
    await Clipboard.setStringAsync(backup.key);
    setBackup(prev => {
      if (prev.type !== 'key_display') return prev;
      return { ...prev, keyCopied: true };
    });
    if (copiedFeedbackTimer.current) clearTimeout(copiedFeedbackTimer.current);
    setShowCopiedFeedback(true);
    copiedFeedbackTimer.current = setTimeout(() => setShowCopiedFeedback(false), 2000);
  }, [backup]);

  const handleContinueToFile = useCallback(() => {
    if (backup.type !== 'key_display' || !backup.keyCopied) return;
    setBackup(prev => {
      if (prev.type !== 'key_display' || !prev.keyCopied) return prev;
      return { type: 'save_file', filePath: prev.filePath };
    });
  }, [backup]);

  const handleDownloadBackup = useCallback(async () => {
    if (backup.type !== 'save_file' || !backup.filePath) return;
    const filePath = backup.filePath;
    try {
      await shareBackup(filePath, { dialogTitle: t('backup.shareTitle') });
      completedRef.current = true;
      filePathRef.current = null;
      cleanupBackupFile(filePath).catch(() => {});
      setBackup({ type: 'success' });
    } catch {
      Alert.alert(t('backup.error.title'), t('backup.error.shareFailed'));
    }
  }, [backup, t]);

  const handleBackToSettings = useCallback(() => {
    router.replace('/(tabs)/settings');
  }, [router]);

  const isCentered = backup.type === 'save_file' || backup.type === 'success';

  return (
    <>
      <Stack.Screen options={{ title: screenTitle }} />
      <ScrollView
        style={commonStyles.scrollView}
        contentContainerStyle={[
          scrollContentContainerWithSafeArea,
          isCentered ? styles.centeredContent : { paddingTop: 16 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[commonStyles.sectionContainer, styles.section]}>
          {backup.type === 'key_display' && (
            <View style={styles.stepSection}>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>
                {t('backup.keyLabel')}
              </Text>

              <View style={[styles.keyBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.keyText, { color: colors.textPrimary }]} selectable>
                  {backup.key}
                </Text>
              </View>

              <Button
                variant="outlined"
                color={showCopiedFeedback ? colors.success : colors.primary}
                icon={showCopiedFeedback ? 'checkmark-outline' : 'copy-outline'}
                title={showCopiedFeedback ? t('backup.keyCopied') : t('backup.copyKey')}
                onPress={handleCopyKey}
                fullWidth
              />

              <View
                style={[
                  styles.warningContainer,
                  { borderColor: colors.warning, backgroundColor: colors.warningLight },
                ]}
              >
                <Text style={[typography.bodyBold, { color: colors.warning }]}>
                  {t('backup.keyWarningTitle')}
                </Text>
                <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 4 }]}>
                  {t('backup.keyWarning')}
                </Text>
              </View>

              <Button
                title={t('backup.continueButton')}
                onPress={handleContinueToFile}
                disabled={!backup.keyCopied}
                fullWidth
              />
            </View>
          )}

          {backup.type === 'save_file' && (
            <View style={styles.centeredSection}>
              <Text
                style={[
                  typography.bodyBold,
                  { color: colors.textPrimary, textAlign: 'center', marginBottom: 24 },
                ]}
              >
                {t('backup.downloadReadyTitle')}
              </Text>

              <Button
                title={backup.filePath ? t('backup.downloadButton') : t('backup.preparingFile')}
                onPress={handleDownloadBackup}
                disabled={!backup.filePath}
                loading={!backup.filePath}
                fullWidth
              />
            </View>
          )}

          {backup.type === 'success' && (
            <View style={styles.centeredSection}>
              <Text
                style={[
                  typography.bodyBold,
                  { color: colors.textPrimary, textAlign: 'center', marginBottom: 24 },
                ]}
              >
                {t('backup.successTitle')}
              </Text>

              <Button
                title={t('backup.backToSettings')}
                onPress={handleBackToSettings}
                fullWidth
              />
            </View>
          )}
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  section: {
    padding: 16,
    gap: 12,
    marginBottom: 16,
  },
  stepSection: {
    gap: 12,
  },
  centeredSection: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  centeredContent: {
    flex: 1,
    justifyContent: 'center',
  },
  keyBox: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  keyText: {
    fontSize: 16,
    fontFamily: 'monospace',
    letterSpacing: 1,
    textAlign: 'center',
  },
  warningContainer: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
  },
});
