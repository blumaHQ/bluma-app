import { generateDateRange } from '../types/calendarTypes';
import type { TempUnit } from '../contexts/TemperatureContext';
import { toFahrenheit } from './temperatureUtils';
import { parseLocalDate } from './dateUtils';

export type BbtLog = {
  date: string;
  celsius: number;
};

export type BbtChartPoint = {
  date: string;
  dayIndex: number;
  value: number;
};

export type BbtChartModel = {
  dayCount: number;
  points: BbtChartPoint[];
  yMin: number;
  yMax: number;
  yTicks: number[];
  xTicks: { dayIndex: number; label: string }[];
};

export type ChartPadding = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

export const BBT_CHART_PADDING: ChartPadding = {
  left: 34,
  right: 6,
  top: 12,
  bottom: 28,
};

export function daysBetweenIso(startIso: string, endIso: string): number {
  const start = parseLocalDate(startIso);
  const end = parseLocalDate(endIso);
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

export function parseTemperatureLogs(
  logs: { date: string; name: string | null }[]
): BbtLog[] {
  const byDate = new Map<string, number>();
  for (const log of logs) {
    const value = parseFloat(log.name ?? '');
    if (Number.isNaN(value)) continue;
    byDate.set(log.date, value);
  }
  return [...byDate.entries()]
    .map(([date, celsius]) => ({ date, celsius }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function findCycleIndexForDate(
  cycles: { startDate: string }[],
  date: string
): number {
  if (cycles.length === 0) return 0;
  const index = cycles.findIndex(cycle => cycle.startDate <= date);
  return index === -1 ? cycles.length - 1 : index;
}

export function getCycleDateRange(
  cycle: { startDate: string; endDate?: string },
  today: string
): { startDate: string; endDate: string; dayCount: number } {
  const endDate =
    cycle.endDate ?? (today < cycle.startDate ? cycle.startDate : today);
  const dayCount = Math.max(1, daysBetweenIso(cycle.startDate, endDate) + 1);
  return { startDate: cycle.startDate, endDate, dayCount };
}

export function buildBbtChartModel(
  logs: BbtLog[],
  startDate: string,
  endDate: string,
  unit: TempUnit
): BbtChartModel {
  const dayCount = Math.max(1, daysBetweenIso(startDate, endDate) + 1);
  const points = logs
    .filter(log => log.date >= startDate && log.date <= endDate)
    .map(log => ({
      date: log.date,
      dayIndex: daysBetweenIso(startDate, log.date),
      value: unit === 'F' ? toFahrenheit(log.celsius) : log.celsius,
    }))
    .filter(point => point.dayIndex >= 0 && point.dayIndex < dayCount);

  const { yMin, yMax, yTicks } = getYScale(
    points.map(point => point.value),
    unit
  );
  const dates = generateDateRange(startDate, dayCount);
  const xTicks = xTickIndices(dayCount).map(dayIndex => ({
    dayIndex,
    label: String(parseLocalDate(dates[dayIndex]).getDate()),
  }));

  return { dayCount, points, yMin, yMax, yTicks, xTicks };
}

export function toChartXY(
  dayIndex: number,
  value: number,
  dayCount: number,
  yMin: number,
  yMax: number,
  width: number,
  height: number,
  pad: ChartPadding = BBT_CHART_PADDING
): { x: number; y: number } {
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const x =
    dayCount <= 1
      ? pad.left + innerW / 2
      : pad.left + (dayIndex / (dayCount - 1)) * innerW;
  const span = yMax - yMin;
  const y =
    span === 0
      ? pad.top + innerH / 2
      : pad.top + (1 - (value - yMin) / span) * innerH;
  return { x, y };
}

function getYScale(
  values: number[],
  unit: TempUnit
): { yMin: number; yMax: number; yTicks: number[] } {
  const step = unit === 'F' ? 0.4 : 0.2;
  const minSteps = 5;

  if (values.length === 0) {
    const yMin = unit === 'F' ? 96.8 : 36.0;
    const yMax = roundTo(yMin + minSteps * step, 2);
    return { yMin, yMax, yTicks: buildTicks(yMin, yMax, step) };
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const yMin = roundTo(min - step, 2);
  const needed = Math.max(
    minSteps,
    Math.ceil(roundTo((max + step - yMin) / step, 8))
  );
  const yMax = roundTo(yMin + needed * step, 2);
  return { yMin, yMax, yTicks: buildTicks(yMin, yMax, step) };
}

function xTickIndices(dayCount: number): number[] {
  if (dayCount <= 1) return [0];
  const step = dayCount > 16 ? 2 : 1;
  const ticks: number[] = [];
  for (let i = 0; i < dayCount; i += step) {
    ticks.push(i);
  }
  const last = dayCount - 1;
  if (last - ticks[ticks.length - 1] >= step) {
    ticks.push(last);
  }
  return ticks;
}

function buildTicks(yMin: number, yMax: number, step: number): number[] {
  const count = Math.round((yMax - yMin) / step);
  const ticks: number[] = [];
  for (let i = 0; i <= count; i++) {
    ticks.push(roundTo(yMin + i * step, 2));
  }
  return ticks;
}

function roundTo(n: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}
