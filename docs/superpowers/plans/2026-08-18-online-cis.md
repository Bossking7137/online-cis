# Online CIS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A client-side, no-backend web app where a client fills AOK's Client Information Sheet on any device, signs on-screen, generates a clean PDF locally, and shares it (WhatsApp/etc.).

**Architecture:** Static single-page wizard, no build step. A single **schema module** defines every section/field once; the UI renders from it and the PDF reads from it (one source of truth). Pure logic (schema, validation, utils, state, PDF building) lives in isomorphic ES modules that run in both the browser and Node, so they are unit-tested with Node's built-in test runner. DOM, canvas signature, and native share are verified manually on a device matrix.

**Tech Stack:** HTML5, CSS3, vanilla JavaScript (ES modules), `pdf-lib` (vendored locally, ESM build), Node.js built-in `node:test` for unit tests. No frameworks, no bundler, no runtime CDN.

## Global Constraints

- **No backend, no network at runtime.** All libraries vendored under `vendor/`; app must work offline.
- **No runtime dependency on a CDN.** `pdf-lib` is downloaded once at dev time into `vendor/` and imported by relative path.
- **ES modules everywhere.** Browser loads `app.js` via `<script type="module">`; Node imports the same pure modules directly. No CommonJS.
- **Isomorphic pure modules.** `schema.js`, `validation.js`, `util.js`, `state.js`, `pdf.js` must not reference `window`, `document`, `navigator`, or `localStorage` at module top level — those are injected or guarded so Node can import them.
- **Company header constants (verbatim, printed on every PDF):** `AFRICA ORIGIN KHUMOETSILE PTY LTD` · `REG NUMBER: BW00005267841` · `EXEMPTION NUMBER: 11/1/8 (01)` · `PLOT 688, KWHAI ROAD, GABORONE` · `CONTACT NUMBER: 77 716 452` · title `CLIENT INFORMATION SHEET`.
- **Botswana terms preserved verbatim:** Omang, Headman, Ward, UIN, COP, OCOP, Exemption number.
- **Minimal required fields to generate PDF:** a name (business OR full name), cell number, consent checkbox ticked, signature captured. Everything else optional.
- **Signature input:** must use Pointer Events so mouse, touch, and stylus all work identically across Android/iPhone/laptop/desktop.

## File Structure

```
online-cis/
  index.html            wizard markup shell + module entry
  styles.css            mobile-first responsive styles
  src/
    schema.js           SINGLE SOURCE OF TRUTH: sections, fields, options, header
    util.js             sanitizeFilename, formatDateCAT, isBlank, displayValue
    validation.js       validateForGenerate(state) -> {ok, errors}
    state.js            createState, saveState/loadState/clearState (storage injected)
    signature.js        SignaturePad(canvas) -> open()/clear()/toPngBytes()
    pdf.js              buildPdf(state, signaturePngBytes) -> Uint8Array (isomorphic)
    share.js            sharePdf(bytes, filename) : native share or download+WhatsApp
    app.js              wizard controller: renders schema, wires steps, glue
  vendor/
    pdf-lib.esm.js      vendored pdf-lib (dev-time download, no runtime CDN)
  tests/
    util.test.js
    validation.test.js
    state.test.js
    pdf.test.js
    run.md              how to run tests
  README.md             open/test/deploy instructions
```

Responsibilities are split so each file holds one job and can be reasoned about alone. `app.js` is the only file that touches the DOM wizard; `signature.js` the only one that touches canvas; `share.js` the only one that touches `navigator.share`. Everything else is pure and testable.

---

### Task 1: Project scaffold + form schema (single source of truth)

**Files:**
- Create: `online-cis/src/schema.js`
- Create: `online-cis/package.json`
- Test: `online-cis/tests/schema.test.js`

**Interfaces:**
- Produces: `HEADER` (object with `company, reg, exemption, address, contact, title`), `SECTIONS` (array of `{id, title, note?, fields}`), where each field is `{id, label, type, options?, note?}`. `type` ∈ `text|textarea|email|tel|date|choice|checkbox`. Also `ALL_FIELDS` (flat array) and `fieldById(id)`.

- [ ] **Step 1: Create `package.json`** so Node runs ESM and tests.

```json
{
  "name": "online-cis",
  "version": "1.0.0",
  "type": "module",
  "private": true,
  "scripts": {
    "test": "node --test"
  }
}
```

- [ ] **Step 2: Write the failing test** `tests/schema.test.js`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HEADER, SECTIONS, ALL_FIELDS, fieldById } from '../src/schema.js';

test('header carries verbatim AOK constants', () => {
  assert.equal(HEADER.company, 'AFRICA ORIGIN KHUMOETSILE PTY LTD');
  assert.equal(HEADER.reg, 'REG NUMBER: BW00005267841');
  assert.equal(HEADER.title, 'CLIENT INFORMATION SHEET');
});

test('has the five sections in order', () => {
  const titles = SECTIONS.map(s => s.id);
  assert.deepEqual(titles, ['s1', 's2', 's3', 's4', 's5']);
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
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd online-cis && node --test tests/schema.test.js`
Expected: FAIL (cannot find module `../src/schema.js`).

- [ ] **Step 4: Write `src/schema.js`** encoding the full form from the spec (§4). Include: header constants; s1 business fields + consent (a `checkbox` field `consent` whose `note` holds the full "I … duly authorised …" paragraph and the three bullets); s2 personal (Title/Marital status as `choice`); s3 contact (Owner/Tenant as `choice`, time-at-address split `years`/`months`); s4 bank (Account type as `choice`); s5 Next of Kin 1 and Next of Kin 2 (both full field sets, all optional). Derive `ALL_FIELDS` by flattening `SECTIONS[].fields`, and `fieldById` from a Map.

```js
export const HEADER = {
  company: 'AFRICA ORIGIN KHUMOETSILE PTY LTD',
  reg: 'REG NUMBER: BW00005267841',
  exemption: 'EXEMPTION NUMBER: 11/1/8 (01)',
  address: 'PLOT 688, KWHAI ROAD, GABORONE',
  contact: 'CONTACT NUMBER: 77 716 452',
  title: 'CLIENT INFORMATION SHEET',
};

export const CONSENT_TEXT =
  'I, {name}, duly authorised to represent the above mentioned company and in ' +
  'my personal capacity agree and authorise Africa Origin Khumoetsile to:';
export const CONSENT_BULLETS = [
  'Make inquiries from any bank, financial institution or approved credit reference bureau in Botswana or any mentioned referee to confirm any information provided by the borrower.',
  'Seek information from any Bank, financial institution or approved credit reference bureau when assessing the borrower at any time during the existence of the borrower’s account.',
  'Obtaining from, exchanging with, or disclosing all credit and fraud information relating to the credit application to the Credit Reference Databank, Banks, Financial Institutions or credit reference bureau.',
];

export const SECTIONS = [
  { id: 's1', title: 'SECTION 1: APPLICANT DETAILS', fields: [
    { id: 'business_name', label: 'Applicant name (Business)', type: 'text' },
    { id: 'uin', label: 'Registration number (UIN)', type: 'text' },
    { id: 'business_address', label: 'Business postal address', type: 'textarea' },
    { id: 'consent', label: 'I have read and agree to the Borrower Reference Consent above', type: 'checkbox' },
    { id: 'auth_name', label: 'Borrower duly Authorised name', type: 'text' },
    { id: 'consent_date', label: 'Date', type: 'date' },
  ]},
  { id: 's2', title: 'SECTION 2: APPLICANT PERSONAL DETAILS', fields: [
    { id: 'title', label: 'Title', type: 'choice', options: ['Mr','Mrs','Miss','Dr','Prof'] },
    { id: 'full_names', label: 'Full Names', type: 'text' },
    { id: 'marital_status', label: 'Marital Status', type: 'choice', options: ['Single','Married COP','Married OCOP','Divorced','Widowed'] },
    { id: 'maiden_name', label: 'Maiden name (Married Woman)', type: 'text' },
    { id: 'dob', label: 'Date of Birth', type: 'date' },
    { id: 'omang', label: 'Omang / passport', type: 'text' },
    { id: 'nationality', label: 'Nationality', type: 'text' },
  ]},
  { id: 's3', title: 'SECTION 3: APPLICANT CONTACT DETAILS', fields: [
    { id: 'cell', label: 'Cell no (also for notification)', type: 'tel' },
    { id: 'tel_work', label: 'Telephone (Work)', type: 'tel' },
    { id: 'tel_home', label: 'Telephone (Home)', type: 'tel' },
    { id: 'email', label: 'Email', type: 'email' },
    { id: 'res_address', label: 'Residential Address', type: 'textarea' },
    { id: 'occupancy', label: 'Owner / Tenant', type: 'choice', options: ['Owner','Tenant'] },
    { id: 'years_at_address', label: 'Years at address', type: 'text' },
    { id: 'months_at_address', label: 'Months at address', type: 'text' },
    { id: 'home_village', label: 'Home Village', type: 'text' },
    { id: 'ward', label: 'Ward', type: 'text' },
    { id: 'headman', label: 'Headman', type: 'text' },
  ]},
  { id: 's4', title: 'SECTION 4: APPLICANT BANK DETAILS', fields: [
    { id: 'account_name', label: 'Account Name', type: 'text' },
    { id: 'bank_name', label: 'Bank name', type: 'text' },
    { id: 'branch', label: 'Branch name & code', type: 'text' },
    { id: 'account_number', label: 'Account Number', type: 'text' },
    { id: 'account_type', label: 'Account type', type: 'choice', options: ['Current','Savings','Other'] },
  ]},
  { id: 's5', title: 'SECTION 5: NEXT OF KIN', fields: [
    // Next of Kin 1 (spouse if married)
    { id: 'nok1_name', label: 'Next of Kin 1 — Name (spouse if married)', type: 'text' },
    { id: 'nok1_relationship', label: 'NOK1 Relationship', type: 'text' },
    { id: 'nok1_employer', label: 'NOK1 Employer name', type: 'text' },
    { id: 'nok1_tel_work', label: 'NOK1 Telephone (Work)', type: 'tel' },
    { id: 'nok1_cell', label: 'NOK1 Cell', type: 'tel' },
    { id: 'nok1_address', label: 'NOK1 Residential Address', type: 'textarea' },
    { id: 'nok1_village', label: 'NOK1 Home village', type: 'text' },
    { id: 'nok1_headman', label: 'NOK1 Headman name', type: 'text' },
    // Next of Kin 2 (not living with you)
    { id: 'nok2_name', label: 'Next of Kin 2 — Name (not living with you)', type: 'text' },
    { id: 'nok2_relationship', label: 'NOK2 Relationship', type: 'text' },
    { id: 'nok2_employer', label: 'NOK2 Employer name', type: 'text' },
    { id: 'nok2_tel_work', label: 'NOK2 Telephone (Work)', type: 'tel' },
    { id: 'nok2_cell', label: 'NOK2 Cell', type: 'tel' },
    { id: 'nok2_address', label: 'NOK2 Residential Address', type: 'textarea' },
    { id: 'nok2_village', label: 'NOK2 Home village', type: 'text' },
    { id: 'nok2_headman', label: 'NOK2 Headman name', type: 'text' },
  ]},
];

export const ALL_FIELDS = SECTIONS.flatMap(s => s.fields);
const _byId = new Map(ALL_FIELDS.map(f => [f.id, f]));
export const fieldById = (id) => _byId.get(id);
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `node --test tests/schema.test.js`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add online-cis/package.json online-cis/src/schema.js online-cis/tests/schema.test.js
git commit -m "feat: add form schema as single source of truth"
```

---

### Task 2: Pure utilities

**Files:**
- Create: `online-cis/src/util.js`
- Test: `online-cis/tests/util.test.js`

**Interfaces:**
- Produces: `sanitizeFilename(s)`, `isBlank(v)`, `displayValue(v)`, `todayISO(dateLike?)`.

- [ ] **Step 1: Write the failing test** `tests/util.test.js`

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/util.test.js`
Expected: FAIL (module not found).

- [ ] **Step 3: Write `src/util.js`**

```js
export const isBlank = (v) =>
  v === undefined || v === null || (typeof v === 'string' && v.trim() === '');

export function sanitizeFilename(s) {
  const cleaned = String(s ?? '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned || 'form';
}

export function displayValue(v) {
  if (v === true) return 'X';
  if (isBlank(v)) return '';
  return String(v);
}

export function todayISO(d = new Date()) {
  return d.toISOString().slice(0, 10);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/util.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add online-cis/src/util.js online-cis/tests/util.test.js
git commit -m "feat: add pure utility helpers"
```

---

### Task 3: Validation

**Files:**
- Create: `online-cis/src/validation.js`
- Test: `online-cis/tests/validation.test.js`

**Interfaces:**
- Consumes: `isBlank` from `util.js`.
- Produces: `validateForGenerate(state)` → `{ ok: boolean, errors: string[] }`. `state` is `{ fields: {id:value}, signature: pngBytes|null }`.

- [ ] **Step 1: Write the failing test** `tests/validation.test.js`

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/validation.test.js`
Expected: FAIL (module not found).

- [ ] **Step 3: Write `src/validation.js`**

```js
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/validation.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add online-cis/src/validation.js online-cis/tests/validation.test.js
git commit -m "feat: add generate-time validation"
```

---

### Task 4: State + autosave (storage injected)

**Files:**
- Create: `online-cis/src/state.js`
- Test: `online-cis/tests/state.test.js`

**Interfaces:**
- Produces: `createState()` → `{fields:{}, signature:null}`; `saveState(state, storage)`; `loadState(storage)` → state or fresh; `clearState(storage)`. `storage` is any object with `getItem/setItem/removeItem` (so tests pass a fake and the browser passes `localStorage`). Signature bytes are NOT persisted (kept in memory only) to avoid storing a signature image on disk; only `fields` are saved.

- [ ] **Step 1: Write the failing test** `tests/state.test.js`

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/state.test.js`
Expected: FAIL (module not found).

- [ ] **Step 3: Write `src/state.js`**

```js
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/state.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add online-cis/src/state.js online-cis/tests/state.test.js
git commit -m "feat: add state model with injectable storage"
```

---

### Task 5: Vendor pdf-lib + PDF generation

**Files:**
- Create: `online-cis/vendor/pdf-lib.esm.js` (downloaded once, dev time)
- Create: `online-cis/src/pdf.js`
- Test: `online-cis/tests/pdf.test.js`

**Interfaces:**
- Consumes: `HEADER, SECTIONS, CONSENT_TEXT, CONSENT_BULLETS` from `schema.js`; `displayValue` from `util.js`; `PDFDocument, rgb, StandardFonts` from vendored pdf-lib.
- Produces: `buildPdf(state, signaturePngBytes)` → `Promise<Uint8Array>`. Isomorphic (pdf-lib only, no DOM). `signaturePngBytes` is a `Uint8Array` PNG or `null`.

- [ ] **Step 1: Download pdf-lib ESM build into `vendor/`**

Obtain the standalone ESM build of `pdf-lib` (a single `.js` file, ~1.5 MB) and save it as `online-cis/vendor/pdf-lib.esm.js`. Source: the `pdf-lib` package `dist/pdf-lib.esm.js` (npm/unpkg). This is a **dev-time download** — confirm with the user before fetching (filename `pdf-lib.esm.js`, ~1.5 MB, from unpkg.com/pdf-lib). At runtime nothing is fetched.

- [ ] **Step 2: Write the failing test** `tests/pdf.test.js`

```js
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
```

- [ ] **Step 3: Run test to verify it fails**

Run: `node --test tests/pdf.test.js`
Expected: FAIL (module not found).

- [ ] **Step 4: Write `src/pdf.js`** — draw A4 pages: header block, then iterate `SECTIONS`; for each section draw its title, then each field as `Label: value` with an underline; render `consent` specially (paragraph with `{name}` substituted + the three bullets); embed the signature PNG on the signature line if present; add pages as content overflows. Return `doc.save()`.

```js
import { PDFDocument, rgb, StandardFonts } from '../vendor/pdf-lib.esm.js';
import { HEADER, SECTIONS, CONSENT_TEXT, CONSENT_BULLETS } from './schema.js';
import { displayValue } from './util.js';

const A4 = [595.28, 841.89];
const MARGIN = 48;

export async function buildPdf(state, signaturePngBytes) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fields = (state && state.fields) || {};

  let page = doc.addPage(A4);
  let y = A4[1] - MARGIN;
  const line = (dy = 16) => { y -= dy; if (y < MARGIN + 40) { page = doc.addPage(A4); y = A4[1] - MARGIN; } };
  const draw = (text, x, f = font, size = 10) =>
    page.drawText(String(text), { x, y, size, font: f, color: rgb(0.1,0.1,0.1) });
  const rule = (x1, x2) => page.drawLine({ start: {x:x1,y:y-2}, end:{x:x2,y:y-2}, thickness:0.5, color: rgb(0.6,0.6,0.6) });

  // Header
  draw(HEADER.company, MARGIN, bold, 13); line();
  for (const l of [HEADER.reg, HEADER.exemption, HEADER.address, HEADER.contact]) { draw(l, MARGIN); line(12); }
  line(6); draw(HEADER.title, MARGIN, bold, 12); line(24);

  for (const section of SECTIONS) {
    draw(section.title, MARGIN, bold, 11); line(18);
    for (const fld of section.fields) {
      if (fld.id === 'consent') {
        const who = displayValue(fields.auth_name) || displayValue(fields.full_names) || '__________';
        draw(CONSENT_TEXT.replace('{name}', who), MARGIN, font, 9); line(14);
        for (const b of CONSENT_BULLETS) { draw('• ' + b.slice(0, 95), MARGIN + 8, font, 8); line(11); }
        draw('Consent agreed: ' + (fields.consent === true ? 'YES' : 'NO'), MARGIN, bold, 9); line(16);
        continue;
      }
      draw(fld.label + ':', MARGIN, bold, 9);
      draw(displayValue(fields[fld.id]), MARGIN + 170, font, 10);
      rule(MARGIN + 168, A4[0] - MARGIN); line();
    }
    line(8);
  }

  // Signature
  line(6); draw('Borrower duly Authorised Signature:', MARGIN, bold, 9);
  if (signaturePngBytes && signaturePngBytes.length) {
    const png = await doc.embedPng(signaturePngBytes);
    const w = 160, h = (png.height / png.width) * w;
    page.drawImage(png, { x: MARGIN + 180, y: y - h + 8, width: w, height: h });
  } else {
    rule(MARGIN + 180, A4[0] - MARGIN);
  }
  return await doc.save();
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `node --test tests/pdf.test.js`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add online-cis/vendor/pdf-lib.esm.js online-cis/src/pdf.js online-cis/tests/pdf.test.js
git commit -m "feat: add client-side PDF builder with pdf-lib"
```

---

### Task 6: Signature pad

**Files:**
- Create: `online-cis/src/signature.js`

**Interfaces:**
- Consumes: a `<canvas>` element (browser only).
- Produces: `class SignaturePad` with `constructor(canvas)`, `clear()`, `isEmpty()`, and `async toPngBytes()` → `Uint8Array`. Uses Pointer Events; sets `canvas.style.touchAction = 'none'` so drawing never scrolls the page. Manual verification (no Node test — requires canvas + pointer).

- [ ] **Step 1: Write `src/signature.js`**

```js
export class SignaturePad {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.drawing = false;
    this._empty = true;
    canvas.style.touchAction = 'none';
    this.ctx.lineWidth = 2.5;
    this.ctx.lineCap = 'round';
    this.ctx.strokeStyle = '#111';
    const pos = (e) => {
      const r = canvas.getBoundingClientRect();
      return { x: (e.clientX - r.left) * (canvas.width / r.width),
               y: (e.clientY - r.top) * (canvas.height / r.height) };
    };
    canvas.addEventListener('pointerdown', (e) => {
      this.drawing = true; this._empty = false;
      canvas.setPointerCapture(e.pointerId);
      const p = pos(e); this.ctx.beginPath(); this.ctx.moveTo(p.x, p.y);
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!this.drawing) return;
      const p = pos(e); this.ctx.lineTo(p.x, p.y); this.ctx.stroke();
    });
    const end = () => { this.drawing = false; };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
    canvas.addEventListener('pointerleave', end);
  }
  clear() { this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height); this._empty = true; }
  isEmpty() { return this._empty; }
  async toPngBytes() {
    const blob = await new Promise(res => this.canvas.toBlob(res, 'image/png'));
    return new Uint8Array(await blob.arrayBuffer());
  }
}
```

- [ ] **Step 2: Manual verification (deferred to Task 9 device pass)** — noted here: draw on canvas, confirm no page scroll on touch, `clear()` blanks it, `toPngBytes()` returns bytes. Commit now; behavior is exercised in Task 9.

- [ ] **Step 3: Commit**

```bash
git add online-cis/src/signature.js
git commit -m "feat: add pointer-based signature pad"
```

---

### Task 7: Share module

**Files:**
- Create: `online-cis/src/share.js`

**Interfaces:**
- Produces: `async sharePdf(bytes, filename, waMessage)`. Builds a `File` from the PDF bytes. If `navigator.canShare?.({files:[file]})` → `navigator.share`. Else download via object URL and open `https://wa.me/?text=<encoded waMessage>` in a new tab. Returns `{method:'share'|'download'}`. Browser only; manual verification.

- [ ] **Step 1: Write `src/share.js`**

```js
export async function sharePdf(bytes, filename, waMessage) {
  const file = new File([bytes], filename, { type: 'application/pdf' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename,
        text: waMessage || 'Africa Origin Khumoetsile — Client Information Sheet' });
      return { method: 'share' };
    } catch (e) { if (e && e.name === 'AbortError') return { method: 'share' }; }
  }
  // Fallback: download, then offer WhatsApp
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  const msg = encodeURIComponent(waMessage ||
    'Hello, attached is my completed Africa Origin Khumoetsile Client Information Sheet.');
  window.open('https://wa.me/?text=' + msg, '_blank');
  return { method: 'download' };
}
```

- [ ] **Step 2: Commit**

```bash
git add online-cis/src/share.js
git commit -m "feat: add share module with WhatsApp fallback"
```

---

### Task 8: Wizard UI (index.html + app.js + styles.css)

**Files:**
- Create: `online-cis/index.html`
- Create: `online-cis/styles.css`
- Create: `online-cis/src/app.js`

**Interfaces:**
- Consumes: everything above — `SECTIONS, HEADER, CONSENT_TEXT, CONSENT_BULLETS` (schema), `validateForGenerate`, `createState/loadState/saveState/clearState`, `SignaturePad`, `buildPdf`, `sharePdf`.
- Produces: the running app. `app.js` renders each step from `SECTIONS`, binds inputs to `state.fields[id]` (debounced `saveState` on change), renders `choice` as chip buttons and `checkbox` (consent) with the read-only consent text above it, drives Back/Next + progress bar, opens the signature modal, and on Review runs `validateForGenerate` before enabling Generate → `buildPdf` → `sharePdf`.

- [ ] **Step 1: Write `index.html`** — a shell with a header, a `<main id="app">` the controller fills, a signature `<dialog id="sigModal">` containing a `<canvas>` + Clear/Save buttons, and `<script type="module" src="src/app.js">`.

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>AOK — Client Information Sheet</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <header class="topbar">
    <div class="brand">AFRICA ORIGIN KHUMOETSILE</div>
    <div class="progress"><div id="bar"></div></div>
  </header>
  <main id="app"></main>
  <dialog id="sigModal">
    <h3>Sign here</h3>
    <canvas id="sigCanvas" width="600" height="260"></canvas>
    <div class="row">
      <button id="sigClear" type="button">Clear</button>
      <button id="sigSave" type="button" class="primary">Save signature</button>
    </div>
    <p class="hint">Tip: rotate your phone to landscape for a bigger signing area.</p>
  </dialog>
  <script type="module" src="src/app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Write `styles.css`** — mobile-first: sticky top bar, progress `#bar` width driven by a `--pct` var, fields full width with ≥16px inputs (prevents iOS zoom), chip buttons with `.selected` state, a `.primary` button, sticky bottom nav (Back/Next), and a `dialog#sigModal` sized to the viewport with the canvas at `width:100%`. Keep it clean and professional (neutral palette, one accent). Define colors on `:root` and honor `prefers-color-scheme: dark`.

- [ ] **Step 3: Write `src/app.js`** — the controller. Key responsibilities, in order:
  - `import` schema, validation, state, SignaturePad, buildPdf, sharePdf, util.
  - `const state = loadState(localStorage);` build a `STEPS` array = `[intro, ...SECTIONS, review]`.
  - `renderStep(i)`: for a section step, render `section.title` then each field via `renderField(fld)`. `renderField` switches on `type`: `text/email/tel/date` → labelled `<input>`; `textarea` → `<textarea>`; `choice` → a row of chip `<button>`s that set `state.fields[id]` and toggle `.selected`; `checkbox` (consent) → render `CONSENT_TEXT` (with `{name}` → live `auth_name`/`full_names` or a placeholder) + `CONSENT_BULLETS` as a read-only block, then a checkbox bound to `state.fields.consent`.
  - Every input change: `state.fields[id] = value; debouncedSave();` where `debouncedSave = () => saveState(state, localStorage)`.
  - Signature step/button: `showModal()` on `#sigModal`; `new SignaturePad(canvas)` once; `Clear`→`pad.clear()`; `Save`→ if `!pad.isEmpty()` set `state.signature = await pad.toPngBytes()`, close modal, mark signed.
  - Review step: show a summary of entered fields; run `const v = validateForGenerate(state)`; if `!v.ok` list `v.errors` and disable Generate; else enable **Generate PDF** → `const bytes = await buildPdf(state, state.signature)` → `const name = sanitizeFilename(state.fields.business_name || state.fields.full_names)` → `sharePdf(bytes, 'AOK-CIS-'+name+'-'+todayISO()+'.pdf', waMessage)`. Show a "Start over" button → `clearState(localStorage); location.reload();`.
  - Nav: Back/Next update `currentStep`, re-render, set `bar.style.width` to `((i+1)/STEPS.length*100)+'%'`.

- [ ] **Step 4: Manual smoke test in a browser**

Run a static server from the project root and open it:

```bash
cd "online-cis" && python -m http.server 8000
```

Open `http://localhost:8000`, walk every step, sign, generate, confirm the PDF downloads and opens with all entered fields + the signature.

- [ ] **Step 5: Commit**

```bash
git add online-cis/index.html online-cis/styles.css online-cis/src/app.js
git commit -m "feat: add wizard UI wiring schema, signature, pdf, share"
```

---

### Task 9: README + device matrix pass

**Files:**
- Create: `online-cis/README.md`

- [ ] **Step 1: Write `README.md`** — what it is; how to run locally (`python -m http.server 8000`); how to run tests (`node --test`); how to deploy (drag the folder to Netlify, or push to GitHub Pages — it's fully static); the desktop WhatsApp caveat (download-then-attach); privacy note (data stays on device, nothing sent to a server).

- [ ] **Step 2: Device matrix verification** — on each of Android Chrome, iPhone Safari, desktop Chrome/Edge: fill a form, sign (confirm touch draws without scrolling), generate, and share. On phones confirm the native share sheet lists WhatsApp; on desktop confirm download + WhatsApp link. Record results in the README or a short `TESTING.md`.

- [ ] **Step 3: Run the full unit suite once more**

Run: `cd online-cis && node --test`
Expected: PASS (all suites from Tasks 1–5).

- [ ] **Step 4: Commit**

```bash
git add online-cis/README.md
git commit -m "docs: add README and testing notes"
```

---

## Self-Review

**Spec coverage:** §4 form content → Task 1 schema. §5 architecture/files → File Structure + Tasks. §6 wizard → Task 8. §7 signature pad → Task 6. §8 PDF → Task 5. §9 sharing → Task 7. §10 validation → Task 3. §11 testing → Node tests (Tasks 1–5) + device matrix (Task 9). §12 deliverables → Task 9 README + all files. Autosave (§6) → Task 4. No spec requirement is left without a task.

**Placeholder scan:** No TBD/TODO. UI-only steps (Tasks 6–8) that can't run under Node carry concrete code plus explicit manual verification steps rather than vague "handle edge cases".

**Type consistency:** `state = {fields:{id:value}, signature: Uint8Array|null}` is used identically across validation, state, pdf, and app. `buildPdf(state, signaturePngBytes)`, `SignaturePad.toPngBytes()`, `sharePdf(bytes, filename, waMessage)`, `validateForGenerate(state)→{ok,errors}` names match every call site. Storage is injected as `{getItem,setItem,removeItem}` in both tests and app.
