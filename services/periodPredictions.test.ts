import { describe, expect, it } from '@jest/globals';
import { PeriodPredictionService } from './periodPredictions';

describe('PeriodPredictionService.getCurrentCycleDay', () => {
  it('counts from the logged period start without wrapping', () => {
    expect(
      PeriodPredictionService.getCurrentCycleDay('2026-08-06', '2026-08-06')
    ).toBe(1);
    expect(
      PeriodPredictionService.getCurrentCycleDay('2026-08-06', '2026-08-30')
    ).toBe(25);
  });

  it('keeps counting when the period is late', () => {
    expect(
      PeriodPredictionService.getCurrentCycleDay('2026-08-06', '2026-09-10')
    ).toBe(36);
  });
});

describe('PeriodPredictionService.wrapCycleDay', () => {
  it('leaves days within the current cycle unchanged', () => {
    expect(PeriodPredictionService.wrapCycleDay(1, 30)).toBe(1);
    expect(PeriodPredictionService.wrapCycleDay(30, 30)).toBe(30);
  });

  it('starts a new cycle after cycleLength', () => {
    expect(PeriodPredictionService.wrapCycleDay(31, 30)).toBe(1);
    expect(PeriodPredictionService.wrapCycleDay(32, 30)).toBe(2);
    expect(PeriodPredictionService.wrapCycleDay(61, 30)).toBe(1);
  });
});

describe('PeriodPredictionService.getCycleDayForDate', () => {
  const start = '2026-08-06';
  const cycleLength = 30;

  it('resets on a future predicted period start', () => {
    expect(
      PeriodPredictionService.getCycleDayForDate(
        start,
        '2026-09-05',
        cycleLength,
        '2026-08-30'
      )
    ).toBe(1);
  });

  it('counts through the last day of the current cycle', () => {
    expect(
      PeriodPredictionService.getCycleDayForDate(
        start,
        '2026-09-04',
        cycleLength,
        '2026-08-30'
      )
    ).toBe(30);
  });

  it('wraps later predicted cycles', () => {
    expect(
      PeriodPredictionService.getCycleDayForDate(
        start,
        '2026-09-06',
        cycleLength,
        '2026-08-30'
      )
    ).toBe(2);
    expect(
      PeriodPredictionService.getCycleDayForDate(
        start,
        '2026-10-05',
        cycleLength,
        '2026-08-30'
      )
    ).toBe(1);
  });

  it('does not wrap today or the past when the period is late', () => {
    expect(
      PeriodPredictionService.getCycleDayForDate(
        start,
        '2026-09-10',
        cycleLength,
        '2026-09-10'
      )
    ).toBe(36);
    expect(
      PeriodPredictionService.getCycleDayForDate(
        start,
        '2026-09-05',
        cycleLength,
        '2026-09-10'
      )
    ).toBe(31);
  });
});
