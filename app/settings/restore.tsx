import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  Image,
} from 'react-native';
import { Button } from '../../components/Button';
import * as DocumentPicker from 'expo-document-picker';
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
      style={[commonStyles.scrollView, { backgroundColor: colors.surface, paddingTop: 16 }]}
      contentContainerStyle={scrollContentContainerWithSafeArea}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View>
        {restore.type === 'idle' && (
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
                {
                  color: colors.textPrimary,
                  textAlign: 'center',
                  marginBottom: 24,
                  marginTop: 8,
                  paddingHorizontal: 16,
                  fontSize: 24,
                  lineHeight: 28,
                  fontWeight: '500',
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
        )}

        {(restore.type === 'entering_key' || restore.type === 'restoring') && (
          <View style={styles.centeredSection}>
            <View style={styles.illustrationWrapper}>
              <Image
                source={require('../../assets/images/password.png')}
                style={styles.illustration}
                resizeMode="contain"
              />
            </View>
            <View style={styles.keyInputSection}>
              <Text
                style={[
                  typography.headingMd,
                  {
                    color: colors.textPrimary,
                    textAlign: 'center',
                    marginBottom: 16,
                    marginTop: 8,
                    paddingHorizontal: 16,
                    fontSize: 24,
                    lineHeight: 28,
                    fontWeight: '500',
                  },
                ]}
              >
                {t('backup.restore.keyLabel')}
              </Text>
              <TextInput
                style={[
                  styles.keyInput,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.neutral150,
                    color: colors.textPrimary,
                    textAlign: 'center',
                  },
                ]}
                value={restore.keyInput}
                onChangeText={text =>
                  restore.type === 'entering_key' &&
                  setRestore({ ...restore, keyInput: text })
                }
                placeholder={t('backup.restore.keyPlaceholder')}
                placeholderTextColor={colors.placeholder}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="off"
              />

              <Button
                title={t('backup.restore.restoreButton')}
                onPress={handleRestore}
                disabled={restore.type === 'restoring'}
                loading={restore.type === 'restoring'}
                fullWidth
              />
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centeredSection: {
    alignItems: 'center',
  },
  illustrationWrapper: {
    alignItems: 'center',
    marginBottom: 8,
  },
  illustration: {
    width: 190,
    height: 170,
  },
  keyInputSection: {
    gap: 12,
    width: '100%',
  },
  keyInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
    fontSize: 20,
    fontFamily: 'monospace',
    letterSpacing: 0.8,
    marginBottom: 8,

  },
});

