export const NOTIFICATION_SETTINGS_KEYS = {
  BEFORE_PERIOD: 'notifications_period_before',
  DAY_OF_PERIOD: 'notifications_period_day',
  LATE_PERIOD: 'notifications_period_late',
  FERTILITY_WINDOW: 'notifications_fertility_window',
  TIME_HOUR: 'notification_time_hour',
  TIME_MINUTE: 'notification_time_minute',
} as const;

export const NOTIFICATION_SETTINGS_KEYS_LIST = Object.values(NOTIFICATION_SETTINGS_KEYS);
