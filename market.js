/* Cartera Family v13 — pestaña «Actualidad»: índices de referencia, noticias y agenda, sentimiento (Fear & Greed) y sectores.
   Los datos llegan ya descargados y cifrados en data/market.enc.json (fetch_market.py en la actualización diaria):
   la web nunca llama a servicios de terceros. Si una sección no se pudo actualizar, se muestra la del día anterior con su fecha. */
(function () {
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const st = { mk: '1m', fg: '1y', sec: '1d', news: 'all', ag: 'all', newsAll: false, m: null };
  const FLAG = { us: ['🇺🇸', 'EE. UU.'], es: ['🇪🇸', 'España'], eu: ['🇪🇺', 'Zona euro'] };
  const flag = (p) => (FLAG[p] ? `<span class="flag" role="img" aria-label="${FLAG[p][1]}">${FLAG[p][0]}</span>` : '');
  const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const dmy = (iso) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : '—');
  const hm = (iso) => (iso && iso.length > 10 ? iso.slice(11, 16) : '');
  const when = (iso) => (iso ? `${dmy(iso)}${hm(iso) ? ' ' + hm(iso) : ''}` : '—');
  const arrow = (x) => (x > 0 ? '▲' : x < 0 ? '▼' : '■');
  const sgn = (x) => (x == null ? 'zero' : F.sign(x));
  const MK_P = [['1d', '1 día'], ['1w', '1 sem.'], ['1m', '1 mes'], ['ytd', 'YTD'], ['1y', '1 año']];
  const SEC_P = [['1d', '1 día'], ['1w', '1 sem.'], ['1m', '1 mes'], ['3m', '3 meses'], ['ytd', 'YTD'], ['1y', '1 año']];
  const FG_P = [['1m', '1 mes'], ['3m', '3 meses'], ['6m', '6 meses'], ['1y', '1 año']];

  function stamp(sec, extra) {
    if (!sec) return '';
    const s = sec.stale ? `<span class="stale-chip" data-test="stale">Sin actualizar hoy · datos del ${when(sec.actualizado)}</span>` : `<span class="upd">Actualizado ${when(sec.actualizado)}</span>`;
    return `<p class="mk-stamp">${s}${extra ? ' · ' + extra : ''}</p>`;
  }
  function credit(name, url) { return `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(name)}</a>`; }
  function periodsHtml(list, cur, attr, label) {
    return `<div class="periods mk-periods n${list.length}" role="group" aria-label="${label}">${list.map(([k, t]) => `<button type="button" ${attr}="${k}" aria-pressed="${k === cur}"><span class="pl">${t}</span></button>`).join('')}</div>`;
  }
  function secHead(id, ico, title, sub) {
    return `<div class="sec-h"><span class="sec-ico" aria-hidden="true">${ico}</span><h2 id="${id}">${title}</h2></div>${sub ? `<p class="sub">${sub}</p>` : ''}`;
  }
  const ICO = {
    idx: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 5-6"/></svg>',
    news: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 8h10M7 12h10M7 16h6"/></svg>',
    fg: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 16a8 8 0 0 1 16 0"/><path d="m12 16 4-5"/></svg>',
    sec: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h10M4 12h16M4 18h7"/></svg>',
  };

  /* ---------- Índices ---------- */
  function fmtVal(it, v) {
    if (v == null) return '—';
    if (it.tipo === 'rend') return F.num(v, 3) + '\u00a0%';
    const cur = it.id === 'sp500' ? (it.moneda === 'USD' ? '\u00a0$' : '\u00a0€') : '';
    return F.num(v, 2) + cur;
  }
  function fmtChg(it, c) {
    if (c == null) return '—';
    if (it.tipo === 'rend') return (c > 0 ? '+' : '') + F.num(c, 1) + '\u00a0pb';
    return F.pctSigned(c);
  }
  function chgSpan(it, c) { return `<span class="${sgn(c)}"><span aria-hidden="true">${arrow(c)} </span>${fmtChg(it, c)}</span>`; }
  function seriesFor(it, p) {
    if (p === '1d') {
      const intra = (it.intradia || []).filter((x) => x[0].slice(0, 10) === it.fecha);
      if (intra.length > 3) return { pts: intra, intra: true };
      return { pts: it.serie.slice(-2), intra: false };
    }
    const c = it.cambios[p]; const from = c ? c.fecha_ref : it.serie[0][0];
    return { pts: it.serie.filter((x) => x[0] >= from), intra: false };
  }
  function indicesHtml(m) {
    const s = m.indices;
    if (!s) return `<section class="panel mk-sec" aria-labelledby="h-mk-idx"><div class="panel-pad">${secHead('h-mk-idx', ICO.idx, 'Índices de referencia')}<p class="empty">Sin datos de mercado todavía.</p></div></section>`;
    return `<section class="panel mk-sec" aria-labelledby="h-mk-idx" data-test="mk-indices"><div class="panel-pad">
      ${secHead('h-mk-idx', ICO.idx, 'Índices de referencia', 'Último dato y evolución. En los bonos, la variación es en puntos básicos (pb = 0,01 puntos de rentabilidad).')}
      ${stamp(s)}
      ${periodsHtml(MK_P, st.mk, 'data-mk-period', 'Periodo de los índices')}
      <div class="mk-grid" id="mk-grid">${s.items.map((it) => `<article class="mk-card" data-test="mk-card-${esc(it.id)}" aria-labelledby="mkt-${esc(it.id)}">
        <div class="mk-top"><div class="mk-name"><h3 id="mkt-${esc(it.id)}">${it.pais ? flag(it.pais) + ' ' : ''}${esc(it.nombre)}</h3><p>${esc(it.sub)}</p></div>
          <div class="mk-last"><b data-test="mk-last">${fmtVal(it, it.ultimo)}</b><span class="mk-chg" data-test="mk-chg"></span></div></div>
        <div class="mk-chips" role="list">${MK_P.map(([k, t]) => { const c = it.cambios[k]; return `<div role="listitem" class="mk-chip${k === st.mk ? ' on' : ''}" data-k="${k}"><span>${t}</span>${chgSpan(it, c ? c.cambio : null)}</div>`; }).join('')}</div>
        <div class="mk-chart" data-chart="${esc(it.id)}"></div>
        <p class="mk-src">${it.stale ? '<span class="stale-chip">dato anterior</span> ' : ''}Dato ${when(it.hora || it.fecha)}${it.estado && /REGULAR|OPEN/i.test(it.estado) ? ' · <span class="open">mercado abierto</span>' : ''} · Fuente: ${credit(it.fuente, it.fuente_url)}${it.nota ? ` · <span class="mk-note">${esc(it.nota)}</span>` : ''}</p>
      </article>`).join('')}</div>
    </div></section>`;
  }
  function drawIndices() {
    const s = st.m && st.m.indices; if (!s) return;
    $$('[data-mk-period]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mkPeriod === st.mk)));
    s.items.forEach((it) => {
      const card = $(`[data-test="mk-card-${it.id}"]`); if (!card) return;
      const c = it.cambios[st.mk];
      card.querySelector('[data-test=mk-chg]').innerHTML = `${chgSpan(it, c ? c.cambio : null)}<small>${MK_P.find((x) => x[0] === st.mk)[1]}</small>`;
      card.querySelectorAll('.mk-chip').forEach((ch) => ch.classList.toggle('on', ch.dataset.k === st.mk));
      const { pts, intra } = seriesFor(it, st.mk);
      const host = card.querySelector('.mk-chart');
      if (pts.length < 2) { host.innerHTML = '<p class="empty">Sin datos suficientes para este periodo.</p>'; return; }
      const dates = pts.map((x) => x[0]), vals = pts.map((x) => x[1]);
      const ref = st.mk === '1d' && c ? c.ref : vals[0];
      const dir = sgn(vals[vals.length - 1] - ref);
      const delta = (v) => (it.tipo === 'rend' ? (v - ref) * 100 : v / ref - 1);
      const lab = (d) => (intra ? hm(d) : F.date(d));
      lineChart(host, {
        dates, h: 150, nTicks: 3, padL: 50,
        series: [{ label: it.nombre, values: vals, cls: 'mk mk-' + dir, endDot: true, endCls: 'mk-' + dir }],
        xFmt: (d) => (intra ? hm(d) : F.dateShort(d)),
        yFmt: (y, step) => { const dec = it.tipo === 'rend' ? (step < 0.01 ? 3 : 2) : step < 1 ? 2 : step < 10 ? 1 : 0; return F.num(y, dec) + (it.tipo === 'rend' ? '%' : ''); },
        tipHtml: (i) => `<strong>${lab(dates[i])}</strong><span>${esc(it.nombre)}: <b>${fmtVal(it, vals[i])}</b></span><span>Desde ${intra ? 'el cierre anterior' : F.date(dates[0])}: <b class="${sgn(delta(vals[i]))}">${fmtChg(it, delta(vals[i]))}</b></span>`,
        tipText: (i) => `${lab(dates[i])}. ${it.nombre} ${fmtVal(it, vals[i])}. Variación ${fmtChg(it, delta(vals[i]))}.`,
        ariaLabel: `${it.nombre}: evolución ${MK_P.find((x) => x[0] === st.mk)[1]}, de ${fmtVal(it, vals[0])} a ${fmtVal(it, vals[vals.length - 1])} (${fmtChg(it, c ? c.cambio : delta(vals[vals.length - 1]))}).`,
      });
    });
  }

  /* ---------- Noticias y agenda ---------- */
  function fmtEv(v, u) {
    if (v == null || v === '') return '—';
    if (typeof v === 'string') return esc(v);
    const dec = Math.abs(v) >= 100 ? 1 : Math.abs(v - Math.round(v)) < 1e-9 ? 1 : 2;
    return F.num(v, Math.min(dec, (String(v).split('.')[1] || '').length || 1)) + (u === '%' ? '\u00a0%' : u === 'K' ? 'K' : u === 'M' ? 'M' : u === 'B' ? 'B' : '');
  }
  const CATL = { tipos: 'Tipos', 'inflación': 'IPC', empleo: 'Empleo', pib: 'PIB' };
  function newsList(m) {
    const s = m.noticias; if (!s) return '<p class="empty">Sin noticias.</p>';
    const list = s.items.filter((n) => st.news === 'all' || n.pais === st.news);
    const shown = st.newsAll ? list : list.slice(0, 8);
    return `<ul class="news" data-test="mk-news-list">${shown.map((n) => `<li data-pais="${esc(n.pais)}"><a href="${esc(n.url)}" target="_blank" rel="noopener"><span class="nmeta">${flag(n.pais)} <b>${esc(n.fuente)}</b> · ${when(n.fecha)}${n.stale ? ' · anterior' : ''}</span><span class="nt">${esc(n.titulo)}</span>${n.resumen ? `<span class="ns">${esc(n.resumen)}</span>` : ''}</a></li>`).join('') || '<li class="empty">No hay noticias para este filtro.</li>'}</ul>
      ${list.length > 8 ? `<button type="button" class="ovl more" data-news-more="1" aria-expanded="${st.newsAll}">${st.newsAll ? 'Ver menos' : `Ver ${list.length - 8} más`}</button>` : ''}`;
  }
  function agendaList(m) {
    const s = m.agenda; if (!s) return '<p class="empty">Sin agenda.</p>';
    const now = (m.generado || '').slice(0, 16);
    const ev = s.eventos.filter((e) => st.ag === 'all' || e.pais === st.ag);
    const days = {}; ev.forEach((e) => (days[e.fecha.slice(0, 10)] = days[e.fecha.slice(0, 10)] || []).push(e));
    const today = now.slice(0, 10);
    return `<div class="agenda" data-test="mk-agenda-list">${Object.keys(days).sort().map((d) => {
      const dow = DIAS[new Date(d + 'T12:00:00Z').getUTCDay()];
      return `<div class="ag-day${d === today ? ' today' : ''}"><h4>${dow} ${dmy(d)}${d === today ? ' <span class="chip-note">hoy</span>' : ''}</h4><ul>${days[d].map((e) => {
        const past = e.fecha.slice(0, 16) <= now; const has = e.actual != null;
        const cls = has && e.mejor != null ? (e.mejor ? 'pos' : 'neg') : '';
        return `<li class="ev${past ? ' past' : ' next'}" data-pais="${e.pais}">
          <div class="ev-t"><span class="ev-h">${e.todo_el_dia || e.provisional ? 'Día' : hm(e.fecha)}</span>${flag(e.pais)}</div>
          <div class="ev-b"><p class="ev-n"><span title="${esc(e.nombre_orig)}">${esc(e.nombre)}</span>${e.categoria ? ` <span class="ev-cat c-${esc(e.categoria.normalize('NFD').replace(/[\u0300-\u036f]/g, ''))}">${CATL[e.categoria]}</span>` : ''}<span class="imp" aria-label="importancia ${e.importancia} de 3">${'●'.repeat(e.importancia)}${'○'.repeat(Math.max(0, 3 - e.importancia))}</span></p>
          <p class="ev-v">${has ? `<span>Real <b class="${cls}">${fmtEv(e.actual, e.unidad)}</b></span>` : past ? '<span class="dim">Sin dato</span>' : '<span class="nx">Próximo</span>'}<span>Prev. <b>${fmtEv(e.prevision, e.unidad)}</b></span><span>Ant. <b>${fmtEv(e.anterior, e.unidad)}</b></span></p></div></li>`;
      }).join('')}</ul></div>`;
    }).join('') || '<p class="empty">No hay eventos para este filtro.</p>'}</div>`;
  }
  function chips(list, cur, attr, label) {
    return `<div class="toggle sm mk-filter" role="group" aria-label="${label}">${list.map(([k, t]) => `<button type="button" ${attr}="${k}" aria-pressed="${k === cur}">${t}</button>`).join('')}</div>`;
  }
  function newsHtml(m) {
    const n = m.noticias, a = m.agenda;
    return `<section class="panel mk-sec" aria-labelledby="h-mk-news" data-test="mk-news"><div class="panel-pad">
      ${secHead('h-mk-news', ICO.news, 'Noticias y agenda', 'Titulares de mercados y los datos macro de la semana en EE. UU. y España (IPC, empleo, tipos de interés, PIB…).')}
      <h3 class="mk-h3">Noticias</h3>${stamp(n, n ? 'Fuentes: ' + n.fuentes.map((f) => credit(f.nombre, f.url) + (f.ok ? '' : ' (sin actualizar)')).join(', ') : '')}
      ${chips([['all', 'Todas'], ['es', '🇪🇸 España'], ['us', '🇺🇸 EE. UU.']], st.news, 'data-news-f', 'Filtrar noticias')}
      <div id="mk-news-box">${newsList(m)}</div>
      <h3 class="mk-h3" id="h-mk-ag">Agenda de la semana${a ? ` · ${dmy(a.semana[0])} – ${dmy(a.semana[1])}` : ''}</h3>${stamp(a, a ? 'Fuente: ' + credit(a.fuente, a.fuente_url) + ' · horas de Madrid' : '')}
      ${chips([['all', 'Todos'], ['us', '🇺🇸 EE. UU.'], ['es', '🇪🇸 España'], ['eu', '🇪🇺 Zona euro']], st.ag, 'data-ag-f', 'Filtrar agenda por país')}
      <p class="fine ag-leg">Real en <b class="pos">verde</b> si es mejor de lo previsto y en <b class="neg">rojo</b> si es peor (según la fuente). ●●● = importancia alta.</p>
      <div id="mk-ag-box">${agendaList(m)}</div>
    </div></section>`;
  }

  /* ---------- Sentimiento (Fear & Greed) ---------- */
  const FGZ = [[0, 25, 'Miedo extremo', 'z1'], [25, 45, 'Miedo', 'z2'], [45, 55, 'Neutral', 'z3'], [55, 75, 'Codicia', 'z4'], [75, 100, 'Codicia extrema', 'z5']];
  const fgLabel = (v) => (FGZ.find((z) => v < z[1] || z[1] === 100) || FGZ[4])[2];
  const fgZone = (v) => (FGZ.find((z) => v < z[1] || z[1] === 100) || FGZ[4])[3];
  function gauge(v) {
    const cx = 120, cy = 112, r = 92, w = 18;
    const pt = (val, rr) => { const a = Math.PI * (1 - val / 100); return [cx + rr * Math.cos(a), cy - rr * Math.sin(a)]; };
    const arc = (a, b) => { const [x1, y1] = pt(a, r), [x2, y2] = pt(b, r); return `M${x1.toFixed(1)} ${y1.toFixed(1)}A${r} ${r} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)}`; };
    const [nx, ny] = pt(v, r - 26);
    return `<svg viewBox="0 0 240 132" class="gauge" role="img" aria-label="Índice Fear & Greed: ${F.num(v, 0)} de 100, ${fgLabel(v)}">
      ${FGZ.map(([a, b, , z]) => `<path d="${arc(a + 0.6, b - 0.6)}" class="gz ${z}" stroke-width="${w}" fill="none"/>`).join('')}
      ${[0, 25, 50, 75, 100].map((t) => { const [x, y] = pt(t, r + 17); return `<text x="${x.toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="middle" class="gt">${t}</text>`; }).join('')}
      <line x1="${cx}" y1="${cy}" x2="${nx.toFixed(1)}" y2="${ny.toFixed(1)}" class="needle"/><circle cx="${cx}" cy="${cy}" r="7" class="hub"/>
    </svg>`;
  }
  function fgHtml(m) {
    const s = m.sentimiento;
    if (!s) return `<section class="panel mk-sec" aria-labelledby="h-mk-fg"><div class="panel-pad">${secHead('h-mk-fg', ICO.fg, 'Sentimiento de mercado')}<p class="empty">Sin datos.</p></div></section>`;
    const prev = [['cierre', 'Cierre anterior'], ['1w', 'Hace 1 semana'], ['1m', 'Hace 1 mes'], ['1y', 'Hace 1 año']];
    return `<section class="panel mk-sec" aria-labelledby="h-mk-fg" data-test="mk-fg"><div class="panel-pad">
      ${secHead('h-mk-fg', ICO.fg, 'Sentimiento de mercado · Fear &amp; Greed', 'Índice de miedo y codicia de CNN (0 = miedo extremo, 100 = codicia extrema), calculado con 7 indicadores del mercado de EE. UU.')}
      ${stamp(s, 'Dato ' + when(s.hora))}
      <div class="fg-top"><div class="fg-gauge">${gauge(s.valor)}<p class="fg-v"><b data-test="fg-value" class="${fgZone(s.valor)}">${F.num(s.valor, 0)}</b><span data-test="fg-label">${esc(s.etiqueta)}</span></p></div>
        <div class="fg-prev" role="list">${prev.map(([k, t]) => { const v = s.anterior[k]; return `<div role="listitem" data-test="fg-prev-${k}"><span>${t}</span><b class="${v == null ? '' : fgZone(v)}">${v == null ? '—' : F.num(v, 0)}</b><small>${v == null ? '' : fgLabel(v)}</small></div>`; }).join('')}</div></div>
      <h3 class="mk-h3">Histórico</h3>
      ${periodsHtml(FG_P, st.fg, 'data-fg-period', 'Periodo del histórico Fear & Greed')}
      <div id="fg-chart" class="fg-chart"></div>
      <p class="mk-src">Fuente: ${credit(s.fuente, s.fuente_url)}. Gráfico redibujado con los datos públicos del índice.</p>
    </div></section>`;
  }
  function drawFg() {
    const s = st.m && st.m.sentimiento; if (!s) return;
    $$('[data-fg-period]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.fgPeriod === st.fg)));
    const last = s.serie[s.serie.length - 1][0], d = new Date(last + 'T12:00:00Z');
    const back = { '1m': 1, '3m': 3, '6m': 6, '1y': 12 }[st.fg]; d.setUTCMonth(d.getUTCMonth() - back);
    const from = d.toISOString().slice(0, 10); const pts = s.serie.filter((x) => x[0] >= from);
    const dates = pts.map((x) => x[0]), vals = pts.map((x) => x[1]);
    lineChart($('#fg-chart'), {
      dates, h: 190, nTicks: 4, yRange: [0, 100], padL: 34,
      bands: FGZ.map(([a, b, , z]) => [a, b, z]),
      series: [{ label: 'Fear & Greed', values: vals, cls: 'fgl', endDot: true, endCls: 'fgl' }],
      yFmt: (y) => F.num(y, 0),
      tipHtml: (i) => `<strong>${F.date(dates[i])}</strong><span>Fear &amp; Greed: <b class="${fgZone(vals[i])}">${F.num(vals[i], 0)}</b></span><span>${fgLabel(vals[i])}</span>`,
      tipText: (i) => `${F.date(dates[i])}. Fear & Greed ${F.num(vals[i], 0)}, ${fgLabel(vals[i])}.`,
      ariaLabel: `Histórico del índice Fear & Greed desde el ${F.date(dates[0])}: mínimo ${F.num(Math.min(...vals), 0)}, máximo ${F.num(Math.max(...vals), 0)}, último ${F.num(vals[vals.length - 1], 0)}.`,
    });
  }

  /* ---------- Sectores ---------- */
  function secHtml(m) {
    const s = m.sectores;
    if (!s) return `<section class="panel mk-sec" aria-labelledby="h-mk-sec"><div class="panel-pad">${secHead('h-mk-sec', ICO.sec, 'Rentabilidad por sectores')}<p class="empty">Sin datos.</p></div></section>`;
    return `<section class="panel mk-sec" aria-labelledby="h-mk-sec" data-test="mk-sectors"><div class="panel-pad">
      ${secHead('h-mk-sec', ICO.sec, 'Rentabilidad por sectores', 'Los 11 sectores de la bolsa de EE. UU., ordenados de mejor a peor en el periodo elegido.')}
      ${stamp(s)}
      ${periodsHtml(SEC_P, st.sec, 'data-sec-period', 'Periodo de los sectores')}
      <div id="sec-bars"></div>
      <p class="mk-src">Fuente: ${credit(s.fuente, s.fuente_url)}.</p>
    </div></section>`;
  }
  function drawSec() {
    const s = st.m && st.m.sectores; if (!s) return;
    $$('[data-sec-period]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.secPeriod === st.sec)));
    const list = s.items.filter((x) => x[st.sec] != null).sort((a, b) => b[st.sec] - a[st.sec]);
    const mx = Math.max(...list.map((x) => Math.abs(x[st.sec])), 0.0001);
    $('#sec-bars').innerHTML = `<ol class="bars" data-test="sec-bars" aria-label="Rentabilidad por sector, ${SEC_P.find((x) => x[0] === st.sec)[1]}">${list.map((x) => {
      const v = x[st.sec], w = (Math.abs(v) / mx) * 100;
      return `<li data-sector="${esc(x.nombre_orig)}"><span class="bn" title="${esc(x.nombre_orig)}">${esc(x.nombre)}</span><span class="bt" aria-hidden="true"><span class="bneg">${v < 0 ? `<i style="width:${w.toFixed(1)}%"></i>` : ''}</span><span class="bpos">${v > 0 ? `<i style="width:${w.toFixed(1)}%"></i>` : ''}</span></span><b class="bv ${sgn(v)}" data-test="sec-val">${F.pctSigned(v)}</b></li>`;
    }).join('')}</ol>`;
  }

  /* ---------- Montaje ---------- */
  function html(m) {
    st.m = m;
    return `<div class="page-h"><h1>Actualidad de mercados</h1><p>Índices, noticias, agenda, sentimiento y sectores · actualizado ${when(m.generado)} (hora de Madrid)</p></div>`
      + indicesHtml(m) + newsHtml(m) + fgHtml(m) + secHtml(m)
      + `<p class="fine mk-disc">Datos públicos de las fuentes indicadas, descargados al cierre de la tarde junto con la cartera. Si una fuente falla, se muestra el último dato disponible con su fecha. Uso informativo; no es asesoramiento financiero.</p>`;
  }
  function draw() { drawIndices(); drawFg(); drawSec(); }
  function bind(root) {
    root.addEventListener('click', (ev) => {
      const t = ev.target.closest('button'); if (!t) return;
      const refocus = (sel) => { const b = $(sel); b && b.focus(); };
      if (t.dataset.mkPeriod) { st.mk = t.dataset.mkPeriod; drawIndices(); refocus(`[data-mk-period="${st.mk}"]`); }
      else if (t.dataset.fgPeriod) { st.fg = t.dataset.fgPeriod; drawFg(); refocus(`[data-fg-period="${st.fg}"]`); }
      else if (t.dataset.secPeriod) { st.sec = t.dataset.secPeriod; drawSec(); refocus(`[data-sec-period="${st.sec}"]`); }
      else if (t.dataset.newsF) { st.news = t.dataset.newsF; st.newsAll = false; $('#mk-news-box').innerHTML = newsList(st.m); $$('[data-news-f]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.newsF === st.news))); }
      else if (t.dataset.newsMore) { st.newsAll = !st.newsAll; $('#mk-news-box').innerHTML = newsList(st.m); refocus('[data-news-more]'); }
      else if (t.dataset.agF) { st.ag = t.dataset.agF; $('#mk-ag-box').innerHTML = agendaList(st.m); $$('[data-ag-f]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.agF === st.ag))); }
    });
  }
  window.CFMarket = { html, draw, bind };
})();
