/**
 * Le scroll n'est pas une position : c'est un bouton. Un geste = un pas.
 * On accumule la molette jusqu'à un seuil, puis on ignore la traîne d'inertie (pavés tactiles, souris à roue libre)
 * jusqu'à ce que la molette se calme. Clavier et swipe tactile donnent les mêmes pas.
 */
export class Input {
  private acc = 0;
  private quietUntil = 0;
  private lastWheel = 0;
  private touchY: number | null = null;
  pointer = { x: 0, y: 0, down: false, dx: 0, dy: 0 };

  constructor(canvas: HTMLElement, private onStep: (dir: 1 | -1) => void, private isBusy: () => boolean) {
    window.addEventListener('wheel', this.wheel, { passive: false });
    window.addEventListener('keydown', this.key);
    window.addEventListener('touchstart', e => { this.touchY = e.touches[0].clientY; }, { passive: true });
    window.addEventListener('touchend', e => {
      if (this.touchY === null) return;
      const dy = this.touchY - e.changedTouches[0].clientY; this.touchY = null;
      if (Math.abs(dy) > 50) this.fire(dy > 0 ? 1 : -1);
    });
    canvas.addEventListener('pointerdown', e => { this.pointer.down = true; canvas.setPointerCapture(e.pointerId); });
    window.addEventListener('pointerup', () => { this.pointer.down = false; });
    window.addEventListener('pointermove', e => {
      this.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.pointer.y = -((e.clientY / window.innerHeight) * 2 - 1);
      if (this.pointer.down) { this.pointer.dx += e.movementX; this.pointer.dy += e.movementY; }
    });
  }

  /** déplacement accumulé depuis la dernière image, remis à zéro à la lecture */
  takeDrag() { const d = { dx: this.pointer.dx, dy: this.pointer.dy }; this.pointer.dx = this.pointer.dy = 0; return d; }

  private wheel = (e: WheelEvent) => {
    e.preventDefault();
    const now = performance.now();
    if (now - this.lastWheel > 220) this.acc = 0;        // nouveau geste
    this.lastWheel = now;
    if (this.isBusy() || now < this.quietUntil) { this.quietUntil = Math.max(this.quietUntil, now + 180); return; }
    this.acc += e.deltaMode === 1 ? e.deltaY * 30 : e.deltaY;
    if (Math.abs(this.acc) > 60) { this.fire(this.acc > 0 ? 1 : -1); this.acc = 0; this.quietUntil = now + 700; }
  };

  private key = (e: KeyboardEvent) => {
    if (['ArrowDown', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); this.fire(1); }
    if (['ArrowUp', 'PageUp'].includes(e.key)) { e.preventDefault(); this.fire(-1); }
  };

  private fire(dir: 1 | -1) { if (!this.isBusy()) this.onStep(dir); }
}
