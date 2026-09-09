export type AppState =
  | { status: 'initializing' }
  | { status: 'locked'; reason: 'auth_cancelled' | 'background_return' }
  | { status: 'db_error'; error: string; canReset: boolean }
  | { status: 'checking_onboarding' }
  | { status: 'ready'; onboardingComplete: boolean; isInitialRender: boolean };

export const createInitialState = (): AppState => ({ status: 'initializing' });

export const createLockedState = (
  reason: 'auth_cancelled' | 'background_return'
): AppState => ({ status: 'locked', reason });

// `canReset` is false for failures that have cost the user nothing: offering to
// wipe intact data is how people lose it.
export const createErrorState = (error: string, canReset = true): AppState => ({
  status: 'db_error',
  error,
  canReset,
});

export const createCheckingOnboardingState = (): AppState => ({
  status: 'checking_onboarding',
});

export const createReadyState = (onboardingComplete: boolean, isInitialRender = true): AppState => ({
  status: 'ready',
  onboardingComplete,
  isInitialRender,
});

