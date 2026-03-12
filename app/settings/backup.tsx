import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
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
  | { type: 'idle' }
  | { type: 'key_display'; key: string; filePath: string | null; keyCopied: boolean }
  | { type: 'save_file'; filePath: string | null }
  | { type: 'success' };

export default function BackupScreen() {
  const { colors } = useTheme();
  const { typography, commonStyles, scrollContentContainerWithSafeArea } = useAppStyles();
  const { t } = useTranslation('settings');

  const [backup, setBackup] = useState<BackupPhase>({ type: 'idle' });
  const [showCopiedFeedback, setShowCopiedFeedback] = useState(false);
  const copiedFeedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (copiedFeedbackTimer.current) clearTimeout(copiedFeedbackTimer.current); }, []);

  const handleCreateBackup = useCallback(async () => {
    const backupKey = generateBackupKey();
    const backupPromise = createBackupForKey(backupKey);
    setBackup({ type: 'key_display', key: backupKey, filePath: null, keyCopied: false });
    try {
      const filePath = await backupPromise;
      setBackup(prev => {
        if (prev.type === 'key_display') return { ...prev, filePath };
        if (prev.type === 'save_file') return { ...prev, filePath };
        return prev;
      });
    } catch {
      setBackup({ type: 'idle' });
      Alert.alert(t('backup.error.title'), t('backup.error.createFailed'));
    }
  }, [t]);

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

  const handleShareBackup = useCallback(async () => {
    if (backup.type !== 'save_file' || !backup.filePath) return;
    const filePath = backup.filePath;
    try {
      await shareBackup(filePath);
      setBackup({ type: 'success' });
      cleanupBackupFile(filePath).catch(() => {});
    } catch {
      Alert.alert(t('backup.error.title'), t('backup.error.shareFailed'));
    }
  }, [backup, t]);

  const handleDone = useCallback(() => {
    setBackup({ type: 'idle' });
  }, []);

  return (
    <ScrollView
      style={commonStyles.scrollView}
      contentContainerStyle={[scrollContentContainerWithSafeArea, { paddingTop: 16 }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={[commonStyles.sectionContainer, styles.section]}>
        <View style={styles.sectionHeader}>
          <Ionicons name="cloud-upload-outline" size={20} color={colors.primary} />
          <Text style={[typography.bodyBold, { marginLeft: 8, color: colors.textPrimary }]}>
            {t('backup.createTitle')}
          </Text>
        </View>

        <Text style={[typography.body, { color: colors.textSecondary }]}>
          {t('backup.createDescription')}
        </Text>

        {backup.type === 'idle' && (
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: colors.primary }]}
            onPress={handleCreateBackup}
          >
            <Text style={[typography.bodyBold, { color: '#fff' }]}>
              {t('backup.createButton')}
            </Text>
          </TouchableOpacity>
        )}

        {/* ── Step 1: Copy your key ── */}
        {backup.type === 'key_display' && (
          <View style={styles.stepSection}>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              {t('backup.step1Label')}
            </Text>

            <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 4 }]}>
              {t('backup.keyLabel')}
            </Text>

            <View style={[styles.keyBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.keyText, { color: colors.textPrimary }]} selectable>
                {backup.key}
              </Text>
            </View>

            <View
              style={[
                styles.warningContainer,
                { borderColor: colors.warning, backgroundColor: colors.warningLight },
              ]}
            >
              <View style={styles.warningHeader}>
                <Ionicons name="alert-circle-outline" size={16} color={colors.warning} />
                <Text style={[typography.bodyBold, { marginLeft: 6, color: colors.warning }]}>
                  {t('backup.keyWarningTitle')}
                </Text>
              </View>
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 4 }]}>
                {t('backup.keyWarning')}
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.secondaryButton,
                { borderColor: showCopiedFeedback ? colors.success : colors.primary },
              ]}
              onPress={handleCopyKey}
            >
              <Ionicons
                name={showCopiedFeedback ? 'checkmark-outline' : 'copy-outline'}
                size={16}
                color={showCopiedFeedback ? colors.success : colors.primary}
              />
              <Text
                style={[
                  typography.bodyBold,
                  { marginLeft: 6, color: showCopiedFeedback ? colors.success : colors.primary },
                ]}
              >
                {showCopiedFeedback ? t('backup.keyCopied') : t('backup.copyKey')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.primaryButton,
                {
                  backgroundColor: backup.keyCopied ? colors.primary : colors.border,
                  opacity: backup.keyCopied ? 1 : 0.5,
                },
              ]}
              onPress={handleContinueToFile}
              disabled={!backup.keyCopied}
            >
              <Text
                style={[
                  typography.bodyBold,
                  { color: backup.keyCopied ? '#fff' : colors.textSecondary },
                ]}
              >
                {t('backup.continueToFile')}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Step 2: Save backup file ── */}
        {backup.type === 'save_file' && (
          <View style={styles.stepSection}>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              {t('backup.step2Label')}
            </Text>

            <Text style={[typography.body, { color: colors.textSecondary, marginTop: 4 }]}>
              {t('backup.step2Description')}
            </Text>

            <TouchableOpacity
              style={[
                styles.primaryButton,
                {
                  backgroundColor: backup.filePath ? colors.primary : colors.border,
                  opacity: backup.filePath ? 1 : 0.6,
                },
              ]}
              onPress={handleShareBackup}
              disabled={!backup.filePath}
            >
              {!backup.filePath ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <ActivityIndicator size="small" color={colors.textSecondary} />
                  <Text style={[typography.bodyBold, { color: colors.textSecondary }]}>
                    {t('backup.preparingFile')}
                  </Text>
                </View>
              ) : (
                <Text style={[typography.bodyBold, { color: '#fff' }]}>
                  {t('backup.savedBackup')}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* ── Success ── */}
        {backup.type === 'success' && (
          <View style={styles.successSection}>
            <Ionicons name="checkmark-circle" size={48} color={colors.success} />
            <Text style={[typography.bodyBold, { color: colors.textPrimary, marginTop: 12 }]}>
              {t('backup.successTitle')}
            </Text>
            <Text
              style={[
                typography.body,
                { color: colors.textSecondary, textAlign: 'center', marginTop: 4 },
              ]}
            >
              {t('backup.successMessage')}
            </Text>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.primary, marginTop: 8 }]}
              onPress={handleDone}
            >
              <Text style={[typography.bodyBold, { color: '#fff' }]}>
                {t('backup.done')}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  section: {
    padding: 16,
    gap: 12,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepSection: {
    gap: 12,
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
  primaryButton: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  secondaryButton: {
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    borderWidth: 1,
  },
  warningContainer: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  successSection: {
    alignItems: 'center',
    paddingVertical: 8,
    gap: 4,
  },
});
