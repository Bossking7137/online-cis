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

// Day/Month/Year, e.g. 19/08/2026 (uses the client's local date).
export function formatDMY(d = new Date()) {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}
