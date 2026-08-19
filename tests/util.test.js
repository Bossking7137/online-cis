import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeFilename, isBlank, displayValue, formatDMY } from '../src/util.js';

test('sanitizeFilename strips unsafe chars and trims', () => {
  assert.equal(sanitizeFilename('Acme (Pty) Ltd/../x'), 'Acme-Pty-Ltd-x');
  assert.equal(sanitizeFilename('   '), 'form');
  assert.equal(sanitizeFilename(''), 'form');
});

test('isBlank treats empty/whitespace/undefined as blank', () => {
  assert.equal(isBlank(''), true);
  assert.equal(isBlank('   '), true);
  assert.equal(isBlank(undefined), true);
  assert.equal(isBlank('x'), false);
  assert.equal(isBlank(true), false);
});

test('displayValue renders blanks as empty and bools as X', () => {
  assert.equal(displayValue(''), '');
  assert.equal(displayValue('Gaborone'), 'Gaborone');
  assert.equal(displayValue(true), 'X');
});

test('formatDMY formats a date as DD/MM/YYYY with zero-padding', () => {
  assert.equal(formatDMY(new Date(2026, 7, 19)), '19/08/2026'); // month is 0-based: 7 = August
  assert.equal(formatDMY(new Date(2026, 0, 5)), '05/01/2026');
});
