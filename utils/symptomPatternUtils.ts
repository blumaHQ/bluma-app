import type { CyclePhase } from '../services/periodPredictions';
import { PeriodPredictionService } from '../services/periodPredictions';
import { SYMPTOMS, MOODS } from '../constants/healthTracking';

export interface SymptomPattern {
  itemId: string;
  type: 'symptom' | 'mood';
  phase: CyclePhase;
  /** Number of distinct cycles where this item appeared in this phase */
  count: number;
  /** Total number of individual log entries across those cycles */
  logCount: number;
  totalCycles: number;
}

export const PHASE_ORDER: CyclePhase[] = ['menstrual', 'follicular', 'ovulatory', 'luteal'];

const EXCLUDED_ITEM_IDS = new Set(['im-okay']);
const SYMPTOM_IDS = new Set(SYMPTOMS.map(s => s.id));
const MOOD_IDS = new Set(MOODS.map(m => m.id));

/**
 * Detects recurring symptom/mood patterns across the last `windowSize` cycles.
 * A pattern is surfaced when a given item appeared in the same cycle phase
 * in at least `minCount` of the last `windowSize` cycles.
 */
export function computeSymptomPatterns(
  allPeriodDates: string[],
  healthLogRows: { date: string; type: string; item_id: string }[],
  avgCycleLength: number,
  avgPeriodLength: number,
  minCount = 3,
  windowSize = 6,
): SymptomPattern[] {
  if (!Number.isInteger(windowSize) || windowSize < 1) return [];
  if (!Number.isInteger(minCount) || minCount < 1) return [];
  if (allPeriodDates.length === 0) return [];

  // periods[0] = most recent cycle, descending order
  const periods = PeriodPredictionService.groupDateIntoPeriods([...allPeriodDates]);
  const last6 = periods.slice(0, windowSize);
  const totalCycles = last6.length;
  if (totalCycles === 0) return [];

  // Earliest date of each cycle = its start date (cycleStarts[0] = most recent)
  const cycleStarts = last6.map(period => [...period].sort()[0]);

  // Precompute the actual length of each cycle (start → next period start).
  // cycleStarts[i-1] is the newer cycle, so distance = cycleStarts[i-1] - cycleStarts[i].
  // The most recent (in-progress) cycle falls back to avgCycleLength.
  const cycleLengths = cycleStarts.map((start, i) => {
    if (i === 0) return avgCycleLength;
    const startMs = new Date(start + 'T12:00:00').getTime();
    const nextStartMs = new Date(cycleStarts[i - 1] + 'T12:00:00').getTime();
    return Math.round((nextStartMs - startMs) / (1000 * 60 * 60 * 24));
  });

  // Map: `${itemId}|${phase}` -> Set of cycle indices (0 = most recent)
  const patternMap = new Map<string, Set<number>>();
  // Map: `${itemId}|${phase}` -> total number of individual log entries
  const logCountMap = new Map<string, number>();

  for (const log of healthLogRows) {
    if (log.type !== 'symptom' && log.type !== 'mood') continue;
    if (EXCLUDED_ITEM_IDS.has(log.item_id)) continue;
    if (!SYMPTOM_IDS.has(log.item_id) && !MOOD_IDS.has(log.item_id)) continue;

    const logMs = new Date(log.date + 'T12:00:00').getTime();

    // Find which of the last 6 cycles this log belongs to
    let cycleIndex = -1;
    for (let i = 0; i < cycleStarts.length; i++) {
      const startMs = new Date(cycleStarts[i] + 'T12:00:00').getTime();
      // Cycle ends the day before the next (newer) cycle starts; current cycle has no end
      const endMs =
        i > 0 ? new Date(cycleStarts[i - 1] + 'T12:00:00').getTime() - 1 : Infinity;

      if (logMs >= startMs && logMs <= endMs) {
        cycleIndex = i;
        break;
      }
    }

    if (cycleIndex === -1) continue;

    const cycleDay = PeriodPredictionService.getCurrentCycleDay(
      cycleStarts[cycleIndex],
      log.date
    );
    const periodLengthForPhase = cycleIndex === 0 ? avgPeriodLength : last6[cycleIndex].length;
    const phase = PeriodPredictionService.getCyclePhase(
      cycleDay,
      cycleLengths[cycleIndex],
      periodLengthForPhase
    );
    const key = `${log.item_id}|${phase}`;

    if (!patternMap.has(key)) patternMap.set(key, new Set());
    patternMap.get(key)!.add(cycleIndex);
    logCountMap.set(key, (logCountMap.get(key) ?? 0) + 1);
  }

  const results: SymptomPattern[] = [];

  for (const [key, cycleSet] of patternMap) {
    if (cycleSet.size < minCount) continue;

    const sep = key.indexOf('|');
    const itemId = key.slice(0, sep);
    const phase = key.slice(sep + 1) as CyclePhase;

    results.push({
      itemId,
      type: SYMPTOM_IDS.has(itemId) ? 'symptom' : 'mood',
      phase,
      count: cycleSet.size,
      logCount: logCountMap.get(key) ?? cycleSet.size,
      totalCycles,
    });
  }

  // Sort: highest count first, then by phase order, then alphabetically
  return results.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    const pa = PHASE_ORDER.indexOf(a.phase);
    const pb = PHASE_ORDER.indexOf(b.phase);
    if (pa !== pb) return pa - pb;
    return a.itemId.localeCompare(b.itemId);
  });
}
