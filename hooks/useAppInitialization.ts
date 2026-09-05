import { useState, useEffect, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { initializeDatabase, getSetting, clearDatabaseCache, deleteDatabaseFile } from '../db';
import { useAuth } from '../contexts/AuthContext';
import {
  EncryptionError,
  ERROR_CODES,
  clearKeyCache,
  deleteEncryptionKey,
} from '../services/databaseEncryptionService';
import {
  AppState,
  createInitialState,
  createLockedState,
  createErrorState,
  createCheckingOnboardingState,
  createReadyState,
} from '../types/appState';

// What the user is told, and whether they are offered a wipe, for each way
// database setup can fail. `canReset: false` marks the failures that leave the
// data intact and clear up on their own, where a wipe would destroy good data.
const DATABASE_ERROR_STATES: Partial<
  Record<keyof typeof ERROR_CODES, { messageKey: string; canReset: boolean }>
> = {
  ORPHANED_DATABASE: {
    messageKey: 'errors.database.orphaned',
    canReset: true,
  },
  KEY_MISMATCH: {
    messageKey: 'errors.database.keyMismatch',
    canReset: true,
  },
  KEY_NOT_FOUND: {
    messageKey: 'errors.database.keyUnavailable',
    canReset: true,
  },
  CIPHER_UNAVAILABLE: {
    messageKey: 'errors.database.cipherUnavailable',
    canReset: false,
  },
  MIGRATION_FAILED: {
    messageKey: 'errors.database.migrationFailed',
    canReset: false,
  },
};

function createDatabaseErrorState(error: unknown): AppState {
  const mapped =
    error instanceof EncryptionError
      ? DATABASE_ERROR_STATES[error.code]
      : undefined;

  // Technical details are logged, never shown.
  console.error('[AppInitialization] Database initialization error:', error);

  return mapped
    ? createErrorState(mapped.messageKey, mapped.canReset)
    : createErrorState('errors.database.generic');
}

/**
 * Manages app initialization flow: database setup → onboarding check → navigation.
 * Handles authentication, background locking, and error recovery.
 */
export function useAppInitialization() {
  const [appState, setAppState] = useState<AppState>(createInitialState());
  const [initialRender, setInitialRender] = useState(true);
  const setupInProgress = useRef(false);
  const previousReadyState = useRef<Extract<AppState, { status: 'ready' }> | null>(null);
  const unlockTriggered = useRef(false);
  const unlockInProgress = useRef(false);
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useTranslation('common');
  const {
    unlockApp,
    startAuthentication,
    endAuthentication,
    justReturnedFromBackground,
    clearBackgroundFlag,
  } = useAuth();

  const setupDatabase = useCallback(async (skipStateChange = false) => {
    if (setupInProgress.current) return;
    setupInProgress.current = true;

    let authenticationStarted = false;
    try {
      startAuthentication();
      authenticationStarted = true;
      await initializeDatabase();
      unlockApp();
      endAuthentication();
      authenticationStarted = false;
      if (!skipStateChange) {
        setAppState(createCheckingOnboardingState());
      } else {
        setAppState(prev => prev.status === 'ready' ? prev : createCheckingOnboardingState());
      }
    } catch (error) {
      if (authenticationStarted) {
        endAuthentication();
      }
      if (
        error instanceof EncryptionError &&
        error.code === ERROR_CODES.AUTHENTICATION_FAILED
      ) {
        try {
          await clearKeyCache();
          await clearDatabaseCache();
        } catch (cleanupError) {
          console.error('[AppInitialization] Cache cleanup failed:', cleanupError);
        } finally {
          setAppState(createLockedState('auth_cancelled'));
        }
      } else {
        setAppState(createDatabaseErrorState(error));
      }
    } finally {
      setupInProgress.current = false;
    }
  }, [unlockApp, startAuthentication, endAuthentication]);

  const unlockFromBackground = useCallback(async () => {
    if (unlockInProgress.current) {
      console.log('[AppInit] Unlock already in progress, ignoring duplicate request');
      return;
    }
    
    if (!previousReadyState.current) {
      return;
    }
    
    unlockInProgress.current = true;
    const savedState = previousReadyState.current;
    let authenticationStarted = false;
    
    try {
      startAuthentication();
      authenticationStarted = true;
      await initializeDatabase();
      unlockApp();
      endAuthentication();
      authenticationStarted = false;
      previousReadyState.current = null;
      setAppState({ ...savedState, isInitialRender: false });
    } catch (error) {
      if (authenticationStarted) {
        endAuthentication();
      }
      if (
        error instanceof EncryptionError &&
        error.code === ERROR_CODES.AUTHENTICATION_FAILED
      ) {
        // User cancelled - reset flag so manual unlock button works
        // Keep previousReadyState so retry can work
        unlockTriggered.current = false;
        return;
      }
      previousReadyState.current = null;
      setAppState(createDatabaseErrorState(error));
    } finally {
      unlockInProgress.current = false;
    }
  }, [unlockApp, startAuthentication, endAuthentication]);

  const retryInitialization = useCallback(async () => {
    if (appState.status === 'locked' && appState.reason === 'background_return') {
      await unlockFromBackground();
    } else {
      try {
        await clearKeyCache();
        await clearDatabaseCache();
      } catch (error) {
        console.error('[AppInitialization] Failed to clear keys during retry:', error);
      } finally {
        setAppState(createInitialState());
      }
    }
  }, [appState, unlockFromBackground]);

  const resetAllLocalData = useCallback(() => {
    Alert.alert(
      t('resetData.title'),
      t('resetData.message'),
      [
        {
          text: t('buttons.cancel'),
          style: 'cancel',
        },
        {
          text: t('resetData.confirm'),
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete encryption key from SecureStore
              await deleteEncryptionKey();
              
              // Delete database file from filesystem
              await deleteDatabaseFile();
              
              // Clear any remaining caches
              await clearDatabaseCache();
              
              // Re-initialize app with fresh database and key
              setAppState(createInitialState());
            } catch (error) {
              console.error('[AppInitialization] Failed to reset local data:', error);
              Alert.alert(
                t('resetData.failed.title'),
                t('resetData.failed.message'),
                [{ text: 'OK' }]
              );
            }
          },
        },
      ]
    );
  }, [t]);

  // Re-lock app when returning from background (security requirement)
  useEffect(() => {
    if (justReturnedFromBackground) {
      clearBackgroundFlag();
      setupInProgress.current = false;
      unlockTriggered.current = false;
      
      // If unlock was in progress, it likely got stuck - reset it
      if (unlockInProgress.current) {
        console.log('[AppInit] Resetting stuck authentication from background interruption');
        unlockInProgress.current = false;
        endAuthentication();
      }
      
      if (appState.status === 'ready') {
        previousReadyState.current = appState;
        setAppState(createLockedState('background_return'));
      }
      // Don't overwrite previousReadyState if already locked from background
    }
  }, [justReturnedFromBackground, appState, clearBackgroundFlag, endAuthentication]);

  // Auto-trigger biometric when locked from background return
  useEffect(() => {
    if (appState.status === 'locked' && appState.reason === 'background_return' && previousReadyState.current && !unlockTriggered.current) {
      unlockTriggered.current = true;
      unlockFromBackground();
    }
  }, [appState, unlockFromBackground]);

  // Trigger database initialization when app starts
  useEffect(() => {
    if (appState.status === 'initializing') {
      setupDatabase();
    }
  }, [appState, setupDatabase]);

  // Check onboarding status after database is ready
  useEffect(() => {
    if (appState.status !== 'checking_onboarding') return;

    let mounted = true;

    async function checkOnboardingStatus() {
      try {
        const status = await getSetting('onboardingCompleted');
        if (mounted) {
          setAppState(createReadyState(status === 'true'));
        }
      } catch (error) {
        console.error('[AppInitialization] Failed to check onboarding status', error);
        if (mounted) {
          setAppState(createReadyState(false));
        }
      }
    }

    checkOnboardingStatus();

    return () => {
      mounted = false;
    };
  }, [appState]);

  // Redirect to onboarding on first render if not completed
  useEffect(() => {
    if (appState.status !== 'ready') return;

    if (initialRender) {
      const inOnboardingPath = pathname.startsWith('/onboarding');

      if (!appState.onboardingComplete && !inOnboardingPath) {
        router.replace('/onboarding');
      }
      
      setTimeout(() => {
        setAppState(prev => prev.status === 'ready' ? { ...prev, isInitialRender: false } : prev);
      }, 50);
      
      setInitialRender(false);
    }
  }, [appState, pathname, router, initialRender]);

  return {
    appState,
    retryInitialization,
    resetAllLocalData,
  };
}
