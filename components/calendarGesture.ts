export const MINUTES_PER_DAY = 1440;
export const SNAP_MINUTES = 1;
export const requiresTaskSelection = (pointerType: string) => pointerType !== 'mouse';
export const canStartTaskGesture = (
  pointerType: string,
  selectedTaskId: string | null,
  taskId: string,
) => !requiresTaskSelection(pointerType) || selectedTaskId === taskId;
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
export const timeMinutes = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};
export const timeLabel = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
const validTime = (value: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
// HTML time inputs use 00:00 for the calendar's 24:00 boundary.
export const durationFromTimes = (start: string, end: string) => {
  if (!validTime(start) || !validTime(end)) return NaN;
  return (end === '00:00' ? MINUTES_PER_DAY : timeMinutes(end)) - timeMinutes(start);
};
export const endTimeForDuration = (start: string, duration: number) => {
  if (!validTime(start) || !Number.isFinite(duration)) return '';
  const end = Math.min(MINUTES_PER_DAY, timeMinutes(start) + duration);
  return end === MINUTES_PER_DAY ? '00:00' : timeLabel(end);
};
export const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
export const shiftDay = (date: Date, days: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
export const monday = (date: Date) => shiftDay(date, -((date.getDay() + 6) % 7));

// Precision controls movement only; small existing durations must never be inflated.
export function gestureRange(mode: 'move' | 'start' | 'end', start: number, duration: number, delta: number, step = SNAP_MINUTES) {
  const safeDuration = clamp(duration, 1, MINUTES_PER_DAY);
  const originalStart = clamp(start, 0, MINUTES_PER_DAY - safeDuration);
  const end = originalStart + safeDuration;
  const safeStep = Math.max(1, Math.round(step));
  const snapped = Math.round(delta / safeStep) * safeStep;
  if (mode === 'start') {
    const nextStart = clamp(originalStart + snapped, 0, end - 1);
    return { start: nextStart, duration: end - nextStart };
  }
  if (mode === 'end') return { start: originalStart, duration: clamp(end + snapped, originalStart + 1, MINUTES_PER_DAY) - originalStart };
  return { start: clamp(originalStart + snapped, 0, MINUTES_PER_DAY - safeDuration), duration: safeDuration };
}
