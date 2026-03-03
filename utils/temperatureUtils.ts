export const toFahrenheit = (celsius: number): number =>
  Math.round((celsius * 9 / 5 + 32) * 10) / 10;

export const toCelsius = (fahrenheit: number): number =>
  Math.round(((fahrenheit - 32) * 5 / 9) * 10) / 10;
