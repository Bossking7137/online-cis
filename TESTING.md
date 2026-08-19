# Testing Guide — Online CIS

This document describes the automated tests (unit tests, E2E test) and the manual device matrix verification that AOK must complete before production deployment.

## Automated Testing Status

### Unit Tests — DONE ✓

**Status:** All 18 tests passing.

**How to run:**
1. Start a local HTTP server: `python -m http.server 8000`
2. Open `http://localhost:8000/tests/index.html` in a browser
3. The page prints a PASS/FAIL summary

Tests run in the browser (no Node.js required). An import map in `tests/index.html` aliases `node:test` and `node:assert/strict` to local shims, so test files are unchanged and would also run under Node if installed.

**Test coverage:**

| Module | File | Tests | Status |
|--------|------|-------|--------|
| Schema | `tests/schema.test.js` | 4 | PASS |
| Utilities | `tests/util.test.js` | 3 | PASS |
| Validation | `tests/validation.test.js` | 4 | PASS |
| State | `tests/state.test.js` | 3 | PASS |
| PDF overlay | `tests/pdf.test.js` | 4 | PASS |
| **Total** | | **18** | **PASS** |

**What's tested:**
- Schema: Field definitions, form structure
- Utilities: String formatting, date handling
- Validation: Required fields, field types, Omang format, email format
- State: Field updates, signature capture, state immutability
- PDF: PDF binary structure, embedded signature image, filename generation

### End-to-End Test — DONE ✓

**What was tested (through the live wizard UI):**
- Walked every step: Referee → Section 1–5 → Review
- Filled every field; choice fields (Title, Marital status, Owner/Tenant, Account type) set via chips
- Captured a signature on the canvas via pointer events (confirmed no page scrolling during drawing)
- Passed all validation checks
- Generated a PDF locally by overlaying answers onto the AOK Version 3 template
  - File: `AOK-CIS-<business-or-full-name>-<date>.pdf`
  - Size: ~235 KB (includes the original 2-page form as the background)
  - Format: Valid PDF (`%PDF-`), answers sit in the blanks, chosen options circled, signature on page 1
- Verified via a stress build that overlong values wrap and never overflow the page
- Initiated sharing (download + WhatsApp fallback on desktop)

**Result:** PASS

## Manual Device Matrix — TO DO

Before production, AOK team must test the app on **three device/browser combinations** using a real client's workflow:

### Test Procedure (per device)

On each device, follow this checklist:

1. **Open the app**
   - [ ] URL loads without errors (console clear)
   - [ ] Layout is mobile-optimized (on phones: no horizontal scroll)
   - [ ] All form fields visible and readable

2. **Fill the form**
   - [ ] All steps are present (Referee, Applicant, Personal, Contact, Bank, Next-of-Kin 1 & 2)
   - [ ] No fields are cut off or hidden
   - [ ] Typing works (keyboard appears on mobile)
   - [ ] Required fields are marked (red asterisk)

3. **Sign on canvas**
   - [ ] Signature modal opens when "Sign" button is tapped
   - [ ] Drawing works (pointer/touch is captured)
   - [ ] **IMPORTANT:** Drawing does NOT scroll the page (common bug on touch devices)
   - [ ] "Clear" button resets the canvas
   - [ ] Signature is visible after "Save signature" is pressed

4. **Generate PDF**
   - [ ] "Generate PDF" button is enabled (name + cell + consent + signature present)
   - [ ] Clicking generates a PDF locally
   - [ ] **Open the PDF and confirm the answers sit in the blanks (not on the labels), the chosen Title/Marital/Owner options are circled, and the signature is on page 1**
   - [ ] PDF download completes or share sheet appears

5. **Share**
   - **On phones:** Native share sheet appears → WhatsApp is in the list → tapping WhatsApp opens the app with PDF
   - **On desktop:** PDF downloads to Downloads folder → can manually attach to WhatsApp

### Device Matrix

| Device | Browser | Status | Tester | Date | Notes |
|--------|---------|--------|--------|------|-------|
| Android phone | Chrome | [ ] | | | |
| iPhone | Safari | [ ] | | | |
| Desktop | Chrome | [ ] | | | |
| Desktop | Edge | [ ] | | | |

**Note:** Firefox and Safari on desktop are optional (Chrome/Edge cover 95% of desktop users).

---

## How to Test Locally Before Device Matrix

If you want to test locally before going to real devices:

### Desktop simulation
1. Open DevTools (F12)
2. Click the device toggle (top-left) to enable mobile emulation
3. Test on "iPhone 12" and "Pixel 5" presets
4. Note: Touch emulation in DevTools is good but not identical to real touch

### Real mobile testing
1. Connect to the same WiFi as your dev machine
2. Find your machine's local IP: `ipconfig getifaddr en0` (Mac) or `ipconfig` (Windows, look for IPv4)
3. Open `http://<your-ip>:8000/index.html` on your phone
4. Test the full flow

---

## Verification Checklist for Production

Before going live:

- [ ] Unit tests pass in browser (`/tests/index.html`)
- [ ] E2E test completed (form fill → sign → generate → share works)
- [ ] Device matrix completed (Android Chrome, iPhone Safari, desktop Chrome/Edge)
- [ ] No console errors on any device
- [ ] PDF generation works (valid file, answers in the blanks, options circled, signature on page 1)
- [ ] Sharing works (WhatsApp is in share options on phones)
- [ ] Desktop WhatsApp caveat is communicated to users (download-then-attach)

---

## Known Limitations

1. **Desktop WhatsApp sharing:** Browsers cannot directly attach local files to WhatsApp for security reasons. Users must download the PDF and manually attach it.

2. **Data persistence:** Form progress is stored in browser local storage, so it persists across browser restarts — but clearing browser data or using private/incognito mode will clear it.

3. **Signature quality:** Depends on the input device (stylus > finger, higher DPI = sharper image).

4. **PDF file size:** ~235 KB, because the output embeds AOK's original 2-page form as its background (this is what guarantees the layout matches exactly).

---

## Updating coordinates when AOK changes the form

The PDF is produced by typing answers onto `assets/aok-cis-template.pdf` at fixed
coordinates. If AOK issues a new version of the form, the labels move, so the
coordinates in `src/pdf.js` (`MAP` and `CHOICES`) must be re-measured:

1. Replace `assets/aok-cis-template.pdf` with the new form.
2. Serve the project (`python -m http.server 8137`) and open any page.
3. In the browser console, load pdf.js and read the **true glyph positions** of
   each dotted leader from the template's operator list (this is how the current
   coordinates were derived — estimating label widths with a substitute font is
   NOT accurate enough and causes answers to overlap the labels). For each field
   line, take the x where its first `…` glyph is painted; that is the blank-start
   x. For "mark with X" options, take each option word's x and width for the
   circle.
4. Update `MAP` (x = blank-start + ~2, y = the line's baseline, maxW = distance to
   the next label or line end) and `CHOICES` in `src/pdf.js`.
5. Regenerate a sample and confirm every answer sits in its blank.

---

## Troubleshooting Failed Tests

### Unit tests fail to run
- Confirm you're using `http://localhost:8000/tests/index.html` (not `file://`)
- Check browser console (F12 → Console) for import errors
- Ensure `tests/_harness.js` and `tests/_assert.js` exist and are readable

### Unit test failures (specific module)
- Check the failure message in the browser console
- Common issues: field schema change without test update, validation rule change
- Regenerate tests if schema was intentionally changed

### E2E test fails
- Check browser console for JavaScript errors
- Confirm local server is running (`python -m http.server 8000`)
- Try a different browser (rules out browser-specific issues)
- Check network tab (no 404s or failed requests)

### Device matrix issues

**"Signature canvas is sluggish or doesn't draw"**
- Try closing other browser tabs
- Rotate phone to landscape (bigger canvas, sometimes smoother)
- Try a different browser on the same device

**"Signature scrolls the page"**
- This is a known mobile issue. Check that `src/signature.js` sets `touch-action: none` on the canvas.
- Try updating your browser to the latest version.

**"PDF doesn't generate on one device but works on another"**
- Check browser console (F12 → Console tab) for errors
- Confirm the device has enough memory (unlikely to be an issue for a ~235 KB file)
- Try a different browser on the same device

---

## Reporting Results

After completing the device matrix, fill in the table above with:
- Device model and OS version
- Browser name and version
- Status (PASS / FAIL + brief note)
- Tester name
- Date tested

If any device fails, create an issue with:
1. Device/browser combo
2. What failed (e.g., "signature scrolls page")
3. Console error (if any)
4. Screenshot (if possible)

---

For general app documentation, see [README.md](README.md).
