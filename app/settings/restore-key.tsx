import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Image } from 'react-native';
import { Button } from '../../components/Button';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../styles/theme';
import { useAppStyles } from '../../hooks/useStyles';
import { restoreBackup } from '../../services/backupService';

export default function RestoreKeyScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { typography, commonStyles, scrollContentContainerWithSafeArea } = useAppStyles();
  const { t } = useTranslation('settings');
  const { fileUri } = useLocalSearchParams<{ fileUri: string }>();

  const [keyInput, setKeyInput] = useState('');
  const [restoring, setRestoring] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleRestore = useCallback(async () => {
    if (!keyInput.trim()) {
      setErrorMessage(t('backup.restore.error.emptyKey'));
      return;
    }

    setErrorMessage(null);
    setRestoring(true);
    try {
      await restoreBackup(fileUri, keyInput.trim());
      router.replace('/settings/restore-success');
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
      setErrorMessage(msg);
      setRestoring(false);
    }
  }, [fileUri, keyInput, router, t]);

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

        <View style={styles.keyInputSection}>
          <Text
            style={[
              typography.headingMd,
              {
                color: colors.textPrimary,
                fontSize: 28,
                lineHeight: 34,
                fontWeight: '600',
                textAlign: 'center',
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
                borderColor: errorMessage ? colors.error : colors.neutral150,
                color: colors.textPrimary,
                textAlign: 'center',
              },
            ]}
            value={keyInput}
            onChangeText={text => {
              setKeyInput(text);
              if (errorMessage) {
                setErrorMessage(null);
              }
            }}
            placeholder={t('backup.restore.keyPlaceholder')}
            placeholderTextColor={colors.placeholder}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="off"
          />
          {errorMessage ? (
            <Text
              style={[
                typography.caption,
                {
                  color: colors.error,
                  textAlign: 'center',
                  marginTop: -4,
                },
              ]}
            >
              {errorMessage}
            </Text>
          ) : null}
        </View>
          <Button
            title={t('backup.restore.restoreButton')}
            onPress={handleRestore}
            disabled={restoring || !keyInput.trim()}
            loading={restoring}
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
    marginBottom: 8,
  },
  illustration: {
    width: 200,
    height: 200,
  },
  keyInputSection: {
    width: '100%',
    gap: 24,
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
