import { format, isValid, parseISO } from 'date-fns';

export function formatMillisecondTimestamp(iso: string | null | undefined): string {
  if (!iso) return '-';
  const parsed = parseISO(iso);
  if (!isValid(parsed)) return iso;
  return format(parsed, 'dd MMM yyyy, HH:mm:ss.SSS');
}
