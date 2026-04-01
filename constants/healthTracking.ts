export type HealthItemType = 'symptom' | 'mood' | 'flow' | 'discharge' | 'sex';

export interface HealthItem {
  id: string;
  icon: string;
}

export const SYMPTOMS: readonly HealthItem[] = [
  { id: 'im-okay', icon: 'im-okay' },
  { id: 'cramps', icon: 'cramps' },
  { id: 'tender-breasts', icon: 'tender-breasts' },
  { id: 'headache', icon: 'headache' },
  { id: 'nausea', icon: 'nausea' },
  { id: 'acne', icon: 'acne' },
  { id: 'backache', icon: 'backacke' },
  { id: 'fatigue', icon: 'fatigue' },
  { id: 'hot-flashes', icon: 'hot flashes' },
  { id: 'night-sweats', icon: 'night-sweats' },
  { id: 'brain-fog', icon: 'brain-fog' },
  { id: 'joint-pain', icon: 'joint-pain' },
  { id: 'dizziness', icon: 'dizziness' },
  { id: 'cravings', icon: 'cravings' },
  { id: 'bloating', icon: 'bloating' },
  { id: 'constipation', icon: 'constipation' },
  { id: 'diarrhea', icon: 'diarrhea' },
  { id: 'frequent-urination', icon: 'frequent-urination' },
  { id: 'vaginal-dryness', icon: 'vaginal dryness' },
  { id: 'insomnia', icon: 'insomnia' },
] as const;

export const MOODS: readonly HealthItem[] = [
  { id: 'calm', icon: 'calm' },
  { id: 'happy', icon: 'happy' },
  { id: 'energetic', icon: 'energetic' },
  { id: 'sad', icon: 'sad' },
  { id: 'anxious', icon: 'anxious' },
  { id: 'confused', icon: 'confused' },
  { id: 'irritated', icon: 'irritated' },
  { id: 'angry', icon: 'angry' },
  { id: 'grumpy', icon: 'grumpy' },
  { id: 'sleepy', icon: 'sleepy' },
  { id: 'stressed', icon: 'stressed' },
  { id: 'relaxed', icon: 'relaxed' },
  { id: 'mood-swings', icon: 'mood-swings' },
  { id: 'frisky', icon: 'frisky' },
  { id: 'apathetic', icon: 'apathetic' },
  { id: 'bored', icon: 'bored' },
] as const;

export const FLOWS: readonly HealthItem[] = [
  { id: 'light', icon: 'light' },
  { id: 'medium', icon: 'medium' },
  { id: 'heavy', icon: 'heavy' },
  { id: 'blood-clots', icon: 'blood-clots' },
] as const;

export const DISCHARGES: readonly HealthItem[] = [
  { id: 'no-discharge', icon: 'no-discharge' },
  { id: 'watery', icon: 'watery' },
  { id: 'creamy', icon: 'creamy' },
  { id: 'egg-white', icon: 'egg-white' },
  { id: 'sticky', icon: 'sticky' },
  { id: 'spotting', icon: 'spotting' },
  { id: 'unusual', icon: 'unusual' },
  { id: 'grey-discharge', icon: 'grey-discharge' },
] as const;

export const SEX: readonly HealthItem[] = [
  { id: 'no-sex', icon: 'no-sex' },
  { id: 'protected-sex', icon: 'protected-sex' },
  { id: 'unprotected-sex', icon: 'unprotected-sex' },
  { id: 'pain-during-sex', icon: 'pain-during-sex' },
  { id: 'high-sex-drive', icon: 'high-sex-drive' },
  { id: 'neutral-sex-drive', icon: 'neutral-sex-drive' },
  { id: 'low-sex-drive', icon: 'low-sex-drive' },
] as const;

export const SELECTION_COLORS = {
  symptom: '#6580E2',
  mood: '#F2C100',
  flow: '#FF6B9D',
  discharge: '#9B6BE2',
  sex: '#E85D75',
} as const;

