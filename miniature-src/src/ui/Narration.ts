import gsap from 'gsap';

/**
 * Les quelques lignes de texte de chaque échelle. Elles apparaissent une par une, lentement,
 * et s'effacent dès qu'on quitte l'échelle.
 */
export class Narration {
  private box = document.getElementById('narration')!;
  private tl: gsap.core.Timeline | null = null;

  show(lines: string[], { delay = 0.4, gap = 2.6 } = {}) {
    this.clear(true);
    lines.forEach((text, i) => {
      const p = document.createElement('p');
      p.textContent = text;
      if (i === 0) p.className = lines.length > 1 && text.length < 24 ? 'first' : '';
      else if (i === lines.length - 1 && lines.length > 2) p.className = 'small';
      this.box.appendChild(p);
    });
    const ps = Array.from(this.box.children);
    this.tl = gsap.timeline({ delay });
    ps.forEach((p, i) => this.tl!.to(p, { opacity: 1, y: 0, duration: 2.2, ease: 'sine.out', force3D: true }, i * gap));
  }

  clear(instant = false) {
    this.tl?.kill();
    const ps = Array.from(this.box.children);
    if (instant || !ps.length) { this.box.innerHTML = ''; return; }
    gsap.to(ps, { opacity: 0, y: -6, duration: 0.7, force3D: true, ease: 'sine.in', stagger: 0.05, onComplete: () => ps.forEach(p => p.remove()) });
  }
}

/** Indications minimales : l'invitation à scroller, les six points de niveau, le son. */
export class Chrome {
  private hint = document.getElementById('hint')!;
  private dots = document.getElementById('dots')!;
  private hintShown = false;

  constructor(count: number) {
    for (let i = 0; i < count; i++) this.dots.appendChild(document.createElement('i'));
  }

  setLevel(level: number) {
    Array.from(this.dots.children).forEach((d, i) => d.classList.toggle('on', i === level));
  }

  showHint() { if (!this.hintShown) { this.hintShown = true; this.hint.classList.add('on'); } }
  hideHint() { this.hint.classList.remove('on'); }

  liftCurtain() { document.getElementById('curtain')!.classList.add('gone'); }

  /** Écran d'entrée : attend un clic (ou une touche). C'est ce geste qui autorise le navigateur à jouer le son. */
  waitForBegin(onGesture: () => void): Promise<void> {
    const btn = document.getElementById('begin') as HTMLButtonElement;
    btn.disabled = false; btn.textContent = 'click to begin';
    document.getElementById('curtain')!.classList.add('ready');
    return new Promise(res => {
      const go = () => { onGesture(); window.removeEventListener('keydown', go); document.getElementById('curtain')!.removeEventListener('click', go); res(); };
      document.getElementById('curtain')!.addEventListener('click', go);
      window.addEventListener('keydown', go);
    });
  }
}
