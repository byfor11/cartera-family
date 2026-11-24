/* Cartera Family v3: descifra data/portfolio.enc.json (build_data.py + encrypt_data.py) y pinta la app (estilo «Fortea»). */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const state = { tab: 'cartera', data: null, view: 'graph', calUnit: 'pct', period: 'all', ovl: { bench: false }, month: null, sort: 'valor', q: '', tipo: '' };
  const TIPO_K = { 'Renta Variable': 'rv', 'Renta Variable (indexado)': 'rv', 'Renta Fija': 'rf', 'Monetario': 'mon', 'Retorno Absoluto': 'ra', 'Plan de pensiones': 'pp', 'Liquidez': 'liq' };
  const tk = (t) => TIPO_K[t] || 'liq';
  const arrow = (x) => (x > 0 ? '▲' : x < 0 ? '▼' : '■');
  const signed = (x, fmt) => `<span class="${F.sign(x)}"><span aria-hidden="true">${arrow(x)} </span>${fmt(x)}</span>`;
  const infoBtn = (key, label) => `<button type="button" class="info-btn" data-info="${key}" aria-label="Qué es ${esc(label)}">i</button>`;
  const ICON = {
    cal: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>',
    layers: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m12 3 9 5-9 5-9-5 9-5z"/><path d="m3 13 9 5 9-5"/></svg>',
    bank: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 10h18L12 4 3 10zM5 10v8M9 10v8M15 10v8M19 10v8M3 20h18"/></svg>',
    clock: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    euro: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M17 6a7 7 0 1 0 0 12M4 10h9M4 14h9"/></svg>',
    wallet: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="6" width="18" height="14" rx="2"/><path d="M16 13h2M3 10h18"/></svg>',
    target: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/></svg>',
    brief: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
    line: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 5-6"/></svg>',
    search: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>',
  };

  /* ---------- Reloj ---------- */
  function tickClock() {
    const now = new Date();
    try {
      const t = now.toLocaleTimeString('es-ES', { timeZone: 'Europe/Madrid', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
      const tz = (now.toLocaleTimeString('es-ES', { timeZone: 'Europe/Madrid', timeZoneName: 'short' }).split(' ').pop() || '').replace('GMT+1', 'CET').replace('GMT+2', 'CEST');
      $('#clock-t').textContent = t + ' ' + tz;
      $('#clock-d').textContent = now.toLocaleDateString('es-ES', { timeZone: 'Europe/Madrid', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    } catch (e) { $('#clock-t').textContent = now.toTimeString().slice(0, 8); }
  }
  tickClock(); setInterval(tickClock, 1000);

  /* ---------- Periodos ---------- */
  function addDays(iso, n) { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
  function addMonths(iso, n) { const d = new Date(iso + 'T12:00:00Z'); d.setUTCMonth(d.getUTCMonth() + n); return d.toISOString().slice(0, 10); }
  function periods(d) {
    const s = d.serie, L = s.length - 1, last = s[L].f;
    const baseIdx = (target) => { let k = -1; for (let i = 0; i <= L; i++) if (s[i].f <= target) k = i; return k; };
    const jan1 = last.slice(0, 4) + '-01-01', ytdBase = s[0].f >= jan1 ? -1 : baseIdx(addDays(jan1, -1));
    const defs = [
      { id: '1d', label: '1 día', note: 'último día', base: L - 1 },
      { id: '1w', label: '1 sem.', note: 'última semana', base: Math.max(0, baseIdx(addDays(last, -7))) },
      { id: '1m', label: '1 mes', note: 'último mes', base: Math.max(0, baseIdx(addMonths(last, -1))) },
      { id: 'ytd', label: 'YTD', note: ytdBase < 0 ? `en ${last.slice(0, 4)} (desde el inicio, ${F.date(s[0].f)})` : `en ${last.slice(0, 4)} (desde el 01/01)`, base: ytdBase },
      { id: 'all', label: '<span class="lg">Desde inicio</span><span class="sh">Inicio</span>', note: 'desde el ' + F.date(s[0].f), base: -1 },
    ];
    return defs.map((p) => ({ ...p, ...change(s, p.base, L), twr: s[L].t / (p.base < 0 ? 1 : s[p.base].t) - 1 }));
  }
  /* v12: resultado NETO de cada día = rentab_neta_eur de la fuente = valor − invertido − custodia Fidelity acumulada
     (si faltara en la fuente, se calcula con esa misma fórmula). */
  function netPl(p) { return p.pl != null ? p.pl : p.v - p.i - (p.c || 0); }
  /* Valor neto de custodia (= invertido + resultado neto) */
  function netV(p) { return p.i + netPl(p); }
  /* Variación de un periodo SIN aportaciones, neta de custodia (lo mismo que dibuja el gráfico y la tarjeta de rentabilidad neta):
     € = Vneto_fin − Vneto_base − aportaciones = neto_fin − neto_base;  % = € / (Vneto_base + aportaciones).
     b = -1 → desde antes del inicio (valor 0): € = rentab_neta_eur, % = € / aportado. */
  function change(s, b, e) {
    const i0 = b >= 0 ? s[b].i : 0, flows = s[e].i - i0;
    const eur = netPl(s[e]) - (b >= 0 ? netPl(s[b]) : 0); const den = (b >= 0 ? netV(s[b]) : 0) + flows;
    return { eur: Math.round(eur * 100) / 100, pct: den ? eur / den : 0, flows };
  }

  /* ---------- Curva ---------- */
  function decFor(step) { for (let d = 0; d < 4; d++) { const x = step * Math.pow(10, d); if (Math.abs(x - Math.round(x)) < 1e-6) return d; } return 3; }
  function tileVal(p) { return F.pctSigned(p.pct); }
  function tileSign(p) { return F.sign(p.eur); }
  function equityPanel(d) {
    const r = d.resumen;
    return `<section class="panel" aria-labelledby="h-eq"><div class="panel-pad">
      <div class="eq-top">
        <div>
          <h2 class="label" id="h-eq">Equity curve · capital de la cartera</h2>
          <p class="big" data-test="valor">${F.eur(r.valor)}</p>
          <div class="chip-row"><span class="chg" id="chg"></span><span class="chip-note" id="chg-note"></span>${infoBtn('twr', 'cómo se calcula la rentabilidad de cada periodo')}</div>
        </div>
        <div class="ctrls">
          <div class="toggle" role="group" aria-label="Vista">
            <button type="button" data-view="graph" aria-pressed="${state.view === 'graph'}">${ICON.line}Gráfico</button>
            <button type="button" data-view="calendar" aria-pressed="${state.view === 'calendar'}">${ICON.cal.replace('16', '13').replace('16', '13')}Calendario</button>
          </div>
        </div>
      </div>
      <div class="periods" role="group" aria-label="Periodo" id="periods"></div>
      <div class="chart-area" id="chart-area"></div>
      ${metricsHtml(d)}
      ${infoListHtml(d)}
    </div></section>`;
  }
  function drawEquity() {
    const d = state.data, area = $('#chart-area');
    const ps = periods(d), cur = ps.find((p) => p.id === state.period);
    $('#periods').innerHTML = ps.map((p) => `<button type="button" data-period="${p.id}" aria-pressed="${p.id === state.period}"><span class="pl">${p.label}</span><span class="pv ${tileSign(p)}">${tileVal(p)}</span></button>`).join('');
    const chg = $('#chg');
    chg.className = 'chg ' + F.sign(cur.eur);
    chg.innerHTML = `<span><span aria-hidden="true">${arrow(cur.eur)} </span>${F.pctSigned(cur.pct)}</span><span class="sep" aria-hidden="true">|</span><span>${F.eurSigned(cur.eur)}</span>`;
    $('#chg-note').innerHTML = `${esc(cur.note)} · resultado neto sobre lo aportado · <span class="twr-note">TWR ${F.pctSigned(cur.twr)}</span>`;
    $$('[data-view]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === state.view)));
    if (state.view === 'calendar') { drawCalendar(area); return; }
    const S = d.serie, bIdx = cur.base, b0 = Math.max(0, bIdx);
    const s = S.slice(b0), t0 = bIdx < 0 ? 1 : S[bIdx].t;
    const dates = s.map((p) => p.f), L = s.length - 1;
    const ch = s.map((p, k) => change(S, bIdx, b0 + k));
    const gpct = ch.map((c) => c.pct), gain = ch.map((c) => c.eur);
    const v0 = bIdx < 0 ? 0 : netV(S[bIdx]), i0 = bIdx < 0 ? 0 : S[bIdx].i;
    const baseEur = s.map((p) => v0 + (p.i - i0));               // capital aportado (o valor neto al inicio del periodo + aportaciones)
    const cus = s.map((p) => p.v - netV(p));                     // custodia Fidelity acumulada (valor − valor neto)
    const twr = s.map((p) => p.t / t0 - 1);
    // Benchmark con el mismo dinero y las mismas aportaciones, medido igual que la cartera
    const bv = [baseEur[0]];
    for (let k = 1; k < s.length; k++) bv.push(bv[k - 1] * (s[k].b / s[k - 1].b) + (s[k].i - s[k - 1].i));
    const bench = bv.map((x, k) => (baseEur[k] ? (x - baseEur[k]) / baseEur[k] : 0));
    const isAll = bIdx < 0;
    const baseName = isAll ? 'Capital aportado' : 'Base del periodo';
    const series = [{ label: 'Cartera', values: gpct, cls: 'main', gainLoss: true, endDot: true, endCls: F.sign(gpct[L]) }];
    if (state.ovl.bench) series.push({ label: 'Benchmark', values: bench, cls: 'bench' });
    const ini = (d.inicios || []).map((m) => ({ ...m, k: dates.indexOf(m.f) })).filter((m) => m.k >= 0);
    const iniAt = Object.fromEntries(ini.map((m) => [m.k, m]));
    const flowK = []; // v10: solo se marcan las dos aportaciones; los escalones de la línea son compras de fondos
    const dm = (f) => F.date(f).slice(0, 5);
    const points = ini.map((m) => ({ i: m.k, v: 0, cls: 'ini', label: `${m.plataforma} · ${dm(m.f_aportacion)}`, sub: '+' + F.eur(m.importe, 0) }))
      .concat(flowK.map((k) => ({ i: k, v: 0 })));
    const row = (cls, lab, val, sgn) => `<span><i class="lsw ${cls}" aria-hidden="true"></i>${lab}: <b class="${sgn || ''}">${val}</b></span>`;
    const tipHtml = (i) => {
      const m = iniAt[i], fl = i > 0 ? s[i].i - s[i - 1].i : (isAll ? s[0].i : 0);
      return `<strong>${F.date(dates[i])}</strong>`
        + row('val', 'Valor', F.eur(s[i].v))
        + (cus[i] > 0.004 ? row('cus', 'Custodia Fidelity', F.eurSigned(-cus[i])) : '')
        + row('inv', baseName, F.eur(baseEur[i]))
        + row('', gain[i] >= 0 ? 'Ganancia' : 'Pérdida', `${F.eurSigned(gain[i])} (${F.pctSigned(gpct[i])})`, F.sign(gain[i]))
        + row('gain', 'Rentabilidad TWR', F.pctSigned(twr[i]), F.sign(twr[i]))
        + (state.ovl.bench ? row('bench', 'Benchmark', F.pctSigned(bench[i])) : '')
        + (m ? `<span class="tip-ini"><i class="ptsw" aria-hidden="true"></i>Aportación ${esc(m.plataforma)} (${dm(m.f_aportacion)}): <b>${F.eur(m.importe)}</b></span>`
             + `<span class="tip-sub">Compras de fondos: ${m.compras.map(dm).join(' · ')}</span>`
           : fl > 0.005 && i > 0 ? `<span class="tip-sub">Compras de fondos del día: ${F.eur(fl)}</span>` : '');
    };
    const tipText = (i) => `${F.date(dates[i])}. Valor ${F.eur(s[i].v)}.${cus[i] > 0.004 ? ` Custodia Fidelity acumulada ${F.eur(cus[i])}.` : ''} ${baseName} ${F.eur(baseEur[i])}. ${gain[i] >= 0 ? 'Ganancia' : 'Pérdida'} ${F.eurSigned(gain[i])}, ${F.pctSigned(gpct[i])}. Rentabilidad TWR ${F.pctSigned(twr[i])}.` + (iniAt[i] ? ` Aportación a ${iniAt[i].plataforma} el ${F.date(iniAt[i].f_aportacion)}: ${F.eur(iniAt[i].importe)}.` : '') + (state.ovl.bench ? ` Benchmark ${F.pctSigned(bench[i])}.` : '');
    const opts = {
      yFmt: (y, step) => (Math.abs(y) < 1e-12 ? '0%' : F.num(y * 100, decFor(step * 100)) + '%'),
      tipHtml, tipText, points, areaBase: 0, baseline: {},
      ariaLabel: `Ganancia o pérdida sobre ${isAll ? 'el capital aportado' : 'la base del periodo'} del ${F.date(dates[0])} al ${F.date(dates[L])}: la línea de la cartera va por encima de la línea de capital aportado cuando hay ganancia y por debajo cuando hay pérdida. Termina en ${F.pctSigned(gpct[L])} (${F.eurSigned(gain[L])}) sobre ${F.eur(baseEur[L], 0)}. Mínimo ${F.pctSigned(Math.min(...gpct))}, máximo ${F.pctSigned(Math.max(...gpct))}.`
        + (ini.length ? ' Aportaciones: ' + ini.map((m) => `${m.plataforma} ${F.eur(m.importe, 0)} el ${F.date(m.f_aportacion)}`).join('; ') + '.' : '')
        + (state.ovl.bench ? ` Benchmark con el mismo dinero: ${F.pctSigned(bench[L])}.` : ''),
    };
    area.innerHTML = `<div class="chart-top"><div class="legend">
        <span><i class="lsw" aria-hidden="true"></i>Cartera</span>
        <span><i class="lsw inv" aria-hidden="true"></i>${isAll ? '<span class="lg">Capital aportado</span><span class="sh">Aportado</span>' : 'Base del periodo'}</span>
        <span class="lg-gl"><i class="gl pos" aria-hidden="true"></i>gana <i class="gl neg" aria-hidden="true"></i>pierde</span>
        ${ini.length ? '<span><i class="ptsw" aria-hidden="true"></i><span class="lg">Aportaciones</span><span class="sh">Aportación</span></span>' : ''}
      </div><button type="button" class="ovl" data-ovl="bench" aria-pressed="${state.ovl.bench}"><i class="sw" aria-hidden="true"></i>Benchmark</button></div><div id="chart"></div>
      <p class="fine">${isAll ? 'La línea discontinua es el dinero aportado' : 'La línea discontinua es el valor neto al inicio del periodo más lo aportado después'}: la cartera va <b class="pos">por encima</b> cuando ganas y <b class="neg">por debajo</b> cuando pierdes (% = resultado neto, ya restada la custodia de Fidelity, ÷ ${isAll ? 'lo aportado' : 'esa base'}; es la misma cifra que la rentabilidad neta). Toca o arrastra el gráfico para ver cada día los € y la rentabilidad TWR.${state.ovl.bench ? ` Benchmark: el mismo dinero, con las mismas aportaciones, en un índice de igual composición (${esc(d.benchmark.pesos_hoy_txt)} hoy).` : ''}</p>`;
    lineChart($('#chart'), { dates, series, ...opts });
  }

  /* ---------- Calendario ---------- */
  function tint(v, t1, t2) { if (v == null || Math.abs(v) < 1e-9) return 't0'; const a = Math.abs(v); const lvl = a <= t1 ? 1 : a <= t2 ? 2 : 3; return (v < 0 ? 'tn' : 'tp') + lvl; }
  function calendarData(d) {
    const s = d.serie, months = {};
    for (let k = 0; k < s.length; k++) {
      const m = s[k].f.slice(0, 7); (months[m] = months[m] || { m, days: [], first: k, last: k }).last = k;
      months[m].days.push({ f: s[k].f, r: k === 0 ? null : s[k].t / s[k - 1].t - 1, e: k === 0 ? null : change(s, k - 1, k).eur });
    }
    return Object.values(months).map((o) => ({ ...o, r: s[o.last].t / (o.first === 0 ? 1 : s[o.first - 1].t) - 1, e: change(s, o.first - 1, o.last).eur }));
  }
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  function drawCalendar(area) {
    const months = calendarData(state.data);
    if (!state.month) state.month = months[months.length - 1].m;
    const sel = months.find((m) => m.m === state.month);
    const [y, mo] = sel.m.split('-').map(Number);
    const cells = []; const firstDow = (new Date(Date.UTC(y, mo - 1, 1)).getUTCDay() + 6) % 7; // 0 = lunes
    const nDays = new Date(Date.UTC(y, mo, 0)).getUTCDate(); const byDate = Object.fromEntries(sel.days.map((x) => [x.f, x]));
    let pad = firstDow < 5 ? firstDow : 0;
    for (let i = 0; i < pad; i++) cells.push('<div class="d empty" aria-hidden="true"></div>');
    for (let day = 1; day <= nDays; day++) {
      const dow = (firstDow + day - 1) % 7; if (dow > 4) continue;
      const iso = `${y}-${String(mo).padStart(2, '0')}-${String(day).padStart(2, '0')}`; const it = byDate[iso];
      if (!it) { cells.push(`<div class="d empty"><span class="n" aria-hidden="true">${day}</span><span class="sr-only">${day}: sin dato</span></div>`); continue; }
      const dv = state.calUnit === 'pct' ? (it.r == null ? null : F.pctSigned(it.r, 2).replace('\u00a0%', '%')) : (it.e == null ? null : (it.e > 0 ? '+' : '') + F.num(it.e, 0));
      cells.push(`<div class="d ${tint(it.r, 0.0025, 0.0075)}" role="listitem" data-date="${iso}" aria-label="${day} de ${MESES[mo - 1]}: ${it.r == null ? 'inicio de la cartera' : F.pctSigned(it.r) + ', ' + F.eurSigned(it.e)}"><span class="n">${day}</span><span class="v">${dv == null ? 'inicio' : dv}</span></div>`);
    }
    area.innerHTML = `<div class="cal-top"><p class="label" style="margin:0">${state.calUnit === 'pct' ? 'Rentabilidad mensual (TWR)' : 'Ganancia mensual en € (sin aportaciones)'} · elige un mes</p>
      <div class="toggle sm" role="group" aria-label="Unidad del calendario"><button type="button" data-cal-unit="pct" aria-pressed="${state.calUnit === 'pct'}">%</button><button type="button" data-cal-unit="eur" aria-pressed="${state.calUnit === 'eur'}">€</button></div></div>
      <div class="cal-months" role="group" aria-label="Meses">${months.map((m) => { const [yy, mm] = m.m.split('-').map(Number); return `<button type="button" class="${tint(m.r, 0.01, 0.025)}" data-month="${m.m}" aria-pressed="${m.m === state.month}" aria-label="${MESES[mm - 1]} ${yy}: ${F.pctSigned(m.r)}, ${F.eurSigned(m.e)}"><span class="m">${MESES[mm - 1].slice(0, 3)} ${String(yy).slice(2)}</span><span class="v">${state.calUnit === 'pct' ? F.pctSigned(m.r, 2).replace('\u00a0%', '%') : (m.e > 0 ? '+' : '') + F.num(m.e, 0) + '€'}</span></button>`; }).join('')}</div>
      <p class="label" style="margin-top:8px">${MESES[mo - 1]} ${y} · día a día${state.calUnit === 'pct' ? ' (%)' : ' (€)'}</p>
      <div class="cal-head" aria-hidden="true"><span>LUN</span><span>MAR</span><span>MIÉ</span><span>JUE</span><span>VIE</span></div>
      <div class="cal-grid" role="list" aria-label="Rentabilidad diaria de ${MESES[mo - 1]} ${y}">${cells.join('')}</div>
      <div class="cal-legend" aria-hidden="true">Diario: <i class="tn3"></i>&lt; −0,75% <i class="tn2"></i> <i class="tn1"></i>0 <i class="tp1"></i> <i class="tp2"></i><i class="tp3"></i>&gt; +0,75% (color según % del día) · Mensual: tramos de 1% y 2,5%</div>`;
  }

  /* ---------- Métricas ---------- */
  function metricsHtml(d) {
    const r = d.ratios;
    const col = (x) => (x >= 0 ? 'v-green' : 'v-red');
    const M = [
      ['vol', 'Volatilidad', 'σ ann', F.pct(r.volatilidad), 'v-blue'],
      ['sharpe', 'Ratio de Sharpe', 'SR', F.num(r.sharpe, 2), col(r.sharpe)],
      ['sortino', 'Ratio de Sortino', 'Sortino', F.num(r.sortino, 2), col(r.sortino)],
      ['alfa', 'Alfa anual', 'α ann', F.pctSigned(r.alfa_anual), col(r.alfa_anual)],
      ['beta', 'Beta', 'β', F.num(r.beta, 2), 'v-blue'],
      ['var', 'Pérdida en un día malo', 'VaR 95', F.pct(r.var95), 'v-red'],
      ['cvar', 'Pérdida en días extremos', 'CVaR 95', F.pct(r.cvar95), 'v-red'],
      ['dd', 'Peor racha', 'MDD', F.pct(r.max_drawdown), 'v-red'],
      ['ulcer', 'Ulcer Index', 'UI', F.pct(r.ulcer), 'v-blue'],
      ['kurt', 'Kurtosis', 'Kurt', F.num(r.curtosis, 2), 'v-blue'],
    ];
    return `<h2 class="sr-only">Métricas de riesgo</h2><div class="metrics">${M.map(([k, t, sym, v, c]) => `<article class="metric" data-test="ratio-${k}">
      <div class="metric-top"><h3>${t}<small>${sym}</small></h3>${infoBtn(k, t)}</div><p class="v ${c}" style="margin-bottom:0">${v}</p></article>`).join('')}</div>
      <p class="fine">Calculadas con ${r.n_rentabilidades} rentabilidades diarias TWR (${F.date(d.inicio)} – ${F.date(d.fecha_datos)}). Con ~6 meses de historia son orientativas. Toca «i» para ver qué significa cada una.</p>`;
  }
  function infoListHtml(d) {
    const days = Math.round((new Date(d.fecha_datos) - new Date(d.inicio)) / 864e5);
    const m = Math.floor(days / 30.44), rest = Math.round(days - m * 30.44);
    const nF = d.posiciones.filter((p) => p.id !== 'efectivo').length, hasCash = d.posiciones.some((p) => p.id === 'efectivo');
    const plats = [...new Set(d.posiciones.map((p) => p.plataforma))];
    const row = (ico, t, s, v) => `<div class="info-row"><div class="l"><span class="sec-ico">${ico}</span><div><div class="ttl">${t}</div><div class="s">${s}</div></div></div><div class="r">${v}</div></div>`;
    return `<div class="info-list"><h2 class="label">Información cartera</h2><div style="margin-top:10px">
      ${row(ICON.cal, 'Tiempo de inversión activa', 'invirtiendo desde el ' + F.date(d.inicio), `${m} meses${rest ? ' y ' + rest + ' días' : ''}`)}
      ${row(ICON.layers, 'Activos en cartera', 'posiciones activas', `${nF} fondos${hasCash ? ' + liquidez' : ''}`)}
      ${row(ICON.bank, 'Plataformas', plats.join(' · '), `${plats.length}`)}
      ${row(ICON.clock, 'Datos a', 'último valor liquidativo', F.date(d.fecha_datos))}
    </div></div>`;
  }

  /* ---------- KPIs ---------- */
  function kpisHtml(d) {
    const r = d.resumen, s = d.serie;
    const ap = d.inicios || [];
    const late = (m) => m.detalle.filter((x) => x.f && (new Date(x.f) - new Date(m.f_aportacion)) / 864e5 > 7);
    return `<section class="kpis" aria-label="Resumen">
      <article class="kpi"><div class="kpi-top"><h2 class="label">Patrimonio total</h2><span class="ico ico-b">${ICON.euro}</span></div>
        <p class="kv" style="margin-bottom:0">${F.eur(r.valor)}</p>
        <p class="ks" style="margin-bottom:0">${signed(r.valor - r.invertido, F.eurSigned)} valor − aportado</p>
        <p class="ks" style="margin:2px 0 0" data-test="pl">${signed(r.pl, F.eurSigned)} resultado neto (tras ${F.eur(r.custodia_acum)} de custodia pendiente)</p></article>
      <article class="kpi"><div class="kpi-top"><h2 class="label">Aportado a la cartera</h2><span class="ico ico-g">${ICON.wallet}</span></div>
        <p class="kv" style="margin-bottom:0" data-test="invertido">${F.eur(r.invertido)}</p>
        <div class="kpi-rows" data-test="aportaciones"><div><span>Aportaciones</span><b>${ap.length}</b></div>${ap.map((m) => `<div data-test="aport-${esc(m.plataforma)}"><span>${F.date(m.f_aportacion).slice(0, 5)} · ${esc(m.plataforma)}</span><b>${F.eur(m.importe)}</b></div>${late(m).map((x) => `<div class="kpi-note"><span>incluye ${esc(x.nombre)} ${F.eur(x.importe)} (${F.date(x.f).slice(0, 5)})</span></div>`).join('')}`).join('')}<div><span>Liquidez incluida</span><span>${F.eur(r.efectivo)}</span></div></div></article>
      <article class="kpi"><div class="kpi-top"><h2 class="label">Rentabilidad</h2><span class="kpi-ic">${infoBtn('neto', 'la rentabilidad neta')}<span class="ico ico-a">${ICON.target}</span></span></div>
        <p class="kv" style="margin-bottom:0" data-test="plp">${signed(r.plp, F.pctSigned)} <span class="chip-note">neta</span></p>
        <div class="kpi-rows"><div><span>TWR desde inicio</span><b data-test="twr">${signed(r.twr, F.pctSigned)}</b></div><div><span>TWR anualizada</span><b>${signed(r.twr_anual, F.pctSigned)}</b></div><div><span>Objetivo</span><span>sin definir</span></div></div></article>
    </section>`;
  }

  /* ---------- Posiciones ---------- */
  /* Número con todos los decimales que trae el dato (mín. 2, máx. 6), sin ceros sobrantes */
  function exact(x) { const t = (+x.toFixed(6)).toString(); const dec = Math.min(6, Math.max(2, (t.split('.')[1] || '').length)); return F.num(x, dec); }
  function marks(p) { return (p.estimado ? '<sup class="mark" title="Participaciones estimadas">†</sup>' : '') + (p.fecha_aprox ? '<sup class="mark" title="Fecha de compra aproximada">‡</sup>' : ''); }
  function sparkSvg(vals, w = 84, h = 26) {
    if (!vals || vals.length < 2) return `<svg class="spark" width="${w}" height="${h}" aria-hidden="true"><line x1="2" x2="${w - 2}" y1="${h / 2}" y2="${h / 2}" stroke="#10b981" stroke-width="1.6"/></svg>`;
    const mn = Math.min(...vals), mx = Math.max(...vals), sp = mx - mn || 1;
    const pts = vals.map((v, i) => `${(2 + (i / (vals.length - 1)) * (w - 4)).toFixed(1)},${(h - 3 - ((v - mn) / sp) * (h - 6)).toFixed(1)}`).join(' ');
    const up = vals[vals.length - 1] >= vals[0];
    return `<svg class="spark" width="${w}" height="${h}" aria-hidden="true"><polyline points="${pts}" fill="none" stroke="${up ? '#10b981' : '#f43f5e'}" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
  }
  function positionsPanel(d) {
    const tipos = [...new Set(d.posiciones.map((p) => p.tipo))];
    return `<section class="panel" id="posiciones" tabindex="-1" aria-labelledby="h-pos">
      <div class="tabs" role="presentation"><span class="tab">${ICON.brief}Posiciones activas <span class="badge">${d.posiciones.length}</span></span></div>
      <div class="pos-h"><div><div class="sec-h"><span class="sec-ico">${ICON.brief}</span><h2 id="h-pos">Posiciones activas</h2></div>
        <p class="sub">Fondos y liquidez de la cartera. Toca un fondo para ver todos sus datos.</p></div>
        <div class="filters"><label class="search"><span class="sr-only">Buscar fondo, ISIN o plataforma</span>${ICON.search}<input id="q" type="search" placeholder="Buscar fondo o ISIN…" autocomplete="off" value="${esc(state.q)}"></label>
        <label><span class="sr-only">Filtrar por tipo</span><select id="tipo"><option value="">Todos los tipos</option>${tipos.map((t) => `<option value="${esc(t)}">${esc(t)}</option>`).join('')}</select></label></div></div>
      <div class="table-scroll" role="region" aria-label="Tabla de fondos, desliza en horizontal" tabindex="0" id="ftable"></div>
      <div class="pos-foot"><p class="fine">«Cantidad comprada» = participaciones compradas (no ha habido ventas, así que son las que se tienen hoy). «Precio actual (NAV)» = valor liquidativo por participación a ${F.date(d.fecha_datos)}; si es de otra fecha se indica debajo. Valor = cantidad × NAV. <span class="mark">†</span> Participaciones estimadas (aportado / NAV de compra). <span class="mark">‡</span> Fecha de compra aproximada, deducida por VL. «Desde compra» y «€ desde compra» = valor − invertido de cada fondo (antes de la custodia externa). «Total fondos» es su suma (valor − aportado); al restarle la custodia de Fidelity acumulada sale el «Resultado neto», el mismo importe y % del gráfico y de la tarjeta de rentabilidad. «Diario» = variación del último día del histórico (${F.date(d.fecha_datos)}). Tendencia: NAV desde la compra.</p></div>
    </section>`;
  }
  /* v19: tabla de fondos reutilizable (Mi cartera y, en Gestión personal, los fondos de cada tipo de una cartera modelo).
     Misma estructura, contenido y estilo; o.labels adapta los títulos (p. ej. «Desde inicio» en una cartera nocional). */
  const SORT_KEY = { valor: 'valor', peso: 'valor', diario: 'diario', compra: 'plp', eur: 'pl' };
  function sortFunds(list, sort) { const key = SORT_KEY[sort] || 'valor'; return list.slice().sort((a, b) => (b[key] ?? -1e9) - (a[key] ?? -1e9)); }
  function fundTable(o) {
    const L = Object.assign({ qty: 'Cantidad comprada', qtySub: 'participaciones', since: 'Desde compra', sinceEur: '€ desde compra' }, o.labels || {});
    const list = o.list, btn = o.btn || 'data-pos';
    const th = (k, t) => `<th scope="col" ${o.sort === k ? 'aria-sort="descending"' : ''}><button type="button" data-sort="${k}">${t}${o.sort === k ? ' <span aria-hidden="true">▼</span>' : ''}</button></th>`;
    return `<table class="ftable"><caption class="sr-only">${esc(o.caption)}</caption>
      <thead><tr><th scope="col" class="first">Fondo / posición</th><th scope="col" class="l">Tipo</th><th scope="col" class="wrap">${L.qty}<small class="thsub">${L.qtySub}</small></th><th scope="col" class="wrap">Precio actual (NAV)<small class="thsub">por participación</small></th>${th('valor', 'Valor en EUR')}${th('diario', 'Diario')}${th('compra', L.since)}${th('eur', L.sinceEur)}${th('peso', 'Peso %')}<th scope="col">Tendencia</th></tr></thead>
      <tbody>${list.length ? list.map((p) => `<tr data-test="pos-${esc(p.id)}">
        <th scope="row" class="first"><button type="button" class="fname" ${btn}="${esc(p.id)}" aria-label="${esc(p.nombre)}: ver detalle"><span class="nm">${esc(p.nombre)}</span>${marks(p)}<small>${p.isin ? esc(p.isin) + ' · ' : ''}${esc(p.plataforma)}</small></button></th>
        <td class="l"><span class="pill ${p.tipoCls || 'k-' + tk(p.tipo)}">${esc(p.tipo)}</span></td>
        <td data-test="cantidad">${p.participaciones == null ? '—' : exact(p.participaciones)}${p.estimado ? '<span class="mark" aria-label="estimadas">†</span>' : ''}</td>
        <td data-test="nav" title="${p.vl == null ? '' : 'NAV del ' + F.date(p.fecha_vl)}">${p.vl == null ? '—' : exact(p.vl) + '\u00a0€'}${p.vl != null && p.fecha_vl !== o.fecha ? `<small class="navd">${F.date(p.fecha_vl).slice(0, 5)}</small>` : ''}</td>
        <td class="val">${F.eur(p.valor)}</td>
        <td>${signed(p.diario, (x) => F.pctSigned(x))}</td>
        <td>${signed(p.plp, (x) => F.pctSigned(x))}</td>
        <td class="eurc" data-test="pl-eur">${signed(p.pl, (x) => F.eurSigned(x))}</td>
        <td class="wt" data-test="peso">${F.pct(p.peso)}</td>
        <td>${sparkSvg(p.spark)}</td></tr>`).join('') : `<tr class="empty-row"><td colspan="10">${o.empty || 'Ningún fondo coincide con la búsqueda.'}</td></tr>`}</tbody>
      <tfoot>${o.foot ? o.foot(list) : ''}</tfoot></table>`;
  }
  window.CFTable = { html: fundTable, sort: sortFunds, signed };
  function drawTable() {
    const d = state.data, q = state.q.trim().toLowerCase();
    const list = sortFunds(d.posiciones.filter((p) => (!state.tipo || p.tipo === state.tipo) && (!q || [p.nombre, p.isin, p.plataforma, p.tipo].join(' ').toLowerCase().includes(q))), state.sort);
    const tot = list.reduce((a, p) => a + p.valor, 0), totW = list.reduce((a, p) => a + p.peso, 0);
    // Suma en céntimos (sin errores de coma flotante): con todas las filas = valor − aportado de la cartera
    const totPl = list.reduce((a, p) => a + Math.round(p.pl * 100), 0) / 100, totInv = list.reduce((a, p) => a + p.invertido, 0);
    $('#ftable').innerHTML = fundTable({ list, sort: state.sort, fecha: state.data.fecha_datos, caption: `Posiciones activas a ${F.date(d.fecha_datos)}`, foot: () => {
        const full = list.length === d.posiciones.length, cu = d.resumen.custodia_acum || 0, net = d.resumen.pl;
        const sub = `<tr${full ? ' class="tf-sub"' : ''}><th scope="row" class="first">${full ? 'Total fondos <small>valor − aportado</small>' : 'Total (filtrado)'}</th><td></td><td></td><td></td><td>${F.eur(tot)}</td><td></td><td data-test="${full ? 'sum-plp' : 'total-plp'}">${totInv ? signed(totPl / totInv, (x) => F.pctSigned(x)) : ''}</td><td class="eurc" data-test="${full ? 'sum-pl-eur' : 'total-pl-eur'}">${signed(totPl, (x) => F.eurSigned(x))}</td><td>${F.pct(totW)}</td><td></td></tr>`;
        if (!full) return sub;
        // v12: total neto = suma por fondo − custodia de Fidelity acumulada = rentab_neta_eur (gráfico y tarjeta)
        return sub + `<tr class="tf-cus"><th scope="row" class="first">Custodia Fidelity <small>acumulada, aún no cobrada</small></th><td></td><td></td><td></td><td></td><td></td><td></td><td class="eurc" data-test="custodia-eur">${signed(-cu, (x) => F.eurSigned(x))}</td><td></td><td></td></tr>`
          + `<tr class="tf-net"><th scope="row" class="first">Resultado neto <small>= gráfico</small></th><td></td><td></td><td></td><td></td><td></td><td data-test="total-plp">${signed(d.resumen.plp, (x) => F.pctSigned(x))}</td><td class="eurc" data-test="total-pl-eur">${signed(net, (x) => F.eurSigned(x))}</td><td></td><td></td></tr>`;
      } });
  }
  function label(k) { const s = k.replace(/_/g, ' '); return s.charAt(0).toUpperCase() + s.slice(1); }
  function openSheet(id) {
    const p = state.data.posiciones.find((x) => x.id === id); if (!p) return;
    const extra = [];
    extra.push(['Tipo', p.tipo]); extra.push(['Plataforma', p.plataforma]);
    if (p.isin) extra.push(['ISIN', p.isin + (p.codigo_dgs && p.codigo_dgs === p.isin ? ' (código DGS)' : '')]);
    if (p.participaciones != null) extra.push(['Cantidad comprada', exact(p.participaciones) + ' participaciones' + (p.estimado ? ' †' : '') + ' (sin ventas: es la que se tiene hoy)']);
    if (p.vl != null) extra.push(['Precio actual (NAV)', exact(p.vl) + '\u00a0€ por participación · ' + F.date(p.fecha_vl) + (p.fecha_vl !== state.data.fecha_datos ? ' (un día por delante del resto)' : '')]);
    if (p.vl_compra != null) extra.push(['NAV medio de compra', exact(p.vl_compra) + '\u00a0€']);
    extra.push(['Invertido', F.eur(p.invertido)]);
    if (p.fecha_compra) extra.push(['Fecha de compra', F.date(p.fecha_compra) + (p.fecha_aprox ? ' ‡' : '') + (p.confianza ? ` (confianza ${p.confianza})` : '')]);
    if (p.fecha_compra_nota) extra.push(['Nota de compra', p.fecha_compra_nota]);
    if (p.ter != null) extra.push(['TER (gastos corrientes)', F.num(p.ter, 2) + ' %' + (p.ter_nota ? ' — ' + p.ter_nota : '')]);
    if (p.custodia_externa != null) extra.push(['Custodia externa', F.num(p.custodia_externa, 2) + ' % anual']);
    Object.entries(p.comisiones || {}).forEach(([k, v]) => { if (k !== 'fuente') extra.push(['Comisión: ' + label(k), v]); });
    if (p.comisiones && p.comisiones.fuente) extra.push(['Fuente comisiones', p.comisiones.fuente]);
    if (p.nota) extra.push(['Nota', p.nota]);
    (p.avisos || []).forEach((a) => extra.push(['Aviso', a]));
    $('#sheet-body').innerHTML = `<div class="sheet-top"><p class="dtag">${esc(p.tipo)} · ${esc(p.plataforma)}</p><button type="submit" class="icon-btn" value="close" aria-label="Cerrar detalle">✕</button></div><h2 id="sheet-title">${esc(p.nombre)}${marks(p)}</h2>
      <div class="sheet-nums"><div><span>Valor</span><b>${F.eur(p.valor)}</b></div><div><span>Peso</span><b>${F.pct(p.peso)}</b></div><div><span>Desde compra</span><b class="nw">${signed(p.pl, F.eurSigned)}</b><b class="nw">${signed(p.plp, F.pctSigned)}</b></div></div>
      ${p.spark && p.spark.length > 1 ? `<p class="label">VL desde la compra (${F.date(p.spark_desde)})</p>${sparkSvg(p.spark, 300, 60).replace('class="spark"', 'class="spark" style="width:100%;height:60px;margin:6px 0 10px" preserveAspectRatio="none" viewBox="0 0 300 60"')}` : ''}
      <dl class="dl">${extra.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
      ${p.fuente_vl ? `<p class="fine">Fuente del VL: <a href="${esc(p.fuente_vl)}" target="_blank" rel="noopener">${esc(new URL(p.fuente_vl).hostname)}</a></p>` : ''}`;
    const dlg = $('#sheet'); dlg.showModal ? dlg.showModal() : dlg.setAttribute('open', ''); dlg.scrollTop = 0;
  }

  /* ---------- Explicaciones ---------- */
  function infoText(key) {
    const d = state.data, r = d.ratios, lr = d.libre_riesgo, b = d.benchmark, v = d.resumen.valor;
    const comp = b.componentes.map((c) => `<li><b>${esc(c.clase)}</b>: ${esc(c.nombre)} (${esc(c.ticker)})</li>`).join('');
    const shortH = `<p class="fine">Historial corto (${r.n_rentabilidades} días): dato orientativo.</p>`;
    const T = {
      neto: ['Rentabilidad neta', 'Neta', `<p>Dinero ganado o perdido sobre lo aportado: <b>valor actual − custodia acumulada − aportado</b>.</p><p>El valor de cada fondo ya descuenta sus gastos (TER) y además se resta la custodia de Renta 4 del fondo indexado (${F.eur(d.resumen.custodia_acum)} hasta ahora). El porcentaje es sobre lo aportado (${F.eur(d.resumen.invertido)}).</p><p>No hay rentabilidad objetivo definida, así que no se muestra ninguna barra de objetivo.</p>`],
      twr: ['Cómo leer el gráfico y los periodos', 'TWR y ganancia', `<p><b>Gráfico</b>: la línea discontinua es el <b>capital aportado</b> y la línea azul es la cartera. Cuando el resultado neto es positivo, la línea azul va <b>por encima</b> (zona verde); cuando es negativo, <b>por debajo</b> (zona roja). El % es el <b>resultado neto ÷ lo aportado</b>, con la custodia de Fidelity ya restada: la misma cifra que la tarjeta «Rentabilidad neta». En 1 día, 1 semana y 1 mes la base es el valor neto al inicio del periodo más lo aportado después. Los puntos verdes marcan las dos aportaciones: ${d.inicios.map((m) => `${esc(m.plataforma)} el ${F.date(m.f_aportacion)} (${F.eur(m.importe)})`).join(' y ')}. Los escalones de la línea discontinua están en las fechas de compra de los fondos, que es cuando el dinero empezó a invertirse.</p><p><b>Ganancia / pérdida €</b> (resultado neto): valor − custodia de Fidelity acumulada − aportado, el mismo dato que da Cartera Family (rentab_neta_eur). En los periodos: valor neto final − valor neto inicial − aportaciones del periodo; el % es ese importe ÷ (valor neto inicial + aportaciones). Desde el inicio: ${F.eurSigned(d.resumen.pl)} (${F.pctSigned(d.resumen.plp)}); sin restar la custodia (${F.eur(d.resumen.custodia_acum)}) serían ${F.eurSigned(d.resumen.valor - d.resumen.invertido)}.</p><p><b>Rentabilidad TWR</b> (en el tooltip y junto al importe): rentabilidad <b>ponderada por tiempo</b>, lo que ha hecho el dinero sin que influyan las aportaciones. Desde el inicio: ${F.pctSigned(d.resumen.twr)} (anualizada ${F.pctSigned(d.resumen.twr_anual)}). Es la base de las métricas de riesgo.</p><p><b>YTD</b>: en lo que va de año (desde el 01/01, o desde el inicio si la cartera empezó este año).</p><p>¿Por qué la TWR (${F.pctSigned(d.resumen.twr)}) es más negativa que el resultado neto sobre lo aportado (${F.pctSigned(d.resumen.plp)})? La TWR da el mismo peso a cada día: en las primeras semanas solo había una parte del dinero y cayó; en euros esa caída pesó poco.</p>`],
      vol: ['Volatilidad', 'σ ann', `<p>Cuánto oscila la cartera de un día para otro, llevado a un año. A más volatilidad, más vaivenes por el camino.</p><p>${F.pct(r.volatilidad)} es baja: más de la mitad de la cartera está en monetario y renta fija. La bolsa mundial suele moverse entre el 12 % y el 20 %.</p><p class="fine">Desviación típica de las rentabilidades diarias TWR × √252. Coincide con Cartera Family (${F.num(r.volatilidad_fuente_pct, 2)} %).</p>`],
      sharpe: ['Ratio de Sharpe', 'SR', `<p>Rentabilidad <b>por encima del tipo sin riesgo</b> por cada unidad de riesgo. Por encima de 1 se considera bueno; negativo significa que en este periodo habría rendido más dejar el dinero al tipo sin riesgo.</p><p>Tipo sin riesgo: <b>${esc(lr.nombre)}</b>, media ${F.num(lr.medio_pct, 3)} % del ${F.date(lr.desde)} al ${F.date(lr.hasta)} (habría rendido ${F.pctSigned(r.rf_total)} en el periodo).</p><p class="fine">Media diaria de (rentabilidad − €STR) / desviación típica de esos excesos × √252. Fuente: <a href="${esc(lr.web)}" target="_blank" rel="noopener">BCE, serie ${esc(lr.serie)}</a>.</p>${shortH}`],
      sortino: ['Ratio de Sortino', 'Sortino', `<p>Como el Sharpe, pero <b>solo penaliza las caídas</b>: la volatilidad de los días en que la cartera rinde menos que el €STR. Los días buenos no cuentan como «riesgo».</p><p>${F.num(r.sortino, 2)}: negativo porque en el periodo la cartera ha rendido menos que el €STR.</p><p class="fine">Exceso medio anualizado / desviación a la baja anualizada (objetivo = €STR).</p>${shortH}`],
      alfa: ['Alfa anual', 'α ann', `<p>Lo que la cartera añade (o resta) <b>sobre lo que explicaría su beta</b> frente al benchmark. Positivo = los fondos elegidos lo han hecho mejor que un índice equivalente.</p><p>${F.pctSigned(r.alfa_anual)} anualizado (el benchmark hizo ${F.pctSigned(r.benchmark_total)} frente al ${F.pctSigned(d.resumen.twr)} de la cartera).</p><p><b>Benchmark</b>: ${esc(b.descripcion)}</p><ul>${comp}</ul><p class="fine">Pesos hoy: ${esc(b.pesos_hoy_txt)}. Precios: ${esc(b.fuente_precios)}. Regresión de los excesos diarios sobre el €STR; alfa diaria × 252.</p>${shortH}`],
      beta: ['Beta', 'β', `<p>Sensibilidad al mercado: 1 = se mueve igual que el benchmark; menos de 1, más suave.</p><p>${F.num(r.beta, 2)} frente al benchmark equivalente y ${F.num(r.beta_msci_acwi, 2)} frente a la bolsa mundial (MSCI ACWI) sola. R² ${F.num(r.r2, 2)}: solo una parte de los movimientos diarios se explica por el benchmark, algo normal con fondos de gestión activa y de estilo «value» y con valores liquidativos que no cierran a la misma hora que la bolsa alemana.</p>${shortH}`],
      var: ['Pérdida en un día malo', 'VaR 95', `<p>El 95 % de los días la cartera <b>no perdió más de ${F.pct(Math.abs(r.var95))}</b> en un día. Con el valor actual equivale a unos ${F.eur(Math.abs(r.var95) * v, 0)}.</p><p class="fine">Método histórico: percentil 5 de las ${r.n_rentabilidades} rentabilidades diarias TWR.</p>${shortH}`],
      cvar: ['Pérdida en días extremos', 'CVaR 95', `<p>Pérdida <b>media del 5 % de los peores días</b> (${r.n_cola} días): ${F.pct(r.cvar95)}, unos ${F.eur(Math.abs(r.cvar95) * v, 0)} con el valor actual.</p><p>Peor día del periodo: ${F.date(r.peor_dia.f)} (${F.pctSigned(r.peor_dia.r)}). Mejor día: ${F.date(r.mejor_dia.f)} (${F.pctSigned(r.mejor_dia.r)}).</p>${shortH}`],
      dd: ['Peor racha', 'MDD', `<p>Mayor caída desde un máximo hasta el mínimo posterior: ${F.pct(r.max_drawdown)}, del ${F.dateLong(r.max_dd_pico)} al ${F.dateLong(r.max_dd_valle)}${r.max_dd_valle === d.fecha_datos ? ' (último dato: la caída sigue abierta)' : ''}.</p><p class="fine">Sobre el índice TWR, así que las aportaciones no lo distorsionan. Coincide con Cartera Family (${F.num(r.max_dd_fuente_pct, 2)} %).</p>`],
      ulcer: ['Ulcer Index', 'UI', `<p>«Dolor» acumulado del inversor: combina <b>la profundidad y la duración</b> de las caídas desde máximos en un solo número. Cuanto más bajo, más tranquilo el camino.</p><p>${F.pct(r.ulcer)}: caídas pequeñas en general.</p><p class="fine">Raíz de la media de los drawdowns al cuadrado del índice TWR, día a día.</p>`],
      kurt: ['Kurtosis', 'Kurt', `<p>Indica si los días extremos (muy buenos o muy malos) son más frecuentes de lo que predice una campana de Gauss, que tiene curtosis 3.</p><p>${F.num(r.curtosis, 2)} (exceso ${F.num(r.exceso_curtosis, 2)}): ${r.curtosis > 3.5 ? 'colas algo más «gordas» de lo normal; hay más días extremos de lo esperado.' : r.curtosis >= 2.5 ? 'cerca de lo normal.' : 'menos días extremos de lo normal.'} Asimetría ${F.num(r.asimetria, 2)}.</p><p class="fine">Curtosis de Pearson de las rentabilidades diarias TWR.</p>${shortH}`],
    };
    return T[key];
  }

  /* ---------- Pie ---------- */
  function footerHtml(d) {
    const b = d.benchmark, lr = d.libre_riesgo;
    return `<section class="card foot" aria-labelledby="h-foot"><h2 id="h-foot">Datos, fuentes y avisos</h2>
      <p>Datos a <b>${F.dateLong(d.fecha_datos)}</b>. ${esc(d.fecha_datos_nota || '')} Generado el ${esc(d.generado.replace('T', ' '))} (hora de Madrid).</p>
      <h3>Avisos</h3><ul>${d.avisos.map((a) => `<li>${esc(a)}</li>`).join('')}</ul>
      <h3>Fuentes</h3><ul><li>Posiciones, histórico y comisiones: bot Cartera Family (VL de FT Markets, quefondos y las gestoras).</li>
      <li>Tipo sin riesgo: <a href="${esc(lr.web)}" target="_blank" rel="noopener">€STR, Banco Central Europeo</a>.</li>
      ${b.componentes.filter((c) => c.ticker !== '€STR').map((c) => `<li>Benchmark ${esc(c.clase.toLowerCase())}: ${esc(c.nombre)} — ${esc(b.fuente_precios)}.</li>`).join('')}</ul>
      <h3>Método</h3><p class="fine" style="margin-top:0">${esc(d.ratios.metodo)}</p>
      <p class="fine">Uso personal e informativo; no es asesoramiento financiero.</p>
      <button type="button" class="btn btn-danger" data-lock="1">Bloquear y olvidar la contraseña en este iPhone</button>
    </section>`;
  }

  /* ---------- Montaje ---------- */
  function openInfo(key) {
    const [title, tag, body] = infoText(key); $('#info-title').textContent = title; $('#info-tag').textContent = tag; $('#info-body').innerHTML = body;
    const dlg = $('#info'); dlg.showModal ? dlg.showModal() : dlg.setAttribute('open', '');
  }
  /* ---------- Pestañas (v13): Mi cartera | Actualidad ---------- */
  const TABS = [['cartera', 'Mi cartera', '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>'],
    ['actualidad', 'Actualidad', '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 5-6"/></svg>'],
    ['gestion', 'Gestión personal', '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v10M15 9.5c0-1.4-1.3-2.2-3-2.2s-3 .8-3 2.2 1.3 2 3 2.3 3 .9 3 2.3-1.3 2.2-3 2.2-3-.8-3-2.2"/></svg>']];
  const mk = { data: null, err: null, mounted: false };
  function tabsHtml() {
    return `<div class="apptabs" role="tablist" aria-label="Secciones de la app">${TABS.map(([id, t, ico]) => `<button type="button" role="tab" id="tabbtn-${id}" data-tab="${id}" aria-controls="tab-${id}" aria-selected="${state.tab === id}" tabindex="${state.tab === id ? 0 : -1}">${ico}${t}</button>`).join('')}</div>`;
  }
  function mountMarket() {
    const box = $('#tab-actualidad'); if (!box || box.hidden) return;
    if (!mk.data) { box.innerHTML = `<section class="card mk-wait" data-test="mk-wait"><p>${mk.err ? esc(mk.err) : 'Cargando datos de mercado…'}</p></section>`; return; }
    if (!mk.mounted) { box.innerHTML = CFMarket.html(mk.data); CFMarket.bind(box); mk.mounted = true; }
    CFMarket.draw();
  }
  /* v18: pestaña «Gestión personal» (gestion.js); las carteras modelo llegan cifradas en data/models.enc.json */
  const gp = { data: null, err: null, mounted: false };
  function mountGestion() {
    const box = $('#tab-gestion'); if (!box || box.hidden) return;
    if (!gp.mounted) { box.innerHTML = CFGestion.html(gp.data); CFGestion.bind(box); gp.mounted = true; if (!gp.data) CFGestion.setModels(null, gp.err); }
    CFGestion.draw();
  }
  async function loadModels(key) {
    try {
      const r = await fetch('data/models.enc.json', { cache: 'no-cache' });
      if (!r.ok) throw new Error('sin datos (' + r.status + ')');
      gp.data = await CFCrypto.decrypt(key, await r.json());
    } catch (e) { gp.err = 'No se han podido cargar las carteras modelo: ' + (e.message || 'error') + '.'; }
    if (gp.mounted) CFGestion.setModels(gp.data, gp.err);
  }
  function showTab(id, focus) {
    state.tab = id;
    TABS.forEach(([t]) => { const b = $('#tabbtn-' + t), p = $('#tab-' + t); b.setAttribute('aria-selected', String(t === id)); b.tabIndex = t === id ? 0 : -1; p.hidden = t !== id; });
    if (id === 'cartera') drawEquity(); else if (id === 'gestion') mountGestion(); else mountMarket();
    if (focus) $('#tabbtn-' + id).focus();
  }
  async function loadMarket(key) {
    try {
      const r = await fetch('data/market.enc.json', { cache: 'no-cache' });
      if (!r.ok) throw new Error('sin datos de mercado (' + r.status + ')');
      mk.data = await CFCrypto.decrypt(key, await r.json());
    } catch (e) { mk.err = 'No se han podido cargar los datos de mercado: ' + (e.message || 'error') + '.'; }
    mountMarket();
  }
  function render(d, key) {
    state.data = d;
    $('#lock-btn').hidden = false;
    $('#foot-date').textContent = 'Datos a ' + F.date(d.fecha_datos);
    const app = $('#app');
    app.innerHTML = `<div id="tab-cartera" role="tabpanel" aria-labelledby="tabbtn-cartera" ${state.tab === 'cartera' ? '' : 'hidden'}><div class="page-h"><h1>Resumen de la cartera</h1><p>Histórico y métricas de la Cartera Family · datos a ${F.date(d.fecha_datos)}</p></div>`
      + equityPanel(d) + kpisHtml(d) + positionsPanel(d) + footerHtml(d) + `</div><div id="tab-actualidad" role="tabpanel" aria-labelledby="tabbtn-actualidad" ${state.tab === 'actualidad' ? '' : 'hidden'}></div><div id="tab-gestion" role="tabpanel" aria-labelledby="tabbtn-gestion" ${state.tab === 'gestion' ? '' : 'hidden'}></div>`;
    app.setAttribute('aria-busy', 'false');
    drawEquity(); drawTable();
    /* v16: una sola barra de pestañas, arriba en la cabecera (antes salía dos veces: cabecera + barra bajo ella) */
    $('.nav').innerHTML = tabsHtml(); $('.nav').classList.add('tabs-on'); $('.topbar').classList.add('has-tabs');
    $('.nav').addEventListener('click', (ev) => { const b = ev.target.closest('[data-tab]'); if (b) showTab(b.dataset.tab, true); });
    $('.apptabs').addEventListener('keydown', (ev) => {
      const i = TABS.findIndex(([t]) => t === state.tab); let j = null;
      if (ev.key === 'ArrowRight') j = (i + 1) % TABS.length; else if (ev.key === 'ArrowLeft') j = (i + TABS.length - 1) % TABS.length; else if (ev.key === 'Home') j = 0; else if (ev.key === 'End') j = TABS.length - 1;
      if (j != null) { ev.preventDefault(); showTab(TABS[j][0], true); }
    });
    if (key) { loadMarket(key); loadModels(key); } else { mk.err = 'Datos de mercado no disponibles.'; gp.err = 'Carteras modelo no disponibles.'; }
    app.addEventListener('click', (ev) => {
      const t = ev.target.closest('button'); if (!t) return;
      if (t.dataset.tab) { showTab(t.dataset.tab, true); window.scrollTo(0, 0); return; }
      if (t.closest('#tab-actualidad') || t.closest('#tab-gestion')) return; // Actualidad (market.js) y Gestión personal (gestion.js) gestionan sus propios botones
      if (t.dataset.view) { state.view = t.dataset.view; drawEquity(); }
      else if (t.dataset.calUnit) { state.calUnit = t.dataset.calUnit; drawEquity(); const b = $(`[data-cal-unit="${state.calUnit}"]`); b && b.focus(); }
      else if (t.dataset.period) { state.period = t.dataset.period; if (state.view !== 'graph') state.view = 'graph'; drawEquity(); const pb = $(`[data-period="${state.period}"]`); pb && pb.focus(); }
      else if (t.dataset.ovl) { state.ovl[t.dataset.ovl] = !state.ovl[t.dataset.ovl]; drawEquity(); const b = $(`[data-ovl="${t.dataset.ovl}"]`); b && b.focus(); }
      else if (t.dataset.month) { state.month = t.dataset.month; drawEquity(); const b = $(`[data-month="${state.month}"]`); b && b.focus(); }
      else if (t.dataset.sort) { state.sort = t.dataset.sort; drawTable(); const b = $(`#ftable [data-sort="${state.sort}"]`); b && b.focus(); }
      else if (t.dataset.pos) openSheet(t.dataset.pos);
      else if (t.dataset.info) openInfo(t.dataset.info);
      else if (t.dataset.lock) lock();
    });
    $('#q').addEventListener('input', (ev) => { state.q = ev.target.value; drawTable(); });
    $('#tipo').addEventListener('change', (ev) => { state.tipo = ev.target.value; drawTable(); });
    let rz, lastW = window.innerWidth; window.addEventListener('resize', () => { if (window.innerWidth === lastW) return; lastW = window.innerWidth; clearTimeout(rz); rz = setTimeout(() => { if (state.tab === 'actualidad') mountMarket(); else if (state.tab === 'gestion') mountGestion(); else drawEquity(); }, 150); });
  }
  ['info', 'sheet'].forEach((id) => $('#' + id).addEventListener('click', (ev) => { if (ev.target.id === id) ev.target.close(); }));

  /* ---------- Desbloqueo ---------- */
  function lock() { CFCrypto.forget(); location.reload(); }
  function unlockScreen(env, msg) {
    $('#foot-date').textContent = 'Datos cifrados';
    const app = $('#app'); app.setAttribute('aria-busy', 'false');
    app.innerHTML = `<div class="unlock-wrap"><section class="unlock" aria-labelledby="h-unlock">
      <div class="logo" aria-hidden="true"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4.5" y="10.5" width="15" height="10" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/></svg></div>
      <h1 id="h-unlock">Cartera protegida</h1>
      <p class="sub">Los datos de la cartera están cifrados. Introduce la contraseña para verlos.</p>
      <form id="unlock-form" novalidate>
        <label for="pw" class="field-label label">Contraseña</label>
        <div class="pw-row">
          <input id="pw" name="password" type="password" autocomplete="current-password" autocapitalize="off" autocorrect="off" spellcheck="false" required aria-describedby="pw-err" ${msg ? 'aria-invalid="true"' : ''}>
          <button type="button" id="pw-toggle" class="pw-toggle" aria-pressed="false" aria-label="Mostrar contraseña">Ver</button>
        </div>
        <p id="pw-err" class="err" role="alert">${msg ? esc(msg) : ''}</p>
        <label class="check"><input type="checkbox" id="remember" checked><span>Recordar en este iPhone</span></label>
        <button class="btn" id="unlock-btn" type="submit" style="margin-top:12px">Desbloquear</button>
      </form>
      <p class="fine">El descifrado se hace solo en este dispositivo (AES-256). Si marcas «Recordar», la clave se guarda en este iPhone hasta que pulses «Bloquear».</p>
    </section></div>`;
    const pw = $('#pw'), btn = $('#unlock-btn');
    $('#pw-toggle').addEventListener('click', (ev) => { const show = pw.type === 'password'; pw.type = show ? 'text' : 'password'; ev.currentTarget.setAttribute('aria-pressed', String(show)); ev.currentTarget.textContent = show ? 'Ocultar' : 'Ver'; ev.currentTarget.setAttribute('aria-label', show ? 'Ocultar contraseña' : 'Mostrar contraseña'); });
    $('#unlock-form').addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const err = $('#pw-err');
      if (!pw.value) { err.textContent = 'Escribe la contraseña.'; pw.setAttribute('aria-invalid', 'true'); pw.focus(); return; }
      btn.disabled = true; btn.textContent = 'Descifrando…'; err.textContent = '';
      try {
        const key = await CFCrypto.derive(pw.value, env);
        let data;
        try { data = await CFCrypto.decrypt(key, env); } catch (e) { throw new Error('bad'); }
        if ($('#remember').checked) { try { await CFCrypto.remember(key, env); } catch (e) { /* sin almacenamiento */ } }
        pw.value = '';
        render(data, key);
      } catch (e) {
        btn.disabled = false; btn.textContent = 'Desbloquear';
        err.textContent = e.message === 'bad' ? 'Contraseña incorrecta. Vuelve a intentarlo.' : 'No se ha podido descifrar en este navegador.';
        pw.setAttribute('aria-invalid', 'true'); pw.select(); pw.focus();
      }
    });
    if (!msg) setTimeout(() => pw.focus(), 50);
  }
  async function start() {
    if (!CFCrypto.supported) throw new Error('Este navegador no permite descifrar los datos (WebCrypto). Ábrela en Safari con https');
    const r = await fetch('data/portfolio.enc.json', { cache: 'no-cache' });
    if (!r.ok) throw new Error('No se encuentran los datos (' + r.status + ')');
    const env = await r.json();
    const key = await CFCrypto.stored(env);
    if (key) {
      let data = null;
      try { data = await CFCrypto.decrypt(key, env); } catch (e) { CFCrypto.forget(); }
      if (data) { render(data, key); return; }
    } else if (CFCrypto.hasStored()) {
      CFCrypto.forget(); unlockScreen(env, 'Los datos se han cifrado de nuevo con otra contraseña. Introdúcela otra vez.'); return;
    }
    unlockScreen(env);
  }
  $('#lock-btn').addEventListener('click', lock);
  start().catch((e) => {
    $('#app').setAttribute('aria-busy', 'false');
    $('#app').innerHTML = `<section class="card"><h2>No se han podido cargar los datos</h2><p>${esc(e.message)}. Comprueba la conexión y vuelve a abrir la app.</p></section>`;
  });
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
})();
