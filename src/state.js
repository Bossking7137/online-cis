const KEY = 'online-cis:v1';

export const createState = () => ({ fields: {}, signature: null });

export function saveState(state, storage) {
  try { storage.setItem(KEY, JSON.stringify({ fields: state.fields })); }
  catch { /* storage unavailable — ignore, in-memory still works */ }
}

export function loadState(storage) {
  try {
    const raw = storage.getItem(KEY);
    if (!raw) return createState();
    const parsed = JSON.parse(raw);
    return { fields: parsed.fields || {}, signature: null };
  } catch { return createState(); }
}

export function clearState(storage) {
  try { storage.removeItem(KEY); } catch { /* ignore */ }
}
