/*
 * Bouton « ← Calendrier », identique sur tous les jours.
 * Usage : <script src="/retour.js" data-pos="tl" defer></script>   (tl, tr, bl, br : coin de l'écran)
 */
(() => {
  const s = document.currentScript, pos = (s && s.dataset.pos) || 'bl';
  const css = `
    .dvt-back { position: fixed; z-index: 2147483000; display: inline-flex; align-items: center; gap: 7px;
      padding: 7px 13px 7px 10px; border-radius: 999px; text-decoration: none;
      font: 600 12px/1 system-ui, -apple-system, "Segoe UI", Inter, sans-serif; letter-spacing: .02em; color: #fff;
      background: rgba(14, 14, 20, .72); border: 1px solid rgba(255, 255, 255, .18);
      -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px); box-shadow: 0 6px 18px rgba(0, 0, 0, .28);
      transition: background .2s, transform .2s; }
    .dvt-back:hover { background: rgba(14, 14, 20, .9); transform: translateY(-1px); }
    .dvt-back svg { width: 14px; height: 14px; }
    .dvt-back.tl { top: 14px; left: 14px; } .dvt-back.tr { top: 14px; right: 14px; }
    .dvt-back.bl { bottom: 14px; left: 14px; } .dvt-back.br { bottom: 14px; right: 14px; }
    @media print { .dvt-back { display: none; } }`;
  const add = () => {
    const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    const a = document.createElement('a');
    a.href = '/'; a.className = 'dvt-back ' + pos; a.setAttribute('aria-label', 'Retour au calendrier Devtober');
    a.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3 10h18M8 3v4M16 3v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg><span>← Calendrier</span>';
    document.body.appendChild(a);
  };
  document.body ? add() : addEventListener('DOMContentLoaded', add);
})();
