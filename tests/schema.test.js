import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HEADER, SECTIONS, ALL_FIELDS, fieldById } from '../src/schema.js';

test('header carries verbatim AOK constants', () => {
  assert.equal(HEADER.company, 'AFRICA ORIGIN KHUMOETSILE PTY LTD');
  assert.equal(HEADER.reg, 'REG NUMBER: BW00005267841');
  assert.equal(HEADER.title, 'CLIENT INFORMATION SHEET');
});

test('has the referee + five sections + beneficial-owner + PEP in order', () => {
  const titles = SECTIONS.map(s => s.id);
  assert.deepEqual(titles, ['ref', 's1', 's2', 's3', 's4', 's5', 'bo', 'pep']);
});

test('choice fields carry options; known Botswana terms present', () => {
  const marital = fieldById('marital_status');
  assert.equal(marital.type, 'choice');
  assert.ok(marital.options.includes('Married COP'));
  assert.ok(marital.options.includes('Married OCOP'));
  assert.ok(fieldById('omang'));      // Omang / passport
  assert.ok(fieldById('headman'));    // Headman
});

test('every field id is unique', () => {
  const ids = ALL_FIELDS.map(f => f.id);
  assert.equal(new Set(ids).size, ids.length);
});
