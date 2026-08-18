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
// Coordinates measured from "AOK Client Information application Version 3".
const MAP = {
  // ---- SHEET 1 ----
  referee_name:     { page: 0, x: 138, y: 551.6, maxW: 285 },
  referee_contact:  { page: 0, x: 154, y: 532.9, maxW: 258 },
  business_name:    { page: 0, x: 159, y: 490.0, maxW: 258 },
  uin:              { page: 0, x: 157, y: 471.4, maxW: 260 },
  business_address: { page: 0, x: 150, y: 452.7, maxW: 262, contX: 56, contY: 434.1, contW: 390 },
  // consent "I ______ duly authorised…" — the authorised person's name
  consent_name:     { page: 0, x: 60,  y: 372.5, maxW: 246, size: 9 },
  consent_date:     { page: 0, x: 77,  y: 230.9, maxW: 356 },
  auth_name:        { page: 0, x: 182, y: 201.3, maxW: 240 },

  // ---- SHEET 2 ----
  title:            { page: 1, x: 210, y: 763.5, size: 9 },   // choice, appended right of options
  full_names:       { page: 1, x: 100, y: 744.9, maxW: 332 },
  marital_status:   { page: 1, x: 402, y: 726.2, maxW: 90, size: 8 }, // choice
  maiden_name:      { page: 1, x: 180, y: 707.6, maxW: 250 },
  dob:              { page: 1, x: 108, y: 688.9, maxW: 90 },
  omang:            { page: 1, x: 295, y: 688.9, maxW: 108 },
  nationality:      { page: 1, x: 97,  y: 670.3, maxW: 328 },
  cell:             { page: 1, x: 92,  y: 627.5, maxW: 170 },
  tel_work:         { page: 1, x: 126, y: 608.7, maxW: 120 },
  tel_home:         { page: 1, x: 285, y: 608.7, maxW: 137 },
  email:            { page: 1, x: 79,  y: 590.1, maxW: 358 },
  res_address:      { page: 1, x: 137, y: 571.4, maxW: 203 },
  occupancy:        { page: 1, x: 414, y: 571.4, maxW: 120, size: 7 }, // choice
  years_at_address: { page: 1, x: 259, y: 552.8, maxW: 58 },
  months_at_address:{ page: 1, x: 331, y: 552.8, maxW: 58 },
  home_village:     { page: 1, x: 108, y: 534.1, maxW: 150 },
  ward:             { page: 1, x: 288, y: 534.1, maxW: 134 },
  headman:          { page: 1, x: 118, y: 515.5, maxW: 323 },
  account_name:     { page: 1, x: 112, y: 472.6, maxW: 322 },
  bank_name:        { page: 1, x: 104, y: 453.9, maxW: 130 },
  branch:           { page: 1, x: 327, y: 453.9, maxW: 105 },
  account_number:   { page: 1, x: 120, y: 435.3, maxW: 317 },
  account_type:     { page: 1, x: 204, y: 416.6, maxW: 204 }, // choice, sits on the dotted blank
  // Next of Kin 1 (Section 5)
  nok1_name:        { page: 1, x: 81,  y: 373.7, maxW: 360 },
  nok1_relationship:{ page: 1, x: 106, y: 355.1, maxW: 138 },
  nok1_employer:    { page: 1, x: 315, y: 355.1, maxW: 105 },
  nok1_tel_work:    { page: 1, x: 141, y: 336.4, maxW: 113 },
  nok1_cell:        { page: 1, x: 279, y: 336.4, maxW: 130 },
  nok1_address:     { page: 1, x: 132, y: 317.8, maxW: 286 },
  nok1_village:     { page: 1, x: 110, y: 299.1, maxW: 138 },
  nok1_headman:     { page: 1, x: 319, y: 299.1, maxW: 113 },
  // Next of Kin 2 (Section 6)
  nok2_name:        { page: 1, x: 81,  y: 256.2, maxW: 360 },
  nok2_relationship:{ page: 1, x: 106, y: 237.6, maxW: 138 },
  nok2_employer:    { page: 1, x: 315, y: 237.6, maxW: 105 },
  nok2_tel_work:    { page: 1, x: 141, y: 218.9, maxW: 113 },
  nok2_cell:        { page: 1, x: 279, y: 218.9, maxW: 130 },
  nok2_address:     { page: 1, x: 132, y: 200.3, maxW: 286 },
  nok2_village:     { page: 1, x: 110, y: 181.6, maxW: 138 },
  nok2_headman:     { page: 1, x: 319, y: 181.6, maxW: 113 },
};

// signature image slot on sheet 1 (bottom-left of the drawn image)
const SIG = { page: 0, x: 198, y: 166, maxW: 150, maxH: 40 };

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
