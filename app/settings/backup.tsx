import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Image } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Stack, useNavigation, useRouter } from 'expo-router';
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
import { InfoIcon } from '../../components/icons/general/info';

type BackupPhase =
  | { type: 'key_display'; key: string; filePath: string | null; keyCopied: boolean }
  | { type: 'save_file'; filePath: string | null }
  | { type: 'success' };

export default function BackupScreen() {
  const { colors } = useTheme();
  const { typography, commonStyles, scrollContentContainerWithSafeArea } = useAppStyles();
  const { t } = useTranslation('settings');
  const router = useRouter();
  const navigation = useNavigation();

  const keyRef = useRef<string>(generateBackupKey());
  const [backup, setBackup] = useState<BackupPhase>(() => ({
    type: 'key_display',
    key: keyRef.current,
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

  useEffect(() => {
    if (backup.type !== 'save_file') return;
    return navigation.addListener('beforeRemove', e => {
      e.preventDefault();
      setBackup({ type: 'key_display', key: keyRef.current, filePath: filePathRef.current, keyCopied: true });
    });
  }, [backup.type, navigation]);

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

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: backup.type === 'success' ? '' : screenTitle,
          headerBackVisible: backup.type !== 'success',
          headerStyle: { backgroundColor: colors.panel },
        }}
      />
      <ScrollView
        style={[commonStyles.scrollView, { backgroundColor: colors.panel, paddingTop: 16 }]}
        contentContainerStyle={[scrollContentContainerWithSafeArea]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View>
          {backup.type === 'key_display' && (
            <View style={styles.stepSection}>
              <View style={styles.illustrationWrapper}>
                <Image
                  source={require('../../assets/images/password.png')}
                  style={styles.illustration}
                  resizeMode="contain"
                />
              </View>

              <View
                style={[
                  styles.keyBox,
                  { backgroundColor: colors.surface, borderColor: colors.neutral150 },
                ]}
              >
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
                <InfoIcon size={20} color={colors.warning} style={styles.warningIcon} />
                <Text style={[typography.body, { color: colors.textSecondary, flex: 1, fontSize: 15, lineHeight: 20, letterSpacing: 0.2 }]}>
                  <Text style={[typography.body, { fontWeight: '600', fontSize: 15, lineHeight: 20, letterSpacing: 0.2 }]}>
                    {t('backup.keyWarningTitle')}
                  </Text>{' '}
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
                  { color: colors.textPrimary, textAlign: 'center', marginBottom: 24, marginTop: 8, paddingHorizontal: 16, fontSize: 24, lineHeight: 28, fontWeight: '500'},
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
                  { color: colors.textPrimary, textAlign: 'center', marginBottom: 24, marginTop: 8, paddingHorizontal: 16, fontSize: 24, lineHeight: 28, fontWeight: '500'},
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
  stepSection: {
    gap: 24,
  },
  centeredSection: {
    alignItems: 'center',
  },
  keyBox: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  keyText: {
    fontSize: 20,
    fontFamily: 'monospace',
    letterSpacing: 1.2,
    textAlign: 'center',
  },
  illustrationWrapper: {
    alignItems: 'center',
    marginBottom: 8,
  },
  illustration: {
    width: 200,
    height: 200,
  },
  warningContainer: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    columnGap: 8,
  },
  warningIcon: {
    marginRight: 3,
  },
});
