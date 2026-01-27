import { format, formatDistanceToNow, differenceInMinutes, parseISO } from 'date-fns';

export function formatTime(date: Date): string {
  return format(date, 'h:mm a');
}

export function formatDate(date: Date): string {
  return format(date, 'MMM d');
}

export function formatDateTime(date: Date): string {
  return format(date, 'MMM d, h:mm a');
}

export function formatTimeUntil(date: Date): string {
  return formatDistanceToNow(date, { addSuffix: false });
}

export function getMinutesUntil(date: Date): number {
  return differenceInMinutes(date, new Date());
}

export function parseTimeString(timeStr: string): { hours: number; minutes: number } {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return { hours, minutes };
}

export function formatSessionTime(startTime: Date, endTime: Date): string {
  const now = new Date();
  const isToday = format(startTime, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd');
  const isTomorrow = format(startTime, 'yyyy-MM-dd') === format(new Date(now.getTime() + 86400000), 'yyyy-MM-dd');

  let prefix = '';
  if (isToday) {
    prefix = 'Tonight ';
  } else if (isTomorrow) {
    prefix = 'Tomorrow ';
  } else {
    prefix = format(startTime, 'MMM d ');
  }

  return `${prefix}${formatTime(startTime)} - ${formatTime(endTime)}`;
}

export function getCurrentTimeDisplay(): string {
  const now = new Date();
  return `${format(now, 'HH:mm')} | ${format(now, 'MMM d')}`;
}

export function calculateProgress(start: Date, end: Date): number {
  const now = new Date();
  const total = end.getTime() - start.getTime();
  const elapsed = now.getTime() - start.getTime();
  return Math.min(100, Math.max(0, (elapsed / total) * 100));
}

export function serializeDate(date: Date): string {
  return date.toISOString();
}

export function deserializeDate(str: string): Date {
  return parseISO(str);
}
