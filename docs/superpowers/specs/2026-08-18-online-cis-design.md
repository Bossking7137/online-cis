# Online CIS — Design Spec

**Date:** 2026-08-18
**Project:** Online CIS (Client Information Sheet, digital)
**Owner:** Africa Origin Khumoetsile (Pty) Ltd (AOK)
**Location:** `C:\Users\origi\Africa Origin\online-cis`

---

## 1. Purpose

Digitize AOK's paper "Client Information Sheet" (a Botswana credit/loan
application) so a client can fill it in online on any device, sign it on-screen,
generate a clean PDF on their own device, and share that PDF to AOK via WhatsApp
or any other channel.

The current source is a 2-page Word-exported PDF with **no interactive fields** —
a print-and-sign document. We are rebuilding the digital equivalent from scratch.

## 2. Constraints & decisions (locked with owner)

- **No backend.** The app is 100% client-side. Nothing is stored on a server; no
  database, no login. The client's data (Omang, bank details, next of kin) stays
  on their own device until they choose to share the finished PDF. This is the
  cheapest and the most privacy-safe posture for this sensitive data.
- **Hosting:** static site, deployable to a free host (Netlify / GitHub Pages)
  and later a custom domain. Also runs by opening the file directly (offline).
- **PDF look:** clean, professional re-layout of the same content — NOT a
  pixel copy of the Word file's dotted lines.
- **Required fields (minimal):** authorised/full name, cell number, consent
  checkbox, and a signature. All other fields are optional.
- **Times/locale:** Botswana context — terms preserved verbatim (Omang, Headman,
  Ward, UIN, COP/OCOP, Exemption number).

## 3. Non-goals (YAGNI)

- No central AOK dashboard, no server-side storage, no auto-email in v1.
- No user accounts or authentication.
- No pixel-identical reproduction of the original dotted-line layout.
- No multi-language (English only, matching the source).

## 4. Form content (from the source PDF)

Company header (constant, printed on every PDF):

- AFRICA ORIGIN KHUMOETSILE PTY LTD
- REG NUMBER: BW00005267841
- EXEMPTION NUMBER: 11/1/8 (01)
- PLOT 688, KWHAI ROAD, GABORONE
- CONTACT NUMBER: 77 716 452
- Title: CLIENT INFORMATION SHEET

**Section 1 — Applicant details (Business)**
- Applicant name (Business)
- Registration number (UIN)
- Business postal address (multi-line)
- **Borrower Reference Consent** — the "I, <name>, duly authorised…" paragraph
  and its three consent bullets, shown read-only, plus a required agreement check
- Date · Borrower duly Authorised name · **Borrower duly Authorised Signature**

**Section 2 — Applicant personal details** (choose-one items become chips)
- Title: Mr / Mrs / Miss / Dr / Prof
- Full names
- Marital status: Single / Married COP / Married OCOP / Divorced / Widowed
- Maiden name (married woman)
- Date of birth · Omang / passport · Nationality

**Section 3 — Applicant contact details**
- Cell no (also for notification)
- Telephone (work) · (home)
- Email
- Residential address · Owner / Tenant
- Time at address (Years / Months)
- Home village · Ward · Headman

**Section 4 — Applicant bank details**
- Account name
- Bank name · Branch name & code
- Account number
- Account type: Current / Savings / Other

**Section 5 — Next of Kin 1 (spouse if married) and Next of Kin 2 (not living with you)**
Each: Name · Relationship · Employer name · Telephone (work) · Cell ·
Residential address · Home village · Headman name

## 5. Architecture

Single-page web app, no build step, vanilla HTML/CSS/JavaScript.

```
index.html      structure + step markup
styles.css      mobile-first responsive styling
app.js          wizard navigation, state, validation, autosave
signature.js    canvas signature pad (pointer + touch)
pdf.js          builds the PDF with pdf-lib, embeds signature PNG
share.js        Web Share API + desktop download/WhatsApp fallback
vendor/pdf-lib.min.js   bundled locally (no CDN — offline-safe)
```

Each unit has one job and a narrow interface:

- `app.js` owns a single `formState` object and renders steps. It calls
  `signature.open()` and `pdf.generate(formState, signaturePng)`.
- `signature.js` exposes `open() -> Promise<pngDataUrl>`; knows nothing about the
  form.
- `pdf.js` exposes `generate(state, signaturePng) -> Blob`; knows nothing about
  the DOM.
- `share.js` exposes `share(blob, filename)`; handles capability detection.

## 6. Screen flow (wizard)

1. **Start** — AOK header, one-line intro, "Begin".
2. **Section 1 — Business & consent** — business fields; consent text read-only;
   required "I agree" check.
3. **Section 2 — Personal** — Title / Marital status as tap-chips.
4. **Section 3 — Contact.**
5. **Section 4 — Bank** — Account type as chips.
6. **Section 5 — Next of Kin 1 & 2.**
7. **Sign** — signature pad pop-up; capture Date + Authorised name.
8. **Review & Generate** — summary → "Generate PDF" → Share / Download.

Cross-cutting: top progress bar, Back/Next, autosave to `localStorage` so a
dropped connection doesn't wipe progress, and a "Clear my data" button.

## 7. Signature pad

A modal with an HTML `<canvas>` capturing Pointer Events (covers mouse, touch,
and stylus uniformly) with a touch-action lock so drawing doesn't scroll the
page. A baseline signing line. Buttons: **Clear**, **Save**. On save, exports a
trimmed transparent PNG for embedding. On narrow phones, a hint to rotate to
landscape for a larger signing area. Works identically on Android, iPhone,
laptop, desktop.

## 8. PDF generation

Built client-side with `pdf-lib`:

- A4 pages, AOK header block, five sections laid out cleanly with the client's
  typed answers, the consent paragraph, Date, Authorised name, and the embedded
  signature PNG on the signature line.
- Empty optional fields render as a blank underline (so the PDF still reads like
  the official form).
- Filename: `AOK-CIS-<BusinessOrFullName>-<YYYY-MM-DD>.pdf` (sanitized).

## 9. Sharing

- **Phones / supported browsers:** `navigator.canShare({ files: [pdf] })` → native
  Share sheet → WhatsApp, Gmail, Drive, etc. in one tap.
- **Desktop / unsupported:** trigger a **Download**, plus a WhatsApp button
  (`https://wa.me/?text=…`) opening WhatsApp with a pre-typed message so the user
  attaches the just-downloaded file. Browsers cannot auto-attach a local file into
  WhatsApp from a web page (a platform security rule); the UI makes the
  download-then-attach step explicit.

## 10. Validation

- Block "Generate PDF" until: name (business or full) present, cell number
  present, consent checked, signature captured.
- Inline, friendly error messages; never lose entered data on error.
- Light format hints (email shape, digits for phone) as warnings, not hard blocks
  — real forms receive imperfect data.

## 11. Testing

- Manual device matrix: Android Chrome, iPhone Safari, desktop Chrome/Edge —
  fill, sign, generate, share.
- Signature pad: verify touch draws without page-scroll; Clear resets; Save embeds.
- PDF: open the generated file and confirm every entered field appears and the
  signature is placed correctly.
- Share fallback: confirm desktop downloads and the WhatsApp link opens.
- Offline: load with network disabled (bundled libs) and confirm full flow works.

## 12. Deliverables

- The `online-cis` static site (the files in §5).
- A short `README.md`: how to open/test locally and how to deploy to Netlify /
  GitHub Pages.
- This spec.

## 13. Future (not in v1)

- Optional auto-email a copy to AOK.
- Optional central submissions dashboard (needs backend + security review, since
  it would store Omang/bank data online).
- Custom domain + AOK branding polish.
