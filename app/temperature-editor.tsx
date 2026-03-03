import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../styles/theme';
import { useAppStyles } from '../hooks/useStyles';
import { useTemperature, TempUnit, parseTempUnit } from '../contexts/TemperatureContext';
import { getSetting, setSetting } from '../db';
import { Button } from '../components/Button';
import { toFahrenheit, toCelsius } from '../utils/temperatureUtils';

// °F values starting with "1" are 100-104 (3 digits before decimal), otherwise 2
const digitsBefore = (digits: string, unit: TempUnit): number =>
  unit === 'F' && digits.startsWith('1') ? 3 : 2;

const formatDigits = (digits: string, unit: TempUnit): string => {
  const before = digitsBefore(digits, unit);
  if (digits.length < before) return digits;
  return `${digits.slice(0, before)}.${digits.slice(before)}`;
};

const toFormattedDisplay = (value: number, unit: TempUnit): string => {
  const digits = value.toFixed(2).replace('.', '');
  return formatDigits(digits, unit);
};

export default function TemperatureEditor() {
  const { colors } = useTheme();
  const { typography } = useAppStyles();
  const { t } = useTranslation(['common', 'health']);
  const insets = useSafeAreaInsets();
  const { tempCelsius, setTempCelsius, setTempUnit } = useTemperature();

  const [unit, setUnit] = useState<TempUnit>('C');
  const [displayValue, setDisplayValue] = useState<string>('');
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const init = async () => {
      const savedUnit = parseTempUnit(await getSetting('temp_unit'));
      setUnit(savedUnit);
      setTempUnit(savedUnit);

      if (tempCelsius) {
        const c = parseFloat(tempCelsius);
        const val = savedUnit === 'F' ? toFahrenheit(c) : c;
        setDisplayValue(toFormattedDisplay(val, savedUnit));
      }
    };

    init();
  }, [tempCelsius, setTempUnit]);

  const handleUnitChange = async (newUnit: TempUnit) => {
    if (newUnit === unit) return;

    const current = parseFloat(displayValue);
    if (!isNaN(current)) {
      const converted = newUnit === 'F' ? toFahrenheit(current) : toCelsius(current);
      setDisplayValue(toFormattedDisplay(converted, newUnit));
    }

    setUnit(newUnit);
    setTempUnit(newUnit);
    await setSetting('temp_unit', newUnit);
  };

  const handleTextChange = (text: string) => {
    const digits = text.replace(/\D/g, '');
    const before = digitsBefore(digits, unit);
    const clamped = digits.slice(0, before + 2);

    if (text.length < displayValue.length && clamped.length === before) {
      setDisplayValue(clamped);
      return;
    }

    setDisplayValue(formatDigits(clamped, unit));
  };

  const numericValue = parseFloat(displayValue);
  const isInRange =
    isNaN(numericValue) ||
    (unit === 'C'
      ? numericValue >= 35 && numericValue <= 40
      : numericValue >= 95 && numericValue <= 102);
  const rawDigits = displayValue.replace(/\D/g, '');
  const before = digitsBefore(rawDigits, unit);
  const isComplete = rawDigits.length >= before + 1;
  const showError = !!displayValue && isComplete && !isInRange;
  const disableSave = !isComplete || !isInRange;

  const handleSave = () => {
    if (!isInRange) return;

    const val = numericValue;
    if (!isNaN(val) && val > 0) {
      const celsius = unit === 'F' ? toCelsius(val) : val;
      setTempCelsius(celsius.toFixed(2));
    } else {
      setTempCelsius('');
    }
    router.back();
  };

  const hasValue = !!displayValue && numericValue > 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.panel }]}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.content}>
          <View style={styles.toggleWrapper}>
            <View
              style={[
                styles.toggle,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.toggleOption,
                  unit === 'C' && { backgroundColor: colors.neutral150 },
                ]}
                onPress={() => handleUnitChange('C')}
              >
                <Text
                  style={[typography.bodyXl, unit === 'C' && styles.activeToggleText]}
                >
                  °C
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.toggleOption,
                  unit === 'F' && { backgroundColor: colors.neutral150 },
                ]}
                onPress={() => handleUnitChange('F')}
              >
                <Text
                  style={[typography.bodyXl, unit === 'F' && styles.activeToggleText]}
                >
                  °F
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputRow}>
            <TextInput
              style={[
                typography.displayMd,
                styles.input,
                {
                  borderColor: colors.neutral150,
                },
              ]}
              value={displayValue}
              onChangeText={handleTextChange}
              keyboardType="number-pad"
              placeholder="00.00"
              placeholderTextColor={colors.placeholder}
              textAlign="center"
              cursorColor={colors.textPrimary}
            />
            {showError && (
              <Text
                style={[
                  typography.body,
                  { color: colors.error, marginTop: 8, textAlign: 'center' },
                ]}
              >
                {unit === 'C'
                  ? t('health:tracking.temperatureRangeC')
                  : t('health:tracking.temperatureRangeF')}
              </Text>
            )}
          </View>
        </View>

        {hasValue && (
          <View
            style={[
              styles.buttonContainer,
              {
                paddingBottom: Math.max(insets.bottom, 120),
              },
            ]}
          >
            <Button title={t('buttons.done')} onPress={handleSave} fullWidth disabled={disableSave} />
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
    paddingTop: 32,
  },
  toggleWrapper: {
    alignItems: 'center',
    marginBottom: 48,
  },
  toggle: {
    flexDirection: 'row',
    borderRadius: 30,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 2,
  },
  toggleOption: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 24,
    minWidth: 70,
    alignItems: 'center',
  },
  activeToggleText: {
    fontWeight: '700',
  },
  inputRow: {
    paddingHorizontal: 8,
  },
  input: {
    width: '70%',
    alignSelf: 'center',
    paddingVertical: 8,
    fontSize: 48,
    borderRadius: 12,
    borderWidth: 1,
  },
  buttonContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
});
