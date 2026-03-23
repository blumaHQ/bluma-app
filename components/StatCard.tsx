import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../styles/theme';
import { useAppStyles } from '../hooks/useStyles';
import { InfoIcon } from './icons/general/info';
import { useTranslation } from 'react-i18next';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  status?: 'normal' | 'irregular';
  type?: 'cycle' | 'period';
}

export function StatCard({ title, value, icon, status, type }: StatCardProps) {
  const { colors } = useTheme();
  const { typography } = useAppStyles();
  const router = useRouter();
  const { t } = useTranslation('common');

  const getStatusIcon = () => {
    if (!status) return null;

    if (status === 'normal') {
      return <Ionicons name="checkmark-circle" size={20} color={colors.success} />;
    } else {
      return <Ionicons name="alert-circle" size={20} color={colors.warning} />;
    }
  };

  const getStatusText = () => {
    if (!status) return null;
    return status === 'normal' ? t('status.normal') : t('status.irregular');
  };

  const getStatusColor = () => {
    if (!status) return colors.textSecondary;
    return colors.textSecondary;
  };

  const handlePress = () => {
    if (type) {
      const pathname =
        type === 'cycle'
          ? '/(info)/cycle-length-info'
          : '/(info)/period-length-info';
      router.push(pathname);
    }
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.surfaceVariant },
        pressed && styles.cardPressed,
      ]}
      onPress={handlePress}
      disabled={!type}
    >
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: colors.surfaceVariant2 },
        ]}
      >
        {icon}
      </View>
      <View style={styles.contentContainer}>
        <View style={styles.topRow}>
          <Text style={[typography.body, { color: colors.textPrimary }]}>
            {title}
          </Text>
          {type && (
            <View style={styles.infoIcon}>
              <InfoIcon size={20} color={colors.textSecondary} />
            </View>
          )}
        </View>
        <View style={styles.bottomRow}>
          <Text style={typography.headingMd}>{value}</Text>
          {status && (
            <View style={styles.statusContainer}>
              {getStatusIcon()}
              <Text style={[typography.caption, { color: getStatusColor() }]}>
                {getStatusText()}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  contentContainer: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoIcon: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default StatCard;
