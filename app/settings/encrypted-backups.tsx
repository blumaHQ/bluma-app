import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../styles/theme';
import { useAppStyles } from '../../hooks/useStyles';

export default function EncryptedBackupsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { typography, commonStyles } = useAppStyles();
  const { t } = useTranslation('settings');

  return (
    <View style={[commonStyles.scrollView, { paddingTop: 16 }]}>
      <View style={[commonStyles.sectionContainer, { padding: 0 }]}>
        <TouchableOpacity
          style={[styles.row, { borderBottomColor: colors.border }]}
          onPress={() => router.push('/settings/backup')}
        >
          <View style={styles.iconContainer}>
            <Ionicons name="arrow-up-outline" size={24} color={colors.neutral200} />
          </View>
          <Text style={[typography.bodyLg, { flex: 1 }]}>
            {t('backup.settingsRowBackup')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.row, styles.lastRow]}
          onPress={() => router.push('/settings/restore-file')}
        >
          <View style={styles.iconContainer}>
            <Ionicons name="download-outline" size={24} color={colors.neutral200} />
          </View>
          <Text style={[typography.bodyLg, { flex: 1 }]}>
            {t('backup.settingsRowRestore')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomWidth: 1,
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  iconContainer: {
    marginRight: 12,
  },
});
