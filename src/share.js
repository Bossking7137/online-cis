// Save + review + share helpers for the finished PDF.
//
// Flow the app uses:
//   1. saveAndReview(...)  — save the PDF to the device AND open it in a tab so
//      the client can review it first.
//   2. shareFile(...)      — on a later tap, open the native share sheet
//      (WhatsApp / Email / Save to Files / …), or fall back to a WhatsApp link.

/**
 * Save the PDF to the device (download) and open it for review.
 * @param {Uint8Array} bytes
 * @param {string} filename
 * @param {Window|null} reviewTab  a blank tab opened synchronously on the click
 *   (so mobile browsers don't block it); the PDF is loaded into it for review.
 * @returns {File} the PDF File, for a later shareFile() call.
 */
export function saveAndReview(bytes, filename, reviewTab) {
  const file = new File([bytes], filename, { type: 'application/pdf' });
  const url = URL.createObjectURL(file);

  // 1) open for review
  if (reviewTab && !reviewTab.closed) {
    try { reviewTab.location.href = url; } catch (e) { /* ignore */ }
  } else {
    try { window.open(url, '_blank'); } catch (e) { /* ignore */ }
  }

  // 2) save to the device
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();

  // keep the blob alive long enough for the review tab to load it
  setTimeout(() => URL.revokeObjectURL(url), 120000);
  return file;
}

/**
 * Open the native share sheet for the PDF, or fall back to a WhatsApp link.
 * Must be called from a user gesture (e.g. a Share button click).
 * @param {File} file
 * @param {string} waMessage
 * @returns {Promise<{method:string}>}
 */
export async function shareFile(file, waMessage) {
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: file.name,
        text: waMessage || 'Africa Origin Khumoetsile — Client Information Sheet',
      });
      return { method: 'share' };
    } catch (e) {
      if (e && e.name === 'AbortError') return { method: 'cancelled' };
    }
  }
  // Desktop / unsupported: open WhatsApp with a prefilled message (user attaches
  // the already-saved PDF).
  const msg = encodeURIComponent(waMessage ||
    'Hello, attached is my completed Africa Origin Khumoetsile Client Information Sheet.');
  window.open('https://wa.me/?text=' + msg, '_blank');
  return { method: 'wa' };
}
