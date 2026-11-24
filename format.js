/* Formato es-ES fijo (1.234,56 €), sin depender de Intl para la agrupación de miles. */
(function () {
  function group(intStr) { return intStr.replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
  function num(x, dec) {
    if (x === null || x === undefined || isNaN(x)) return '—';
    const neg = x < 0 || Object.is(x, -0);
    const s = Math.abs(x).toFixed(dec);
    const [i, f] = s.split('.');
    const out = group(i) + (f ? ',' + f : '');
    return (neg && Number(s) !== 0 ? '−' : '') + out;
  }
  const F = {
    num,
    eur: (x, dec = 2) => (x === null || x === undefined ? '—' : num(x, dec) + '\u00a0€'),
    eurSigned: (x, dec = 2) => (x > 0 ? '+' : '') + F.eur(x, dec),
    pct: (x, dec = 2) => (x === null || x === undefined ? '—' : num(x * 100, dec) + '\u00a0%'),
    pctSigned: (x, dec = 2) => (x > 0 ? '+' : '') + F.pct(x, dec),
    /* v20: dateDM = 20/11; when = 24/11/2026, 22:42 a partir de un ISO (con o sin hora). No usan Date(), así no hay desfases de zona. */
    ymd: (iso) => { const m = String(iso || '').match(/(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/); return m ? { y: m[1], mo: m[2], d: m[3], h: m[4], mi: m[5] } : null; },
    date: (iso) => { const t = F.ymd(iso); return t ? `${t.d}/${t.mo}/${t.y}` : '—'; },
    dateDM: (iso) => { const t = F.ymd(iso); return t ? `${t.d}/${t.mo}` : '—'; },
    when: (iso) => { const t = F.ymd(iso); if (!t) return '—'; return t.h ? `${t.d}/${t.mo}/${t.y}, ${t.h}:${t.mi}` : `${t.d}/${t.mo}/${t.y}`; },
    dateLong: (iso) => {
      if (!iso) return '—';
      const M = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
      const [y, m, d] = iso.split('-').map(Number); return `${d} de ${M[m - 1]} de ${y}`;
    },
    dateShort: (iso) => { const M = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic']; const [, m, d] = iso.split('-').map(Number); return `${d} ${M[m - 1]}`; },
    sign: (x) => (x > 0 ? 'pos' : x < 0 ? 'neg' : 'zero'),
  };
  window.F = F;
})();
