/* Cartera Family v13 — pestaña «Actualidad»: índices de referencia, noticias y agenda, sentimiento (Fear & Greed) y sectores.
   Los datos llegan ya descargados y cifrados en data/market.enc.json (fetch_market.py en la actualización diaria):
   la web nunca llama a servicios de terceros. Si una sección no se pudo actualizar, se muestra la del día anterior con su fecha. */
(function () {
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const st = { open: null, per: {}, fg: '1d', sec: '1d', news: 'all', ag: 'all', agView: 'week', agDay: null, newsAll: false, m: null };
  const FLAG = { us: ['🇺🇸', 'EE. UU.'], es: ['🇪🇸', 'España'], eu: ['🇪🇺', 'Zona euro'] };
  const flag = (p) => (FLAG[p] ? `<span class="flag" role="img" aria-label="${FLAG[p][1]}">${FLAG[p][0]}</span>` : '');
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const DCORTO = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const dmy = (iso) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : '—');
  const hm = (iso) => (iso && iso.length > 10 ? iso.slice(11, 16) : '');
  const when = (iso) => (iso ? `${dmy(iso)}${hm(iso) ? ' ' + hm(iso) : ''}` : '—');
  const arrow = (x) => (x > 0 ? '▲' : x < 0 ? '▼' : '■');
  const sgn = (x) => (x == null ? 'zero' : F.sign(x));
  /* v14: etiquetas cortas de la barra de periodos (píldora) y nombre largo para lectores de pantalla */
  const PN = { week: ['Semana', 'Semana'], month: ['Mes', 'Mes'], '1d': ['1D', '1 día'], '1w': ['1S', '1 semana'], '1m': ['1M', '1 mes'], '3m': ['3M', '3 meses'], '6m': ['6M', '6 meses'], ytd: ['YTD', 'en el año'], '1y': ['1A', '1 año'], '5y': ['5A', '5 años'] };
  const MK_P = ['1d', '1w', '1m', '3m', 'ytd', '1y', '5y'];
  const SEC_P = ['1d', '1w', '1m', '3m', 'ytd', '1y'];
  const FG_P = ['1d', '1w', '1m', '3m', '6m', '1y'];

  function stamp(sec, extra) {
    if (!sec) return '';
    const s = sec.stale ? `<span class="stale-chip" data-test="stale">Sin actualizar hoy · datos del ${when(sec.actualizado)}</span>` : `<span class="upd">Actualizado ${when(sec.actualizado)}</span>`;
    return `<p class="mk-stamp">${s}${extra ? ' · ' + extra : ''}</p>`;
  }
  function credit(name, url) { return `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(name)}</a>`; }
  function pillbar(list, cur, attr, label, extra) {
    return `<div class="pillbar" role="group" aria-label="${label}" ${extra || ''}>${list.map((k) => `<button type="button" ${attr}="${k}" aria-pressed="${k === cur}" aria-label="${PN[k][1]}" title="${PN[k][1]}">${PN[k][0]}</button>`).join('')}</div>`;
  }
  function secHead(id, ico, title, sub, right) {
    return `<div class="sec-row"><div class="sec-h"><span class="sec-ico" aria-hidden="true">${ico}</span><h2 id="${id}">${title}</h2></div>${right || ''}</div>${sub ? `<p class="sub">${sub}</p>` : ''}`;
  }
  const ICO = {
    cal: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
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
    return F.num(v, it.dec || 2) + cur;
  }
  function fmtChg(it, c) {
    if (c == null) return '—';
    if (it.tipo === 'rend') return (c > 0 ? '+' : '') + F.num(c, 1) + '\u00a0pb';
    return F.pctSigned(c);
  }
  function chgSpan(it, c) { return `<span class="${sgn(c)}"><span aria-hidden="true">${arrow(c)} </span>${fmtChg(it, c)}</span>`; }
  const perOf = (it) => st.per[it.id] || '1m';
  const perList = (it) => MK_P.filter((k) => k === '1d' || it.cambios[k]);
  function seriesFor(it, p) {
    if (p === '1d') {
      const intra = (it.intradia || []).filter((x) => x[0].slice(0, 10) === it.fecha);
      if (intra.length > 3) return { pts: intra, intra: true };
      return { pts: it.serie.slice(-2), intra: false };
    }
    const c = it.cambios[p]; const from = c ? c.fecha_ref : it.serie[0][0];
    return { pts: it.serie.filter((x) => x[0] >= from), intra: false };
  }
  /* v14: cuadros compactos (nombre, último dato y variación del día). Al tocar uno se despliega debajo, a todo el ancho,
     su gráfico con la barra de periodos; al tocarlo otra vez se pliega. Solo hay uno desplegado a la vez. */
  function tileHtml(it) {
    const c = it.cambios['1d'], open = st.open === it.id;
    return `<button type="button" class="mk-tile${open ? ' open' : ''}" data-mk-tile="${esc(it.id)}" data-test="mk-card-${esc(it.id)}" aria-expanded="${open}" aria-controls="mk-x-${esc(it.id)}">
        <span class="mk-tn">${esc(it.nombre)}</span><b class="mk-tv" data-test="mk-last">${fmtVal(it, it.ultimo)}</b>
        <span class="mk-td" data-test="mk-day">${chgSpan(it, c ? c.cambio : null)}<small> hoy</small></span>${it.stale ? '<span class="stale-dot" title="dato anterior">•</span>' : ''}
        <span class="mk-chev" aria-hidden="true"></span></button>`
      + `<div class="mk-x" id="mk-x-${esc(it.id)}" role="region" aria-label="Gráfico de ${esc(it.nombre)}" data-test="mk-x-${esc(it.id)}" ${open ? '' : 'hidden'}>${open ? expandedHtml(it) : ''}</div>`;
  }
  function expandedHtml(it) {
    const p = perOf(it);
    return `<div class="mk-xh"><div class="mk-name"><h3>${esc(it.nombre)}</h3><p>${esc(it.sub)}</p></div>
        <div class="mk-last"><b>${fmtVal(it, it.ultimo)}</b><span class="mk-chg" data-test="mk-chg"></span></div></div>
      <div class="mk-xbar">${pillbar(perList(it), p, 'data-mk-period', 'Periodo del gráfico de ' + esc(it.nombre), `data-mk-id="${esc(it.id)}"`)}</div>
      <div class="mk-chart" data-chart="${esc(it.id)}"></div>
      <p class="mk-src">${it.stale ? '<span class="stale-chip">dato anterior</span> ' : ''}Dato ${when(it.hora || it.fecha)}${it.estado && /REGULAR|OPEN/i.test(it.estado) ? ' · <span class="open">mercado abierto</span>' : ''} · Fuente: ${credit(it.fuente, it.fuente_url)}${it.nota ? ` · <span class="mk-note">${esc(it.nota)}</span>` : ''}</p>`;
  }
  function indicesHtml(m) {
    const s = m.indices;
    if (!s) return `<section class="panel mk-sec" aria-labelledby="h-mk-idx"><div class="panel-pad">${secHead('h-mk-idx', ICO.idx, 'Índices de referencia')}<p class="empty">Sin datos de mercado todavía.</p></div></section>`;
    return `<section class="panel mk-sec" aria-labelledby="h-mk-idx" data-test="mk-indices"><div class="panel-pad">
      ${secHead('h-mk-idx', ICO.idx, 'Índices de referencia', 'Toca un índice para ver su gráfico. En los bonos, la variación es en puntos básicos (pb = 0,01 puntos).')}
      ${stamp(s)}
      <div class="mk-tiles" id="mk-grid">${s.items.map(tileHtml).join('')}</div>
    </div></section>`;
  }
  function drawIndices() {
    const s = st.m && st.m.indices; if (!s) return;
    const grid = $('#mk-grid'); if (!grid) return;
    s.items.forEach((it) => {
      const open = st.open === it.id, tile = grid.querySelector(`[data-mk-tile="${it.id}"]`), x = $('#mk-x-' + it.id);
      tile.setAttribute('aria-expanded', String(open)); tile.classList.toggle('open', open);
      if (!open) { x.hidden = true; x.innerHTML = ''; return; }
      x.hidden = false; x.innerHTML = expandedHtml(it); drawChart(it, x);
    });
  }
  function drawChart(it, x) {
    const p = perOf(it), c = it.cambios[p], name = PN[p][1];
    x.querySelector('[data-test=mk-chg]').innerHTML = `${chgSpan(it, c ? c.cambio : null)}<small>${name}</small>`;
    $$('[data-mk-period]', x).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mkPeriod === p)));
    const { pts, intra } = seriesFor(it, p);
    const host = x.querySelector('.mk-chart');
    if (pts.length < 2) { host.innerHTML = '<p class="empty">Sin datos suficientes para este periodo.</p>'; return; }
    const dates = pts.map((q) => q[0]), vals = pts.map((q) => q[1]);
    const ref = p === '1d' && c ? c.ref : vals[0];
    const dir = sgn(vals[vals.length - 1] - ref);
    const delta = (v) => (it.tipo === 'rend' ? (v - ref) * 100 : v / ref - 1);
    const lab = (d) => (intra ? hm(d) : F.date(d));
    const long = p === '5y' || (p === 'ytd' && dates.length > 300);
    lineChart(host, {
      dates, h: 170, nTicks: 3, padL: 52,
      series: [{ label: it.nombre, values: vals, cls: 'mk mk-' + dir, endDot: true, endCls: 'mk-' + dir }],
      xFmt: (d) => (intra ? hm(d) : long ? d.slice(5, 7) + '/' + d.slice(2, 4) : F.dateShort(d)),
      yFmt: (y, step) => { const dec = it.tipo === 'rend' ? (step < 0.01 ? 3 : 2) : it.dec && step < 0.01 ? 4 : step < 0.1 ? 3 : step < 1 ? 2 : step < 10 ? 1 : 0; return F.num(y, dec) + (it.tipo === 'rend' ? '%' : ''); },
      tipHtml: (i) => `<strong>${lab(dates[i])}</strong><span>${esc(it.nombre)}: <b>${fmtVal(it, vals[i])}</b></span><span>Desde ${intra ? 'el cierre anterior' : F.date(dates[0])}: <b class="${sgn(delta(vals[i]))}">${fmtChg(it, delta(vals[i]))}</b></span>`,
      tipText: (i) => `${lab(dates[i])}. ${it.nombre} ${fmtVal(it, vals[i])}. Variación ${fmtChg(it, delta(vals[i]))}.`,
      ariaLabel: `${it.nombre}: evolución en ${name}, de ${fmtVal(it, vals[0])} a ${fmtVal(it, vals[vals.length - 1])} (${fmtChg(it, c ? c.cambio : delta(vals[vals.length - 1]))}).`,
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
  /* v16: noticias en tarjetas pequeñas (solo titular + fuente/hora), dos por fila en móvil; al tocar se abre la noticia */
  function newsList(m) {
    const s = m.noticias; if (!s) return '<p class="empty">Sin noticias.</p>';
    const list = s.items.filter((n) => st.news === 'all' || n.pais === st.news);
    const shown = st.newsAll ? list : list.slice(0, 8);
    return `<ul class="news-cards" data-test="mk-news-list">${shown.map((n) => `<li data-pais="${esc(n.pais)}"><a href="${esc(n.url)}" target="_blank" rel="noopener" title="${esc(n.resumen || n.titulo)}"><span class="nt">${esc(n.titulo)}</span><span class="nmeta">${flag(n.pais)} <b>${esc(n.fuente)}</b> · ${n.fecha && n.fecha.slice(0, 10) === (m.generado || '').slice(0, 10) ? hm(n.fecha) : when(n.fecha)}${n.stale ? ' · anterior' : ''}</span></a></li>`).join('') || '<li class="empty">No hay noticias para este filtro.</li>'}</ul>
      ${list.length > 8 ? `<button type="button" class="ovl more" data-news-more="1" aria-expanded="${st.newsAll}">${st.newsAll ? 'Ver menos' : `Ver ${list.length - 8} más`}</button>` : ''}`;
  }
  function evItem(e, now) {
    const past = e.fecha.slice(0, 16) <= now; const has = e.actual != null;
    const cls = has && e.mejor != null ? (e.mejor ? 'pos' : 'neg') : '';
    return `<li class="ev${past ? ' past' : ' next'}" data-pais="${e.pais}">
          <div class="ev-t"><span class="ev-h">${e.todo_el_dia || e.provisional ? 'Día' : hm(e.fecha)}</span>${flag(e.pais)}</div>
          <div class="ev-b"><p class="ev-n"><span title="${esc(e.nombre_orig)}">${esc(e.nombre)}</span>${e.categoria ? ` <span class="ev-cat c-${esc(e.categoria.normalize('NFD').replace(/[\u0300-\u036f]/g, ''))}">${CATL[e.categoria]}</span>` : ''}<span class="imp" aria-label="importancia ${e.importancia} de 3">${'●'.repeat(e.importancia)}${'○'.repeat(Math.max(0, 3 - e.importancia))}</span></p>
          <p class="ev-v">${has ? `<span>Real <b class="${cls}">${fmtEv(e.actual, e.unidad)}</b></span>` : past ? '<span class="dim">Sin dato</span>' : '<span class="nx">Próximo</span>'}<span>Prev. <b>${fmtEv(e.prevision, e.unidad)}</b></span><span>Ant. <b>${fmtEv(e.anterior, e.unidad)}</b></span></p></div></li>`;
  }
  /* v16: agenda por días. Semana = tira horizontal L…D; Mes = calendario. Punto amarillo = día con algún evento de importancia alta.
     Al tocar un día se despliegue debajo lo que hay (o lo que ya hubo, con el dato real); al tocarlo otra vez se pliega. */
  const DL = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
  const isoAdd = (iso, n) => { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const dowMon = (iso) => (new Date(iso + 'T12:00:00Z').getUTCDay() + 6) % 7;
  const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);
  function agRange(a) { return st.agView === 'month' && a.mes ? a.mes : a.semana; }
  function agEvents(m) { return m.agenda.eventos.filter((e) => st.ag === 'all' || e.pais === st.ag); }
  function dayBtn(d, byDay, today, inMonth) {
    const ev = byDay[d] || [], imp = ev.some((e) => e.clave), sel = st.agDay === d;
    const lab = `${cap(DIAS[new Date(d + 'T12:00:00Z').getUTCDay()])} ${dmy(d)}: ${ev.length ? ev.length + (ev.length === 1 ? ' evento' : ' eventos') : 'sin eventos'}${imp ? ', con fecha clave' : ''}${d === today ? ' (hoy)' : ''}`;
    return `<button type="button" class="ag-d${d === today ? ' today' : ''}${ev.length ? '' : ' empty'}${d < today ? ' past' : ''}" data-ag-day="${d}" aria-pressed="${sel}" aria-expanded="${sel}" aria-controls="ag-panel" aria-label="${lab}">
        ${inMonth ? '' : `<span class="ag-dl">${DL[dowMon(d)]}</span>`}<span class="ag-dn">${+d.slice(8, 10)}</span><span class="ag-dot${imp ? ' on' : ''}" aria-hidden="true"></span></button>`;
  }
  function agendaBox(m) {
    const a = m.agenda; if (!a) return '<p class="empty">Sin agenda.</p>';
    const now = (m.generado || '').slice(0, 16), today = now.slice(0, 10);
    const ev = agEvents(m), byDay = {};
    ev.forEach((e) => (byDay[e.fecha.slice(0, 10)] = byDay[e.fecha.slice(0, 10)] || []).push(e));
    const [r0, r1] = agRange(a);
    let cal;
    if (st.agView === 'month') {
      const lead = dowMon(r0), cells = [];
      for (let i = 0; i < lead; i++) cells.push('<span class="ag-blank" aria-hidden="true"></span>');
      for (let d = r0; d <= r1; d = isoAdd(d, 1)) cells.push(dayBtn(d, byDay, today, true));
      cal = `<div class="ag-month" data-test="ag-month"><div class="ag-mh" aria-hidden="true">${DL.map((x) => `<span>${x}</span>`).join('')}</div><div class="ag-mg">${cells.join('')}</div></div>`;
    } else {
      const days = []; for (let d = r0; d <= r1; d = isoAdd(d, 1)) days.push(d);
      cal = `<div class="ag-week" data-test="ag-week">${days.map((d) => dayBtn(d, byDay, today, false)).join('')}</div>`;
    }
    const d = st.agDay, list = d ? byDay[d] || [] : [];
    const panel = d ? `<div class="ag-panel" id="ag-panel" data-test="ag-panel" data-day="${d}"><h4>${cap(DIAS[new Date(d + 'T12:00:00Z').getUTCDay()])} ${dmy(d)}${d === today ? ' <span class="chip-note">hoy</span>' : ''}</h4>
        ${list.length ? `<ul data-test="mk-agenda-list">${list.map((e) => evItem(e, now)).join('')}</ul>` : '<p class="empty">No hay eventos este día para este filtro.</p>'}</div>` : '<div id="ag-panel" hidden></div>';
    /* v17: hitos = solo fechas clave con dato publicado (tipos, IPC general, empleo EE. UU., PIB), en una línea corta cada uno */
    const inR = (h) => h.fecha.slice(0, 10) >= r0 && h.fecha.slice(0, 10) <= r1 && (st.ag === 'all' || h.pais === st.ag);
    const hitos = (a.hitos || []).filter(inR), prox = (a.proximos || []).filter(inR);
    const chip = (iso) => `<span class="h-d">${DCORTO[new Date(iso.slice(0, 10) + 'T12:00:00Z').getUTCDay()]} ${dmy(iso)}</span>`;
    const scope = st.agView === 'month' ? 'este mes' : 'esta semana';
    const hb = `<div class="ag-hitos" data-test="ag-hitos"><h4>Hitos ${st.agView === 'month' ? 'del mes' : 'de la semana'}</h4>
        ${hitos.length ? `<ul class="hitos">${hitos.map((h) => `<li data-test="ag-hito" data-fecha="${h.fecha}" data-pais="${h.pais}">${chip(h.fecha)}<span class="h-t">${flag(h.pais)} ${esc(h.texto)}</span></li>`).join('')}</ul>` : `<p class="empty" data-test="ag-hitos-empty">Sin hitos publicados ${scope}.</p>`}
        ${prox.length ? `<p class="h-sub">Próximas fechas clave</p><ul class="hitos prox">${prox.map((h) => `<li data-test="ag-prox" data-fecha="${h.fecha.slice(0, 10)}" data-pais="${h.pais}">${chip(h.fecha)}<span class="h-t">${flag(h.pais)} ${esc(h.texto)} <small>${hm(h.fecha)}</small></span></li>`).join('')}</ul>` : ''}
      </div>`;
    return cal + panel + hb;
  }
  function chips(list, cur, attr, label) {
    return `<div class="toggle sm mk-filter" role="group" aria-label="${label}">${list.map(([k, t]) => `<button type="button" ${attr}="${k}" aria-pressed="${k === cur}">${t}</button>`).join('')}</div>`;
  }
  function newsHtml(m) {
    const n = m.noticias;
    return `<section class="panel mk-sec" aria-labelledby="h-mk-news" data-test="mk-news"><div class="panel-pad">
      ${secHead('h-mk-news', ICO.news, 'Noticias', 'Titulares de mercados de España y EE. UU. Toca una noticia para abrirla en su web.')}
      ${stamp(n, n ? 'Fuentes: ' + n.fuentes.map((f) => credit(f.nombre, f.url) + (f.ok ? '' : ' (sin actualizar)')).join(', ') : '')}
      ${chips([['all', 'Todas'], ['es', '🇪🇸 España'], ['us', '🇺🇸 EE. UU.']], st.news, 'data-news-f', 'Filtrar noticias')}
      <div id="mk-news-box">${newsList(m)}</div>
    </div></section>`;
  }
  function agendaHtml(m) {
    const a = m.agenda;
    return `<section class="panel mk-sec" aria-labelledby="h-mk-ag" data-test="mk-agenda"><div class="panel-pad">
      ${secHead('h-mk-ag', ICO.cal, 'Agenda', 'Datos macro de EE. UU., España y la zona euro (IPC, empleo, tipos de interés, PIB…). <span class="ag-dot on" aria-hidden="true"></span> = fecha clave (tipos, IPC, empleo EE. UU., PIB). Toca un día para ver sus eventos.', pillbar(['week', 'month'], st.agView, 'data-ag-view', 'Vista de la agenda'))}
      ${stamp(a, a ? 'Fuente: ' + credit(a.fuente, a.fuente_url) + ' · horas de Madrid' : '')}
      <p class="ag-range" id="ag-range"></p>
      ${chips([['all', 'Todos'], ['us', '🇺🇸 EE. UU.'], ['es', '🇪🇸 España'], ['eu', '🇪🇺 Euro']], st.ag, 'data-ag-f', 'Filtrar agenda por país')}
      <div id="mk-ag-box">${a ? agendaBox(m) : '<p class="empty">Sin agenda.</p>'}</div>
      <p class="fine ag-leg">Real en <b class="pos">verde</b> si es mejor de lo previsto y en <b class="neg">rojo</b> si es peor (según la fuente). ●●● = importancia alta.</p>
    </div></section>`;
  }
  function drawAg() {
    const a = st.m && st.m.agenda; if (!a || !$('#mk-ag-box')) return;
    $('#mk-ag-box').innerHTML = agendaBox(st.m);
    $$('[data-ag-view]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.agView === st.agView)));
    $$('[data-ag-f]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.agF === st.ag)));
    const [r0, r1] = agRange(a);
    $('#ag-range').textContent = st.agView === 'month' ? `${cap(MESES[+r0.slice(5, 7) - 1])} ${r0.slice(0, 4)}` : `Semana del ${dmy(r0)} al ${dmy(r1)}`;
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
  /* v15: un solo selector mueve indicador y gráfico. 1D = indicador con el valor del día y su cambio frente al cierre anterior;
     1S…1A = rango del periodo («varilla» 0–100 con zonas de color, tramo mínimo–máximo resaltado y marca del valor actual). */
  function fgPeriodPts(s, p) {
    if (p === '1d') return s.serie.slice(-5);  // CNN no publica serie intradía: últimos 5 días como contexto
    const last = s.serie[s.serie.length - 1][0], d = new Date(last + 'T12:00:00Z');
    if (p === '1w') d.setUTCDate(d.getUTCDate() - 7);
    else d.setUTCMonth(d.getUTCMonth() - { '1m': 1, '3m': 3, '6m': 6, '1y': 12 }[p]);
    const from = d.toISOString().slice(0, 10);
    return s.serie.filter((x) => x[0] >= from);
  }
  function fgStats(pts) {
    let mn = pts[0], mx = pts[0];
    pts.forEach((x) => { if (x[1] < mn[1]) mn = x; if (x[1] > mx[1]) mx = x; });  // primera fecha en caso de empate
    return { mn, mx, start: pts[0], cur: pts[pts.length - 1] };
  }
  const chgPts = (d) => `${d > 0 ? '+' : ''}${F.num(d, 1)}`;
  function rangeBar(st_) {
    const W = 300, x = (v) => 10 + (v / 100) * (W - 20), y = 26, h = 12;
    const a = x(st_.mn[1]), b = x(st_.mx[1]), c = x(st_.cur[1]);
    return `<svg viewBox="0 0 ${W} 62" class="fg-rbar" data-test="fg-rbar" data-min="${st_.mn[1]}" data-max="${st_.mx[1]}" role="img" aria-label="Rango del índice en el periodo: mínimo ${F.num(st_.mn[1], 0)} (${fgLabel(st_.mn[1])}), máximo ${F.num(st_.mx[1], 0)} (${fgLabel(st_.mx[1])}), actual ${F.num(st_.cur[1], 0)}.">
      <defs><linearGradient id="fg-rgrad" x1="${a}" x2="${b}" gradientUnits="userSpaceOnUse">${[st_.mn[1], st_.mx[1]].map((v, i) => `<stop offset="${i}" stop-color="${{ z1: '#e11d48', z2: '#f97316', z3: '#9ca3af', z4: '#22c55e', z5: '#059669' }[fgZone(v)]}"/>`).join('')}</linearGradient></defs>
      ${FGZ.map(([z0, z1_, , z]) => `<rect class="rz ${z}" x="${x(z0) + 0.5}" y="${y}" width="${x(z1_) - x(z0) - 1}" height="${h}" rx="3"/>`).join('')}
      <rect class="rseg" x="${a.toFixed(1)}" y="${y - 3}" width="${Math.max(3, b - a).toFixed(1)}" height="${h + 6}" rx="5"/>
      <rect class="rend" x="${(a - 1).toFixed(1)}" y="${y - 6}" width="2" height="${h + 12}"/><rect class="rend" x="${(b - 1).toFixed(1)}" y="${y - 6}" width="2" height="${h + 12}"/>
      <path class="rcur" d="M${c.toFixed(1)} ${y - 4}l-6 -10h12z"/><text class="rcl" x="${Math.min(W - 14, Math.max(14, c)).toFixed(1)}" y="${y - 16}" text-anchor="middle">${F.num(st_.cur[1], 0)}</text>
      ${[0, 25, 50, 75, 100].map((t) => `<text class="rlab" x="${x(t)}" y="${y + h + 14}" text-anchor="middle">${t}</text>`).join('')}
    </svg>`;
  }
  function fgHtml(m) {
    const s = m.sentimiento;
    if (!s) return `<section class="panel mk-sec" aria-labelledby="h-mk-fg"><div class="panel-pad">${secHead('h-mk-fg', ICO.fg, 'Sentimiento de mercado')}<p class="empty">Sin datos.</p></div></section>`;
    return `<section class="panel mk-sec" aria-labelledby="h-mk-fg" data-test="mk-fg"><div class="panel-pad">
      ${secHead('h-mk-fg', ICO.fg, 'Sentimiento · Fear &amp; Greed', 'Índice de miedo y codicia de CNN (0 = miedo extremo, 100 = codicia extrema), calculado con 7 indicadores del mercado de EE. UU. En 1D se ve el valor del día; en 1S…1A, el rango (mínimo–máximo) del periodo.', pillbar(FG_P, st.fg, 'data-fg-period', 'Periodo del índice Fear & Greed'))}
      ${stamp(s, 'Dato ' + when(s.hora))}
      <div id="fg-top" aria-live="polite"></div>
      <h3 class="mk-h3">Histórico <span class="fg-per" id="fg-per"></span></h3>
      <div id="fg-chart" class="fg-chart"></div>
      <p class="mk-src">Fuente: ${credit(s.fuente, s.fuente_url)}. Gráfico redibujado con los datos públicos del índice.</p>
    </div></section>`;
  }
  function fgTopDay(s) {
    const prev = [['cierre', 'Cierre anterior'], ['1w', 'Hace 1 semana'], ['1m', 'Hace 1 mes'], ['1y', 'Hace 1 año']];
    const pc = s.anterior.cierre, d = pc == null ? null : s.valor - pc;
    return `<div class="fg-top" data-test="fg-day"><div class="fg-gauge">${gauge(s.valor)}<p class="fg-v"><b data-test="fg-value" class="${fgZone(s.valor)}">${F.num(s.valor, 0)}</b><span data-test="fg-label">${esc(s.etiqueta)}</span>
        ${d == null ? '' : `<span class="fg-chg" data-test="fg-chg"><b class="${sgn(d)}">${chgPts(d)}</b> frente al cierre anterior (${F.num(pc, 0)})</span>`}</p></div>
      <div class="fg-prev" role="list">${prev.map(([k, t]) => { const v = s.anterior[k]; return `<div role="listitem" data-test="fg-prev-${k}"><span>${t}</span><b class="${v == null ? '' : fgZone(v)}">${v == null ? '—' : F.num(v, 0)}</b><small>${v == null ? '' : fgLabel(v)}</small></div>`; }).join('')}</div></div>`;
  }
  function fgTopRange(s, pts) {
    const t = fgStats(pts), d = t.cur[1] - t.start[1];
    const box = (k, lab, x, extra) => `<div role="listitem" data-test="fg-${k}"><span>${lab}</span><b class="${fgZone(x[1])}">${F.num(x[1], 0)}</b><small>${fgLabel(x[1])}</small><small class="dt" data-test="fg-${k}-date">${F.date(x[0])}</small>${extra || ''}</div>`;
    return `<div class="fg-top" data-test="fg-range"><div class="fg-range">
        <div class="fg-rh"><h3>Rango · ${PN[st.fg][1]}</h3><span class="fg-rv" data-test="fg-range-v"><b class="${fgZone(t.mn[1])}">${F.num(t.mn[1], 0)}</b><small>–</small><b class="${fgZone(t.mx[1])}">${F.num(t.mx[1], 0)}</b></span></div>
        ${rangeBar(t)}
        <div class="fg-rleg"><span>Miedo extremo</span><span>Neutral</span><span>Codicia extrema</span></div>
        <p class="fine">Hoy <b class="${fgZone(t.cur[1])}" data-test="fg-cur">${F.num(t.cur[1], 0)}</b> (${fgLabel(t.cur[1])}) · cambio en el periodo <b class="${sgn(d)}" data-test="fg-per-chg">${chgPts(d)}</b> puntos.</p></div>
      <div class="fg-prev" role="list">${box('min', 'Mínimo', t.mn)}${box('max', 'Máximo', t.mx)}${box('start', 'Inicio del periodo', t.start)}
        <div role="listitem" data-test="fg-chgbox"><span>Cambio en el periodo</span><b class="chg ${sgn(d)}">${chgPts(d)}</b><small>de ${F.num(t.start[1], 0)} a ${F.num(t.cur[1], 0)}</small><small class="dt">puntos (0–100)</small></div></div></div>`;
  }
  function drawFg() {
    const s = st.m && st.m.sentimiento; if (!s) return;
    $$('[data-fg-period]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.fgPeriod === st.fg)));
    const pts = fgPeriodPts(s, st.fg);
    $('#fg-top').innerHTML = st.fg === '1d' ? fgTopDay(s) : fgTopRange(s, pts);
    $('#fg-per').textContent = st.fg === '1d' ? '· últimos 5 días (CNN no publica datos intradía)' : '· ' + PN[st.fg][1];
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
    const svg = $('#fg-chart svg.chart'); if (svg) { svg.dataset.from = dates[0]; svg.dataset.to = dates[dates.length - 1]; svg.dataset.n = dates.length; }
  }

  /* ---------- Sectores ---------- */
  function secHtml(m) {
    const s = m.sectores;
    if (!s) return `<section class="panel mk-sec" aria-labelledby="h-mk-sec"><div class="panel-pad">${secHead('h-mk-sec', ICO.sec, 'Rentabilidad por sectores')}<p class="empty">Sin datos.</p></div></section>`;
    return `<section class="panel mk-sec" aria-labelledby="h-mk-sec" data-test="mk-sectors"><div class="panel-pad">
      ${secHead('h-mk-sec', ICO.sec, 'Sectores', 'Rentabilidad de los 11 sectores de la bolsa de EE. UU., de mejor a peor en el periodo elegido.', pillbar(SEC_P, st.sec, 'data-sec-period', 'Periodo de los sectores'))}
      ${stamp(s)}
      <div id="sec-bars"></div>
      <p class="mk-src">Fuente: ${credit(s.fuente, s.fuente_url)}.</p>
    </div></section>`;
  }
  function drawSec() {
    const s = st.m && st.m.sectores; if (!s) return;
    $$('[data-sec-period]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.secPeriod === st.sec)));
    const list = s.items.filter((x) => x[st.sec] != null).sort((a, b) => b[st.sec] - a[st.sec]);
    const mx = Math.max(...list.map((x) => Math.abs(x[st.sec])), 0.0001);
    $('#sec-bars').innerHTML = `<ol class="bars" data-test="sec-bars" aria-label="Rentabilidad por sector, ${PN[st.sec][1]}">${list.map((x) => {
      const v = x[st.sec], w = (Math.abs(v) / mx) * 100;
      return `<li data-sector="${esc(x.nombre_orig)}"><span class="bn" title="${esc(x.nombre_orig)}">${esc(x.nombre)}</span><span class="bt" aria-hidden="true"><span class="bneg">${v < 0 ? `<i style="width:${w.toFixed(1)}%"></i>` : ''}</span><span class="bpos">${v > 0 ? `<i style="width:${w.toFixed(1)}%"></i>` : ''}</span></span><b class="bv ${sgn(v)}" data-test="sec-val">${F.pctSigned(v)}</b></li>`;
    }).join('')}</ol>`;
  }

  /* ---------- Montaje ---------- */
  function html(m) {
    st.m = m; if (st.agDay == null && !st.agInit) { st.agDay = (m.generado || '').slice(0, 10) || null; st.agInit = true; }
    return `<div class="page-h"><h1>Actualidad de mercados</h1><p>Índices, noticias, agenda, sentimiento y sectores · actualizado ${when(m.generado)} (hora de Madrid)</p></div>`
      + indicesHtml(m) + newsHtml(m) + agendaHtml(m) + fgHtml(m) + secHtml(m)
      + `<p class="fine mk-disc">Datos públicos de las fuentes indicadas, descargados al cierre de la tarde junto con la cartera. Si una fuente falla, se muestra el último dato disponible con su fecha. Uso informativo; no es asesoramiento financiero.</p>`;
  }
  function draw() { drawIndices(); drawAg(); drawFg(); drawSec(); }
  function bind(root) {
    root.addEventListener('click', (ev) => {
      const t = ev.target.closest('button'); if (!t) return;
      const refocus = (sel) => { const b = $(sel); b && b.focus(); };
      if (t.dataset.mkTile) { const id = t.dataset.mkTile; st.open = st.open === id ? null : id; drawIndices(); refocus(`[data-mk-tile="${id}"]`); }
      else if (t.dataset.mkPeriod) {
        const id = t.closest('[data-mk-id]').dataset.mkId, it = st.m.indices.items.find((q) => q.id === id);
        st.per[id] = t.dataset.mkPeriod; drawChart(it, $('#mk-x-' + id)); refocus(`#mk-x-${id} [data-mk-period="${st.per[id]}"]`);
      }
      else if (t.dataset.fgPeriod) { st.fg = t.dataset.fgPeriod; drawFg(); refocus(`[data-fg-period="${st.fg}"]`); }
      else if (t.dataset.secPeriod) { st.sec = t.dataset.secPeriod; drawSec(); refocus(`[data-sec-period="${st.sec}"]`); }
      else if (t.dataset.newsF) { st.news = t.dataset.newsF; st.newsAll = false; $('#mk-news-box').innerHTML = newsList(st.m); $$('[data-news-f]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.newsF === st.news))); }
      else if (t.dataset.newsMore) { st.newsAll = !st.newsAll; $('#mk-news-box').innerHTML = newsList(st.m); refocus('[data-news-more]'); }
      else if (t.dataset.agF) { st.ag = t.dataset.agF; drawAg(); }
      else if (t.dataset.agView) {
        st.agView = t.dataset.agView; const [r0, r1] = agRange(st.m.agenda), today = (st.m.generado || '').slice(0, 10);
        if (!st.agDay || st.agDay < r0 || st.agDay > r1) st.agDay = today >= r0 && today <= r1 ? today : r0;
        drawAg(); refocus(`[data-ag-view="${st.agView}"]`);
      }
      else if (t.dataset.agDay) { const d = t.dataset.agDay; st.agDay = st.agDay === d ? null : d; drawAg(); refocus(`[data-ag-day="${d}"]`); }
    });
  }
  window.CFMarket = { html, draw, bind };
})();
