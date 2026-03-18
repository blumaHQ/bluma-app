import React, { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { useTheme } from '../styles/theme';
import { useAppStyles } from '../hooks/useStyles';
import { Button } from './Button';

interface ConfirmSheetProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmSheet({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: ConfirmSheetProps) {
  const { colors } = useTheme();
  const { typography } = useAppStyles();
  const sheetRef = useRef<BottomSheet>(null);

  useEffect(() => {
    if (visible) {
      sheetRef.current?.expand();
    } else {
      sheetRef.current?.close();
    }
  }, [visible]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        onPress={onCancel}
      />
    ),
    [onCancel]
  );

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      enableDynamicSizing
      enablePanDownToClose
      enableOverDrag={false}
      backdropComponent={renderBackdrop}
      onChange={(index) => {
        if (index === -1) onCancel();
      }}
      backgroundStyle={{ backgroundColor: colors.surface }}
      handleIndicatorStyle={{ backgroundColor: colors.neutral200 }}
    >
      <BottomSheetView style={styles.content}>
        <Text style={[typography.headingMd, { color: colors.textPrimary }]}>{title}</Text>
        <Text style={[typography.body, { color: colors.textSecondary, marginTop: 8 }]}>
          {message}
        </Text>
        <View style={styles.actions}>
          <Button variant="outlined" title={cancelLabel} onPress={onCancel} fullWidth />
          <Button title={confirmLabel} onPress={onConfirm} color={colors.error} fullWidth />
        </View>
      </BottomSheetView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 32,
  },
  actions: {
    marginTop: 24,
    gap: 12,
  },
});
