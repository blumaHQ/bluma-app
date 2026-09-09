import React, { useEffect, useRef } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { AuthProvider } from '../contexts/AuthContext';
import { NotesProvider } from '../contexts/NotesContext';
import { TemperatureProvider } from '../contexts/TemperatureContext';
import { ThemeProvider, useTheme } from '../contexts/ThemeContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { lightColors, darkColors } from '../styles/colors';
import Toast, { BaseToast, ErrorToast } from 'react-native-toast-message';
import '../i18n/config';
import { useTranslation } from 'react-i18next';
import { dynamicScreens, getBackgroundColor } from '../config/screenConfig';
import { useAppInitialization } from '../hooks/useAppInitialization';
import { ErrorScreen } from '../components/ErrorScreen';
import { LockScreen } from '../components/LockScreen';
import { LoadingScreen } from '../components/LoadingScreen';

const toastConfig = {
  style: { height: 48 },
  contentContainerStyle: { paddingHorizontal: 16, paddingVertical: 0 },
  text1Style: { fontSize: 16, fontWeight: '400' as const },
};

function AppContent() {
  const notificationResponseListener = useRef<Notifications.Subscription | null>(null);
  const router = useRouter();

  const { appState, retryInitialization, resetAllLocalData } = useAppInitialization();
  const { isDark } = useTheme();
  const { t } = useTranslation(['common', 'settings', 'health', 'info']);

  // Initialize notification response listener only (don't request permissions yet)
  useEffect(() => {
    async function setupNotificationListener() {
      // Set up notification response listener
      notificationResponseListener.current =
        Notifications.addNotificationResponseReceivedListener(response => {
          const { notification } = response;
          const data = notification.request.content.data;

          // Handle the notification based on type
          if (data.type === 'period_reminder' || data.type === 'period_start') {
            // Navigate to the home screen when a period notification is tapped
            router.navigate('/(tabs)');
          }
        });
    }

    setupNotificationListener();

    // Clean up notification listeners on unmount
    return () => {
      if (notificationResponseListener.current) {
        notificationResponseListener.current.remove();
      }
    };
  }, [router]);

  if (appState.status === 'db_error') {
    return (
      <ErrorScreen
        errorKey={appState.error}
        onRetry={retryInitialization}
        onReset={appState.canReset ? resetAllLocalData : undefined}
      />
    );
  }

  if (appState.status === 'locked' && appState.reason === 'auth_cancelled') {
    return <LockScreen onUnlock={retryInitialization} />;
  }

  if (appState.status !== 'ready' && !(appState.status === 'locked' && appState.reason === 'background_return')) {
    return <LoadingScreen />;
  }

  if (appState.status === 'ready' && appState.isInitialRender) {
    return <LoadingScreen />;
  }

  const showLockOverlay = appState.status === 'locked' && appState.reason === 'background_return';

  return (
    <>
      <Stack
        screenOptions={{
          animation: Platform.OS === 'ios' ? 'default' : 'slide_from_right',
          animationDuration: 250,
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen 
          name="edit-period" 
          options={{ 
            headerShown: false,
            presentation: 'modal',
            animation: Platform.OS === 'ios' ? 'default' : 'slide_from_bottom',
          }} 
        />
        {dynamicScreens.map(screen => (
          <Stack.Screen
            key={screen.name}
            name={screen.name}
            options={{
              headerShown: screen.headerShown,
              headerTitle: screen.titleKey ? t(screen.titleKey) : '',
              headerShadowVisible: screen.headerShadowVisible ?? false,
              headerStyle: {
                backgroundColor: getBackgroundColor(
                  screen.backgroundColorKey,
                  isDark,
                  darkColors,
                  lightColors
                ),
              },
              headerTitleStyle: {
                fontSize: 18,
                color: isDark ? darkColors.textPrimary : lightColors.textPrimary,
              },
              headerTintColor: isDark ? darkColors.textPrimary : lightColors.textPrimary,
            }}
          />
        ))}
        <Stack.Screen name="+not-found" />
      </Stack>
      {showLockOverlay && <LockScreen onUnlock={retryInitialization} isOverlay />}
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Toast
        position="top"
        topOffset={80}
        config={{
          success: props => (
            <BaseToast
              {...props}
              style={{ ...toastConfig.style, borderLeftColor: '#28a745' }}
              contentContainerStyle={toastConfig.contentContainerStyle}
              text1Style={toastConfig.text1Style}
            />
          ),
          error: props => (
            <ErrorToast
              {...props}
              style={{ ...toastConfig.style, borderLeftColor: '#dc3545' }}
              contentContainerStyle={toastConfig.contentContainerStyle}
              text1Style={toastConfig.text1Style}
            />
          ),
        }}
      />
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <NotesProvider>
              <TemperatureProvider>
                <AppContent />
              </TemperatureProvider>
            </NotesProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
