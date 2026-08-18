export async function sharePdf(bytes, filename, waMessage) {
  const file = new File([bytes], filename, { type: 'application/pdf' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename,
        text: waMessage || 'Africa Origin Khumoetsile — Client Information Sheet' });
      return { method: 'share' };
    } catch (e) { if (e && e.name === 'AbortError') return { method: 'share' }; }
  }
  // Fallback: download, then offer WhatsApp
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  const msg = encodeURIComponent(waMessage ||
    'Hello, attached is my completed Africa Origin Khumoetsile Client Information Sheet.');
  window.open('https://wa.me/?text=' + msg, '_blank');
  return { method: 'download' };
}
