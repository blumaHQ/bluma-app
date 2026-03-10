import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../styles/theme';
import { useAppStyles } from '../../hooks/useStyles';
import { validateBackupFile, restoreBackup } from '../../services/backupService';

type RestorePhase =
  | { type: 'idle' }
  | { type: 'entering_key'; fileUri: string; keyInput: string }
  | { type: 'restoring' };

export default function RestoreScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { typography, commonStyles, scrollContentContainerWithSafeArea } = useAppStyles();
  const { t } = useTranslation('settings');

  const [restore, setRestore] = useState<RestorePhase>({ type: 'idle' });

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
                type: '*/*',
                copyToCacheDirectory: true,
              });
              if (result.canceled) return;

              const fileUri = result.assets[0].uri;
              try {
                await validateBackupFile(fileUri);
              } catch (err) {
                const msg = err instanceof Error && err.message === 'UNSUPPORTED_VERSION'
                  ? t('backup.restore.error.unsupportedVersion')
                  : t('backup.restore.error.invalidFile');
                Alert.alert(t('backup.error.title'), msg);
                return;
              }

              setRestore({ type: 'entering_key', fileUri, keyInput: '' });
            } catch {
              Alert.alert(t('backup.error.title'), t('backup.restore.error.pickFailed'));
            }
          },
        },
      ]
    );
  }, [t]);

  const handleRestore = useCallback(async () => {
    if (restore.type !== 'entering_key') return;
    const { fileUri, keyInput } = restore;

    if (!keyInput.trim()) {
      Alert.alert(t('backup.error.title'), t('backup.restore.error.emptyKey'));
      return;
    }

    setRestore({ type: 'restoring' });
    try {
      await restoreBackup(fileUri, keyInput.trim());
      Alert.alert(t('backup.restore.successTitle'), t('backup.restore.successMessage'), [
        {
          text: 'OK',
          onPress: () => {
            setRestore({ type: 'idle' });
            router.replace('/(tabs)');
          },
        },
      ]);
    } catch (err) {
      const msg = err instanceof Error && err.message === 'WRONG_KEY'
        ? t('backup.restore.error.wrongKey')
        : t('backup.restore.error.failed');
      Alert.alert(t('backup.error.title'), msg);
      setRestore({ type: 'entering_key', fileUri, keyInput });
    }
  }, [restore, router, t]);

  return (
    <ScrollView
      style={commonStyles.scrollView}
      contentContainerStyle={[scrollContentContainerWithSafeArea, { paddingTop: 16 }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={[commonStyles.sectionContainer, styles.section]}>
        <View style={styles.sectionHeader}>
          <Ionicons name="cloud-download-outline" size={20} color={colors.primary} />
          <Text style={[typography.bodyBold, { marginLeft: 8, color: colors.textPrimary }]}>
            {t('backup.restoreTitle')}
          </Text>
        </View>

        <Text style={[typography.body, { color: colors.textSecondary }]}>
          {t('backup.restoreDescription')}
        </Text>

        {restore.type === 'idle' && (
          <TouchableOpacity
            style={[styles.secondaryButton, { borderColor: colors.border }]}
            onPress={handlePickFile}
          >
            <Ionicons name="folder-open-outline" size={16} color={colors.textPrimary} />
            <Text style={[typography.bodyBold, { marginLeft: 6, color: colors.textPrimary }]}>
              {t('backup.restoreButton')}
            </Text>
          </TouchableOpacity>
        )}

        {(restore.type === 'entering_key' || restore.type === 'restoring') && (
          <View style={styles.keyInputSection}>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              {t('backup.restore.keyLabel')}
            </Text>
            <TextInput
              style={[
                styles.keyInput,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  color: colors.textPrimary,
                },
              ]}
              value={restore.type === 'entering_key' ? restore.keyInput : ''}
              onChangeText={text =>
                restore.type === 'entering_key' &&
                setRestore({ ...restore, keyInput: text })
              }
              placeholder={t('backup.restore.keyPlaceholder')}
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="characters"
              autoCorrect={false}
              editable={restore.type === 'entering_key'}
            />

            <View style={styles.restoreActions}>
              <TouchableOpacity
                style={[styles.secondaryButton, { borderColor: colors.border, flex: 1 }]}
                onPress={() => setRestore({ type: 'idle' })}
                disabled={restore.type === 'restoring'}
              >
                <Text style={[typography.body, { color: colors.textSecondary }]}>
                  {t('backup.restore.cancel')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: colors.primary, flex: 1 }]}
                onPress={handleRestore}
                disabled={restore.type === 'restoring'}
              >
                {restore.type === 'restoring' ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={[typography.bodyBold, { color: '#fff' }]}>
                    {t('backup.restore.restoreButton')}
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={handlePickFile}>
              <Text style={[typography.caption, { color: colors.primary, textAlign: 'center' }]}>
                {t('backup.restore.pickDifferentFile')}
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
  keyInputSection: {
    gap: 12,
  },
  keyInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
    fontSize: 15,
    fontFamily: 'monospace',
    letterSpacing: 0.5,
  },
  restoreActions: {
    flexDirection: 'row',
    gap: 8,
  },
});

