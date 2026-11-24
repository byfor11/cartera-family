/* v18: pestaña «Gestión personal»: calculadora de interés compuesto (solo en el navegador) + carteras modelo de
   «La Pizarra de Andrés» (Andbank) con su track record (data/models.enc.json, cifrado con la misma clave). */
(function () {
  const $ = (s, r) => (r || document).querySelector(s);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const ICO = {
    calc: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 11h2M12 11h2M16 11v6M8 15h2M12 15h2M8 19h0"/></svg>',
    pie: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12A9 9 0 1 1 12 3v9z"/><path d="M15 3.5A9 9 0 0 1 20.5 9H15z"/></svg>',
    line: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 5-6"/></svg>',
    cal: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
  };
  function secHead(id, ico, title, sub, right) {
    return `<div class="sec-row"><div class="sec-h"><span class="sec-ico" aria-hidden="true">${ico}</span><h2 id="${id}">${title}</h2></div>${right || ''}</div>${sub ? `<p class="sub">${sub}</p>` : ''}`;
  }
  const pctS = (x, dec = 2) => (x == null ? '—' : F.pctSigned(x, dec));
  const cl = (x) => (x == null ? '' : x > 0 ? 'pos' : x < 0 ? 'neg' : '');

  /* ================= Calculadora de interés compuesto =================
     Simulación mes a mes. Tipo mensual equivalente a la capitalización elegida: (1 + r/n)^(n/12) − 1, de modo que sin
     aportaciones el resultado es exactamente C0·(1 + r/n)^(n·años). Aportaciones al FINAL de cada mes (mensual) o de cada
     año (anual); si crecen, la cuantía sube un g % cada año. Valor real = valor nominal ÷ (1 + inflación)^años. */
  function calc(p) {
    const C0 = +p.capital || 0, A = +p.aport || 0, yrs = Math.max(0, Math.round(+p.years || 0)), r = (+p.rate || 0) / 100;
    const n = +p.comp || 12, g = (+p.growth || 0) / 100, inf = (+p.infl || 0) / 100, mensual = p.freq !== 'y';
    const im = r === 0 ? 0 : Math.pow(1 + r / n, n / 12) - 1;
    let v = C0, aportado = C0; const rows = [];
    for (let y = 1; y <= yrs; y++) {
      const a = A * Math.pow(1 + g, y - 1); let ay = 0; const v0 = v;
      for (let m = 1; m <= 12; m++) {
        v *= 1 + im;
        if (mensual) { v += a; ay += a; } else if (m === 12) { v += a; ay += a; }
      }
      aportado += ay;
      rows.push({ y, aport: ay, interes: v - v0 - ay, aportado, valor: v, real: v / Math.pow(1 + inf, y) });
    }
    return { final: v, aportado, intereses: v - aportado, real: v / Math.pow(1 + inf, yrs), rows, years: yrs, inf };
  }
  const CDEF = { capital: 10000, aport: 200, freq: 'm', growth: 0, years: 20, rate: 6, comp: 12, infl: 0 };
  const cs = { ...CDEF };
  function field(id, label, val, unit, attrs) {
    return `<label class="cc-f" for="cc-${id}"><span class="label">${label}</span><span class="cc-in"><input id="cc-${id}" data-cc="${id}" type="text" inputmode="decimal" value="${esc(String(val).replace('.', ','))}" ${attrs || ''}><i>${unit}</i></span></label>`;
  }
  function calcHtml() {
    return `<section class="panel mk-sec" aria-labelledby="h-gp-calc" data-test="gp-calc"><div class="panel-pad">
      ${secHead('h-gp-calc', ICO.calc, 'Calculadora de interés compuesto', 'Capital inicial, aportaciones, plazo y rentabilidad esperada. Todo se calcula en este dispositivo.')}
      <form class="cc-form" id="cc-form" novalidate onsubmit="return false">
        ${field('capital', 'Capital inicial', cs.capital, '€')}
        <div class="cc-f"><span class="label" id="cc-aport-l">Aportación periódica</span>
          <div class="cc-row"><span class="cc-in"><input id="cc-aport" data-cc="aport" type="text" inputmode="decimal" aria-labelledby="cc-aport-l" value="${esc(String(cs.aport).replace('.', ','))}"><i>€</i></span>
          <div class="pillbar" role="group" aria-label="Frecuencia de la aportación"><button type="button" data-cc-freq="m" aria-pressed="${cs.freq === 'm'}">al mes</button><button type="button" data-cc-freq="y" aria-pressed="${cs.freq === 'y'}">al año</button></div></div></div>
        ${field('growth', 'Subida anual de la aportación', cs.growth, '%')}
        ${field('years', 'Plazo', cs.years, 'años', 'inputmode="numeric"')}
        ${field('rate', 'Rentabilidad anual esperada', cs.rate, '%')}
        <label class="cc-f" for="cc-comp"><span class="label">Capitalización</span><span class="cc-in sel"><select id="cc-comp" data-cc="comp">
          ${[[12, 'Mensual'], [4, 'Trimestral'], [2, 'Semestral'], [1, 'Anual'], [365, 'Diaria']].map(([v, t]) => `<option value="${v}" ${+cs.comp === v ? 'selected' : ''}>${t}</option>`).join('')}</select></span></label>
        ${field('infl', 'Inflación anual (opcional)', cs.infl, '%')}
      </form>
      <p class="err" id="cc-err" role="alert"></p>
      <div id="cc-out" aria-live="polite"></div>
    </div></section>`;
  }
  const parseNum = (s) => { const t = String(s).trim().replace(/\s|€|%/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.'); return t === '' ? 0 : Number(t); };
  function readCalc() {
    const err = [];
    const lim = { capital: [0, 1e9], aport: [0, 1e8], growth: [-50, 100], years: [1, 80], rate: [-50, 100], infl: [-20, 50] };
    for (const k of Object.keys(lim)) {
      const el = $('#cc-' + k); const v = parseNum(el.value);
      const bad = !isFinite(v) || v < lim[k][0] || v > lim[k][1];
      el.setAttribute('aria-invalid', String(bad));
      if (bad) err.push(`${el.closest('.cc-f').querySelector('.label').textContent}: entre ${F.num(lim[k][0], 0)} y ${F.num(lim[k][1], 0)}`); else cs[k] = k === 'years' ? Math.round(v) : v;
    }
    cs.comp = +$('#cc-comp').value;
    $('#cc-err').textContent = err.length ? 'Revisa: ' + err.join(' · ') : '';
    return !err.length;
  }
  function drawCalc() {
    const out = $('#cc-out'); if (!out) return;
    if (!readCalc()) return;
    const r = calc(cs), L = r.rows;
    const kp = (lab, v, cls, test, sub) => `<div class="cc-k ${cls || ''}" data-test="${test}"><span class="label">${lab}</span><b>${F.eur(v, 0)}</b>${sub ? `<small>${sub}</small>` : ''}</div>`;
    out.innerHTML = `<div class="cc-kpis">
        ${kp('Capital final', r.final, 'main', 'cc-final', `en ${r.years} años`)}
        ${kp('Total aportado', r.aportado, '', 'cc-aportado', `${F.eur(cs.capital, 0)} inicial + aportaciones`)}
        ${kp('Intereses generados', r.intereses, 'gain', 'cc-intereses', r.aportado ? `${F.num(r.intereses / r.aportado * 100, 1)} % sobre lo aportado` : '')}
        ${r.inf ? kp('Capital final en € de hoy', r.real, '', 'cc-real', `con inflación del ${F.num(r.inf * 100, 2)} % anual`) : ''}
      </div>
      <div class="chart-top"><div class="legend"><span><i class="lsw" aria-hidden="true"></i>Capital</span><span><i class="lsw inv" aria-hidden="true"></i>Aportado</span>${r.inf ? '<span><i class="lsw real" aria-hidden="true"></i>En € de hoy</span>' : ''}</div></div>
      <div id="cc-chart" data-test="cc-chart"></div>
      <details class="cc-tab"><summary>Tabla año a año</summary><div class="tbl-wrap"><table class="cc-table" data-test="cc-table"><thead><tr><th scope="col">Año</th><th scope="col">Aportado en el año</th><th scope="col">Intereses del año</th><th scope="col">Capital</th>${r.inf ? '<th scope="col">€ de hoy</th>' : ''}</tr></thead>
        <tbody>${L.map((x) => `<tr><td>${x.y}</td><td>${F.eur(x.aport, 0)}</td><td class="pos">${F.eur(x.interes, 0)}</td><td><b>${F.eur(x.valor, 0)}</b></td>${r.inf ? `<td>${F.eur(x.real, 0)}</td>` : ''}</tr>`).join('')}</tbody></table></div></details>
      <p class="fine">Aportaciones al final de cada ${cs.freq === 'm' ? 'mes' : 'año'}${cs.growth ? `, subiendo un ${F.num(cs.growth, 2)} % cada año` : ''}; capitalización ${({ 12: 'mensual', 4: 'trimestral', 2: 'semestral', 1: 'anual', 365: 'diaria' })[cs.comp]} (tipo mensual equivalente). Rentabilidad constante y sin comisiones ni impuestos: es una simulación, no una previsión.</p>`;
    const dates = ['0'].concat(L.map((x) => String(x.y)));
    const cap = [cs.capital].concat(L.map((x) => x.valor)), apo = [cs.capital].concat(L.map((x) => x.aportado));
    const real = [cs.capital].concat(L.map((x) => x.real));
    const series = [{ label: 'Capital', values: cap, cls: '', area: true, endDot: true }, { label: 'Aportado', values: apo, cls: 'inv' }];
    if (r.inf) series.push({ label: 'En € de hoy', values: real, cls: 'real' });
    lineChart($('#cc-chart'), {
      dates, series, h: 220, nTicks: 4, padL: 56,
      xFmt: (d) => (d === '0' ? 'Hoy' : 'Año ' + d),
      yFmt: (y) => (Math.abs(y) >= 1e6 ? F.num(y / 1e6, 1) + ' M€' : Math.abs(y) >= 1e3 ? F.num(y / 1e3, 0) + ' k€' : F.num(y, 0) + ' €'),
      tipHtml: (i) => `<strong>${i ? 'Año ' + i : 'Hoy'}</strong><span>Capital: <b>${F.eur(cap[i], 0)}</b></span><span>Aportado: <b>${F.eur(apo[i], 0)}</b></span><span>Intereses: <b class="pos">${F.eur(cap[i] - apo[i], 0)}</b></span>${r.inf ? `<span>En € de hoy: <b>${F.eur(real[i], 0)}</b></span>` : ''}`,
      tipText: (i) => `${i ? 'Año ' + i : 'Hoy'}. Capital ${F.eur(cap[i], 0)}, aportado ${F.eur(apo[i], 0)}, intereses ${F.eur(cap[i] - apo[i], 0)}.`,
      ariaLabel: `Evolución del capital en ${r.years} años: de ${F.eur(cs.capital, 0)} a ${F.eur(r.final, 0)}; aportado ${F.eur(r.aportado, 0)} e intereses ${F.eur(r.intereses, 0)}.`,
    });
  }

  /* ================= Carteras modelo ================= */
  const ms = { d: null, sel: 2, view: 'graph', period: 'all', year: null, month: null, open: new Set(), sort: 'valor' };
  const PER = [['1d', '1 día'], ['1m', '1 mes'], ['3m', '3 meses'], ['ytd', 'YTD'], ['1y', '1 año'], ['all', 'Inicio']];
  const SHORT = ['C+', 'C', 'M', 'E', 'A', 'A+'];
  const addDays = (iso, n) => { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const addMonths = (iso, n) => { const d = new Date(iso + 'T12:00:00Z'); d.setUTCMonth(d.getUTCMonth() + n); return d.toISOString().slice(0, 10); };
  function baseIdx(s, target) { let k = -1; for (let i = 0; i < s.length; i++) if (s[i][0] <= target) k = i; return k; }
  function perBase(s, id) {
    const L = s.length - 1, last = s[L][0];
    const t = { '1d': L - 1, '1w': baseIdx(s, addDays(last, -7)), '1m': baseIdx(s, addMonths(last, -1)), '3m': baseIdx(s, addMonths(last, -3)),
      ytd: baseIdx(s, addDays(last.slice(0, 4) + '-01-01', -1)), '1y': baseIdx(s, addMonths(last, -12)), all: 0 }[id];
    return t;
  }
  function perRet(s, id) { const b = perBase(s, id); return b == null || b < 0 ? null : s[s.length - 1][1] / s[b][1] - 1; }
  function months(s) {
    const o = {};
    for (let k = 0; k < s.length; k++) { const m = s[k][0].slice(0, 7); (o[m] = o[m] || { m, first: k, last: k, days: [] }).last = k; o[m].days.push({ f: s[k][0], r: k ? s[k][1] / s[k - 1][1] - 1 : null }); }
    return Object.values(o).map((x) => ({ ...x, r: s[x.last][1] / s[x.first ? x.first - 1 : 0][1] - 1, partial: x.first === 0 }));
  }
  function years(s) {
    const o = {};
    for (let k = 0; k < s.length; k++) { const y = s[k][0].slice(0, 4); (o[y] = o[y] || { y, first: k, last: k }).last = k; }
    return Object.values(o).map((x) => ({ ...x, r: s[x.last][1] / s[x.first ? x.first - 1 : 0][1] - 1, partial: x.first === 0 || x.last === s.length - 1 }));
  }
  function tint(v, t1, t2) { if (v == null || Math.abs(v) < 1e-9) return 't0'; const a = Math.abs(v); const lvl = a <= t1 ? 1 : a <= t2 ? 2 : 3; return (v < 0 ? 'tn' : 'tp') + lvl; }
  function rvShare(d, k) { const t = d.tipos.filter((c) => /variable|alternativos rv/i.test(c.tipo)); return t.reduce((a, c) => a + c.pesos[k], 0); }
  /* v19: un color por tipo de fondo (azul = renta variable, el color principal de la app; verdes = renta fija como en Mi cartera;
     ámbar = corto plazo como «Monetario»; alternativos en naranja/índigo). La misma clase k-mN pinta la sección, la barra y la píldora. */
  const TYPE_COL = { 'RF Corto Plazo': 0, 'Renta Fija Global': 1, 'Renta Fija Alto Rendimiento': 2, 'Renta Fija Emergente': 3, 'Renta Variable': 4, 'Alternativos Renta Fija': 5, 'Alternativos Renta Variable': 6 };
  const TCOL = ['#fbbf24', '#34d399', '#2dd4bf', '#22d3ee', '#3b82f6', '#fb923c', '#818cf8'];
  const tIdx = (t, j) => (TYPE_COL[t] != null ? TYPE_COL[t] : j % TCOL.length);
  const CLASE_TXT = { limpia: 'clase limpia', 'única': 'clase única', 'indicada por Andbank': 'clase indicada por Andbank', 'con retrocesión': 'clase con retrocesión' };

  function modelsHtml(d) {
    if (!d) return `<section class="panel mk-sec" aria-labelledby="h-gp-mod" data-test="gp-models"><div class="panel-pad">${secHead('h-gp-mod', ICO.pie, 'Carteras modelo')}<p class="empty" data-test="gp-models-wait">${ms.err ? esc(ms.err) : 'Cargando carteras modelo…'}</p></div></section>`;
    const cards = d.perfiles.map((p, k) => {
      const tot = p.stats ? p.stats.total : null;
      return `<button type="button" class="mc" data-mc="${k}" aria-pressed="${k === ms.sel}" data-test="mc-card">
        <span class="mc-n">${esc(p.nombre)}</span>
        <span class="mc-bar" aria-hidden="true">${d.tipos.map((c, j) => (c.pesos[k] ? `<i style="width:${c.pesos[k]}%;background:${TCOL[tIdx(c.tipo, j)]}"></i>` : '')).join('')}</span>
        <span class="mc-s">${p.n_fondos} fondos · RV ${F.num(rvShare(d, k), 0)} %</span>
        <span class="mc-r ${cl(tot)}">${tot == null ? 'sin track record' : pctS(tot)}</span>
        <span class="mc-s">${p.inicio ? 'desde ' + F.date(p.inicio) : '—'}</span></button>`;
    }).join('');
    return `<section class="panel mk-sec" aria-labelledby="h-gp-mod" data-test="gp-models"><div class="panel-pad">
      ${secHead('h-gp-mod', ICO.pie, 'Carteras modelo', `${esc(d.fuente)} · composición publicada con datos a ${F.date(d.fecha_datos)} · 6 perfiles de riesgo`)}
      ${d.cambio && d.cambio.detectado ? `<p class="mc-warn" data-test="mc-change">Andbank cambió la composición (detectado el ${F.date(d.cambio.detectado.slice(0, 10))}): se muestra la nueva.</p>` : ''}
      <div class="mc-list" role="group" aria-label="Elige una cartera modelo">${cards}</div>
      <div class="mc-legend" aria-hidden="true">${d.tipos.map((c, j) => `<span><i style="background:${TCOL[tIdx(c.tipo, j)]}"></i>${esc(c.tipo)}</span>`).join('')}</div>
    </div></section><div id="mc-detail"></div>`;
  }
  /* v19: composición en secciones verticales por tipo de fondo (color, peso y rentabilidad del tipo); al tocar una sección se
     despliega la tabla de sus fondos, que es la MISMA tabla de Mi cartera (window.CFTable de app.js) con una cartera nocional. */
  function fundRows(d, p, c, j) {
    const pos = (p.posicion || {}).fondos || {};
    return c.fondos.filter((f) => f.pesos[ms.sel] > 0).map((f) => {
      const x = pos[f.isin] || {};
      return { id: f.isin || f.nombre, nombre: f.nombre, isin: f.isin, plataforma: CLASE_TXT[f.clase] || 'clase no verificada', tipo: c.tipo, tipoCls: 'k-m' + tIdx(c.tipo, j),
        participaciones: x.participaciones ?? null, vl: x.vl ?? null, fecha_vl: x.fecha_vl, valor: x.valor ?? null, diario: x.diario ?? null, plp: x.plp ?? null, pl: x.pl ?? null,
        peso: x.peso ?? null, spark: x.spark, objetivo: f.pesos[ms.sel], invertido: x.invertido, f };
    });
  }
  function compHtml(d, k) {
    const p = d.perfiles[k], T = Object.fromEntries((p.tipos || []).map((t) => [t.tipo, t]));
    const secs = d.tipos.map((c, j) => [c, j]).filter(([c]) => c.pesos[k] > 0).map(([c, j]) => {
      const t = T[c.tipo], open = ms.open.has(c.tipo), n = c.fondos.filter((f) => f.pesos[k] > 0).length, id = 'mcs-' + tIdx(c.tipo, j);
      return `<div class="mc-sec k-m${tIdx(c.tipo, j)}" data-test="mc-tipo" data-tipo="${esc(c.tipo)}">
        <button type="button" class="mc-sh" data-mc-sec="${esc(c.tipo)}" aria-expanded="${open}" aria-controls="${id}">
          <span class="mc-sn"><b>${esc(c.tipo)}</b><small>${n} fondo${n > 1 ? 's' : ''}</small></span>
          <span class="mc-sw" data-test="mc-tipo-peso">${F.num(c.pesos[k], 2)}\u00a0%<small>peso</small></span>
          <span class="mc-sr ${cl(t && t.rent)}" data-test="mc-tipo-rent">${t ? pctS(t.rent) : '—'}<small>${t ? 'desde inicio' : 'sin datos'}</small></span>
          <span class="mc-chev" aria-hidden="true">▾</span></button>
        <div class="mc-sb" id="${id}" ${open ? '' : 'hidden'}>${open ? secTable(d, p, c, j) : ''}</div></div>`;
    }).join('');
    return `<div class="mc-secs" data-test="mc-comp">${secs}</div>`;
  }
  function secTable(d, p, c, j) {
    const rows = window.CFTable.sort(fundRows(d, p, c, j), ms.sort), t = (p.tipos || []).find((x) => x.tipo === c.tipo), sg = window.CFTable.signed;
    const tot = rows.reduce((a, r) => a + (r.valor || 0), 0), pl = rows.reduce((a, r) => a + Math.round((r.pl || 0) * 100), 0) / 100, w = rows.reduce((a, r) => a + (r.peso || 0), 0);
    const noc = (d.comision || {}).nocional_eur || 10000;
    return `<div class="table-scroll" role="region" aria-label="Fondos de ${esc(c.tipo)}, desliza en horizontal" tabindex="0" data-test="mc-ftable">${window.CFTable.html({
      list: rows, sort: ms.sort, fecha: p.fin, btn: 'data-mc-fund', caption: `Fondos de ${c.tipo} en la cartera ${p.nombre} a ${F.date(p.fin)}`,
      labels: { qty: 'Participaciones', qtySub: `cartera nocional de ${F.eur(noc, 0)}`, since: 'Desde inicio', sinceEur: '€ desde inicio' },
      foot: () => (p.posicion ? `<tr class="tf-sub"><th scope="row" class="first">Total ${esc(c.tipo)} <small>valor − aportado</small></th><td></td><td></td><td></td><td>${F.eur(tot)}</td><td>${t ? sg(t.diario, (x) => F.pctSigned(x)) : ''}</td><td data-test="sum-plp">${t ? sg(t.rent, (x) => F.pctSigned(x)) : ''}</td><td class="eurc" data-test="sum-pl-eur">${sg(pl, (x) => F.eurSigned(x))}</td><td>${F.pct(w)}</td><td></td></tr>` : ''),
    })}</div>`;
  }
  function totHtml(d, p) {
    const P = p.posicion; if (!P) return '';
    const sg = window.CFTable.signed, spl = Object.values(P.fondos).reduce((a, f) => a + Math.round(f.pl * 100), 0) / 100, net = P.valor_neto - P.nocional;
    const row = (cls, lab, sub, v, test) => `<tr class="${cls}"><th scope="row" class="first">${lab} <small>${sub}</small></th><td class="eurc" data-test="${test}">${sg(v, (x) => F.eurSigned(x))}</td></tr>`;
    return `<div class="table-scroll mc-totw" data-test="mc-tot"><table class="ftable mc-totals"><caption class="sr-only">Resultado de la cartera nocional</caption><tfoot>
      ${row('tf-sub', 'Total fondos', 'valor − aportado', spl, 'mc-sum-fondos')}
      ${row('tf-cus', 'Comisión Andbank cobrada', `${esc(d.comision.comision_txt)}, cobrada al rebalancear`, -P.comision_cobrada, 'mc-com-cobrada')}
      ${row('tf-cus', 'Comisión Andbank pendiente', 'devengada este mes, aún no cobrada', -P.comision_pendiente, 'mc-com-pend')}
      <tr class="tf-net"><th scope="row" class="first">Resultado neto <small>= gráfico · ${pctS(p.stats.total)}</small></th><td class="eurc" data-test="mc-net">${sg(net, (x) => F.eurSigned(x))}</td></tr></tfoot></table></div>`;
  }
  function detailHtml() {
    const d = ms.d, k = ms.sel, p = d.perfiles[k];
    const head = `<div class="page-h mc-h"><h2 class="label">Cartera modelo · ${esc(p.nombre)}</h2></div>`;
    if (!p.serie) {
      return `<section class="panel mk-sec" data-test="mc-detail"><div class="panel-pad">${head}<p class="empty" data-test="mc-no-track">Sin track record: faltan precios de ${p.sin_datos.map(esc).join(', ') || 'algún fondo'}.</p>${compHtml(d, k)}</div></section>`;
    }
    const st = p.stats, com = d.comision || {};
    const met = (lab, v, sub, c) => `<div class="metric" data-test="mc-metric"><h3>${lab}<small>${sub}</small></h3><p class="v ${c || ''}">${v}</p></div>`;
    const ys = years(p.serie);
    return `<section class="panel" aria-labelledby="h-mc-eq" data-test="mc-detail"><div class="panel-pad">
      <div class="eq-top">
        <div>
          <h2 class="label" id="h-mc-eq">Track record · ${esc(p.nombre)}</h2>
          <p class="big" data-test="mc-total"><span class="${cl(st.total)}">${pctS(st.total)}</span></p>
          <p class="sub" data-test="mc-neto">Neto de la comisión de Andbank (${esc(com.comision_txt || '')}) y de los gastos de los fondos · clases limpias cuando existen</p>
          <div class="chip-row"><span class="chg" id="mc-chg"></span><span class="chip-note" id="mc-chg-note"></span></div>
        </div>
        <div class="ctrls"><div class="toggle" role="group" aria-label="Vista">
          <button type="button" data-mc-view="graph" aria-pressed="${ms.view === 'graph'}">${ICO.line}Gráfico</button>
          <button type="button" data-mc-view="calendar" aria-pressed="${ms.view === 'calendar'}">${ICO.cal}Calendario</button></div></div>
      </div>
      <div class="periods mc-per" role="group" aria-label="Periodo" id="mc-periods"></div>
      <div class="chart-area" id="mc-area"></div>
      <div class="metrics">
        ${met('Total', pctS(st.total), 'inicio', cl(st.total))}
        ${met('Anualizada', st.anualizada == null ? '—' : pctS(st.anualizada), st.anualizada == null ? '< 1 año' : 'TAE', cl(st.anualizada))}
        ${met('Volatilidad', st.volatilidad == null ? '—' : F.pct(st.volatilidad), 'σ anual')}
        ${met('Caída máx.', F.pct(st.max_drawdown), 'drawdown', 'neg')}
      </div>
      <p class="label" style="margin-top:16px">Rentabilidad por año</p>
      <div class="mc-years" data-test="mc-years">${ys.map((y) => `<div class="${tint(y.r, 0.03, 0.08)}"><span class="m">${y.y}${y.partial ? '*' : ''}</span><span class="v">${pctS(y.r)}</span></div>`).join('')}</div>
      <p class="fine">* año incompleto (empieza el ${F.date(p.inicio)} o va hasta el ${F.date(p.fin)}).</p>
      <p class="label" style="margin-top:16px">Composición por tipo de fondo · toca un tipo para ver sus fondos</p>
      ${compHtml(d, k)}
      ${totHtml(d, p)}
      <p class="fine">Tabla igual que la de Mi cartera, sobre una cartera nocional de ${F.eur(com.nocional_eur || 10000, 0)} invertida el ${F.date(p.inicio)} con los pesos objetivo y rebalanceada cada mes. «Participaciones» y «Valor» = posición de hoy en esa cartera; «Desde inicio» (%) = variación del VL del fondo desde el ${F.date(p.inicio)}; «€ desde inicio» = valor − aportado a ese fondo (los rebalanceos mueven dinero entre fondos). Peso % = peso actual (el objetivo se recupera el primer día hábil de cada mes). La rentabilidad de cada tipo no descuenta la comisión de Andbank; el resultado neto y el gráfico sí.</p>
      <p class="fine mc-method" data-test="mc-method">Cómo se calcula: ${esc(d.metodo)}${p.inicio_limitado_por ? ` El inicio (${F.date(p.inicio)}) lo marca «${esc(p.inicio_limitado_por)}», el fondo con el histórico más corto.` : ''} Comisión de Andbank: ${esc(com.comision_txt || '')}. ${esc(com.comision_fuente || '')} Fuente de la composición: <a href="${esc(d.fuente_url)}" target="_blank" rel="noopener">${esc(d.fuente)}</a>. No es asesoramiento financiero.</p>
    </div></section>`;
  }
  function drawPeriods(p) {
    const box = $('#mc-periods'); if (!box) return;
    box.innerHTML = PER.map(([id, lab]) => { const r = perRet(p.serie, id); return `<button type="button" data-mc-period="${id}" aria-pressed="${ms.view === 'graph' && ms.period === id}" ${r == null ? 'disabled' : ''}><span class="pl">${lab}</span><span class="pv ${cl(r)}">${r == null ? '—' : pctS(r)}</span></button>`; }).join('');
  }
  function drawGraph(p, area) {
    const s = p.serie, b = Math.max(0, perBase(s, ms.period)), seg = s.slice(b), base = seg[0][1];
    const dates = seg.map((x) => x[0]), vals = seg.map((x) => x[1] / base - 1), L = vals.length - 1;
    const r = vals[L], lab = PER.find((x) => x[0] === ms.period)[1];
    $('#mc-chg').innerHTML = `<b class="${cl(r)}">${pctS(r)}</b>`; $('#mc-chg-note').textContent = ms.period === 'all' ? 'desde el ' + F.date(dates[0]) : `${lab} · desde el ${F.date(dates[0])}`;
    area.innerHTML = `<div id="mc-chart" data-test="mc-chart"></div><p class="fine">Rentabilidad acumulada de la cartera modelo ${esc(p.nombre)} (simulada con los valores liquidativos de sus fondos). Toca o arrastra el gráfico para ver cada día.</p>`;
    const long = (new Date(dates[L]) - new Date(dates[0])) / 864e5 > 400;
    lineChart($('#mc-chart'), {
      dates, series: [{ label: p.nombre, values: vals, cls: '', gainLoss: true, endDot: true }], areaBase: 0, baseline: {},
      xFmt: (d) => (long ? d.slice(5, 7) + '/' + d.slice(2, 4) : F.dateShort(d)),
      yFmt: (y, step) => (Math.abs(y) < 1e-12 ? '0%' : F.num(y * 100, step * 100 < 1 ? 1 : 0) + '%'),
      tipHtml: (i) => `<strong>${F.date(dates[i])}</strong><span>Acumulado: <b class="${cl(vals[i])}">${pctS(vals[i])}</b></span>${i ? `<span>Día: <b class="${cl(seg[i][1] / seg[i - 1][1] - 1)}">${pctS(seg[i][1] / seg[i - 1][1] - 1)}</b></span>` : ''}`,
      tipText: (i) => `${F.date(dates[i])}. Acumulado ${pctS(vals[i])}.`,
      ariaLabel: `Rentabilidad acumulada de ${p.nombre} del ${F.date(dates[0])} al ${F.date(dates[L])}: ${pctS(r)}. Mínimo ${pctS(Math.min(...vals))}, máximo ${pctS(Math.max(...vals))}.`,
    });
    const svg = $('#mc-chart svg.chart'); if (svg) { svg.dataset.from = dates[0]; svg.dataset.to = dates[L]; }
  }
  function drawCal(p, area) {
    const ms_ = months(p.serie);
    if (!ms.month || !ms_.find((m) => m.m === ms.month)) ms.month = ms_[ms_.length - 1].m;
    const cur = ms_.find((m) => m.m === ms.month), [y, mo] = cur.m.split('-').map(Number);
    $('#mc-chg').innerHTML = `<b class="${cl(cur.r)}">${pctS(cur.r)}</b>`; $('#mc-chg-note').textContent = `${MESES[mo - 1]} ${y}`;
    const wd1 = new Date(Date.UTC(y, mo - 1, 1)).getUTCDay(), lead = wd1 >= 1 && wd1 <= 5 ? wd1 - 1 : 0, cells = []; // solo días laborables: si el mes empieza en fin de semana, el lunes siguiente va en la primera columna
    for (let i = 0; i < lead; i++) cells.push('<div class="d empty" aria-hidden="true"></div>');
    const byF = Object.fromEntries(cur.days.map((x) => [x.f, x.r]));
    const nd = new Date(Date.UTC(y, mo, 0)).getUTCDate();
    for (let dd = 1; dd <= nd; dd++) {
      const f = `${cur.m}-${String(dd).padStart(2, '0')}`, wd = new Date(f + 'T12:00:00Z').getUTCDay(); if (wd === 0 || wd === 6) continue;
      const r = byF[f];
      cells.push(r === undefined ? `<div class="d empty" role="listitem" aria-label="${dd}: sin dato"><span class="n">${dd}</span></div>`
        : `<div class="d ${tint(r, 0.0025, 0.0075)}" role="listitem" aria-label="${dd} de ${MESES[mo - 1]}: ${r == null ? 'inicio' : pctS(r)}"><span class="n">${dd}</span><span class="v">${r == null ? 'inicio' : pctS(r).replace('\u00a0%', '%')}</span></div>`);
    }
    area.innerHTML = `<p class="label" style="margin:0">Rentabilidad mensual · elige un mes</p>
      <div class="cal-months" role="group" aria-label="Meses" data-test="mc-months">${ms_.map((m) => { const [yy, mm] = m.m.split('-').map(Number); return `<button type="button" class="${tint(m.r, 0.01, 0.025)}" data-mc-month="${m.m}" aria-pressed="${m.m === ms.month}" aria-label="${MESES[mm - 1]} ${yy}: ${pctS(m.r)}"><span class="m">${MESES[mm - 1].slice(0, 3)} ${String(yy).slice(2)}</span><span class="v">${pctS(m.r).replace('\u00a0%', '%')}</span></button>`; }).join('')}</div>
      <p class="label" style="margin-top:8px">${MESES[mo - 1]} ${y} · día a día (%)</p>
      <div class="cal-head" aria-hidden="true"><span>LUN</span><span>MAR</span><span>MIÉ</span><span>JUE</span><span>VIE</span></div>
      <div class="cal-grid" role="list" data-test="mc-days" aria-label="Rentabilidad diaria de ${MESES[mo - 1]} ${y}">${cells.join('')}</div>`;
    const sc = area.querySelector('.cal-months'), act = sc.querySelector('[aria-pressed="true"]'); if (act) sc.scrollLeft = act.offsetLeft - sc.clientWidth / 2;
  }
  function redrawComp() { const box = $('[data-test=mc-comp]'); if (!box) return; const tmp = document.createElement('div'); tmp.innerHTML = compHtml(ms.d, ms.sel); box.replaceWith(tmp.firstElementChild); }
  function openFund(id) {
    const d = ms.d, p = d.perfiles[ms.sel]; let f = null, tipo = '';
    d.tipos.forEach((c) => c.fondos.forEach((x) => { if ((x.isin || x.nombre) === id) { f = x; tipo = c.tipo; } }));
    if (!f) return; const x = ((p.posicion || {}).fondos || {})[f.isin] || {};
    const dl = [['Tipo', tipo], ['ISIN', f.isin ? f.isin + ' (no lo publica Andbank; resuelto por el nombre de la clase)' : 'no disponible'], ['Clase', (CLASE_TXT[f.clase] || 'no verificada') + (f.clase_nota ? ' — ' + f.clase_nota : '')],
      ['Peso objetivo', F.num(f.pesos[ms.sel], 2) + ' %'], ['Peso actual', x.peso != null ? F.pct(x.peso) : '—'],
      ['VL al inicio', x.vl_inicio != null ? F.num(x.vl_inicio, 2) + ' € (' + F.date(p.inicio) + ')' : '—'], ['VL actual', x.vl != null ? F.num(x.vl, 2) + ' € (' + F.date(x.fecha_vl) + ')' : '—'], ['Fuente del ISIN', f.isin_fuente || '—']];
    $('#sheet-body').innerHTML = `<div class="sheet-top"><p class="dtag">${esc(tipo)} · ${esc(p.nombre)}</p><button type="submit" class="icon-btn" value="close" aria-label="Cerrar detalle">✕</button></div><h2 id="sheet-title">${esc(f.nombre)}</h2>
      <div class="sheet-nums"><div><span>Valor (nocional)</span><b>${x.valor != null ? F.eur(x.valor) : '—'}</b></div><div><span>Peso</span><b>${x.peso != null ? F.pct(x.peso) : '—'}</b></div><div><span>Desde inicio</span><b class="nw">${x.pl != null ? window.CFTable.signed(x.pl, F.eurSigned) : '—'}</b><b class="nw">${x.plp != null ? window.CFTable.signed(x.plp, F.pctSigned) : '—'}</b></div></div>
      <dl class="dl">${dl.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>`;
    const dlg = $('#sheet'); dlg.showModal ? dlg.showModal() : dlg.setAttribute('open', ''); dlg.scrollTop = 0;
  }
  function drawDetail() {
    const box = $('#mc-detail'); if (!box || !ms.d) return;
    const p = ms.d.perfiles[ms.sel];
    if (box.dataset.sel !== String(ms.sel)) { box.innerHTML = detailHtml(); box.dataset.sel = String(ms.sel); }
    if (!p.serie) return;
    drawPeriods(p);
    document.querySelectorAll('[data-mc-view]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mcView === ms.view)));
    const area = $('#mc-area'); ms.view === 'graph' ? drawGraph(p, area) : drawCal(p, area);
  }

  /* ================= Montaje ================= */
  function html(models) {
    ms.d = models || null;
    return `<div class="page-h"><h1>Gestión personal</h1><p>Calculadora de interés compuesto y carteras modelo con su histórico</p></div>`
      + calcHtml() + modelsHtml(ms.d);
  }
  function setModels(d, err) {
    ms.d = d; ms.err = err;
    const sec = $('[data-test="gp-models"]'); if (!sec) return;
    const tmp = document.createElement('div'); tmp.innerHTML = modelsHtml(d);
    const det = $('#mc-detail'); if (det) det.remove();
    sec.replaceWith(...tmp.childNodes); drawDetail();
  }
  function draw() { drawCalc(); drawDetail(); }
  function bind(root) {
    let t0;
    root.addEventListener('input', (ev) => { if (ev.target.dataset.cc) { clearTimeout(t0); t0 = setTimeout(drawCalc, 120); } });
    root.addEventListener('change', (ev) => { if (ev.target.dataset.cc) drawCalc(); });
    root.addEventListener('click', (ev) => {
      const t = ev.target.closest('button'); if (!t) return;
      const refocus = (sel) => { const b = $(sel); b && b.focus(); };
      if (t.dataset.ccFreq) { cs.freq = t.dataset.ccFreq; root.querySelectorAll('[data-cc-freq]').forEach((b) => b.setAttribute('aria-pressed', String(b === t))); drawCalc(); }
      else if (t.dataset.mcSec) { const k = t.dataset.mcSec; ms.open.has(k) ? ms.open.delete(k) : ms.open.add(k); redrawComp(); refocus(`[data-mc-sec="${CSS.escape(k)}"]`); }
      else if (t.dataset.sort && t.closest('[data-test=mc-comp]')) { ms.sort = t.dataset.sort; const k = t.closest('[data-tipo]').dataset.tipo; redrawComp(); refocus(`[data-tipo="${CSS.escape(k)}"] [data-sort="${ms.sort}"]`); }
      else if (t.dataset.mcFund) openFund(t.dataset.mcFund);
      else if (t.dataset.mc != null) { ms.sel = +t.dataset.mc; ms.month = null; ms.open = new Set(); root.querySelectorAll('[data-mc]').forEach((b) => b.setAttribute('aria-pressed', String(b === t))); drawDetail(); }
      else if (t.dataset.mcView) { ms.view = t.dataset.mcView; drawDetail(); refocus(`[data-mc-view="${ms.view}"]`); }
      else if (t.dataset.mcPeriod) { ms.period = t.dataset.mcPeriod; ms.view = 'graph'; drawDetail(); refocus(`[data-mc-period="${ms.period}"]`); }
      else if (t.dataset.mcMonth) { ms.month = t.dataset.mcMonth; drawDetail(); refocus(`[data-mc-month="${ms.month}"]`); }
    });
  }
  window.CFGestion = { html, draw, bind, setModels, calc, SHORT };
})();
