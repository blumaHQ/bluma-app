import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { Button } from '../../components/Button';
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
  | { type: 'restoring'; fileUri: string; keyInput: string };

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
                type: 'application/octet-stream',
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

    setRestore({ type: 'restoring', fileUri, keyInput });
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
      let msg = t('backup.restore.error.failed');
      if (err instanceof Error) {
        switch (err.message) {
          case 'WRONG_KEY':
            msg = t('backup.restore.error.wrongKey');
            break;
          case 'INVALID_FILE':
            msg = t('backup.restore.error.invalidFile');
            break;
          case 'UNSUPPORTED_VERSION':
          case 'UNSUPPORTED_SCHEMA':
            msg = t('backup.restore.error.unsupportedVersion');
            break;
        }
      }
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
          <Button
            variant="outlined"
            icon="folder-open-outline"
            title={t('backup.restoreButton')}
            onPress={handlePickFile}
            fullWidth
          />
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
              value={restore.keyInput}
              onChangeText={text =>
                restore.type === 'entering_key' &&
                setRestore({ ...restore, keyInput: text })
              }
              placeholder={t('backup.restore.keyPlaceholder')}
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="off"
            />

            <View style={styles.restoreActions}>
              <Button
                variant="outlined"
                title={t('backup.restore.cancel')}
                onPress={() => setRestore({ type: 'idle' })}
                disabled={restore.type === 'restoring'}
                style={{ flex: 1 }}
              />
              <Button
                title={t('backup.restore.restoreButton')}
                onPress={handleRestore}
                disabled={restore.type === 'restoring'}
                loading={restore.type === 'restoring'}
                style={{ flex: 1 }}
              />
            </View>

            <Button
              variant="text"
              title={t('backup.restore.pickDifferentFile')}
              onPress={handlePickFile}
              disabled={restore.type === 'restoring'}
            />
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

