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
