import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
  useMemo,
} from 'react';
import { useAuth } from './AuthContext';

export type TempUnit = 'C' | 'F';

export const parseTempUnit = (value: string | null): TempUnit =>
  value === 'C' || value === 'F' ? value : 'C';

interface TemperatureContextType {
  tempCelsius: string;
  setTempCelsius: (temp: string) => void;
  clearTemp: () => void;
  tempUnit: TempUnit;
  setTempUnit: (unit: TempUnit) => void;
}

const TemperatureContext = createContext<TemperatureContextType | undefined>(undefined);

export const useTemperature = () => {
  const context = useContext(TemperatureContext);
  if (context === undefined) {
    throw new Error('useTemperature must be used within a TemperatureProvider');
  }
  return context;
};

export const TemperatureProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [tempCelsius, setTempCelsius] = useState<string>('');
  const [tempUnit, setTempUnit] = useState<TempUnit>('C');
  const { isLocked } = useAuth();

  const clearTemp = useCallback(() => {
    setTempCelsius('');
  }, []);

  useEffect(() => {
    if (isLocked) clearTemp();
  }, [isLocked, clearTemp]);

  const value = useMemo(
    () => ({ tempCelsius, setTempCelsius, clearTemp, tempUnit, setTempUnit }),
    [tempCelsius, clearTemp, tempUnit]
  );

  return (
    <TemperatureContext.Provider value={value}>
      {children}
    </TemperatureContext.Provider>
  );
};
