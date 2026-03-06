export const parseLocalDate = (iso: string): Date => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
};

export const parseSafeHour = (raw: string, defaultValue = 10): number => {
  const n = parseInt(raw, 10);
  return n >= 0 && n <= 23 ? n : defaultValue;
};

export const parseSafeMinute = (raw: string, defaultValue = 0): number => {
  const n = parseInt(raw, 10);
  return n >= 0 && n <= 59 ? n : defaultValue;
};
