# Online CIS — AOK Client Information Sheet

A client-side, no-backend web app for Africa Origin Khumoetsile (AOK). Clients fill out a Client Information Sheet on their device, sign on-screen, generate a PDF locally, and share it — all without sending any data to a server.

## What this is

This is a **static web app** with no backend or database. Everything runs in the browser:

- Client fills out a form (personal details, banking information, declaration)
- Client draws their signature on a touch-enabled canvas
- PDF is generated client-side (using pdf-lib)
- PDF is shared at the client's choice (WhatsApp on phones; download + link on desktop)

**No data is sent to any server.** All sensitive information (Omang, bank details, signature) stays on the client's device. Only the finished PDF is shared, at the user's complete discretion.

## How to run locally

You need a static HTTP server (Python or Node.js). The app will not work with `file://` URLs — ES modules require HTTP.

### Python (no dependencies)
```bash
cd online-cis
python -m http.server 8000
```
Then open `http://localhost:8000/index.html` in your browser.

### Node.js
```bash
cd online-cis
npx http-server -p 8000
```

## How to run tests

Unit tests run in the browser (no Node.js installation required).

Open `http://localhost:8000/tests/index.html` in a browser. The page prints a PASS/FAIL summary.

**Current status:** 16 unit tests, all passing (schema validation, utilities, form validation, state management, PDF generation).

For more details, see [TESTING.md](TESTING.md).

## How to deploy

The app is **fully static** — no build step, no backend required.

### Option 1: Netlify (drag & drop)
1. Go to [netlify.com/drop](https://netlify.com/drop)
2. Drag the entire `online-cis` folder onto the drop zone
3. Your site is live (Netlify assigns a URL)
4. To use a custom domain, configure DNS settings in Netlify

### Option 2: GitHub Pages
1. Push this folder to a GitHub repo (or add it to an existing repo as a subfolder)
2. In GitHub repo settings, enable GitHub Pages and set the source to your branch
3. The site is live at `https://<username>.github.io/<repo>`
4. Point a custom domain to GitHub Pages via DNS records

## Desktop WhatsApp caveat

On **desktop browsers**, browsers cannot directly attach files to WhatsApp from a web page due to security restrictions. The sharing flow is:

1. **PDF downloads** to the user's Downloads folder
2. User can then **manually attach** it to a WhatsApp message in the desktop app (or via web.whatsapp.com)

On **mobile browsers** (Android Chrome, iPhone Safari), the app uses the native share sheet, and WhatsApp appears as a one-tap option.

## Privacy & data handling

- **Your data stays on your device.** Nothing is uploaded to our servers.
- **No account, login, or authentication required.**
- **No cookies or tracking.** The app does not store data except in your browser's local storage (your current form progress).
- **Only the PDF is shared.** You choose what to send and to whom.
- **Safe for sensitive data:** Omang, bank account details, and your signature are never transmitted over the internet — they exist only in your browser.

## File structure

```
online-cis/
├── index.html              # Main app entry point
├── styles.css              # Styling (mobile-responsive, dark-mode support)
├── src/
│   ├── app.js              # Main controller
│   ├── schema.js           # Form field definitions (16 fields: name, Omang, bank details, etc.)
│   ├── validation.js       # Form validation rules
│   ├── state.js            # State management (fields + signature)
│   ├── signature.js        # Canvas signature pad (touch & pointer events)
│   ├── pdf.js              # PDF generation (pdf-lib)
│   ├── util.js             # Utilities (formatting, strings)
│   └── share.js            # Native share (mobile) / download + WhatsApp link (desktop)
├── vendor/
│   └── pdf-lib.esm.js      # Vendored PDF library (ES module, no CDN)
├── tests/
│   ├── index.html          # Test runner
│   ├── _harness.js         # Test framework (node:test shim)
│   ├── _assert.js          # Assertions (node:assert shim)
│   ├── schema.test.js       # Schema validation tests
│   ├── util.test.js         # Utility function tests
│   ├── validation.test.js   # Form validation tests
│   ├── state.test.js        # State management tests
│   └── pdf.test.js          # PDF generation tests
├── README.md               # This file
└── TESTING.md              # Testing guide & checklist
```

## Architecture highlights

### No backend, no database
- Static HTML/CSS/JS only
- No server calls except the initial page load
- State is in-memory; nothing persists between sessions (unless user saves locally)

### Type-safe state
All modules use a consistent state shape:
```javascript
state = {
  fields: {
    // id → value (string, date, etc.)
    "fullName": "John Doe",
    "omang": "123456789",
    // ... 14 more fields
  },
  signature: Uint8Array | null  // PNG bytes from canvas
}
```

### Validation & error handling
- Real-time form validation (field types, required fields, Omang format, email format, etc.)
- Clear error messages (inline on each field)
- Generate button disabled until all required fields pass validation

### PDF generation
- Uses pdf-lib (vendored, no CDN)
- Embeds the signature as a PNG image in the PDF
- Generates filename: `AOK-CIS-<fullname>-<date>.pdf`
- ~7.2 KB file size

### Sharing
- **Mobile (touch devices):** Native share sheet with WhatsApp pre-selected
- **Desktop:** Download + fallback WhatsApp link (user copies/shares manually)

## Browser support

- **Mobile:** Android Chrome (v88+), iPhone Safari (v15+)
- **Desktop:** Chrome/Edge/Firefox (v88+), Safari (v15+)
- Requires ES modules (native `import`), touch or pointer events, and `<canvas>`

## Troubleshooting

### "Can't run the app with `file://` URL"
**Solution:** Use a local HTTP server (Python or Node.js, see "How to run locally").

### "The signature canvas is sluggish"
**Solutions:**
- Try closing other browser tabs
- Rotate to landscape (larger canvas, smoother drawing)
- Try a different browser

### "The PDF doesn't generate"
**Check:**
1. Are all required fields filled? (Red asterisks show required fields)
2. Did you draw a signature? (Signature is required)
3. Check the browser console (F12 → Console tab) for error messages

### "I didn't get the PDF on WhatsApp"
- On **mobile:** Confirm WhatsApp appears in your device's share sheet
- On **desktop:** The PDF downloads to your Downloads folder; manually attach it to WhatsApp

---

For testing guidance, see [TESTING.md](TESTING.md).
