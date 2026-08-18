import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeFilename, isBlank, displayValue } from '../src/util.js';

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
