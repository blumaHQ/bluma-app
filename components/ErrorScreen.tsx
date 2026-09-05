import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { lightColors, darkColors } from '../styles/colors';

interface ErrorScreenProps {
  /** i18n translation key for the primary error message */
  errorKey: string;
  onRetry: () => void;
  onReset: () => void;
}

export function ErrorScreen({ errorKey, onRetry, onReset }: ErrorScreenProps) {
  const { isDark } = useTheme();
  const { t } = useTranslation('common');
  const colors = isDark ? darkColors : lightColors;

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
      backgroundColor: colors.background,
    },
    title: {
      fontSize: 22,
      fontWeight: 'bold',
      marginBottom: 16,
      color: colors.textPrimary,
    },
    message: {
      fontSize: 16,
      marginBottom: 24,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    buttonContainer: {
      flexDirection: 'column',
      gap: 12,
      width: '100%',
      maxWidth: 300,
    },
    buttonPrimary: {
      paddingHorizontal: 24,
      paddingVertical: 12,
      backgroundColor: colors.buttonPrimary,
      borderRadius: 8,
      alignItems: 'center',
    },
    buttonSecondary: {
      paddingHorizontal: 24,
      paddingVertical: 12,
      backgroundColor: 'transparent',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.error,
      alignItems: 'center',
    },
    buttonTextPrimary: {
      color: colors.white,
      fontSize: 16,
      fontWeight: '600',
    },
    buttonTextSecondary: {
      color: colors.error,
      fontSize: 16,
      fontWeight: '600',
    },
  }), [colors]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('errors.database.title')}</Text>
      <Text style={styles.message}>{t(errorKey)}</Text>
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.buttonPrimary}
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel={t('buttons.continue')}
        >
          <Text style={styles.buttonTextPrimary}>{t('buttons.continue')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.buttonSecondary}
          onPress={onReset}
          accessibilityRole="button"
          accessibilityLabel={t('buttons.resetAllData')}
        >
          <Text style={styles.buttonTextSecondary}>{t('buttons.resetAllData')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

