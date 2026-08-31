import { describe, expect, it } from '@jest/globals';
import {
  BBT_CHART_PADDING,
  buildBbtChartModel,
  daysBetweenIso,
  findCycleIndexForDate,
  getCycleDateRange,
  parseTemperatureLogs,
  toChartXY,
} from './bbtChartUtils';

describe('daysBetweenIso', () => {
  it('counts calendar days without timezone shift', () => {
    expect(daysBetweenIso('2026-08-06', '2026-08-06')).toBe(0);
    expect(daysBetweenIso('2026-08-06', '2026-08-26')).toBe(20);
    expect(daysBetweenIso('2026-08-06', '2026-09-04')).toBe(29);
  });
});

describe('parseTemperatureLogs', () => {
  it('keeps the last valid reading per day and skips junk', () => {
    expect(
      parseTemperatureLogs([
        { date: '2026-08-28', name: '36.34' },
        { date: '2026-08-26', name: '36.16' },
        { date: '2026-08-26', name: '36.18' },
        { date: '2026-08-27', name: 'nope' },
        { date: '2026-08-29', name: null },
      ])
    ).toEqual([
      { date: '2026-08-26', celsius: 36.18 },
      { date: '2026-08-28', celsius: 36.34 },
    ]);
  });
});

describe('findCycleIndexForDate', () => {
  const cycles = [
    { startDate: '2026-08-06' },
    { startDate: '2026-07-08' },
    { startDate: '2026-06-10' },
  ];

  it('picks the newest cycle that has already started', () => {
    expect(findCycleIndexForDate(cycles, '2026-08-30')).toBe(0);
    expect(findCycleIndexForDate(cycles, '2026-07-20')).toBe(1);
    expect(findCycleIndexForDate(cycles, '2026-06-10')).toBe(2);
  });

  it('falls back to the oldest cycle when the date is before all starts', () => {
    expect(findCycleIndexForDate(cycles, '2026-05-01')).toBe(2);
  });
});

describe('getCycleDateRange', () => {
  it('ends the current cycle on today', () => {
    expect(
      getCycleDateRange({ startDate: '2026-08-06' }, '2026-08-30')
    ).toEqual({
      startDate: '2026-08-06',
      endDate: '2026-08-30',
      dayCount: 25,
    });
  });

  it('uses the stored end date for a completed cycle', () => {
    expect(
      getCycleDateRange(
        { startDate: '2026-07-08', endDate: '2026-08-05' },
        '2026-08-30'
      )
    ).toEqual({
      startDate: '2026-07-08',
      endDate: '2026-08-05',
      dayCount: 29,
    });
  });
});

describe('buildBbtChartModel', () => {
  it('places skipped days on the calendar axis and still keeps both points', () => {
    const model = buildBbtChartModel(
      [
        { date: '2026-08-26', celsius: 36.16 },
        { date: '2026-08-28', celsius: 36.34 },
        { date: '2026-08-29', celsius: 36.5 },
        { date: '2026-08-30', celsius: 36.56 },
      ],
      '2026-08-06',
      '2026-09-04',
      'C'
    );

    expect(model.dayCount).toBe(30);
    expect(model.points.map(point => point.dayIndex)).toEqual([20, 22, 23, 24]);
    expect(model.points).toHaveLength(4);
    expect(model.yMin).toBeLessThan(36.16);
    expect(model.yMax).toBeGreaterThan(36.56);
  });

  it('converts values when the display unit is Fahrenheit', () => {
    const model = buildBbtChartModel(
      [{ date: '2026-08-06', celsius: 36.5 }],
      '2026-08-06',
      '2026-08-06',
      'F'
    );
    expect(model.points[0].value).toBe(97.7);
    expect(model.yMin).toBeLessThan(97.7);
    expect(model.yMax).toBeGreaterThan(97.7);
  });
});

describe('toChartXY', () => {
  const pad = BBT_CHART_PADDING;
  const width = 300;
  const height = 200;

  it('maps the first and last cycle days to the plot edges', () => {
    const first = toChartXY(0, 36.2, 30, 36, 37, width, height, pad);
    const last = toChartXY(29, 36.2, 30, 36, 37, width, height, pad);
    expect(first.x).toBe(pad.left);
    expect(last.x).toBe(width - pad.right);
  });

  it('keeps a one-day gap wider than adjacent logged days', () => {
    const day26 = toChartXY(20, 36.16, 30, 36, 37, width, height, pad);
    const day28 = toChartXY(22, 36.34, 30, 36, 37, width, height, pad);
    const day29 = toChartXY(23, 36.5, 30, 36, 37, width, height, pad);
    expect(day28.x - day26.x).toBeCloseTo(2 * (day29.x - day28.x));
  });

  it('puts yMin at the bottom and yMax at the top', () => {
    const low = toChartXY(0, 36, 10, 36, 37, width, height, pad);
    const high = toChartXY(0, 37, 10, 36, 37, width, height, pad);
    expect(low.y).toBe(height - pad.bottom);
    expect(high.y).toBe(pad.top);
  });
});
