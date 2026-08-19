import { PDFDocument, StandardFonts, rgb } from '../vendor/pdf-lib.esm.js';
import { displayValue } from './util.js';

// ---------------------------------------------------------------------------
// Template-overlay PDF builder.
//
// Instead of redrawing the form, we load AOK's ORIGINAL PDF as the background
// and type the client's answers onto the blank lines, then drop the signature
// onto the signature line. Output is pixel-identical to the original form
// (logo, headings, dotted lines, spacing preserved) — only answers are added.
//
// Coordinates are in PDF user space (origin BOTTOM-LEFT, y = text baseline).
// The blank-start x values are the TRUE glyph positions of each dotted leader,
// read from the template's own font via the PDF operator list — so answers sit
// in the blanks and never overlap the printed labels. `page` is 0-based.
// To nudge a value, change x / y / maxW here — nothing else moves.
// ---------------------------------------------------------------------------

const INK = rgb(0.05, 0.05, 0.5);   // dark blue "pen"
const SIZE = 10;                     // default answer font size
const LINE_DROP = 11;                // vertical gap when a value wraps

// page: 0-based · x,y: baseline start of the blank · maxW: width budget · size: optional
const MAP = {
  // ---- SHEET 1 ----
  referee_name:     { page: 0, x: 155, y: 551.6, maxW: 268 },
  referee_contact:  { page: 0, x: 173, y: 532.9, maxW: 238 },
  business_name:    { page: 0, x: 179, y: 490.0, maxW: 238 },
  uin:              { page: 0, x: 179, y: 471.4, maxW: 238 },
  business_address: { page: 0, x: 167, y: 452.7, maxW: 246, contX: 56, contY: 434.1, contW: 388 },
  consent_name:     { page: 0, x: 61,  y: 372.5, maxW: 245, size: 9 },
  consent_date:     { page: 0, x: 83,  y: 230.9, maxW: 350 },
  auth_name:        { page: 0, x: 207, y: 201.3, maxW: 213 },

  // ---- SHEET 2 ----
  // title, marital_status, occupancy are "mark with X" fields — circled below.
  full_names:       { page: 1, x: 110, y: 744.9, maxW: 322 },
  maiden_name:      { page: 1, x: 207, y: 707.6, maxW: 222 },
  dob:              { page: 1, x: 118, y: 688.9, maxW: 80 },
  omang:            { page: 1, x: 308, y: 688.9, maxW: 96 },
  nationality:      { page: 1, x: 110, y: 670.3, maxW: 315 },
  cell:             { page: 1, x: 96,  y: 627.5, maxW: 165 },
  tel_work:         { page: 1, x: 142, y: 608.7, maxW: 105 },
  tel_home:         { page: 1, x: 297, y: 608.7, maxW: 125 },
  email:            { page: 1, x: 86,  y: 590.1, maxW: 350 },
  res_address:      { page: 1, x: 149, y: 571.4, maxW: 190 },
  years_at_address: { page: 1, x: 279, y: 552.8, maxW: 40 },
  months_at_address:{ page: 1, x: 340, y: 552.8, maxW: 50 },
  home_village:     { page: 1, x: 120, y: 534.1, maxW: 138 },
  ward:             { page: 1, x: 297, y: 534.1, maxW: 125 },
  headman:          { page: 1, x: 133, y: 515.5, maxW: 305 },
  account_name:     { page: 1, x: 127, y: 472.6, maxW: 305 },
  bank_name:        { page: 1, x: 112, y: 453.9, maxW: 120 },
  branch:           { page: 1, x: 337, y: 453.9, maxW: 97 },
  account_number:   { page: 1, x: 137, y: 435.3, maxW: 300 },
  account_type:     { page: 1, x: 229, y: 416.6, maxW: 178 }, // sits on the dotted blank
  // Next of Kin 1
  nok1_name:        { page: 1, x: 88,  y: 373.7, maxW: 353 },
  nok1_relationship:{ page: 1, x: 116, y: 355.1, maxW: 128 },
  nok1_employer:    { page: 1, x: 325, y: 355.1, maxW: 97 },
  nok1_tel_work:    { page: 1, x: 160, y: 336.4, maxW: 96 },
  nok1_cell:        { page: 1, x: 291, y: 336.4, maxW: 119 },
  nok1_address:     { page: 1, x: 149, y: 317.8, maxW: 280 },
  nok1_village:     { page: 1, x: 120, y: 299.1, maxW: 138 },
  nok1_headman:     { page: 1, x: 330, y: 299.1, maxW: 108 },
  // Next of Kin 2
  nok2_name:        { page: 1, x: 88,  y: 256.2, maxW: 353 },
  nok2_relationship:{ page: 1, x: 116, y: 237.6, maxW: 128 },
  nok2_employer:    { page: 1, x: 325, y: 237.6, maxW: 97 },
  nok2_tel_work:    { page: 1, x: 160, y: 218.9, maxW: 96 },
  nok2_cell:        { page: 1, x: 291, y: 218.9, maxW: 119 },
  nok2_address:     { page: 1, x: 149, y: 200.3, maxW: 280 },
  nok2_village:     { page: 1, x: 120, y: 181.6, maxW: 138 },
  nok2_headman:     { page: 1, x: 330, y: 181.6, maxW: 108 },
};

// signature image slot on sheet 1 (bottom-left of the drawn image)
const SIG = { page: 0, x: 223, y: 167, maxW: 150, maxH: 38 };

// "Mark with X" fields — the chosen option word is circled on the printed form.
// Boxes are the TRUE glyph positions of each option word (x = left, w = width).
const CHOICES = {
  title: { page: 1, options: {
    Mr:   { x: 82.4,  w: 13.2, y: 764 },
    Mrs:  { x: 104.9, w: 17.6, y: 764 },
    Miss: { x: 131.6, w: 20.5, y: 764 },
    Dr:   { x: 161.4, w: 10.7, y: 764 },
    Prof: { x: 181.0, w: 18.8, y: 764 },
  }},
  marital_status: { page: 1, options: {
    'Single':       { x: 125.6, w: 26.5, y: 726 },
    'Married COP':  { x: 161.3, w: 57.4, y: 726 },
    'Married OCOP': { x: 227.9, w: 64.8, y: 726 },
    'Divorced':     { x: 301.8, w: 39.9, y: 726 },
    'Widowed':      { x: 350.8, w: 43.1, y: 726 },
  }},
  occupancy: { page: 1, options: {
    Owner:  { x: 335.3, w: 30.2, y: 571 },
    Tenant: { x: 374.6, w: 31.4, y: 571 },
  }},
};

function wrapText(text, font, size, maxWidth) {
  const out = [];
  for (const rawLine of String(text).split('\n')) {
    const words = rawLine.split(/\s+/).filter(Boolean);
    if (words.length === 0) { out.push(''); continue; }
    let line = '';
    for (const word of words) {
      const trial = line ? line + ' ' + word : word;
      if (!line && font.widthOfTextAtSize(word, size) > maxWidth) {
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

  // circle the chosen option on "mark with X" fields
  for (const [id, cfg] of Object.entries(CHOICES)) {
    const chosen = displayValue(fields[id]);
    const box = chosen && cfg.options[chosen];
    if (!box) continue;
    const page = pages[cfg.page];
    if (!page) continue;
    page.drawEllipse({
      x: box.x + box.w / 2,
      y: box.y + 3,
      xScale: box.w / 2 + 5,
      yScale: 8.5,
      borderColor: INK,
      borderWidth: 1.2,
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
