export class SignaturePad {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.drawing = false;
    this._empty = true;
    canvas.style.touchAction = 'none';
    this.ctx.lineWidth = 2.5;
    this.ctx.lineCap = 'round';
    this.ctx.strokeStyle = '#111';
    const pos = (e) => {
      const r = canvas.getBoundingClientRect();
      return { x: (e.clientX - r.left) * (canvas.width / r.width),
               y: (e.clientY - r.top) * (canvas.height / r.height) };
    };
    canvas.addEventListener('pointerdown', (e) => {
      this.drawing = true; this._empty = false;
      canvas.setPointerCapture(e.pointerId);
      const p = pos(e); this.ctx.beginPath(); this.ctx.moveTo(p.x, p.y);
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!this.drawing) return;
      const p = pos(e); this.ctx.lineTo(p.x, p.y); this.ctx.stroke();
    });
    const end = () => { this.drawing = false; };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
    canvas.addEventListener('pointerleave', end);
  }
  clear() { this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height); this._empty = true; }
  isEmpty() { return this._empty; }
  async toPngBytes() {
    const blob = await new Promise(res => this.canvas.toBlob(res, 'image/png'));
    return new Uint8Array(await blob.arrayBuffer());
  }
}
