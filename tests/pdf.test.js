import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPdf } from '../src/pdf.js';

// The overlay builder needs the original template PDF. In the browser harness we
// fetch it from the served project; the test files run at /tests/, so the
// template is one level up under /assets/.
async function loadTemplate() {
  const resp = await fetch('/assets/aok-cis-template.pdf');
  if (!resp.ok) throw new Error('template fetch failed: ' + resp.status);
  return new Uint8Array(await resp.arrayBuffer());
}

const state = {
  fields: { business_name: 'Acme (Pty) Ltd', cell: '71234567', consent: true,
            full_names: 'Jane Doe', marital_status: 'Married COP', account_type: 'Savings' },
  signature: null,
};

test('buildPdf requires a template', async () => {
  let threw = false;
  try { await buildPdf(state, null, null); } catch { threw = true; }
  assert.ok(threw, 'buildPdf should throw without template bytes');
});

test('buildPdf overlays onto the template and returns a PDF', async () => {
  const tpl = await loadTemplate();
  const bytes = await buildPdf(state, null, tpl);
  assert.ok(bytes instanceof Uint8Array);
  assert.ok(bytes.length > 1000);
  assert.equal(String.fromCharCode(...bytes.slice(0, 4)), '%PDF');
});

test('buildPdf tolerates a signature PNG', async () => {
  const tpl = await loadTemplate();
  // 1x1 transparent PNG
  const png = Uint8Array.from(atob(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
  ), c => c.charCodeAt(0));
  const bytes = await buildPdf(state, png, tpl);
  assert.ok(bytes.length > 1000);
});

test('buildPdf handles very long field values without throwing (wraps to fit)', async () => {
  const tpl = await loadTemplate();
  const longState = {
    fields: {
      business_name: 'Acme Investment Holdings and General Trading Proprietary Limited (Formerly Known As The Botswana Southern Region Cooperative Society)',
      business_address: 'Plot 12345, Extension 9, Along The Old Lobatse Road Next To The New Shopping Complex, Phakalane, Gaborone, Botswana, Private Bag 00123',
      res_address: 'Line one of a very long residential address\nLine two with more detail\nLine three',
      cell: '71234567', consent: true, full_names: 'Jane Doe',
      marital_status: 'Married COP', account_type: 'Savings',
    },
    signature: null,
  };
  const bytes = await buildPdf(longState, null, tpl);
  assert.ok(bytes instanceof Uint8Array);
  assert.ok(bytes.length > 1000);
  assert.equal(String.fromCharCode(...bytes.slice(0, 4)), '%PDF');
});
