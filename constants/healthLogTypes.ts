export const healthLogTypes = [
  'symptom',
  'mood',
  'flow',
  'discharge',
  'sex',
  'notes',
  'temperature',
] as const;

export type HealthItemType = typeof healthLogTypes[number];
