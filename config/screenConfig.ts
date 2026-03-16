export interface ScreenConfig {
  name: string;
  headerShown: boolean;
  titleKey?: string;
  headerShadowVisible?: boolean;
  backgroundColorKey?: 'background' | 'panel' | 'surface' | 'surfaceVariant';
}

export const dynamicScreens: ScreenConfig[] = [
  {
    name: 'settings/calendar-view',
    headerShown: true,
    titleKey: 'settings:screenTitles.calendarView',
    headerShadowVisible: false,
    backgroundColorKey: 'background',
  },
  {
    name: 'settings/reminders',
    headerShown: true,
    titleKey: 'settings:screenTitles.reminders',
    headerShadowVisible: false,
    backgroundColorKey: 'background',
  },
  {
    name: 'settings/app-lock',
    headerShown: true,
    titleKey: 'settings:screenTitles.appLock',
    headerShadowVisible: false,
    backgroundColorKey: 'background',
  },
  {
    name: 'settings/encrypted-backups',
    headerShown: true,
    titleKey: 'settings:screenTitles.encryptedBackups',
    headerShadowVisible: false,
    backgroundColorKey: 'background',
  },
  {
    name: 'settings/backup',
    headerShown: true,
    titleKey: 'settings:screenTitles.backup',
    headerShadowVisible: false,
    backgroundColorKey: 'panel',
  },
  {
    name: 'settings/restore-file',
    headerShown: true,
    titleKey: 'settings:screenTitles.restore',
    headerShadowVisible: false,
    backgroundColorKey: 'panel',
  },
  {
    name: 'settings/restore-key',
    headerShown: true,
    titleKey: 'settings:screenTitles.restoreKey',
    headerShadowVisible: false,
    backgroundColorKey: 'panel',
  },
  {
    name: 'settings/restore-success',
    headerShown: false,
    titleKey: 'settings:screenTitles.restoreSuccess',
    headerShadowVisible: false,
    backgroundColorKey: 'panel',
  },
  {
    name: 'settings/about',
    headerShown: true,
    titleKey: 'settings:screenTitles.about',
    headerShadowVisible: false,
    backgroundColorKey: 'surfaceVariant',
  },
  {
    name: 'settings/privacy-policy',
    headerShown: true,
    titleKey: 'settings:screenTitles.privacyPolicy',
    headerShadowVisible: false,
    backgroundColorKey: 'surfaceVariant',
  },
  {
    name: 'health-tracking',
    headerShown: true,
    titleKey: 'health:tracking.screenTitle',
    headerShadowVisible: true,
    backgroundColorKey: 'surfaceVariant',
  },
  {
    name: 'notes-editor',
    headerShown: true,
    titleKey: 'common:navigation.notes',
    headerShadowVisible: false,
    backgroundColorKey: 'panel',
  },
  {
    name: 'temperature-editor',
    headerShown: true,
    titleKey: 'common:navigation.temperature',
    headerShadowVisible: false,
    backgroundColorKey: 'panel',
  },
  {
    name: 'cycle-details',
    headerShown: true,
    titleKey: 'stats:screenTitles.cycleDetails',
    headerShadowVisible: false,
    backgroundColorKey: 'background',
  },
  {
    name: '(info)/cycle-phase-details',
    headerShown: true,
    titleKey: 'info:screenTitles.todaysInsights',
    headerShadowVisible: true,
    backgroundColorKey: 'surfaceVariant',
  },
  {
    name: '(info)/cycle-length-info',
    headerShown: true,
    titleKey: 'info:screenTitles.cycleLength',
    headerShadowVisible: false,
    backgroundColorKey: 'panel',
  },
  {
    name: '(info)/period-length-info',
    headerShown: true,
    titleKey: 'info:screenTitles.periodLength',
    headerShadowVisible: false,
    backgroundColorKey: 'panel',
  },
  {
    name: '(info)/late-period-info',
    headerShown: true,
    titleKey: 'info:screenTitles.latePeriod',
    headerShadowVisible: false,
    backgroundColorKey: 'panel',
  },
  {
    name: '(info)/prediction-info',
    headerShown: true,
    titleKey: 'info:screenTitles.howPredictionsWork',
    headerShadowVisible: false,
    backgroundColorKey: 'panel',
  },
];

export function getBackgroundColor(
  key: ScreenConfig['backgroundColorKey'],
  isDark: boolean,
  darkColors: any,
  lightColors: any
): string {
  if (!key) return isDark ? darkColors.background : lightColors.background;

  const colorMap = {
    background: isDark ? darkColors.background : lightColors.background,
    panel: isDark ? darkColors.panel : lightColors.panel,
    surface: isDark ? darkColors.surface : lightColors.surface,
    surfaceVariant: isDark ? darkColors.surface : lightColors.surfaceVariant,
  };

  return colorMap[key];
}

