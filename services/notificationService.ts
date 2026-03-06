import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { PeriodPredictionService } from './periodPredictions';
import { getSetting, getDB } from '../db';
import { periodDates } from '../db/schema';
import { Colors } from '../styles/colors';
import i18n from '../i18n/config';
import { NOTIFICATION_SETTINGS_KEYS } from '../constants/notificationKeys';
import { parseSafeHour, parseSafeMinute } from '../utils/dateUtils';

const SECURE_STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
};

// Configure how notifications are handled when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export class NotificationService {
  // Check if notifications are enabled in settings
  static async areNotificationsEnabled(): Promise<boolean> {
    try {
      const [beforePeriodEnabled, dayOfPeriodEnabled, latePeriodEnabled, fertilityWindowEnabled] =
        await Promise.all([
          SecureStore.getItemAsync(NOTIFICATION_SETTINGS_KEYS.BEFORE_PERIOD, SECURE_STORE_OPTIONS),
          SecureStore.getItemAsync(NOTIFICATION_SETTINGS_KEYS.DAY_OF_PERIOD, SECURE_STORE_OPTIONS),
          SecureStore.getItemAsync(NOTIFICATION_SETTINGS_KEYS.LATE_PERIOD, SECURE_STORE_OPTIONS),
          SecureStore.getItemAsync(NOTIFICATION_SETTINGS_KEYS.FERTILITY_WINDOW, SECURE_STORE_OPTIONS),
        ]);

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
      const [beforePeriod, dayOfPeriod, latePeriod, fertilityWindow] =
        await Promise.all([
          SecureStore.getItemAsync(NOTIFICATION_SETTINGS_KEYS.BEFORE_PERIOD, SECURE_STORE_OPTIONS),
          SecureStore.getItemAsync(NOTIFICATION_SETTINGS_KEYS.DAY_OF_PERIOD, SECURE_STORE_OPTIONS),
          SecureStore.getItemAsync(NOTIFICATION_SETTINGS_KEYS.LATE_PERIOD, SECURE_STORE_OPTIONS),
          SecureStore.getItemAsync(NOTIFICATION_SETTINGS_KEYS.FERTILITY_WINDOW, SECURE_STORE_OPTIONS),
        ]);

      return {
        beforePeriodEnabled: beforePeriod === 'true',
        dayOfPeriodEnabled: dayOfPeriod === 'true',
        latePeriodEnabled: latePeriod === 'true',
        fertilityWindowEnabled: fertilityWindow === 'true',
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
    const keys = [
      NOTIFICATION_SETTINGS_KEYS.BEFORE_PERIOD,
      NOTIFICATION_SETTINGS_KEYS.DAY_OF_PERIOD,
      NOTIFICATION_SETTINGS_KEYS.LATE_PERIOD,
      NOTIFICATION_SETTINGS_KEYS.FERTILITY_WINDOW,
    ] as const;

    const [prevBefore, prevDayOf, prevLate, prevFertility] = await Promise.all(
      keys.map((k) => SecureStore.getItemAsync(k, SECURE_STORE_OPTIONS))
    );
    const snapshot = [prevBefore, prevDayOf, prevLate, prevFertility];

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
        await this.rescheduleNotifications();
      } else {
        await this.cancelPeriodNotifications();
      }
    } catch (error) {
      await Promise.allSettled(
        keys.map((k, i) =>
          snapshot[i] !== null && snapshot[i] !== undefined
            ? SecureStore.setItemAsync(k, snapshot[i]!, SECURE_STORE_OPTIONS)
            : SecureStore.deleteItemAsync(k, SECURE_STORE_OPTIONS)
        )
      );
      try {
        if (snapshot.some((value) => value === 'true')) {
          await this.rescheduleNotifications();
        } else {
          await this.cancelPeriodNotifications();
        }
      } catch (rollbackError) {
        console.error('Failed to restore notification schedule:', rollbackError);
      }
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
      const [hour, minute] = await Promise.all([
        SecureStore.getItemAsync(NOTIFICATION_SETTINGS_KEYS.TIME_HOUR, SECURE_STORE_OPTIONS),
        SecureStore.getItemAsync(NOTIFICATION_SETTINGS_KEYS.TIME_MINUTE, SECURE_STORE_OPTIONS),
      ]);
      notificationHour = hour || '10';
      notificationMinute = minute || '0';
    } catch (error) {
      console.error('Failed to read notification time settings, using defaults:', error);
    }

    const safeHour = parseSafeHour(notificationHour);
    const safeMinute = parseSafeMinute(notificationMinute);

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
      safeHour,
      safeMinute,
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

    // Schedule fertility window notification if enabled (day before window opens = ovulation - 6)
    // Prefer the current cycle's window; fall back to next cycle if it has already passed.
    if (fertilityWindowEnabled) {
      const getFertilityReminderDate = (cycleStart: string) => {
        const cyclePrediction = PeriodPredictionService.getPrediction(
          cycleStart,
          allDates,
          userCycleLength
        );

        const [cy, cm, cd] = cyclePrediction.date.split('-').map(Number);
        const periodDateLocal = new Date(
          cy,
          cm - 1,
          cd,
          safeHour,
          safeMinute,
          0
        );

        const ovulationDate = new Date(periodDateLocal);
        ovulationDate.setDate(ovulationDate.getDate() - 14);

        const fertilityDate = new Date(ovulationDate);
        fertilityDate.setDate(fertilityDate.getDate() - 6);

        return fertilityDate;
      };

      const now = new Date();
      const currentCycleFertilityDate = getFertilityReminderDate(startDate);
      const nextCycleFertilityDate = getFertilityReminderDate(prediction.date);

      const fertilityReminderDate =
        currentCycleFertilityDate > now
          ? currentCycleFertilityDate
          : nextCycleFertilityDate;

      if (fertilityReminderDate > now) {
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

  static async rescheduleNotifications(): Promise<void> {
    await this.cancelPeriodNotifications();
    await this.scheduleNotificationsIfDataExists();
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
