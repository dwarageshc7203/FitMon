export const toDayKey = (value) => {
  const date = value ? new Date(value) : new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const dayKeyToDate = (key) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const shiftDayKey = (key, offsetDays) => {
  const base = key ? dayKeyToDate(key) : new Date();
  base.setDate(base.getDate() + offsetDays);
  return toDayKey(base);
};

export const formatDayLabel = (key) => {
  const date = dayKeyToDate(key);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};
