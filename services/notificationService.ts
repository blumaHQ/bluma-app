import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { PeriodPredictionService } from './periodPredictions';
import { getSetting, getDB } from '../db';
import { periodDates } from '../db/schema';
import { Colors } from '../styles/colors';
import i18n from '../i18n/config';

const NOTIFICATION_SETTINGS_KEYS = {
  BEFORE_PERIOD: 'notifications_period_before',
  DAY_OF_PERIOD: 'notifications_period_day',
  LATE_PERIOD: 'notifications_period_late',
  FERTILITY_WINDOW: 'notifications_fertility_window',
  TIME_HOUR: 'notification_time_hour',
  TIME_MINUTE: 'notification_time_minute',
};

const SECURE_STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
};

// Configure how notifications are handled when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    // Newer SDKs also require these fields on iOS
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export class NotificationService {
  // Check if notifications are enabled in settings
  static async areNotificationsEnabled(): Promise<boolean> {
    try {
      const beforePeriodEnabled = await SecureStore.getItemAsync(NOTIFICATION_SETTINGS_KEYS.BEFORE_PERIOD, SECURE_STORE_OPTIONS);
      const dayOfPeriodEnabled = await SecureStore.getItemAsync(NOTIFICATION_SETTINGS_KEYS.DAY_OF_PERIOD, SECURE_STORE_OPTIONS);
      const latePeriodEnabled = await SecureStore.getItemAsync(NOTIFICATION_SETTINGS_KEYS.LATE_PERIOD, SECURE_STORE_OPTIONS);
      const fertilityWindowEnabled = await SecureStore.getItemAsync(NOTIFICATION_SETTINGS_KEYS.FERTILITY_WINDOW, SECURE_STORE_OPTIONS);

      return (
        beforePeriodEnabled === 'true' ||
        dayOfPeriodEnabled === 'true' ||
        latePeriodEnabled === 'true' ||
        fertilityWindowEnabled === 'true'
      );
    } catch (error) {
      console.error('Failed to read notification settings:', error);
      return false;
    }
  }

  // Check the status of specific notification types
  static async getNotificationSettings(): Promise<{
    beforePeriodEnabled: boolean;
    dayOfPeriodEnabled: boolean;
    latePeriodEnabled: boolean;
    fertilityWindowEnabled: boolean;
  }> {
    try {
      const beforePeriodEnabled =
        (await SecureStore.getItemAsync(NOTIFICATION_SETTINGS_KEYS.BEFORE_PERIOD, SECURE_STORE_OPTIONS)) === 'true';
      const dayOfPeriodEnabled =
        (await SecureStore.getItemAsync(NOTIFICATION_SETTINGS_KEYS.DAY_OF_PERIOD, SECURE_STORE_OPTIONS)) === 'true';
      const latePeriodEnabled =
        (await SecureStore.getItemAsync(NOTIFICATION_SETTINGS_KEYS.LATE_PERIOD, SECURE_STORE_OPTIONS)) === 'true';
      const fertilityWindowEnabled =
        (await SecureStore.getItemAsync(NOTIFICATION_SETTINGS_KEYS.FERTILITY_WINDOW, SECURE_STORE_OPTIONS)) === 'true';

      return {
        beforePeriodEnabled,
        dayOfPeriodEnabled,
        latePeriodEnabled,
        fertilityWindowEnabled,
      };
    } catch (error) {
      console.error('Failed to read notification settings:', error);
      return {
        beforePeriodEnabled: false,
        dayOfPeriodEnabled: false,
        latePeriodEnabled: false,
        fertilityWindowEnabled: false,
      };
    }
  }

  // Save notification settings
  static async saveNotificationSettings(
    beforePeriodEnabled: boolean,
    dayOfPeriodEnabled: boolean,
    latePeriodEnabled: boolean,
    fertilityWindowEnabled: boolean
  ): Promise<void> {
    try {
      await SecureStore.setItemAsync(
        NOTIFICATION_SETTINGS_KEYS.BEFORE_PERIOD,
        beforePeriodEnabled ? 'true' : 'false',
        SECURE_STORE_OPTIONS
      );
      await SecureStore.setItemAsync(
        NOTIFICATION_SETTINGS_KEYS.DAY_OF_PERIOD,
        dayOfPeriodEnabled ? 'true' : 'false',
        SECURE_STORE_OPTIONS
      );
      await SecureStore.setItemAsync(
        NOTIFICATION_SETTINGS_KEYS.LATE_PERIOD,
        latePeriodEnabled ? 'true' : 'false',
        SECURE_STORE_OPTIONS
      );
      await SecureStore.setItemAsync(
        NOTIFICATION_SETTINGS_KEYS.FERTILITY_WINDOW,
        fertilityWindowEnabled ? 'true' : 'false',
        SECURE_STORE_OPTIONS
      );

      if (beforePeriodEnabled || dayOfPeriodEnabled || latePeriodEnabled || fertilityWindowEnabled) {
        await this.init();
        await this.scheduleNotificationsIfDataExists();
      } else {
        await this.cancelPeriodNotifications();
      }
    } catch (error) {
      console.error('Failed to save notification settings:', error);
      throw new Error('Failed to save notification settings. Please try again.');
    }
  }

  // Check notification permission status without requesting
  static async checkPermissionStatus(): Promise<boolean> {
    if (!Device.isDevice) {
      console.log('Must use a physical device for notifications');
      return false;
    }

    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  }

  // Check if period data exists and schedule notifications if it does
  private static async scheduleNotificationsIfDataExists(): Promise<void> {
    try {
      const db = getDB();
      const saved = await db.select().from(periodDates);

      if (saved.length > 0) {
        const sortedDates = saved.map(s => s.date);
        const periods =
          PeriodPredictionService.groupDateIntoPeriods(sortedDates);

        // Find the start date of the most recent period
        if (periods.length > 0) {
          const mostRecentPeriod = periods[0];
          const mostRecentStart = mostRecentPeriod[mostRecentPeriod.length - 1]; // Get the earliest date in the period

          // Schedule notifications based on this data
          await this.schedulePeriodReminder(mostRecentStart, sortedDates);
          // scheduled
        }
      }
    } catch (error) {
      console.error(
        'Error scheduling notifications after settings change:',
        error
      );
    }
  }

  // Initialize notification permissions and channel
  static async init() {
    // Check if notifications are enabled in settings
    const notificationsEnabled = await this.areNotificationsEnabled();

    // Only proceed if notifications are enabled
    if (!notificationsEnabled) {
      return;
    }

    // Set up notification channel for Android
    if (Platform.OS === 'android') {
      await this.setupNotificationChannel();
    }

    // Request permissions
    await this.requestPermissions();
  }

  // Set up Android notification channel
  private static async setupNotificationChannel() {
    await Notifications.setNotificationChannelAsync('period-notifications', {
      name: 'Period Notifications',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: Colors.accentPink,
      description: 'Notifications for period tracking and reminders',
    });
  }

  // Request notification permissions
  static async requestPermissions() {
    if (!Device.isDevice) {
      console.log('Must use a physical device for notifications');
      return false;
    }

    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Failed to get notification permissions');
      return false;
    }

    return true;
  }

  // Schedule a notification for upcoming period
  static async schedulePeriodReminder(
    startDate: string,
    allDates: string[],
    daysBefore: number = 3
  ) {
    const { beforePeriodEnabled, dayOfPeriodEnabled, latePeriodEnabled, fertilityWindowEnabled } =
      await this.getNotificationSettings();

    if (!beforePeriodEnabled && !dayOfPeriodEnabled && !latePeriodEnabled && !fertilityWindowEnabled) {
      return;
    }

    // Cancel any existing period notifications first
    await this.cancelPeriodNotifications();

    // Load user cycle length setting
    const userCycleLengthSetting = await getSetting('userCycleLength');
    const userCycleLength = userCycleLengthSetting
      ? parseInt(userCycleLengthSetting, 10)
      : undefined;

    // Load user notification time preference (default to 10 AM)
    let notificationHour = '10';
    let notificationMinute = '0';
    try {
      notificationHour =
        (await SecureStore.getItemAsync(NOTIFICATION_SETTINGS_KEYS.TIME_HOUR, SECURE_STORE_OPTIONS)) || '10';
      notificationMinute =
        (await SecureStore.getItemAsync(NOTIFICATION_SETTINGS_KEYS.TIME_MINUTE, SECURE_STORE_OPTIONS)) || '0';
    } catch (error) {
      console.error('Failed to read notification time settings, using defaults:', error);
    }

    // Get prediction for next period date (YYYY-MM-DD string)
    const prediction = PeriodPredictionService.getPrediction(
      startDate,
      allDates,
      userCycleLength
    );
    const [py, pm, pd] = prediction.date.split('-').map(Number);
    const predictionDateLocal = new Date(
      py,
      pm - 1,
      pd,
      parseInt(notificationHour),
      parseInt(notificationMinute),
      0
    );

    // Schedule before-period notification if enabled
    if (beforePeriodEnabled) {
      // Calculate the notification time - daysBefore days before the period
      const notificationDate = new Date(predictionDateLocal);
      notificationDate.setDate(notificationDate.getDate() - daysBefore);

      // Don't schedule if the notification date is in the past
      if (notificationDate > new Date()) {
        const dayOfWeek = predictionDateLocal.toLocaleDateString(i18n.language, { weekday: 'long' });
        const formattedDate = predictionDateLocal.toLocaleDateString(i18n.language, { month: 'short', day: 'numeric' });
        
        await Notifications.scheduleNotificationAsync({
          content: {
            title: i18n.t('notifications:periodReminder.title'),
            body: i18n.t('notifications:periodReminder.body', {
              dayOfWeek,
              date: formattedDate,
            }),
            data: { type: 'period_reminder' },
            color: Colors.accentPink,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            channelId:
              Platform.OS === 'android' ? 'period-notifications' : undefined,
            date: notificationDate,
          },
          identifier: 'period-reminder',
        });
      }
    }

    // Schedule day-of notification if enabled
    if (dayOfPeriodEnabled) {
      const periodDate = new Date(predictionDateLocal);

      // Don't schedule if the notification date is in the past
      if (periodDate > new Date()) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: i18n.t('notifications:periodStarting.title'),
            body: i18n.t('notifications:periodStarting.body'),
            data: { type: 'period_start' },
            color: Colors.accentPink,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            channelId:
              Platform.OS === 'android' ? 'period-notifications' : undefined,
            date: periodDate,
          },
          identifier: 'period-start',
        });
      }
    }

    // Schedule fertility window notification if enabled (1 day before window opens = ovulation - 6)
    // Anchored to the next predicted period start, not the last recorded one.
    if (fertilityWindowEnabled) {
      const ovulationDateStr = PeriodPredictionService.getOvulationDay(prediction.date, userCycleLength);
      const [oy, om, od] = ovulationDateStr.split('-').map(Number);
      const fertilityReminderDate = new Date(
        oy,
        om - 1,
        od,
        parseInt(notificationHour),
        parseInt(notificationMinute),
        0
      );
      fertilityReminderDate.setDate(fertilityReminderDate.getDate() - 6);

      if (fertilityReminderDate > new Date()) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: i18n.t('notifications:fertilityWindowReminder.title'),
            body: i18n.t('notifications:fertilityWindowReminder.body'),
            data: { type: 'fertility_window_reminder' },
            color: Colors.accentPink,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            channelId:
              Platform.OS === 'android' ? 'period-notifications' : undefined,
            date: fertilityReminderDate,
          },
          identifier: 'fertility-window-reminder',
        });
      }
    }

    // Schedule late period notification if enabled
    if (latePeriodEnabled) {
      const latePeriodDate = new Date(predictionDateLocal);
      latePeriodDate.setDate(latePeriodDate.getDate() + 1); // 1 day after expected period

      // Don't schedule if the notification date is in the past
      if (latePeriodDate > new Date()) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: i18n.t('notifications:periodLate.title'),
            body: i18n.t('notifications:periodLate.body'),
            data: { type: 'period_late' },
            color: Colors.accentPink,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            channelId:
              Platform.OS === 'android' ? 'period-notifications' : undefined,
            date: latePeriodDate,
          },
          identifier: 'period-late',
        });
      }
    }
  }

  // Cancel previously scheduled period notifications
  static async cancelPeriodNotifications() {
    const scheduledNotifications =
      await Notifications.getAllScheduledNotificationsAsync();

    for (const notification of scheduledNotifications) {
      if (
        notification.identifier === 'period-reminder' ||
        notification.identifier === 'period-start' ||
        notification.identifier === 'period-late' ||
        notification.identifier === 'fertility-window-reminder'
      ) {
        await Notifications.cancelScheduledNotificationAsync(
          notification.identifier
        );
      }
    }
  }

}
