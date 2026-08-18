import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateForGenerate } from '../src/validation.js';

const good = {
  fields: { business_name: 'Acme', cell: '71234567', consent: true },
  signature: new Uint8Array([1,2,3]),
};

test('accepts minimal complete form', () => {
  const r = validateForGenerate(good);
  assert.equal(r.ok, true);
  assert.equal(r.errors.length, 0);
});

test('full_names satisfies the name requirement too', () => {
  const r = validateForGenerate({ ...good, fields: { full_names: 'Jane', cell: '7', consent: true } });
  assert.equal(r.ok, true);
});

test('missing name, cell, consent, signature each produce an error', () => {
  const r = validateForGenerate({ fields: {}, signature: null });
  assert.equal(r.ok, false);
  assert.equal(r.errors.length, 4);
});

test('unchecked consent fails', () => {
  const r = validateForGenerate({ ...good, fields: { ...good.fields, consent: false } });
  assert.equal(r.ok, false);
  assert.ok(r.errors.some(e => /consent/i.test(e)));
});
