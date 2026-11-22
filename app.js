/* Cartera Family: descifra data/portfolio.enc.json (generado por build_data.py + encrypt_data.py) y pinta la app. */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const state = { mode: 'capital', range: 'all', sort: 'peso', view: 'cards', data: null };
  const CLASES = { rv: 'Renta variable', rf: 'Renta fija y retorno abs.', liq: 'Monetario y liquidez' };

  function arrow(x) { return x > 0 ? '▲' : x < 0 ? '▼' : '■'; }
  function signed(x, fmt) { return `<span class="${F.sign(x)}"><span aria-hidden="true">${arrow(x)} </span>${fmt(x)}</span>`; }
  function infoBtn(key, label) { return `<button class="info-btn" data-info="${key}" aria-label="Qué es ${esc(label)}">i</button>`; }

  /* ---------- Cabecera ---------- */
  function hero(d) {
    const r = d.resumen;
    return `<section class="card hero" aria-labelledby="h-capital">
      <h1 id="h-capital" class="eyebrow">Capital de la cartera</h1>
      <p class="big" data-test="valor">${F.eur(r.valor)}</p>
      <p class="sub">Último día (${F.date(d.fecha_datos)}): ${signed(r.pl_dia, F.eurSigned)} <span class="muted">(${F.pctSigned(r.twr_dia)})</span></p>
      <dl class="kpis">
        <div><dt>Invertido</dt><dd data-test="invertido">${F.eur(r.invertido)}</dd></div>
        <div><dt>Resultado neto ${infoBtn('neto', 'el resultado neto')}</dt><dd data-test="pl">${signed(r.pl, F.eurSigned)}</dd></div>
        <div><dt>Rentab. neta s/ invertido ${infoBtn('neto', 'la rentabilidad neta')}</dt><dd data-test="plp">${signed(r.plp, F.pctSigned)}</dd></div>
        <div><dt>Rentab. TWR desde inicio ${infoBtn('twr', 'la rentabilidad TWR')}</dt><dd data-test="twr">${signed(r.twr, F.pctSigned)}</dd></div>
      </dl>
      <p class="fine">Desde el ${F.dateLong(d.inicio)}. Resultado neto de comisiones: incluye ${F.eur(r.custodia_acum)} de custodia de Fidelity acumulada.</p>
    </section>`;
  }

  /* ---------- Gráfico ---------- */
  function chartCard() {
    return `<section class="card" aria-labelledby="h-evol">
      <div class="card-head"><h2 id="h-evol">Evolución</h2>
        <div class="seg" role="group" aria-label="Qué mostrar">
          <button data-mode="capital" aria-pressed="true">Capital</button>
          <button data-mode="twr" aria-pressed="false">Rentabilidad</button>
        </div></div>
      <div id="legend" class="legend"></div>
      <div id="chart" class="chart-host"></div>
      <div class="seg seg-range" role="group" aria-label="Periodo">
        <button data-range="1m" aria-pressed="false">1M</button>
        <button data-range="3m" aria-pressed="false">3M</button>
        <button data-range="all" aria-pressed="true">Todo</button>
      </div>
      <p class="fine" id="chart-note"></p>
    </section>`;
  }
  function drawChart() {
    const d = state.data; let s = d.serie;
    if (state.range !== 'all') {
      const last = new Date(s[s.length - 1].f); const from = new Date(last); from.setMonth(from.getMonth() - (state.range === '1m' ? 1 : 3));
      const iso = from.toISOString().slice(0, 10); const k = s.findIndex((p) => p.f >= iso); s = s.slice(Math.max(0, k - 1));
    }
    const dates = s.map((p) => p.f);
    let series, yFmt, tipFmt, label, note;
    if (state.mode === 'capital') {
      series = [
        { key: 'v', label: 'Valor', values: s.map((p) => p.v), cls: 's1', area: true },
        { key: 'i', label: 'Invertido', values: s.map((p) => p.i), cls: 's2', dashed: true },
      ];
      yFmt = (v) => F.num(v / 1000, 0) + ' k'; tipFmt = (v) => F.eur(v, 0);
      const a = s[0], b = s[s.length - 1];
      label = `Gráfico de capital del ${F.date(a.f)} al ${F.date(b.f)}. Valor de ${F.eur(a.v, 0)} a ${F.eur(b.v, 0)}; invertido de ${F.eur(a.i, 0)} a ${F.eur(b.i, 0)}.`;
      const ap = d.serie.filter((p, k) => k > 0 && p.i !== d.serie[k - 1].i).map((p) => F.dateShort(p.f));
      note = (ap.length ? 'Los saltos de la línea discontinua son las aportaciones (' + ap.join(', ') + '). ' : '') + 'Toca o arrastra sobre el gráfico para ver cada día.';
    } else {
      const t0 = s[0].t, b0 = s[0].b;
      series = [
        { key: 't', label: 'Cartera (TWR)', values: s.map((p) => p.t / t0 - 1), cls: 's1', area: false },
        { key: 'b', label: 'Benchmark', values: s.map((p) => p.b / b0 - 1), cls: 's3', dashed: true },
      ];
      yFmt = (v) => F.num(v * 100, 1) + '%'; tipFmt = (v) => F.pctSigned(v);
      const lt = series[0].values[series[0].values.length - 1], lb = series[1].values[series[1].values.length - 1];
      label = `Gráfico de rentabilidad ponderada por tiempo del ${F.date(s[0].f)} al ${F.date(s[s.length - 1].f)}: cartera ${F.pctSigned(lt)}, benchmark ${F.pctSigned(lb)}.`;
      note = 'Rentabilidad ponderada por tiempo (no le afectan las aportaciones), desde el inicio del periodo elegido. Benchmark: ' + d.benchmark.descripcion;
    }
    $('#legend').innerHTML = series.map((x) => `<span><i class="sw ${x.cls}${x.dashed ? ' dashed' : ''}" aria-hidden="true"></i>${x.label}</span>`).join('');
    $('#chart-note').textContent = note;
    lineChart($('#chart'), { dates, series, yFmt, tipFmt, ariaLabel: label });
  }

  /* ---------- Reparto ---------- */
  function allocation(d) {
    const tot = {}; d.posiciones.forEach((p) => { tot[p.clase] = (tot[p.clase] || 0) + p.valor; });
    const order = ['rv', 'rf', 'liq'];
    const sum = order.reduce((a, k) => a + (tot[k] || 0), 0);
    const parts = order.map((k) => ({ k, v: tot[k] || 0, w: (tot[k] || 0) / sum }));
    return `<section class="card" aria-labelledby="h-rep"><h2 id="h-rep">Reparto por tipo de activo</h2>
      <div class="stack" role="img" aria-label="${parts.map((p) => CLASES[p.k] + ' ' + F.pct(p.w, 1)).join(', ')}">
        ${parts.map((p) => `<span class="c-${p.k}" style="width:${(p.w * 100).toFixed(2)}%"></span>`).join('')}</div>
      <ul class="stack-legend">${parts.map((p) => `<li><i class="sw c-${p.k}" aria-hidden="true"></i><span>${CLASES[p.k]}</span><b>${F.pct(p.w, 1)}</b><span class="muted">${F.eur(p.v, 0)}</span></li>`).join('')}</ul>
    </section>`;
  }

  /* ---------- Ratios ---------- */
  function ratios(d) {
    const r = d.ratios;
    const cards = [
      { k: 'vol', t: 'Volatilidad anualizada', v: F.pct(r.volatilidad), s: 'Riesgo: cuánto oscila el valor' },
      { k: 'sharpe', t: 'Ratio de Sharpe', v: F.num(r.sharpe, 2), s: `Frente al €STR (media ${F.num(d.libre_riesgo.medio_pct, 2)} %)` },
      { k: 'alfa', t: 'Alfa anual', v: F.pctSigned(r.alfa_anual), s: 'Frente al benchmark equivalente' },
      { k: 'beta', t: 'Beta', v: F.num(r.beta, 2), s: `Frente al benchmark (R² ${F.num(r.r2, 2)})` },
      { k: 'dd', t: 'Máximo drawdown', v: F.pct(r.max_drawdown), s: `Del ${F.date(r.max_dd_pico)} al ${F.date(r.max_dd_valle)}` },
    ];
    return `<section class="card" aria-labelledby="h-rat"><div class="card-head"><h2 id="h-rat">Ratios de la cartera</h2></div>
      <p class="fine">Calculados con ${r.n_rentabilidades} rentabilidades diarias (${F.date(d.inicio)} – ${F.date(d.fecha_datos)}). Con menos de un año de historia son orientativos.</p>
      <div class="ratios">${cards.map((c) => `<article class="ratio" data-test="ratio-${c.k}">
        <div class="ratio-top"><h3>${c.t}</h3>${infoBtn(c.k, c.t)}</div>
        <p class="ratio-v">${c.v}</p><p class="ratio-s">${esc(c.s)}</p></article>`).join('')}</div>
    </section>`;
  }
  function infoText(key) {
    const d = state.data, r = d.ratios, lr = d.libre_riesgo, b = d.benchmark;
    const comp = b.componentes.map((c) => `<li><b>${esc(c.clase)}</b>: ${esc(c.nombre)} (${esc(c.ticker)})</li>`).join('');
    const T = {
      neto: ['Resultado neto', `<p>Es el dinero ganado o perdido sobre lo que habéis aportado: <b>valor actual − custodia acumulada − invertido</b>.</p><p>El valor de cada fondo ya descuenta sus gastos (TER), y además se resta la custodia de Renta 4 para el fondo de Fidelity (${F.eur(d.resumen.custodia_acum)} hasta ahora).</p><p>El porcentaje se calcula sobre el total invertido (${F.eur(d.resumen.invertido)}).</p>`],
      twr: ['Rentabilidad TWR', `<p>La rentabilidad <b>ponderada por tiempo</b> mide cómo lo han hecho las inversiones sin que influya cuándo entró el dinero.</p><p>Aquí es ${F.pctSigned(d.resumen.twr)}, frente al ${F.pctSigned(d.resumen.plp)} de la rentabilidad neta. Difieren porque la TWR da el mismo peso a cada periodo aunque al principio hubiera menos dinero invertido (las aportaciones llegaron en varias fechas). Anualizada: ${F.pctSigned(d.resumen.twr_anual)}.</p><p>Es la base de todos los ratios.</p>`],
      vol: ['Volatilidad anualizada', `<p>Indica cuánto sube y baja el valor de un día para otro, llevado a un año. Cuanto más alta, más «sustos».</p><p>${F.pct(r.volatilidad)} es baja: más de la mitad de la cartera está en monetario y renta fija. Como referencia, la bolsa mundial suele moverse entre el 12 % y el 20 %.</p><p class="fine">Cálculo: desviación típica de las rentabilidades diarias TWR × √252. Coincide con el dato de Cartera Family (${F.num(r.volatilidad_fuente_pct, 2)} %).</p>`],
      sharpe: ['Ratio de Sharpe', `<p>Mide cuánto se gana <b>por encima de un activo sin riesgo</b> por cada unidad de riesgo asumido. Por encima de 1 es bueno; negativo significa que en este periodo habría rendido más dejar el dinero al tipo sin riesgo.</p><p>Tipo sin riesgo: <b>${esc(lr.nombre)}</b>, media ${F.num(lr.medio_pct, 3)} % (entre ${F.num(lr.min_pct, 3)} % y ${F.num(lr.max_pct, 3)} %) del ${F.date(lr.desde)} al ${F.date(lr.hasta)}. En el periodo habría rendido ${F.pctSigned(r.rf_total)}.</p><p class="fine">Cálculo: media diaria de (rentabilidad − €STR) × 252 / volatilidad anualizada. Fuente: <a href="${esc(lr.web)}" target="_blank" rel="noopener">BCE, serie ${esc(lr.serie)}</a>.</p>`],
      alfa: ['Alfa anual', `<p>Lo que la cartera ha ganado (o perdido) <b>de más respecto a lo que cabía esperar</b> por el mercado, ya descontado su nivel de riesgo (beta). Positivo = los fondos elegidos lo han hecho mejor que el índice equivalente.</p><p>${F.pctSigned(r.alfa_anual)} anualizado: en estos meses la selección de fondos ha ido por detrás del benchmark (que hizo ${F.pctSigned(r.benchmark_total)} frente al ${F.pctSigned(d.resumen.twr)} de la cartera).</p><p><b>Benchmark</b>: ${esc(b.descripcion)}</p><ul>${comp}</ul><p class="fine">Pesos hoy: ${esc(b.pesos_hoy_txt)}. Precios: ${esc(b.fuente_precios)}. Cálculo: regresión de los excesos diarios sobre el €STR; alfa diaria × 252. Con ~6 meses de datos el alfa es muy sensible y orientativa.</p>`],
      beta: ['Beta', `<p>Cuánto se mueve la cartera cuando se mueve el mercado de referencia: 1 = igual; 0,5 = la mitad.</p><p>Beta ${F.num(r.beta, 2)} frente al benchmark equivalente y ${F.num(r.beta_msci_acwi, 2)} frente a la bolsa mundial (MSCI ACWI) sola.</p><p>El R² es ${F.num(r.r2, 2)}: solo una parte pequeña de los movimientos diarios se explica por el benchmark. Es normal con fondos de gestión activa y de estilo «value» y con valores liquidativos que no cierran a la misma hora que la bolsa alemana.</p><p class="fine">Benchmark: ${esc(b.pesos_hoy_txt)}. Regresión diaria; orientativa por el historial corto.</p>`],
      dd: ['Máximo drawdown', `<p>La <b>mayor caída</b> desde un máximo hasta el punto más bajo posterior. Responde a «¿cuánto he llegado a perder desde lo más alto?».</p><p>${F.pct(r.max_drawdown)}: del máximo del ${F.dateLong(r.max_dd_pico)} al ${F.dateLong(r.max_dd_valle)}${r.max_dd_valle === d.fecha_datos ? ', que es el último dato: la caída sigue abierta' : ''}.</p><p class="fine">Calculado sobre el índice TWR, así que las aportaciones no lo distorsionan. Coincide con Cartera Family (${F.num(r.max_dd_fuente_pct, 2)} %).</p>`],
    };
    return T[key];
  }

  /* ---------- Posiciones ---------- */
  function sorted(d) {
    const k = { peso: 'valor', valor: 'valor', pl: 'pl', plp: 'plp' }[state.sort];
    return d.posiciones.slice().sort((a, b) => b[k] - a[k]);
  }
  function marks(p) { return (p.estimado ? '<sup class="mark" title="Participaciones estimadas">†</sup>' : '') + (p.fecha_aprox ? '<sup class="mark" title="Fecha de compra aproximada">‡</sup>' : ''); }
  function label(k) { const s = k.replace(/_/g, ' '); return s.charAt(0).toUpperCase() + s.slice(1); }
  function positionsCard(d) {
    return `<section class="card" id="posiciones" aria-labelledby="h-pos" tabindex="-1">
      <div class="card-head"><h2 id="h-pos">Posiciones activas</h2>
        <div class="seg" role="group" aria-label="Vista"><button data-view="cards" aria-pressed="true">Tarjetas</button><button data-view="table" aria-pressed="false">Tabla</button></div></div>
      <div class="sortbar" role="group" aria-label="Ordenar por"><span class="muted" aria-hidden="true">Ordenar:</span>
        <button data-sort="peso" aria-pressed="true">Peso</button><button data-sort="pl" aria-pressed="false">Resultado €</button><button data-sort="plp" aria-pressed="false">Resultado %</button></div>
      <div id="pos-body"></div>
      <p class="fine"><sup>†</sup> Participaciones estimadas (aportado / VL de compra). <sup>‡</sup> Fecha de compra aproximada, deducida por VL. El resultado de cada fondo es valor − invertido (bruto de la custodia externa).</p>
    </section>`;
  }
  function drawPositions() {
    const d = state.data, list = sorted(d), host = $('#pos-body');
    if (state.view === 'cards') {
      host.innerHTML = `<ul class="pos-list">${list.map((p) => {
        const extra = [];
        if (p.isin) extra.push(['ISIN', p.isin + (p.codigo_dgs && p.codigo_dgs === p.isin ? ' (código DGS)' : '')]);
        if (p.participaciones != null) extra.push(['Participaciones', F.num(p.participaciones, 4) + (p.estimado ? ' †' : '')]);
        if (p.vl != null) extra.push(['VL actual', F.eur(p.vl, 4) + ' · ' + F.date(p.fecha_vl)]);
        if (p.vl_compra != null) extra.push(['VL de compra', F.eur(p.vl_compra, 4)]);
        extra.push(['Invertido', F.eur(p.invertido)]);
        if (p.fecha_compra) extra.push(['Fecha de compra', F.date(p.fecha_compra) + (p.fecha_aprox ? ' ‡' : '') + (p.confianza ? ` (confianza ${p.confianza})` : '')]);
        if (p.fecha_compra_nota) extra.push(['Nota de compra', p.fecha_compra_nota]);
        if (p.ter != null) extra.push(['TER (gastos corrientes)', F.num(p.ter, 2) + ' %' + (p.ter_nota ? ' — ' + p.ter_nota : '')]);
        if (p.custodia_externa != null) extra.push(['Custodia externa', F.num(p.custodia_externa, 2) + ' % anual']);
        Object.entries(p.comisiones || {}).forEach(([k, v]) => { if (k !== 'fuente') extra.push(['Comisión: ' + label(k), v]); });
        if (p.comisiones && p.comisiones.fuente) extra.push(['Fuente comisiones', p.comisiones.fuente]);
        if (p.nota) extra.push(['Nota', p.nota]);
        p.avisos.forEach((a) => extra.push(['Aviso', a]));
        return `<li class="poscard" data-test="pos-${esc(p.id)}">
          <div class="pos-head"><h3>${esc(p.nombre)}${marks(p)}</h3><span class="tag c-${p.clase}-soft">${esc(p.tipo)}</span></div>
          <p class="pos-meta">${p.isin ? esc(p.isin) + ' · ' : ''}${esc(p.plataforma)}</p>
          <div class="pos-nums">
            <div><span class="lbl">Valor</span><b>${F.eur(p.valor)}</b></div>
            <div><span class="lbl">Peso</span><b data-test="peso">${F.pct(p.peso)}</b></div>
            <div><span class="lbl">Resultado</span><b>${signed(p.pl, F.eurSigned)}</b><span class="small">${signed(p.plp, F.pctSigned)}</span></div>
          </div>
          <div class="bar" role="presentation"><span class="c-${p.clase}" style="width:${Math.max(0.6, p.peso * 100).toFixed(2)}%"></span></div>
          <details><summary>Más datos</summary><dl class="dl">${extra.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
          ${p.fuente_vl ? `<p class="fine">Fuente del VL: <a href="${esc(p.fuente_vl)}" target="_blank" rel="noopener">${esc(new URL(p.fuente_vl).hostname)}</a></p>` : ''}</details>
        </li>`;
      }).join('')}</ul>`;
    } else {
      const sortAttr = (k) => (state.sort === k ? 'aria-sort="descending"' : '');
      const th = (k, t) => `<th scope="col" ${sortAttr(k)}><button data-sort="${k}">${t}${state.sort === k ? ' <span aria-hidden="true">▼</span>' : ''}</button></th>`;
      host.innerHTML = `<div class="table-scroll" role="region" aria-label="Tabla de posiciones, desliza en horizontal" tabindex="0"><table class="pos-table">
        <caption class="sr-only">Posiciones activas a ${F.date(d.fecha_datos)}, ordenadas por ${state.sort}</caption>
        <thead><tr><th scope="col" class="sticky">Fondo</th><th scope="col">ISIN</th><th scope="col">Plataforma</th><th scope="col">Tipo</th><th scope="col" class="r">Particip.</th><th scope="col" class="r">VL actual</th><th scope="col">Fecha VL</th>
        ${th('valor', 'Valor')}${th('peso', 'Peso')}<th scope="col" class="r">Invertido</th>${th('pl', 'Resultado €')}${th('plp', 'Resultado %')}<th scope="col" class="r">VL compra</th><th scope="col">Fecha compra</th><th scope="col" class="r">TER</th><th scope="col" class="r">Custodia ext.</th></tr></thead>
        <tbody>${list.map((p) => `<tr><th scope="row" class="sticky">${esc(p.nombre)}${marks(p)}</th><td>${esc(p.isin || '—')}</td><td>${esc(p.plataforma)}</td><td>${esc(p.tipo)}</td>
          <td class="r">${p.participaciones == null ? '—' : F.num(p.participaciones, 4)}${p.estimado ? ' †' : ''}</td><td class="r">${p.vl == null ? '—' : F.num(p.vl, 4)}</td><td>${F.date(p.fecha_vl)}</td>
          <td class="r">${F.eur(p.valor)}</td><td class="r">${F.pct(p.peso)}</td><td class="r">${F.eur(p.invertido)}</td><td class="r">${signed(p.pl, F.eurSigned)}</td><td class="r">${signed(p.plp, F.pctSigned)}</td>
          <td class="r">${p.vl_compra == null ? '—' : F.num(p.vl_compra, 4)}</td><td>${p.fecha_compra ? F.date(p.fecha_compra) + (p.fecha_aprox ? ' ‡' : '') : '—'}</td><td class="r">${p.ter == null ? '—' : F.num(p.ter, 2) + ' %'}</td><td class="r">${p.custodia_externa == null ? '—' : F.num(p.custodia_externa, 2) + ' %'}</td></tr>`).join('')}</tbody>
        <tfoot><tr><th scope="row" class="sticky">Total</th><td colspan="6"></td><td class="r">${F.eur(list.reduce((a, p) => a + p.valor, 0))}</td><td class="r">100,00 %</td><td class="r">${F.eur(list.reduce((a, p) => a + p.invertido, 0))}</td><td colspan="6"></td></tr></tfoot>
      </table></div>`;
    }
    document.querySelectorAll('[data-sort]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.sort === state.sort)));
  }

  /* ---------- Pie ---------- */
  function footer(d) {
    const b = d.benchmark, lr = d.libre_riesgo;
    return `<footer class="card foot" aria-labelledby="h-foot"><h2 id="h-foot">Datos y avisos</h2>
      <p>Datos a <b>${F.dateLong(d.fecha_datos)}</b>. ${esc(d.fecha_datos_nota || '')} Generado el ${esc(d.generado.replace('T', ' '))} (hora de Madrid).</p>
      <ul>${d.avisos.map((a) => `<li>${esc(a)}</li>`).join('')}</ul>
      <h3>Fuentes</h3>
      <ul><li>Posiciones, histórico y comisiones: bot Cartera Family (VL de FT Markets, quefondos y las gestoras).</li>
      <li>Tipo sin riesgo: <a href="${esc(lr.web)}" target="_blank" rel="noopener">€STR, Banco Central Europeo</a>.</li>
      ${b.componentes.filter((c) => c.ticker !== '€STR').map((c) => `<li>Benchmark ${esc(c.clase.toLowerCase())}: ${esc(c.nombre)} — ${esc(b.fuente_precios)}.</li>`).join('')}</ul>
      <p class="fine">${esc(d.ratios.metodo)}</p>
      <p class="fine">Uso personal e informativo; no es asesoramiento financiero.</p>
      <button class="btn btn-ghost" data-lock="1">Bloquear y olvidar la contraseña en este iPhone</button>
    </footer>`;
  }

  /* ---------- Montaje ---------- */
  function render(d) {
    state.data = d;
    $('#fecha-chip').textContent = 'Datos a ' + F.date(d.fecha_datos);
    $('#lock-btn').hidden = false;
    const app = $('#app');
    app.innerHTML = hero(d) + chartCard() + ratios(d) + allocation(d) + positionsCard(d) + footer(d);
    app.setAttribute('aria-busy', 'false');
    drawChart(); drawPositions();
    app.addEventListener('click', (ev) => {
      const t = ev.target.closest('button'); if (!t) return;
      if (t.dataset.mode) { state.mode = t.dataset.mode; t.parentNode.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b === t))); drawChart(); }
      else if (t.dataset.range) { state.range = t.dataset.range; t.parentNode.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b === t))); drawChart(); }
      else if (t.dataset.view) { state.view = t.dataset.view; t.parentNode.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b === t))); drawPositions(); }
      else if (t.dataset.lock) lock();
      else if (t.dataset.sort) { state.sort = t.dataset.sort; drawPositions(); }
      else if (t.dataset.info) { const [title, body] = infoText(t.dataset.info); $('#info-title').textContent = title; $('#info-body').innerHTML = body; const dlg = $('#info'); if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', ''); }
    });
    let rz; window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(drawChart, 150); });
  }
  $('#info').addEventListener('click', (ev) => { if (ev.target.id === 'info') ev.target.close(); });

  /* ---------- Desbloqueo ---------- */
  function lock() { CFCrypto.forget(); location.reload(); }
  function unlockScreen(env, msg) {
    $('#fecha-chip').textContent = 'Datos cifrados';
    const app = $('#app'); app.setAttribute('aria-busy', 'false');
    app.innerHTML = `<section class="card unlock" aria-labelledby="h-unlock">
      <div class="lock-ico" aria-hidden="true"><svg viewBox="0 0 24 24" width="30" height="30"><rect x="4.5" y="10.5" width="15" height="10" rx="2.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" fill="none" stroke="currentColor" stroke-width="2"/></svg></div>
      <h1 id="h-unlock">Cartera protegida</h1>
      <p class="muted">Los datos de la cartera están cifrados. Introduce la contraseña para verlos.</p>
      <form id="unlock-form" novalidate>
        <label for="pw" class="field-label">Contraseña</label>
        <div class="pw-row">
          <input id="pw" name="password" type="password" autocomplete="current-password" autocapitalize="off" autocorrect="off" spellcheck="false" required aria-describedby="pw-err" ${msg ? 'aria-invalid="true"' : ''}>
          <button type="button" id="pw-toggle" class="pw-toggle" aria-pressed="false" aria-label="Mostrar contraseña">Ver</button>
        </div>
        <p id="pw-err" class="err" role="alert">${msg ? esc(msg) : ''}</p>
        <label class="check"><input type="checkbox" id="remember" checked><span>Recordar en este iPhone</span></label>
        <button class="btn" id="unlock-btn" type="submit">Desbloquear</button>
      </form>
      <p class="fine">El descifrado se hace solo en este dispositivo. Si marcas «Recordar», la clave se guarda en este iPhone hasta que pulses «Bloquear».</p>
    </section>`;
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
        if ($('#remember').checked) { try { await CFCrypto.remember(key, env); } catch (e) { /* sin almacenamiento: seguimos */ } }
        pw.value = '';
        render(data);
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
      try { render(await CFCrypto.decrypt(key, env)); return; } catch (e) { CFCrypto.forget(); }
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
