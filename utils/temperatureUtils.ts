export const toFahrenheit = (celsius: number): number =>
  Math.round(((celsius * 9) / 5 + 32) * 100) / 100;

export const toCelsius = (fahrenheit: number): number =>
  Math.round((((fahrenheit - 32) * 5) / 9) * 100) / 100;

export const formatTemperature = (celsius: number, unit: 'C' | 'F'): string =>
  (unit === 'F' ? toFahrenheit(celsius) : celsius).toFixed(2);
