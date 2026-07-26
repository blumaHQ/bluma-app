import React, { useRef, useCallback } from 'react';
import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { Button } from './Button';
import { useTheme } from '../styles/theme';
import { CycleDetails } from './CycleDetails';
import { CalendarDayCategory } from '../utils/calendarStyles';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import Animated, {
  useAnimatedStyle,
  interpolate,
  useSharedValue,
  Extrapolation,
} from 'react-native-reanimated';

const DEFAULT_CONTENT_HEIGHT = 320;

interface CalendarBottomSheetProps {
  selectedDate: string;
  cycleDay: number | null;
  dayCategory: CalendarDayCategory | undefined;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function CalendarBottomSheet({
  selectedDate,
  cycleDay,
  dayCategory,
  isOpen,
  onOpenChange,
}: CalendarBottomSheetProps) {
  const { colors } = useTheme();
  const { t } = useTranslation('calendar');
  const bottomSheetRef = useRef<any>(null);
  const animatedIndex = useSharedValue(-1);
  const contentHeightSv = useSharedValue(DEFAULT_CONTENT_HEIGHT);

  const closeDrawer = useCallback(() => {
    bottomSheetRef.current?.close?.();
    onOpenChange(false);
  }, [onOpenChange]);

  const closedBottom = 20;
  const fabAnimatedStyle = useAnimatedStyle(() => {
    const contentHeight = contentHeightSv.value;
    const openBottom = contentHeight + 16;
    return {
      bottom: interpolate(
        animatedIndex.value,
        [-1, 0],
        [closedBottom, openBottom],
        Extrapolation.CLAMP
      ),
    };
  });

  return (
    <>
      <Animated.View
        style={[styles.floatingButton, fabAnimatedStyle]}
        pointerEvents="box-none"
      >
        <Button
          title={t('editPeriod.editPeriodDates')}
          onPress={() => router.push('/edit-period')}
        />
      </Animated.View>

      <BottomSheet
        ref={bottomSheetRef}
        index={isOpen ? 0 : -1}
        animatedIndex={animatedIndex}
        enableDynamicSizing
        maxDynamicContentSize={500}
        enablePanDownToClose
        enableOverDrag={false}
        onChange={(i: number) => onOpenChange(i >= 0)}
        backgroundStyle={{
          backgroundColor: colors.surface,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          shadowColor: '#000',
          shadowOffset: { width: 2, height: -8 },
          shadowOpacity: 0.8,
          shadowRadius: 12,
          elevation: 12,
        }}
        handleComponent={() => null}
      >
        <BottomSheetView
          onLayout={(e: any) => {
            const h = e?.nativeEvent?.layout?.height ?? 0;
            if (h > 0) contentHeightSv.value = h;
          }}
          style={styles.sheetContent}
        >
          <CycleDetails
            selectedDate={selectedDate}
            cycleDay={cycleDay}
            dayCategory={dayCategory}
            onClose={closeDrawer}
          />
        </BottomSheetView>
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  floatingButton: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 1,
  },
  sheetContent: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
});
