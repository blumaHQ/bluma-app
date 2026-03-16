import { StyleSheet } from 'react-native';
import { ColorScheme } from './colors';

// Theme-aware typography function - use this for new components
export const createTypography = (colors: ColorScheme) =>
  StyleSheet.create({
    headingLg: {
      fontSize: 30,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    headingMd: {
      fontSize: 22,
      lineHeight: 28,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    headingSm: {
      fontSize: 18,
      lineHeight: 24,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    body: {
      fontSize: 17,
      lineHeight: 22,
      fontWeight: '400',
      letterSpacing: 0.25,
      color: colors.textPrimary,
    },
    bodyBold: {
      fontSize: 16,
      lineHeight: 22,
      fontWeight: '600',
      letterSpacing: 0.25,
      color: colors.textPrimary,
    },
    bodyLg: {
      fontSize: 17,
      lineHeight: 23,
      fontWeight: '400',
      letterSpacing: 0.3,
      color: colors.textPrimary,
    },
    bodyXl: {
      fontSize: 18,
      lineHeight: 24,
      fontWeight: '400',
      letterSpacing: 0.35,
      color: colors.textPrimary,
    },
    caption: {
      fontSize: 14,
      lineHeight: 18,
      fontWeight: '400',
      color: colors.textSecondary,
    },
    captionBold: {
      fontSize: 14,
      lineHeight: 18,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    displayLg: {
      fontSize: 48,
      fontWeight: 'bold',
      color: colors.textPrimary,
    },
    displayMd: {
      fontSize: 32,
      fontWeight: 'bold',
      color: colors.textPrimary,
    },
    displaySm: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.textPrimary,
    },
    labelLg: {
      fontSize: 22,
      fontWeight: '500',
      color: colors.textPrimary,
    },
    labelMd: {
      fontSize: 18,
      fontWeight: '500',
      color: colors.textPrimary,
    },
    labelSm: {
      fontSize: 16,
      fontWeight: '500',
      color: colors.textPrimary,
    },
    labelXs: {
      fontSize: 10,
      fontWeight: '500',
      color: colors.textPrimary,
    },
  });

export type Typography = ReturnType<typeof createTypography>;
