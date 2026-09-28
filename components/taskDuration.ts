export function parseEstimatedDuration(value: string): number | null {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, '');
  const match = /^(?:(\d+)h)?(?:(\d+)min)?$/.exec(normalized);
  if (!match || (!match[1] && !match[2])) return null;

  const hours = match[1] ? Number(match[1]) : 0;
  const minutes = match[2] ? Number(match[2]) : 0;
  if (match[1] && match[2] && minutes >= 60) return null;

  const total = hours * 60 + minutes;
  return Number.isSafeInteger(total) && total > 0 ? total : null;
}

export function formatDurationInput(minutes: number): string {
  if (!Number.isSafeInteger(minutes) || minutes <= 0) return '';
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return `${hours ? `${hours}h` : ''}${remainder ? `${remainder}min` : ''}`;
}

export function formatDurationHours(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return '';
  return `${Number((minutes / 60).toFixed(2))}h`;
}
