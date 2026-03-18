import React, { useState } from 'react';
import {
  Text,
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  DeviceEventEmitter,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../styles/theme';
import { useAppStyles } from '../../hooks/useStyles';
import { ThemeSelectionModal } from '../../components/ThemeSelectionModal';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { DataDeletionService } from '../../services/dataDeletionService';
import { useNotes } from '../../contexts/NotesContext';
import { useAuth } from '../../contexts/AuthContext';

function SettingsIcon({ name, ...props }: { name: keyof typeof Ionicons.glyphMap } & Partial<React.ComponentProps<typeof Ionicons>>) {
  const { colors } = useTheme();
  return <Ionicons name={name} size={24} color={colors.neutral200} {...props} />;
}

function ChevronIcon({ ...props }: Partial<React.ComponentProps<typeof Ionicons>>) {
  const { colors } = useTheme();
  return <Ionicons name="chevron-forward" size={24} color={colors.textPrimary} {...props} />;
}

export default function Settings() {
  const router = useRouter();
  const { colors, themeMode } = useTheme();
  const { typography, commonStyles } = useAppStyles();
  const { clearNotes } = useNotes();
  const { refreshLockStatus } = useAuth();
  const { t } = useTranslation('settings');
  const [themeModalVisible, setThemeModalVisible] = useState(false);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);

  return (
    <ScrollView
      style={[commonStyles.scrollView]}
      contentContainerStyle={commonStyles.scrollContentContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ marginBottom: 8 }}>
        <Text style={typography.caption}>{t('sections.general')}</Text>
      </View>

      <View style={[commonStyles.sectionContainer, { padding: 0 }]}>
        <TouchableOpacity
          style={[styles.settingRow, { borderBottomColor: colors.border }]}
          onPress={() => router.push('/settings/reminders')}
        >
          <View style={styles.iconContainer}>
            <SettingsIcon name="alarm-outline" />
          </View>
          <Text style={[typography.bodyLg, { flex: 1 }]}>
            {t('reminders')}
          </Text>
          <ChevronIcon />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.settingRow, { borderBottomColor: colors.border }]}
          onPress={() => setThemeModalVisible(true)}
        >
          <View style={styles.iconContainer}>
            <SettingsIcon name="color-palette-outline" />
          </View>
          <Text style={[typography.bodyLg, { flex: 1 }]}>
            {t('theme')}
          </Text>
          <Text style={[typography.bodyLg, { color: colors.textSecondary }]}>
            {themeMode === 'system'
              ? t('themeOptions.system')
              : themeMode === 'light'
                ? t('themeOptions.light')
                : t('themeOptions.dark')}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={{ marginTop: 24, marginBottom: 8 }}>
        <Text style={typography.caption}>{t('sections.dataAndPrivacy')}</Text>
      </View>

      <View style={[commonStyles.sectionContainer, { padding: 0 }]}>
        <TouchableOpacity
          style={[styles.settingRow, { borderBottomColor: colors.border }]}
          onPress={() => router.push('/settings/app-lock')}
        >
          <View style={styles.iconContainer}>
            <SettingsIcon name="lock-closed-outline" />
          </View>
          <Text style={[typography.bodyLg, { flex: 1 }]}>
            {t('appLock')}
          </Text>
          <ChevronIcon />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.settingRow, { borderBottomColor: colors.border }]}
          onPress={() => router.push('/settings/encrypted-backups')}
        >
          <View style={styles.iconContainer}>
            <SettingsIcon name="shield-outline" />
          </View>
          <Text style={[typography.bodyLg, { flex: 1 }]}>
            {t('backup.settingsRowEncryptedBackups')}
          </Text>
          <ChevronIcon />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.settingRow, styles.lastRow]}
          onPress={() => setDeleteDialogVisible(true)}
        >
          <View style={styles.iconContainer}>
            <SettingsIcon name="trash-outline" color={colors.error} />
          </View>
          <Text
            style={[
              typography.bodyLg,
              { flex: 1, color: colors.error },
            ]}
          >
            {t('deleteData')}
          </Text>
          <ChevronIcon color={colors.error} />
        </TouchableOpacity>
      </View>

      <View style={{ marginTop: 24, marginBottom: 8 }}>
        <Text style={typography.caption}>{t('sections.app')}</Text>
      </View>

      <View style={[commonStyles.sectionContainer, { padding: 0 }]}>
        <TouchableOpacity
          style={[styles.settingRow, { borderBottomColor: colors.border }]}
          onPress={() => router.push('/settings/privacy-policy')}
        >
          <View style={styles.iconContainer}>
            <SettingsIcon name="document-text-outline" />
          </View>
          <Text style={[typography.bodyLg, { flex: 1 }]}>
            {t('privacyPolicy')}
          </Text>
          <ChevronIcon />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.settingRow, styles.lastRow]}
          onPress={() => router.push('/settings/about')}
        >
          <View style={styles.iconContainer}>
            <SettingsIcon name="information-circle-outline" />
          </View>
          <Text style={[typography.bodyLg, { flex: 1 }]}>
            {t('about')}
          </Text>
          <ChevronIcon />
        </TouchableOpacity>
      </View>

      <ThemeSelectionModal
        visible={themeModalVisible}
        onClose={() => setThemeModalVisible(false)}
      />

      <ConfirmDialog
        visible={deleteDialogVisible}
        title={t('deleteDataConfirm.title')}
        message={t('deleteDataConfirm.message')}
        confirmLabel={t('deleteDataConfirm.delete')}
        cancelLabel={t('deleteDataConfirm.cancel')}
        onConfirm={async () => {
          setDeleteDialogVisible(false);
          try {
            await DataDeletionService.deleteAllUserData();
            clearNotes();
            await refreshLockStatus();

            DeviceEventEmitter.emit('dataDeleted');

            Toast.show({
              type: 'success',
              text1: t('deleteDataConfirm.successMessage'),
              visibilityTime: 3000,
              onShow: () => setTimeout(() => router.replace('/onboarding'), 1000),
            });
          } catch (error) {
            console.error('Failed to delete user data:', error);
            Toast.show({
              type: 'error',
              text1: t('deleteDataConfirm.error'),
              text2: t('deleteDataConfirm.errorMessage'),
            });
          }
        }}
        onCancel={() => setDeleteDialogVisible(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    marginRight: 12,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomWidth: 1,
  },
  lastRow: {
    borderBottomWidth: 0,
  },
});

