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

test('buildPdf handles very long field values without throwing (wraps instead of overflowing)', async () => {
  const longState = {
    fields: {
      business_name: 'Acme Investment Holdings and General Trading Proprietary Limited (Formerly Known As The Botswana Southern Region Cooperative Society)',
      business_address: 'Plot 12345, Extension 9, Along The Old Lobatse Road Next To The New Shopping Complex, Phakalane, Gaborone, Botswana, Private Bag 00123',
      res_address: 'Line one of a very long residential address that should wrap onto several lines\nLine two with more detail about the location and nearby landmarks\nLine three, the final line of this multi-line address value',
      cell: '71234567',
      consent: true,
      full_names: 'Jane Doe',
      marital_status: 'Married COP',
      account_type: 'Savings',
    },
    signature: null,
  };
  const bytes = await buildPdf(longState, null);
  assert.ok(bytes instanceof Uint8Array);
  assert.ok(bytes.length > 1000);
  assert.equal(String.fromCharCode(...bytes.slice(0, 4)), '%PDF');
});
