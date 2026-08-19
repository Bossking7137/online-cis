import { HEADER, SECTIONS, CONSENT_TEXT, CONSENT_BULLETS } from './schema.js';
import { validateForGenerate } from './validation.js';
import { createState, saveState, loadState, clearState } from './state.js';
import { SignaturePad } from './signature.js';
import { buildPdf } from './pdf.js';
import { saveAndReview, shareFile } from './share.js';
import { sanitizeFilename, isBlank, displayValue, todayISO, formatDMY } from './util.js';

const state = loadState(localStorage);

// The form Date is always today's date (DD/MM/YYYY), filled automatically and not editable.
state.fields.consent_date = formatDMY();

// The original AOK form used as the PDF background. Fetched once, cached.
const TEMPLATE_URL = new URL('../assets/aok-cis-template.pdf', import.meta.url);
let _templateBytes = null;
async function loadTemplate() {
  if (_templateBytes) return _templateBytes;
  const resp = await fetch(TEMPLATE_URL);
  if (!resp.ok) throw new Error('Could not load the form template (' + resp.status + ').');
  _templateBytes = new Uint8Array(await resp.arrayBuffer());
  return _templateBytes;
}

const STEPS = [
  { kind: 'intro' },
  ...SECTIONS.map((section) => ({ kind: 'section', section })),
  { kind: 'review' },
];

let currentStep = 0;

const app = document.getElementById('app');
const bar = document.getElementById('bar');

const sigModal = document.getElementById('sigModal');
const sigCanvas = document.getElementById('sigCanvas');
const sigClearBtn = document.getElementById('sigClear');
const sigSaveBtn = document.getElementById('sigSave');
let sigPad = null;

function getSigPad() {
  if (!sigPad) sigPad = new SignaturePad(sigCanvas);
  return sigPad;
}

sigClearBtn.addEventListener('click', () => {
  getSigPad().clear();
});

sigSaveBtn.addEventListener('click', async () => {
  const pad = getSigPad();
  if (!pad.isEmpty()) {
    state.signature = await pad.toPngBytes();
  }
  sigModal.close();
  renderStep(currentStep);
});

function openSignatureModal() {
  getSigPad();
  sigModal.showModal();
}

let saveTimer = null;
function debouncedSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveState(state, localStorage), 300);
}

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined) continue;
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v);
  }
  for (const child of [].concat(children)) {
    if (child == null) continue;
    node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return node;
}

function renderField(fld) {
  const wrap = el('div', { class: 'field' });

  if (fld.type === 'checkbox') {
    // Consent block: read-only text + bullets, then the checkbox.
    const who = state.fields.auth_name || state.fields.full_names || '[name]';
    const consentBlock = el('div', { class: 'consent-block' }, [
      el('p', { text: CONSENT_TEXT.replace('{name}', who) }),
      el('ul', {}, CONSENT_BULLETS.map((b) => el('li', { text: b }))),
    ]);
    wrap.appendChild(consentBlock);

    const checkboxRow = el('div', { class: 'checkbox-row' });
    const checkbox = el('input', { type: 'checkbox', id: fld.id });
    checkbox.checked = state.fields[fld.id] === true;
    checkbox.addEventListener('change', () => {
      state.fields[fld.id] = checkbox.checked;
      debouncedSave();
    });
    const label = el('label', { for: fld.id, text: fld.label });
    checkboxRow.appendChild(checkbox);
    checkboxRow.appendChild(label);
    wrap.appendChild(checkboxRow);
    return wrap;
  }

  const label = el('label', { for: fld.id, text: fld.label });
  wrap.appendChild(label);

  if (fld.readonly) {
    // Auto-filled, locked value (e.g. today's date) — shown but not editable.
    const box = el('div', { class: 'readonly-value', text: displayValue(state.fields[fld.id]) || '—' });
    wrap.appendChild(box);
    return wrap;
  }

  if (fld.type === 'textarea') {
    const textarea = el('textarea', { id: fld.id });
    textarea.value = state.fields[fld.id] || '';
    textarea.addEventListener('input', () => {
      state.fields[fld.id] = textarea.value;
      debouncedSave();
    });
    wrap.appendChild(textarea);
    return wrap;
  }

  if (fld.type === 'choice') {
    const row = el('div', { class: 'chip-row' });
    for (const opt of fld.options || []) {
      const chip = el('button', { type: 'button', class: 'chip', text: opt });
      if (state.fields[fld.id] === opt) chip.classList.add('selected');
      chip.addEventListener('click', () => {
        state.fields[fld.id] = opt;
        debouncedSave();
        for (const c of row.children) c.classList.remove('selected');
        chip.classList.add('selected');
      });
      row.appendChild(chip);
    }
    wrap.appendChild(row);
    return wrap;
  }

  // text / email / tel / date
  const input = el('input', { type: fld.type, id: fld.id });
  input.value = state.fields[fld.id] || '';
  input.addEventListener('input', () => {
    state.fields[fld.id] = input.value;
    debouncedSave();
  });
  wrap.appendChild(input);
  return wrap;
}

function renderIntro() {
  const wrap = el('div');
  wrap.appendChild(el('h2', { class: 'step-title', text: HEADER.title }));
  wrap.appendChild(el('p', { text: HEADER.company }));
  wrap.appendChild(el('p', { class: 'hint', text: HEADER.reg }));
  wrap.appendChild(el('p', { class: 'hint', text: HEADER.exemption }));
  wrap.appendChild(el('p', { class: 'hint', text: HEADER.address }));
  wrap.appendChild(el('p', { class: 'hint', text: HEADER.contact }));
  wrap.appendChild(el('p', {
    text: 'This form takes a few minutes. Your progress is saved automatically on this device.',
  }));
  return wrap;
}

function renderSection(section) {
  const wrap = el('div');
  wrap.appendChild(el('h2', { class: 'step-title', text: section.title }));
  for (const fld of section.fields) {
    wrap.appendChild(renderField(fld));
  }
  return wrap;
}

function fieldLabelFor(id) {
  for (const section of SECTIONS) {
    const fld = section.fields.find((f) => f.id === id);
    if (fld) return fld.label;
  }
  return id;
}

function renderReview() {
  const wrap = el('div');
  wrap.appendChild(el('h2', { class: 'step-title', text: 'Review & submit' }));

  const summary = el('div', { class: 'summary' });
  for (const section of SECTIONS) {
    for (const fld of section.fields) {
      if (fld.type === 'checkbox') continue;
      const value = state.fields[fld.id];
      if (isBlank(value)) continue;
      summary.appendChild(el('div', { class: 'summary-row' }, [
        el('span', { class: 'k', text: fieldLabelFor(fld.id) }),
        el('span', { class: 'v', text: displayValue(value) }),
      ]));
    }
  }
  wrap.appendChild(summary);

  // Signature capture
  const sigSection = el('div', { class: 'field' });
  sigSection.appendChild(el('label', { text: 'Signature' }));
  const signed = !!state.signature;
  sigSection.appendChild(el('p', {
    class: 'sig-status',
    text: signed ? 'Signature captured.' : 'No signature yet.',
  }));
  const sigBtn = el('button', {
    type: 'button',
    class: 'primary',
    text: signed ? 'Re-sign' : 'Click here to sign',
    onclick: openSignatureModal,
  });
  sigSection.appendChild(sigBtn);
  wrap.appendChild(sigSection);

  const v = validateForGenerate(state);

  if (!v.ok) {
    const errBox = el('div', { class: 'errors' });
    errBox.appendChild(el('p', { text: 'Please fix the following before generating the PDF:' }));
    const list = el('ul', {}, v.errors.map((msg) => el('li', { text: msg })));
    errBox.appendChild(list);
    wrap.appendChild(errBox);
  }

  const actions = el('div', { class: 'field' });
  const generateBtn = el('button', {
    type: 'button',
    class: 'primary',
    text: 'Save & Share PDF',
    disabled: v.ok ? undefined : 'disabled',
  });
  if (!v.ok) generateBtn.disabled = true;
  const genError = el('p', { class: 'errors', text: '' });
  genError.style.display = 'none';

  // Status + share controls that appear after the PDF is made.
  const doneMsg = el('p', { class: 'done-msg', text: '' });
  doneMsg.style.display = 'none';
  const shareBtn = el('button', { type: 'button', class: 'primary', text: 'Share (WhatsApp / Email)' });
  shareBtn.style.display = 'none';
  const waMessage = 'Hello, attached is my completed Africa Origin Khumoetsile Client Information Sheet.';

  generateBtn.addEventListener('click', async () => {
    // open a blank tab NOW (inside the gesture) so mobile browsers allow the
    // review tab; we point it at the PDF once it is built.
    const reviewTab = window.open('', '_blank');
    generateBtn.disabled = true;
    generateBtn.textContent = 'Preparing your PDF…';
    genError.style.display = 'none';
    genError.textContent = '';
    try {
      const templateBytes = await loadTemplate();
      const bytes = await buildPdf(state, state.signature, templateBytes);
      const name = sanitizeFilename(state.fields.business_name || state.fields.full_names);
      const filename = 'AOK-CIS-' + name + '-' + todayISO() + '.pdf';
      const file = saveAndReview(bytes, filename, reviewTab);
      doneMsg.textContent = 'Saved to your device and opened for you to review. When you are happy, share it:';
      doneMsg.style.display = '';
      shareBtn.style.display = '';
      shareBtn.onclick = () => shareFile(file, waMessage);
      generateBtn.textContent = 'Re-create PDF';
    } catch (err) {
      if (reviewTab && !reviewTab.closed) reviewTab.close();
      genError.textContent = 'Something went wrong creating your PDF. Please try again. '
        + ((err && err.message) ? '(' + err.message + ')' : '');
      genError.style.display = '';
      generateBtn.textContent = 'Save & Share PDF';
    } finally {
      generateBtn.disabled = false;
    }
  });
  actions.appendChild(generateBtn);
  actions.appendChild(doneMsg);
  actions.appendChild(shareBtn);
  actions.appendChild(genError);
  wrap.appendChild(actions);

  const startOver = el('div', { class: 'field' });
  const startOverBtn = el('button', {
    type: 'button',
    text: 'Start over',
    onclick: () => {
      if (confirm('This clears everything you entered. Continue?')) {
        clearState(localStorage);
        location.reload();
      }
    },
  });
  startOver.appendChild(startOverBtn);
  wrap.appendChild(startOver);

  return wrap;
}

function renderNav() {
  const nav = el('div', { class: 'bottom-nav' });

  const backBtn = el('button', { type: 'button', text: 'Back' });
  backBtn.disabled = currentStep === 0;
  backBtn.addEventListener('click', () => {
    if (currentStep > 0) {
      currentStep -= 1;
      renderStep(currentStep);
    }
  });
  nav.appendChild(backBtn);

  const isLast = currentStep === STEPS.length - 1;
  const nextBtn = el('button', {
    type: 'button',
    class: 'primary',
    text: isLast ? 'Done' : 'Next',
  });
  nextBtn.addEventListener('click', () => {
    if (currentStep < STEPS.length - 1) {
      currentStep += 1;
      renderStep(currentStep);
    }
  });
  if (isLast) nextBtn.disabled = true;
  nav.appendChild(nextBtn);

  return nav;
}

function renderStep(i) {
  currentStep = i;
  app.innerHTML = '';

  const step = STEPS[i];
  let content;
  if (step.kind === 'intro') content = renderIntro();
  else if (step.kind === 'section') content = renderSection(step.section);
  else content = renderReview();

  app.appendChild(content);
  app.appendChild(renderNav());

  bar.style.width = ((i + 1) / STEPS.length) * 100 + '%';
}

renderStep(0);
