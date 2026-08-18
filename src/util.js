export const isBlank = (v) =>
  v === undefined || v === null || (typeof v === 'string' && v.trim() === '');

export function sanitizeFilename(s) {
  const cleaned = String(s ?? '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned || 'form';
}

export function displayValue(v) {
  if (v === true) return 'X';
  if (isBlank(v)) return '';
  return String(v);
}

export function todayISO(d = new Date()) {
  return d.toISOString().slice(0, 10);
}
