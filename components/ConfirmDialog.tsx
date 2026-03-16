import React from 'react';
import { Modal, StyleSheet, Text, View, Pressable } from 'react-native';
import { useTheme } from '../styles/theme';
import { useAppStyles } from '../hooks/useStyles';
import { Button } from './Button';

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  cancelLabel?: string;
  onCancel?: () => void;
}

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  onConfirm,
  cancelLabel,
  onCancel,
}: ConfirmDialogProps) {
  const { colors } = useTheme();
  const { typography } = useAppStyles();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable style={[styles.dialog, { backgroundColor: colors.surface }]}>
          <Text style={[typography.headingMd, { color: colors.textPrimary }]}>{title}</Text>
          <Text style={[typography.body, styles.message, { color: colors.textSecondary }]}>
            {message}
          </Text>
          <View style={styles.actions}>
            {cancelLabel && onCancel && (
              <Button variant="outlined" title={cancelLabel} onPress={onCancel} fullWidth />
            )}
            <Button title={confirmLabel} onPress={onConfirm} color={colors.error} fullWidth />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  dialog: {
    width: '100%',
    borderRadius: 20,
    padding: 24,
  },
  message: {
    marginTop: 8,
  },
  actions: {
    marginTop: 24,
    gap: 12,
  },
});
