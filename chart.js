/* Gráfico de líneas en SVG hecho a mano: accesible (role=img + resumen), táctil (arrastrar) y con teclado (flechas). */
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function niceTicks(min, max, n) {
    const span = max - min || Math.abs(max) || 1;
    const step0 = span / n; const mag = Math.pow(10, Math.floor(Math.log10(step0)));
    const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= n) || 10 * mag;
    const lo = Math.floor(min / step) * step; const hi = Math.ceil(max / step) * step;
    const out = []; for (let v = lo; v <= hi + step / 2; v += step) out.push(+v.toFixed(10));
    return out;
  }
  /* opts: { dates, series:[{key,label,values,cls,area,dashed}], yFmt, tipFmt, ariaLabel, onMove } */
  function lineChart(host, opts) {
    host.innerHTML = '';
    const W = Math.max(280, host.clientWidth || 340), H = Math.round(Math.min(340, Math.max(220, W * 0.6)));
    const P = { l: 46, r: 10, t: 14, b: 24 };
    const { dates, series } = opts;
    const N = dates.length;
    let min = Infinity, max = -Infinity;
    series.forEach((s) => s.values.forEach((v) => { if (v != null) { min = Math.min(min, v); max = Math.max(max, v); } }));
    const pad = (max - min) * 0.08 || Math.abs(max) * 0.01 || 1; min -= pad; max += pad;
    const ticks = niceTicks(min, max, 4); min = Math.min(min, ticks[0]); max = Math.max(max, ticks[ticks.length - 1]);
    const x = (i) => P.l + (N <= 1 ? 0 : (i / (N - 1)) * (W - P.l - P.r));
    const y = (v) => P.t + (1 - (v - min) / (max - min)) * (H - P.t - P.b);

    const wrap = document.createElement('div'); wrap.className = 'chart-wrap'; host.appendChild(wrap);
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: 'img', 'aria-label': opts.ariaLabel, tabindex: '0', class: 'chart' }, wrap);
    const defs = el('defs', {}, svg);
    const gid = 'g' + Math.random().toString(36).slice(2, 8);
    const grad = el('linearGradient', { id: gid, x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    el('stop', { offset: '0%', class: 'a1' }, grad); el('stop', { offset: '100%', class: 'a2' }, grad);

    const gGrid = el('g', { class: 'grid', 'aria-hidden': 'true' }, svg);
    ticks.forEach((t) => {
      if (t < min - 1e-9 || t > max + 1e-9) return;
      el('line', { x1: P.l, x2: W - P.r, y1: y(t), y2: y(t) }, gGrid);
      const tx = el('text', { x: P.l - 6, y: y(t) + 4, 'text-anchor': 'end' }, gGrid); tx.textContent = opts.yFmt(t, ticks.length > 1 ? ticks[1] - ticks[0] : 1);
    });
    const nLab = W < 360 ? 3 : 4;
    for (let k = 0; k < nLab; k++) {
      const i = Math.round((k / (nLab - 1)) * (N - 1));
      const tx = el('text', { x: x(i), y: H - 6, 'text-anchor': k === 0 ? 'start' : k === nLab - 1 ? 'end' : 'middle' }, gGrid);
      tx.textContent = F.dateShort(dates[i]);
    }
    series.forEach((s) => {
      let d = ''; let started = false; let first = null, last = null;
      s.values.forEach((v, i) => { if (v == null) { started = false; return; } d += (started ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1); started = true; if (first == null) first = i; last = i; });
      if (s.area && first != null) el('path', { d: d + `L${x(last)} ${H - P.b}L${x(first)} ${H - P.b}Z`, fill: `url(#${gid})`, 'aria-hidden': 'true' }, svg);
      el('path', { d, class: 'line ' + (s.cls || ''), 'aria-hidden': 'true' }, svg);
      if (s.endDot && last != null) el('circle', { cx: x(last), cy: y(s.values[last]), r: 4.5, class: 'enddot', 'aria-hidden': 'true' }, svg);
    });
    const cursor = el('g', { class: 'cursor', 'aria-hidden': 'true', style: 'display:none' }, svg);
    const vline = el('line', { y1: P.t, y2: H - P.b }, cursor);
    const dots = series.map((s) => el('circle', { r: 4.5, class: 'dot ' + (s.cls || '') }, cursor));
    const tip = document.createElement('div'); tip.className = 'tip'; tip.hidden = true; wrap.appendChild(tip);
    const live = document.createElement('div'); live.className = 'sr-only'; live.setAttribute('aria-live', 'polite'); wrap.appendChild(live);
    let cur = null;
    function show(i) {
      i = Math.max(0, Math.min(N - 1, i)); cur = i;
      cursor.style.display = ''; vline.setAttribute('x1', x(i)); vline.setAttribute('x2', x(i));
      series.forEach((s, k) => { const v = s.values[i]; if (v == null) { dots[k].style.display = 'none'; return; } dots[k].style.display = ''; dots[k].setAttribute('cx', x(i)); dots[k].setAttribute('cy', y(v)); });
      tip.innerHTML = `<strong>${F.date(dates[i])}</strong>` + series.map((s) => `<span><i class="lsw ${s.cls || ''}"></i>${s.label}: <b>${s.values[i] == null ? '—' : opts.tipFmt(s.values[i], s)}</b></span>`).join('');
      tip.hidden = false;
      const px = (x(i) / W) * wrap.clientWidth; const tw = tip.offsetWidth;
      tip.style.left = Math.max(0, Math.min(wrap.clientWidth - tw, px - tw / 2)) + 'px';
      live.textContent = F.date(dates[i]) + '. ' + series.map((s) => s.label + ' ' + (s.values[i] == null ? 'sin dato' : opts.tipFmt(s.values[i], s))).join('. ');
    }
    function hide() { cursor.style.display = 'none'; tip.hidden = true; cur = null; }
    function idxFromEvent(ev) {
      const r = svg.getBoundingClientRect(); const px = ((ev.clientX - r.left) / r.width) * W;
      return Math.round(((px - P.l) / (W - P.l - P.r)) * (N - 1));
    }
    svg.addEventListener('pointerdown', (ev) => { svg.setPointerCapture && svg.setPointerCapture(ev.pointerId); show(idxFromEvent(ev)); });
    svg.addEventListener('pointermove', (ev) => { if (ev.pointerType === 'mouse' || ev.buttons) show(idxFromEvent(ev)); });
    svg.addEventListener('pointerleave', (ev) => { if (ev.pointerType === 'mouse') hide(); });
    svg.addEventListener('pointerup', (ev) => { if (ev.pointerType !== 'mouse') setTimeout(hide, 1800); });
    svg.addEventListener('keydown', (ev) => {
      const step = ev.shiftKey ? 5 : 1;
      if (ev.key === 'ArrowRight') { show(cur == null ? N - 1 : cur + step); ev.preventDefault(); }
      else if (ev.key === 'ArrowLeft') { show(cur == null ? N - 1 : cur - step); ev.preventDefault(); }
      else if (ev.key === 'Home') { show(0); ev.preventDefault(); }
      else if (ev.key === 'End') { show(N - 1); ev.preventDefault(); }
      else if (ev.key === 'Escape') hide();
    });
    svg.addEventListener('blur', hide);
  }
  window.lineChart = lineChart;
})();
