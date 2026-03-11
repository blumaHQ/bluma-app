import React, { useState, useCallback } from 'react';
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
  | { type: 'key_display'; key: string; filePath: string | null; keyCopied: boolean; shared: boolean };

export default function BackupScreen() {
  const { colors } = useTheme();
  const { typography, commonStyles, scrollContentContainerWithSafeArea } = useAppStyles();
  const { t } = useTranslation('settings');

  const [backup, setBackup] = useState<BackupPhase>({ type: 'idle' });

  const handleCreateBackup = useCallback(async () => {
    const backupKey = generateBackupKey();
    const backupPromise = createBackupForKey(backupKey);
    setBackup({ type: 'key_display', key: backupKey, filePath: null, keyCopied: false, shared: false });
    try {
      const filePath = await backupPromise;
      setBackup(prev =>
        prev.type === 'key_display' ? { ...prev, filePath } : prev
      );
    } catch {
      setBackup({ type: 'idle' });
      Alert.alert(t('backup.error.title'), t('backup.error.createFailed'));
    }
  }, [t]);

  const handleCopyKey = useCallback(async () => {
    if (backup.type !== 'key_display') return;
    await Clipboard.setStringAsync(backup.key);
    setBackup({ ...backup, keyCopied: true });
  }, [backup]);

  const handleShareBackup = useCallback(async () => {
    if (backup.type !== 'key_display' || !backup.filePath) return;
    try {
      await shareBackup(backup.filePath);
      setBackup({ ...backup, shared: true });
    } catch {
      Alert.alert(t('backup.error.title'), t('backup.error.shareFailed'));
    }
  }, [backup, t]);

  const handleDoneBackup = useCallback(async () => {
    if (backup.type === 'key_display' && backup.filePath) {
      try {
        await cleanupBackupFile(backup.filePath);
      } catch {
        // Cleanup failure is non-critical; cache will be cleared eventually
      }
    }
    setBackup({ type: 'idle' });
  }, [backup]);

  return (
    <ScrollView
      style={commonStyles.scrollView}
      contentContainerStyle={[scrollContentContainerWithSafeArea, { paddingTop: 16 }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* ── Create Backup ── */}
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

        {backup.type === 'key_display' && (
          <View style={styles.keySection}>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
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
                {
                  borderColor: colors.warning,
                  backgroundColor: colors.warningLight,
                },
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
                { borderColor: backup.keyCopied ? colors.success : colors.primary },
              ]}
              onPress={handleCopyKey}
            >
              <Ionicons
                name={backup.keyCopied ? 'checkmark-outline' : 'copy-outline'}
                size={16}
                color={backup.keyCopied ? colors.success : colors.primary}
              />
              <Text
                style={[
                  typography.bodyBold,
                  { marginLeft: 6, color: backup.keyCopied ? colors.success : colors.primary },
                ]}
              >
                {backup.keyCopied ? t('backup.keyCopied') : t('backup.copyKey')}
              </Text>
            </TouchableOpacity>

            {backup.shared ? (
              <View style={styles.sharedActions}>
                <TouchableOpacity
                  style={[styles.secondaryButton, { borderColor: colors.border }]}
                  onPress={handleShareBackup}
                >
                  <Ionicons name="share-outline" size={16} color={colors.textSecondary} />
                  <Text style={[typography.body, { marginLeft: 6, color: colors.textSecondary }]}>
                    {t('backup.shareAgain')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.primaryButton, { backgroundColor: colors.primary }]}
                  onPress={handleDoneBackup}
                >
                  <Text style={[typography.bodyBold, { color: '#fff' }]}>
                    {t('backup.done')}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  {
                    backgroundColor: backup.keyCopied && backup.filePath ? colors.primary : colors.border,
                    opacity: backup.keyCopied && backup.filePath ? 1 : 0.6,
                  },
                ]}
                onPress={handleShareBackup}
                disabled={!backup.keyCopied || !backup.filePath}
              >
                {!backup.filePath ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <ActivityIndicator size="small" color={colors.textSecondary} />
                    <Text style={[typography.bodyBold, { color: colors.textSecondary }]}>
                      {t('backup.preparingFile')}
                    </Text>
                  </View>
                ) : (
                  <Text style={[typography.bodyBold, { color: backup.keyCopied ? '#fff' : colors.textSecondary }]}>
                    {t('backup.savedBackup')}
                  </Text>
                )}
              </TouchableOpacity>
            )}
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
  keySection: {
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
  sharedActions: {
    gap: 8,
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
});
