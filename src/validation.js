import { isBlank } from './util.js';

export function validateForGenerate(state) {
  const f = (state && state.fields) || {};
  const errors = [];
  if (isBlank(f.business_name) && isBlank(f.full_names)) {
    errors.push('Enter a business name or a full name.');
  }
  if (isBlank(f.cell)) errors.push('Enter a cell number.');
  if (f.consent !== true) errors.push('You must agree to the Borrower Reference Consent.');
  if (!state || !state.signature) errors.push('A signature is required.');
  return { ok: errors.length === 0, errors };
}
