import { PDFDocument, rgb, StandardFonts } from '../vendor/pdf-lib.esm.js';
import { HEADER, SECTIONS, CONSENT_TEXT, CONSENT_BULLETS } from './schema.js';
import { displayValue } from './util.js';

const A4 = [595.28, 841.89];
const MARGIN = 48;
const CONTENT_WIDTH = A4[0] - 2 * MARGIN;
const VALUE_X = MARGIN + 170;
const VALUE_WIDTH = A4[0] - MARGIN - VALUE_X;

// Greedily wraps `text` to fit within `maxWidth` at `size` using `font`'s metrics.
// Any single "word" longer than maxWidth is hard-broken character by character so
// it can never overflow the right margin.
export function wrapText(text, font, size, maxWidth) {
  const str = String(text ?? '');
  if (str === '') return [''];

  const lines = [];
  for (const rawLine of str.split('\n')) {
    if (rawLine === '') { lines.push(''); continue; }
    const words = rawLine.split(' ');
    let current = '';
    for (const word of words) {
      const candidate = current ? current + ' ' + word : word;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        current = candidate;
        continue;
      }
      // candidate doesn't fit — flush what we have, then handle `word`.
      if (current) { lines.push(current); current = ''; }
      if (font.widthOfTextAtSize(word, size) <= maxWidth) {
        current = word;
      } else {
        // hard-break the oversized word
        let chunk = '';
        for (const ch of word) {
          const test = chunk + ch;
          if (font.widthOfTextAtSize(test, size) <= maxWidth) {
            chunk = test;
          } else {
            if (chunk) lines.push(chunk);
            chunk = ch;
          }
        }
        current = chunk;
      }
    }
    lines.push(current);
  }
  return lines;
}

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

  // Draws `text` wrapped to `maxWidth`, one line per call to draw(), advancing y via line().
  const drawWrapped = (text, x, maxWidth, f = font, size = 10, dy = 14) => {
    const lines = wrapText(text, f, size, maxWidth);
    for (const l of lines) {
      draw(l, x, f, size);
      line(dy);
    }
  };

  // Ensures at least `needed` points remain below the current y before drawing;
  // starts a new page if not.
  const ensureSpace = (needed) => {
    if (y - needed < MARGIN) { page = doc.addPage(A4); y = A4[1] - MARGIN; }
  };

  // Header
  draw(HEADER.company, MARGIN, bold, 13); line();
  for (const l of [HEADER.reg, HEADER.exemption, HEADER.address, HEADER.contact]) { draw(l, MARGIN); line(12); }
  line(6); draw(HEADER.title, MARGIN, bold, 12); line(24);

  for (const section of SECTIONS) {
    draw(section.title, MARGIN, bold, 11); line(18);
    for (const fld of section.fields) {
      if (fld.id === 'consent') {
        const who = displayValue(fields.auth_name) || displayValue(fields.full_names) || '__________';
        drawWrapped(CONSENT_TEXT.replace('{name}', who), MARGIN, CONTENT_WIDTH, font, 9, 12);
        line(2);
        const bulletX = MARGIN + 8;
        const bulletPrefixWidth = font.widthOfTextAtSize('• ', 8);
        const bulletWidth = (A4[0] - MARGIN - bulletX) - bulletPrefixWidth;
        for (const b of CONSENT_BULLETS) {
          const bLines = wrapText(b, font, 8, bulletWidth);
          bLines.forEach((l, idx) => {
            draw((idx === 0 ? '• ' : '  ') + l, bulletX, font, 8);
            line(10);
          });
        }
        draw('Consent agreed: ' + (fields.consent === true ? 'YES' : 'NO'), MARGIN, bold, 9); line(16);
        continue;
      }
      draw(fld.label + ':', MARGIN, bold, 9);
      const value = displayValue(fields[fld.id]);
      if (value === '') {
        rule(MARGIN + 168, A4[0] - MARGIN);
        line();
      } else {
        const valueLines = wrapText(value, font, 10, VALUE_WIDTH);
        valueLines.forEach((l, idx) => {
          draw(l, VALUE_X, font, 10);
          if (idx === valueLines.length - 1) rule(MARGIN + 168, A4[0] - MARGIN);
          line();
        });
      }
    }
    line(8);
  }

  // Signature
  const sigBlockHeight = 90;
  ensureSpace(sigBlockHeight);
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
