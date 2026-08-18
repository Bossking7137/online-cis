import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createState, saveState, loadState, clearState } from '../src/state.js';

function fakeStorage() {
  const m = new Map();
  return {
    getItem: k => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: k => m.delete(k),
  };
}

test('round-trips fields, drops signature', () => {
  const s = createState();
  s.fields.business_name = 'Acme';
  s.signature = new Uint8Array([9]);
  const store = fakeStorage();
  saveState(s, store);
  const loaded = loadState(store);
  assert.equal(loaded.fields.business_name, 'Acme');
  assert.equal(loaded.signature, null);
});

test('loadState returns fresh state when nothing saved', () => {
  const loaded = loadState(fakeStorage());
  assert.deepEqual(loaded.fields, {});
});

test('clearState wipes storage', () => {
  const store = fakeStorage();
  const s = createState(); s.fields.x = '1'; saveState(s, store);
  clearState(store);
  assert.deepEqual(loadState(store).fields, {});
});
