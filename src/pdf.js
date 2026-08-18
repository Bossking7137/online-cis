import { PDFDocument, StandardFonts, rgb } from '../vendor/pdf-lib.esm.js';
import { displayValue } from './util.js';

// ---------------------------------------------------------------------------
// Template-overlay PDF builder.
//
// Instead of redrawing the form, we load AOK's ORIGINAL PDF as the background
// and type the client's answers onto the blank lines at measured coordinates,
// then drop the signature onto the signature line. The output is therefore
// pixel-identical to the original form (logo, headings, dotted lines, spacing
// all preserved) — only the answers are added.
//
// Coordinates are in PDF user space (origin BOTTOM-LEFT, y = text baseline),
// measured from the template with pdf.js. `page` is 0-based (0 = sheet 1).
// To nudge any value, change x / y / maxW here — nothing else needs to move.
// ---------------------------------------------------------------------------

const INK = rgb(0.05, 0.05, 0.5);   // dark blue "pen" so answers read as filled-in
const SIZE = 10;                     // default answer font size
const LINE_DROP = 11;                // vertical gap when a value wraps to a new line

// page: 0-based · x,y: baseline start · maxW: width budget · size: optional
const MAP = {
  // ---- SHEET 1 ----
  business_name:    { page: 0, x: 200, y: 452.8, maxW: 300 },
  uin:              { page: 0, x: 200, y: 438.3, maxW: 145 },
  business_address: { page: 0, x: 200, y: 423.8, maxW: 300, contX: 75, contY: 409.4, contW: 425 },
  // consent "I ______ duly authorised…" — the authorised person's name
  consent_name:     { page: 0, x: 84,  y: 353.6, maxW: 250, size: 9 },
  consent_date:     { page: 0, x: 104, y: 221.8, maxW: 100 },
  auth_name:        { page: 0, x: 210, y: 195.4, maxW: 265 },

  // ---- SHEET 2 ----
  title:            { page: 1, x: 205, y: 775.7, size: 9 },   // choice, appended right of options
  full_names:       { page: 1, x: 100, y: 755.1, maxW: 388 },
  marital_status:   { page: 1, x: 393, y: 734.7, maxW: 95, size: 8 }, // choice
  maiden_name:      { page: 1, x: 185, y: 714.2, maxW: 300 },
  dob:              { page: 1, x: 113, y: 693.7, maxW: 128 },
  omang:            { page: 1, x: 345, y: 693.7, maxW: 143 },
  nationality:      { page: 1, x: 100, y: 673.2, maxW: 218 },
  cell:             { page: 1, x: 84,  y: 611.7, maxW: 160 },
  tel_work:         { page: 1, x: 140, y: 591.2, maxW: 155 },
  tel_home:         { page: 1, x: 350, y: 591.2, maxW: 138 },
  email:            { page: 1, x: 80,  y: 570.8, maxW: 278 },
  res_address:      { page: 1, x: 130, y: 550.3, maxW: 295 },
  occupancy:        { page: 1, x: 447, y: 552.0, maxW: 70, size: 7 }, // choice
  years_at_address: { page: 1, x: 254, y: 529.8, maxW: 34 },
  months_at_address:{ page: 1, x: 334, y: 529.8, maxW: 34 },
  home_village:     { page: 1, x: 130, y: 509.2, maxW: 160 },
  ward:             { page: 1, x: 335, y: 509.2, maxW: 153 },
  headman:          { page: 1, x: 95,  y: 488.7, maxW: 300 },
  account_name:     { page: 1, x: 120, y: 447.8, maxW: 318 },
  bank_name:        { page: 1, x: 105, y: 427.3, maxW: 170 },
  branch:           { page: 1, x: 385, y: 427.3, maxW: 103 },
  account_number:   { page: 1, x: 130, y: 406.7, maxW: 193 },
  account_type:     { page: 1, x: 220, y: 386.3, maxW: 230 }, // choice, sits on the dotted blank
  // Next of Kin 1
  nok1_name:        { page: 1, x: 80,  y: 345.3, maxW: 408 },
  nok1_relationship:{ page: 1, x: 115, y: 324.8, maxW: 160 },
  nok1_employer:    { page: 1, x: 355, y: 324.8, maxW: 133 },
  nok1_tel_work:    { page: 1, x: 155, y: 304.4, maxW: 143 },
  nok1_cell:        { page: 1, x: 340, y: 304.4, maxW: 148 },
  nok1_address:     { page: 1, x: 130, y: 283.9, maxW: 358 },
  nok1_village:     { page: 1, x: 110, y: 263.3, maxW: 320 },
  nok1_headman:     { page: 1, x: 115, y: 242.8, maxW: 313 },
  // Next of Kin 2
  nok2_name:        { page: 1, x: 80,  y: 201.9, maxW: 408 },
  nok2_relationship:{ page: 1, x: 115, y: 181.3, maxW: 150 },
  nok2_employer:    { page: 1, x: 347, y: 181.3, maxW: 135 },
  nok2_tel_work:    { page: 1, x: 155, y: 160.8, maxW: 143 },
  nok2_cell:        { page: 1, x: 340, y: 160.8, maxW: 148 },
  nok2_address:     { page: 1, x: 130, y: 140.4, maxW: 358 },
  nok2_village:     { page: 1, x: 110, y: 119.9, maxW: 158 },
  nok2_headman:     { page: 1, x: 356, y: 119.9, maxW: 132 },
};

// signature image slot on sheet 1 (bottom-left of the drawn image)
const SIG = { page: 0, x: 225, y: 150, maxW: 150, maxH: 42 };

function wrapText(text, font, size, maxWidth) {
  const out = [];
  for (const rawLine of String(text).split('\n')) {
    const words = rawLine.split(/\s+/).filter(Boolean);
    if (words.length === 0) { out.push(''); continue; }
    let line = '';
    for (const word of words) {
      const trial = line ? line + ' ' + word : word;
      if (!line && font.widthOfTextAtSize(word, size) > maxWidth) {
        // hard-break a single word that alone exceeds the width
        let chunk = '';
        for (const ch of word) {
          if (font.widthOfTextAtSize(chunk + ch, size) > maxWidth && chunk) {
            out.push(chunk); chunk = ch;
          } else { chunk += ch; }
        }
        line = chunk;
      } else if (font.widthOfTextAtSize(trial, size) <= maxWidth || !line) {
        line = trial;
      } else {
        out.push(line); line = word;
      }
    }
    if (line) out.push(line);
  }
  return out;
}

/**
 * Build the completed CIS PDF by overlaying answers onto the original template.
 * @param {{fields:Object, signature:Uint8Array|null}} state
 * @param {Uint8Array|null} signaturePngBytes
 * @param {Uint8Array} templateBytes  bytes of assets/aok-cis-template.pdf
 * @returns {Promise<Uint8Array>}
 */
export async function buildPdf(state, signaturePngBytes, templateBytes) {
  if (!templateBytes || !templateBytes.length) {
    throw new Error('Template PDF not loaded — cannot build the form.');
  }
  const doc = await PDFDocument.load(templateBytes);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const pages = doc.getPages();
  const fields = (state && state.fields) || {};

  // The consent name mirrors the authorised person's name.
  const consentName = displayValue(fields.auth_name) || displayValue(fields.full_names);
  const values = { ...fields, consent_name: consentName };

  for (const [id, pos] of Object.entries(MAP)) {
    const value = displayValue(values[id]);
    if (!value) continue;
    const page = pages[pos.page];
    if (!page) continue;
    const size = pos.size || SIZE;
    const lines = wrapText(value, font, size, pos.maxW || 300);

    let drawX = pos.x, drawY = pos.y + 1.5;
    lines.forEach((ln, i) => {
      if (i === 1 && pos.contX != null) { drawX = pos.contX; drawY = pos.contY + 1.5; }
      else if (i >= 1) { drawY -= LINE_DROP; }
      page.drawText(ln, { x: drawX, y: drawY, size, font, color: INK });
    });
  }

  // signature on sheet 1
  if (signaturePngBytes && signaturePngBytes.length) {
    const png = await doc.embedPng(signaturePngBytes);
    let w = SIG.maxW;
    let h = (png.height / png.width) * w;
    if (h > SIG.maxH) { h = SIG.maxH; w = (png.width / png.height) * h; }
    pages[SIG.page].drawImage(png, { x: SIG.x, y: SIG.y, width: w, height: h });
  }

  return await doc.save();
}
