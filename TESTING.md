# Testing Guide — Online CIS

This document describes the automated tests (unit tests, E2E test) and the manual device matrix verification that AOK must complete before production deployment.

## Automated Testing Status

### Unit Tests — DONE ✓

**Status:** All 16 tests passing.

**How to run:**
1. Start a local HTTP server: `python -m http.server 8000`
2. Open `http://localhost:8000/tests/index.html` in a browser
3. The page prints a PASS/FAIL summary

Tests run in the browser (no Node.js required). An import map in `tests/index.html` aliases `node:test` and `node:assert/strict` to local shims, so test files are unchanged and would also run under Node if installed.

**Test coverage:**

| Module | File | Tests | Status |
|--------|------|-------|--------|
| Schema | `tests/schema.test.js` | 2 | PASS |
| Utilities | `tests/util.test.js` | 4 | PASS |
| Validation | `tests/validation.test.js` | 5 | PASS |
| State | `tests/state.test.js` | 3 | PASS |
| PDF generation | `tests/pdf.test.js` | 2 | PASS |
| **Total** | | **16** | **PASS** |

**What's tested:**
- Schema: Field definitions, form structure
- Utilities: String formatting, date handling
- Validation: Required fields, field types, Omang format, email format
- State: Field updates, signature capture, state immutability
- PDF: PDF binary structure, embedded signature image, filename generation

### End-to-End Test — DONE ✓

**What was tested:**
- Filled every form field (name, Omang, banking details, declarations)
- Captured a signature on the canvas via pointer events (confirmed no page scrolling during drawing)
- Passed all validation checks
- Generated a PDF locally
  - File: `AOK-CIS-<name>-<date>.pdf`
  - Size: ~7.2 KB
  - Format: Valid PDF (starts with `%PDF-`, contains embedded signature image)
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
   - [ ] All 16 fields are present (name, Omang, banking, etc.)
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
   - [ ] "Generate & share" button is enabled (all required fields filled + signed)
   - [ ] Clicking generates a PDF locally (no network request)
   - [ ] Progress is shown (modal or toast)
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
- [ ] PDF generation works (file is valid, ~7KB, contains signature)
- [ ] Sharing works (WhatsApp is in share options on phones)
- [ ] Desktop WhatsApp caveat is communicated to users (download-then-attach)

---

## Known Limitations

1. **Desktop WhatsApp sharing:** Browsers cannot directly attach local files to WhatsApp for security reasons. Users must download the PDF and manually attach it.

2. **Data persistence:** Form progress is stored in browser local storage, so it persists across browser restarts — but clearing browser data or using private/incognito mode will clear it.

3. **Signature quality:** Depends on the input device (stylus > finger, higher DPI = sharper image).

4. **PDF file size:** ~7.2 KB base + signature image (~2–4 KB depending on complexity). Total is typically 9–11 KB.

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
- Confirm the device has enough memory (unlikely to be an issue for an 11 KB file)
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
