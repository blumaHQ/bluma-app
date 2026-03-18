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
import { AnimatedCheckmark } from '../../components/AnimatedCheckmark';

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
    const key = keyRef.current;
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
      .catch(err => {
        if (cancelled) return;
        console.error('[BackupScreen] createBackupForKey failed:', err);
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
    } catch (err) {
      if (err instanceof Error && err.message === 'SHARE_CANCELLED') return;
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
          headerShown: backup.type !== 'success',
          headerTitle: backup.type === 'success' ? '' : screenTitle,
          headerBackVisible: backup.type !== 'success',
        }}
      />
      <ScrollView
        style={[commonStyles.scrollView, { backgroundColor: colors.panel}]}
        contentContainerStyle={[
          scrollContentContainerWithSafeArea,
          backup.type === 'success' && styles.successScrollContainer,
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
  
        <View
          style={[
            styles.contentContainer,
            backup.type !== 'success' && styles.contentContainerWithTopMargin,
          ]}
        >
          {backup.type === 'key_display' && (
            <>
              <View style={styles.illustrationWrapper}>
                <Image
                  source={require('../../assets/images/password.png')}
                  style={styles.illustration}
                  resizeMode="contain"
                />
              </View>

              <View style={[styles.copyKeyContainer, { backgroundColor: colors.surfaceVariant3}]}>
                <View
                  style={[
                    styles.keyBox,
                    { backgroundColor: colors.surfaceVariant4},
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
              </View>

              <View
                style={[
                  styles.warningContainer,
                  { borderColor: colors.warning, backgroundColor: colors.warningLight },
                ]}
              >
                <InfoIcon size={20} color={colors.warning} style={styles.warningIcon} />
                <Text
                  style={[
                    typography.body,
                    {
                      color: colors.textSecondary,
                      flex: 1,
                      fontSize: 15,
                      lineHeight: 20,
                      letterSpacing: 0.2,
                    },
                  ]}
                >
                  <Text
                    style={[
                      typography.body,
                      {
                        fontWeight: '600',
                        fontSize: 15,
                        lineHeight: 20,
                        letterSpacing: 0.2,
                      },
                    ]}
                  >
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
            </>
          )}

          {backup.type === 'save_file' && (
            <View style={[styles.contentContainer, styles.contentContainerWithTopMargin]}>
            <View style={styles.illustrationWrapper}>
              <Image
                source={require('../../assets/images/password.png')}
                style={styles.illustration}
                resizeMode="contain"
              />
            </View>

              <View style={styles.titleButtonContainer}>
              <Text
                style={[
                  typography.headingMd,
                  { color: colors.textPrimary, fontSize: 28, lineHeight: 34, fontWeight: '600', textAlign: 'center'},
                ]}
              >
                {t('backup.downloadReadyTitle')}
              </Text>

              <Text
                style={[
                  typography.body,
                  { color: colors.textSecondary, textAlign: 'center' },
                ]}
              >
                {t('backup.downloadKeyReminder')}
              </Text>

              <Button
                title={backup.filePath ? t('backup.downloadButton') : t('backup.preparingFile')}
                onPress={handleDownloadBackup}
                disabled={!backup.filePath}
                loading={!backup.filePath}
                fullWidth
              />
            </View>
            </View>
          )}

          {backup.type === 'success' && (
            <View style={styles.successSection}>
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
                {t('backup.successTitle')}
              </Text>

              <Button title={t('backup.backToSettings')} onPress={handleBackToSettings} fullWidth />
            </View>
          )}
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    gap: 16,
  },
  contentContainerWithTopMargin: {
    marginTop: 24,
  },
  successScrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  successSection: {
    alignItems: 'center',
    gap: 24,
    paddingHorizontal: 16,
  },
  copyKeyContainer: {
    gap: 16,
    padding: 16,
    borderRadius: 8,
  },
  titleButtonContainer: {
    paddingHorizontal: 16,
    gap: 32,
    alignItems: 'center',
    },
  keyBox: {
    padding: 16,
    borderRadius: 8,
  },
  keyText: {
    fontSize: 19,
    fontFamily: 'monospace',
    letterSpacing: 1.2,
    textAlign: 'center',
  },
  illustrationWrapper: {
    alignItems: 'center',
  },
  illustration: {
    width: 200,
    height: 200,
    marginBottom: 8,
  },
  warningContainer: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    columnGap: 8,
    marginBottom: 16,
  },
  warningIcon: {
    marginRight: 3,
  },
});
