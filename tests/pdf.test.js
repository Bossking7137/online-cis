import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPdf } from '../src/pdf.js';

const state = {
  fields: { business_name: 'Acme (Pty) Ltd', cell: '71234567', consent: true,
            full_names: 'Jane Doe', marital_status: 'Married COP', account_type: 'Savings' },
  signature: null,
};

test('buildPdf returns a non-trivial PDF byte stream', async () => {
  const bytes = await buildPdf(state, null);
  assert.ok(bytes instanceof Uint8Array);
  assert.ok(bytes.length > 1000);
  // PDF magic header "%PDF"
  assert.equal(String.fromCharCode(...bytes.slice(0, 4)), '%PDF');
});

test('buildPdf tolerates a signature PNG', async () => {
  // 1x1 transparent PNG
  const png = Uint8Array.from(atob(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
  ), c => c.charCodeAt(0));
  const bytes = await buildPdf(state, png);
  assert.ok(bytes.length > 1000);
});
