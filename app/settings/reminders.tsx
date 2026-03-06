import React, { useState, useEffect } from 'react';
import {
  Text,
  View,
  StyleSheet,
  Switch,
  ScrollView,
  Platform,
  ActivityIndicator,
  Alert,
  Linking,
  TouchableOpacity,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import * as SecureStore from 'expo-secure-store';
import DateTimePicker from '@react-native-community/datetimepicker';
import { NotificationService } from '../../services/notificationService';
import { NOTIFICATION_SETTINGS_KEYS } from '../../constants/notificationKeys';
import { useTheme } from '../../styles/theme';
import { useAppStyles } from '../../hooks/useStyles';
import { formatTime } from '../../utils/localeUtils';
import { parseSafeHour, parseSafeMinute } from '../../utils/dateUtils';
import { useAuth } from '../../contexts/AuthContext';

export default function Reminders() {
  const { colors } = useTheme();
  const { typography, commonStyles, scrollContentContainerWithSafeArea } = useAppStyles();
  const { t } = useTranslation('settings');
  const { startPermissionRequest, endPermissionRequest } = useAuth();
  const [beforePeriodEnabled, setBeforePeriodEnabled] = useState(false);
  const [dayOfPeriodEnabled, setDayOfPeriodEnabled] = useState(false);
  const [latePeriodEnabled, setLatePeriodEnabled] = useState(false);
  const [fertilityWindowEnabled, setFertilityWindowEnabled] = useState(false);
  const [notificationTime, setNotificationTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    text: string;
    isError: boolean;
  } | null>(null);

  // Load notification settings on mount
  useEffect(() => {
    async function loadSettings() {
      try {
        const settings = await NotificationService.getNotificationSettings();
        setBeforePeriodEnabled(settings.beforePeriodEnabled);
        setDayOfPeriodEnabled(settings.dayOfPeriodEnabled);
        setLatePeriodEnabled(settings.latePeriodEnabled);
        setFertilityWindowEnabled(settings.fertilityWindowEnabled);

        // Load notification time (default to 10 AM)
        const rawHour = (await SecureStore.getItemAsync(NOTIFICATION_SETTINGS_KEYS.TIME_HOUR, { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK })) || '10';
        const rawMinute = (await SecureStore.getItemAsync(NOTIFICATION_SETTINGS_KEYS.TIME_MINUTE, { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK })) || '0';
        const timeDate = new Date();
        timeDate.setHours(parseSafeHour(rawHour), parseSafeMinute(rawMinute), 0, 0);
        setNotificationTime(timeDate);
      } catch (error) {
        console.error('Failed to load notification settings:', error);
        setStatusMessage({
          text: t('reminderSettings.loadError'),
          isError: true,
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadSettings();
  }, [t]);

  // Clear status message after 3 seconds
  useEffect(() => {
    if (statusMessage) {
      const timer = setTimeout(() => {
        setStatusMessage(null);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [statusMessage]);

  // Show permission settings dialog
  const showPermissionSettingsDialog = () => {
    Alert.alert(
      t('reminderSettings.permissionDialog.title'),
      t('reminderSettings.permissionDialog.message'),
      [
        {
          text: t('reminderSettings.permissionDialog.cancel'),
          style: 'cancel',
        },
        {
          text: t('reminderSettings.permissionDialog.openSettings'),
          onPress: () => Linking.openSettings(),
        },
      ]
    );
  };

  type ReminderFlags = {
    beforePeriod: boolean;
    dayOfPeriod: boolean;
    latePeriod: boolean;
    fertilityWindow: boolean;
  };

  const toggleWithPermission = async (
    value: boolean,
    setter: (v: boolean) => void,
    flags: ReminderFlags
  ) => {
    if (!value) {
      setIsSaving(true);
      try {
        setter(value);
        await saveSettings(flags);
      } catch (error) {
        console.error('Error disabling notification:', error);
        setter(!value);
        setStatusMessage({ text: t('reminderSettings.updateError'), isError: true });
      } finally {
        setIsSaving(false);
      }
      return;
    }

    setIsSaving(true);
    try {
      let hasPermission = await NotificationService.checkPermissionStatus();

      if (!hasPermission) {
        startPermissionRequest();
        try {
          hasPermission = await NotificationService.requestPermissions();
        } finally {
          endPermissionRequest();
        }
      }

      if (hasPermission) {
        setter(value);
        await saveSettings(flags);
      } else {
        showPermissionSettingsDialog();
      }
    } catch (error) {
      console.error('Error toggling notification:', error);
      setStatusMessage({ text: t('reminderSettings.updateError'), isError: true });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleFertilityWindow = (value: boolean) =>
    toggleWithPermission(value, setFertilityWindowEnabled, {
      beforePeriod: beforePeriodEnabled,
      dayOfPeriod: dayOfPeriodEnabled,
      latePeriod: latePeriodEnabled,
      fertilityWindow: value,
    });

  const toggleBeforePeriod = (value: boolean) =>
    toggleWithPermission(value, setBeforePeriodEnabled, {
      beforePeriod: value,
      dayOfPeriod: dayOfPeriodEnabled,
      latePeriod: latePeriodEnabled,
      fertilityWindow: fertilityWindowEnabled,
    });

  const toggleDayOfPeriod = (value: boolean) =>
    toggleWithPermission(value, setDayOfPeriodEnabled, {
      beforePeriod: beforePeriodEnabled,
      dayOfPeriod: value,
      latePeriod: latePeriodEnabled,
      fertilityWindow: fertilityWindowEnabled,
    });

  const toggleLatePeriod = (value: boolean) =>
    toggleWithPermission(value, setLatePeriodEnabled, {
      beforePeriod: beforePeriodEnabled,
      dayOfPeriod: dayOfPeriodEnabled,
      latePeriod: value,
      fertilityWindow: fertilityWindowEnabled,
    });

  // Handle time picker change
  const handleTimeChange = async (event: any, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime) {
      const previousTime = notificationTime;
      setNotificationTime(selectedTime);
      const secureStoreOptions = { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK };
      try {
        await SecureStore.setItemAsync(NOTIFICATION_SETTINGS_KEYS.TIME_HOUR, selectedTime.getHours().toString(), secureStoreOptions);
        await SecureStore.setItemAsync(NOTIFICATION_SETTINGS_KEYS.TIME_MINUTE, selectedTime.getMinutes().toString(), secureStoreOptions);
        await NotificationService.rescheduleNotifications();
      } catch {
        setNotificationTime(previousTime);
        try {
          await SecureStore.setItemAsync(NOTIFICATION_SETTINGS_KEYS.TIME_HOUR, previousTime.getHours().toString(), secureStoreOptions);
          await SecureStore.setItemAsync(NOTIFICATION_SETTINGS_KEYS.TIME_MINUTE, previousTime.getMinutes().toString(), secureStoreOptions);
          await NotificationService.rescheduleNotifications();
        } catch (rollbackError) {
          console.error('Failed to rollback notification time in SecureStore:', rollbackError);
        }
        setStatusMessage({ text: t('reminderSettings.updateError'), isError: true });
      }
    }
  };

  // Format time for display (using locale-aware helper)
  const formatTimeDisplay = (date: Date) => {
    return formatTime(date);
  };

  const saveSettings = async ({ beforePeriod, dayOfPeriod, latePeriod, fertilityWindow }: ReminderFlags) => {
    setIsSaving(true);
    try {
      await NotificationService.saveNotificationSettings(beforePeriod, dayOfPeriod, latePeriod, fertilityWindow);
    } catch (error) {
      console.error('Failed to save notification settings:', error);
      const settings = await NotificationService.getNotificationSettings();
      setBeforePeriodEnabled(settings.beforePeriodEnabled);
      setDayOfPeriodEnabled(settings.dayOfPeriodEnabled);
      setLatePeriodEnabled(settings.latePeriodEnabled);
      setFertilityWindowEnabled(settings.fertilityWindowEnabled);

      setStatusMessage({
        text: t('reminderSettings.updateError'),
        isError: true,
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[typography.body, { marginTop: 16 }]}>
          {t('reminderSettings.loading')}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
    style={[commonStyles.scrollView]}
    contentContainerStyle={[scrollContentContainerWithSafeArea, { paddingTop: 8 }]}
    showsVerticalScrollIndicator={false}
  >
      {statusMessage && (
        <View
          style={[
            styles.statusMessage,
            statusMessage.isError ? styles.errorMessage : styles.successMessage,
          ]}
        >
          <Text style={[typography.body, { textAlign: 'center' }]}>
            {statusMessage.text}
          </Text>
        </View>
      )}

      <View style={[styles.section, { backgroundColor: colors.surface }]}>
        <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
          <Text
            style={[
              typography.body,
              { flexShrink: 1, paddingRight: 12, flex: 1 },
            ]}
          >
            {t('reminderSettings.beforePeriod')}
          </Text>
          <Switch
            value={beforePeriodEnabled}
            onValueChange={toggleBeforePeriod}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={Platform.OS === 'ios' ? undefined : colors.white}
            ios_backgroundColor={colors.border}
            disabled={isSaving}
          />
        </View>

        <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
          <Text
            style={[
              typography.body,
              { flexShrink: 1, paddingRight: 12, flex: 1 },
            ]}
          >
            {t('reminderSettings.dayOfPeriod')}
          </Text>
          <Switch
            value={dayOfPeriodEnabled}
            onValueChange={toggleDayOfPeriod}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={Platform.OS === 'ios' ? undefined : colors.white}
            ios_backgroundColor={colors.border}
            disabled={isSaving}
          />
        </View>

        <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
          <Text
            style={[
              typography.body,
              { flexShrink: 1, paddingRight: 12, flex: 1 },
            ]}
          >
            {t('reminderSettings.latePeriod')}
          </Text>
          <Switch
            value={latePeriodEnabled}
            onValueChange={toggleLatePeriod}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={Platform.OS === 'ios' ? undefined : colors.white}
            ios_backgroundColor={colors.border}
            disabled={isSaving}
          />
        </View>

        <View style={[styles.settingRow, styles.lastRow]}>
          <Text
            style={[
              typography.body,
              { flexShrink: 1, paddingRight: 12, flex: 1 },
            ]}
          >
            {t('reminderSettings.fertilityWindow')}
          </Text>
          <Switch
            value={fertilityWindowEnabled}
            onValueChange={toggleFertilityWindow}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={Platform.OS === 'ios' ? undefined : colors.white}
            ios_backgroundColor={colors.border}
            disabled={isSaving}
            accessibilityRole="switch"
            accessibilityLabel={t('reminderSettings.fertilityWindow')}
            accessibilityHint={t('reminderSettings.fertilityWindowHint')}
          />
        </View>
      </View>

      <View style={[styles.section, { backgroundColor: colors.surface }]}>
        <TouchableOpacity
          style={[styles.settingRow, styles.lastRow]}
          onPress={() => setShowTimePicker(true)}
          disabled={isSaving}
        >
          <Text
            style={[
              typography.body,
              { flexShrink: 1, paddingRight: 12, flex: 1 },
            ]}
          >
            {t('reminderSettings.reminderTime')}
          </Text>
          <Text
            style={[
              typography.body,
              { color: colors.primary, fontWeight: '500' },
            ]}
          >
            {formatTimeDisplay(notificationTime)}
          </Text>
        </TouchableOpacity>
      </View>

      {showTimePicker && (
        <DateTimePicker
          value={notificationTime}
          mode="time"
          onChange={handleTimeChange}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginBottom: 24,
    borderRadius: 8,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  statusMessage: {
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 16,
    marginTop: 16,
  },
  successMessage: {
    backgroundColor: '#e7f7ed',
  },
  errorMessage: {
    backgroundColor: '#ffeded',
  },
});