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
    date: (iso) => { if (!iso) return '—'; const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`; },
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
