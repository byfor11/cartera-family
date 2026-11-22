/* Gráfico de líneas en SVG hecho a mano: accesible (role=img + resumen), táctil (arrastrar) y con teclado (flechas).
   v6: eje secundario a la derecha (series con axis:'y2', p. ej. capital aportado en €), líneas escalonadas (step),
   puntos con etiqueta sobre una serie (opts.points) y tooltip a medida (opts.tipHtml / opts.tipText). */
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
  function range(series, axis) {
    let min = Infinity, max = -Infinity;
    series.filter((s) => (s.axis || 'y') === axis).forEach((s) => s.values.forEach((v) => { if (v != null) { min = Math.min(min, v); max = Math.max(max, v); } }));
    return [min, max];
  }
  /* opts: { dates, series:[{label,values,cls,area,endDot,endCls,axis,step}], yFmt, y2Fmt, y2Zero, tipFmt, tipHtml(i), tipText(i),
             points:[{i, v, axis, label, sub, cls}], zeroLine, areaBase, ariaLabel } */
  function lineChart(host, opts) {
    host.innerHTML = '';
    const { dates, series } = opts;
    const has2 = series.some((s) => s.axis === 'y2');
    const W = Math.max(280, host.clientWidth || 340), H = Math.round(Math.min(360, Math.max(240, W * 0.66)));
    const P = { l: 44, r: has2 ? 40 : 10, t: 14, b: 24 };
    const N = dates.length;
    let [min, max] = range(series, 'y');
    const pad = (max - min) * 0.06 || Math.abs(max) * 0.01 || 0.01; min -= pad; max += pad;
    const ticks = niceTicks(min, max, opts.nTicks || 5); min = Math.min(min, ticks[0]); max = Math.max(max, ticks[ticks.length - 1]);
    const x = (i) => P.l + (N <= 1 ? 0 : (i / (N - 1)) * (W - P.l - P.r));
    const y = (v) => P.t + (1 - (v - min) / (max - min)) * (H - P.t - P.b);
    let y2 = null, ticks2 = [];
    if (has2) {
      let [a, b] = range(series, 'y2'); if (opts.y2Zero) a = 0;
      ticks2 = niceTicks(a, b * 1.04, 4); const lo = ticks2[0], hi = ticks2[ticks2.length - 1];
      y2 = (v) => P.t + (1 - (v - lo) / (hi - lo)) * (H - P.t - P.b);
    }
    const Y = (s) => (s.axis === 'y2' ? y2 : y);

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
    if (has2) {
      const g2 = el('g', { class: 'grid y2', 'aria-hidden': 'true' }, svg);
      ticks2.forEach((t) => { const tx = el('text', { x: W - P.r + 5, y: y2(t) + 4, 'text-anchor': 'start' }, g2); tx.textContent = opts.y2Fmt(t, ticks2[1] - ticks2[0]); });
    }
    const nLab = W < 360 ? 3 : 4;
    for (let k = 0; k < nLab; k++) {
      const i = Math.round((k / (nLab - 1)) * (N - 1));
      const tx = el('text', { x: x(i), y: H - 6, 'text-anchor': k === 0 ? 'start' : k === nLab - 1 ? 'end' : 'middle', class: 'xl' }, gGrid);
      tx.textContent = F.dateShort(dates[i]);
    }
    if (opts.zeroLine && min < 0 && max > 0) el('line', { x1: P.l, x2: W - P.r, y1: y(0), y2: y(0), class: 'zero', 'aria-hidden': 'true' }, svg);
    // Series secundarias primero (debajo), la principal encima
    const order = series.map((s, k) => k).sort((a, b) => (series[a].axis === 'y2' ? 0 : 1) - (series[b].axis === 'y2' ? 0 : 1));
    order.forEach((k) => {
      const s = series[k], yy = Y(s);
      let d = ''; let started = false; let first = null, last = null, prevY = null;
      s.values.forEach((v, i) => {
        if (v == null) { started = false; return; }
        if (started && s.step) d += 'L' + x(i).toFixed(1) + ' ' + prevY.toFixed(1);
        d += (started ? 'L' : 'M') + x(i).toFixed(1) + ' ' + yy(v).toFixed(1); started = true; prevY = yy(v); if (first == null) first = i; last = i;
      });
      const baseY = opts.areaBase != null ? Math.min(H - P.b, Math.max(P.t, y(opts.areaBase))) : H - P.b;
      if (s.area && first != null) el('path', { d: d + `L${x(last)} ${baseY}L${x(first)} ${baseY}Z`, fill: `url(#${gid})`, 'aria-hidden': 'true' }, svg);
      el('path', { d, class: 'line ' + (s.cls || ''), 'aria-hidden': 'true' }, svg);
      if (s.endDot && last != null) el('circle', { cx: x(last), cy: yy(s.values[last]), r: 4.5, class: 'enddot ' + (s.endCls || ''), 'aria-hidden': 'true' }, svg);
    });
    // Puntos con etiqueta (p. ej. inicio en cada plataforma, sobre la línea de capital aportado)
    const gPts = el('g', { class: 'points', 'aria-hidden': 'true' }, svg);
    const mainPts = series.filter((s) => s.axis !== 'y2').flatMap((s) => s.values.map((v, i) => (v == null ? null : [x(i), y(v)])).filter(Boolean));
    const placed = [];
    (opts.points || []).forEach((m) => {
      if (m.i < 0 || m.i >= N) return;
      const px = x(m.i), py = (m.axis === 'y2' ? y2 : y)(m.v);
      const g = el('g', { class: 'pt ' + (m.cls || '') }, gPts);
      const bg = el('rect', { rx: 6, class: 'pt-bg' }, g);
      el('circle', { cx: px, cy: py, r: 5.5, class: 'pt-dot' }, g);
      const t1 = el('text', { x: 0, y: 0, class: 'pt-l1' }, g); t1.textContent = m.label;
      const t2 = m.sub ? el('text', { x: 0, y: 0, class: 'pt-l2' }, g) : null; if (t2) t2.textContent = m.sub;
      let bw = 0; try { bw = Math.max(t1.getComputedTextLength(), t2 ? t2.getComputedTextLength() : 0); } catch (e) { bw = 6 * Math.max(m.label.length, (m.sub || '').length); }
      bw = Math.ceil(bw + 12); const bh = t2 ? 30 : 18;
      // Elige la posición de la etiqueta que menos tapa la línea principal y no se sale ni pisa otra etiqueta
      const cands = [[10, 6], [10, -6 - bh], [-10 - bw, 6], [-10 - bw, -6 - bh], [10, -bh / 2], [-10 - bw, -bh / 2]];
      let best = null;
      cands.forEach(([dx, dy], ci) => {
        const bx = px + dx, by = py + dy; let sc = ci * 0.5;
        if (bx < P.l + 2 || bx + bw > W - P.r - 2 || by < P.t || by + bh > H - P.b) sc += 1000;
        placed.forEach((q) => { if (bx < q.x + q.w && bx + bw > q.x && by < q.y + q.h && by + bh > q.y) sc += 500; });
        mainPts.forEach(([qx, qy]) => { if (qx >= bx - 2 && qx <= bx + bw + 2 && qy >= by - 2 && qy <= by + bh + 2) sc += 3; });
        if (!best || sc < best.sc) best = { sc, x: bx, y: by };
      });
      placed.push({ x: best.x, y: best.y, w: bw, h: bh });
      bg.setAttribute('x', best.x); bg.setAttribute('y', best.y); bg.setAttribute('width', bw); bg.setAttribute('height', bh);
      t1.setAttribute('x', best.x + 6); t1.setAttribute('y', best.y + 12.5);
      if (t2) { t2.setAttribute('x', best.x + 6); t2.setAttribute('y', best.y + 24.5); }
    });
    const cursor = el('g', { class: 'cursor', 'aria-hidden': 'true', style: 'display:none' }, svg);
    const vline = el('line', { y1: P.t, y2: H - P.b }, cursor);
    const dots = series.map((s) => el('circle', { r: 4.5, class: 'dot ' + (s.cls || '') }, cursor));
    const tip = document.createElement('div'); tip.className = 'tip'; tip.hidden = true; wrap.appendChild(tip);
    const live = document.createElement('div'); live.className = 'sr-only'; live.setAttribute('aria-live', 'polite'); wrap.appendChild(live);
    let cur = null, hideT = null;
    function show(i) {
      i = Math.max(0, Math.min(N - 1, i)); cur = i;
      cursor.style.display = ''; vline.setAttribute('x1', x(i)); vline.setAttribute('x2', x(i));
      series.forEach((s, k) => { const v = s.values[i]; if (v == null) { dots[k].style.display = 'none'; return; } dots[k].style.display = ''; dots[k].setAttribute('cx', x(i)); dots[k].setAttribute('cy', Y(s)(v)); });
      tip.innerHTML = opts.tipHtml ? opts.tipHtml(i) : `<strong>${F.date(dates[i])}</strong>` + series.map((s) => `<span><i class="lsw ${s.cls || ''}"></i>${s.label}: <b>${s.values[i] == null ? '—' : opts.tipFmt(s.values[i], s)}</b></span>`).join('');
      tip.hidden = false;
      const px = (x(i) / W) * wrap.clientWidth; const tw = tip.offsetWidth;
      // Lejos del dedo: el tooltip se aparta hacia el lado contrario del cursor
      const left = px > wrap.clientWidth / 2 ? px - tw - 14 : px + 14;
      tip.style.left = Math.max(0, Math.min(wrap.clientWidth - tw, left)) + 'px';
      live.textContent = opts.tipText ? opts.tipText(i) : F.date(dates[i]) + '. ' + series.map((s) => s.label + ' ' + (s.values[i] == null ? 'sin dato' : opts.tipFmt(s.values[i], s))).join('. ');
    }
    function hide() { cursor.style.display = 'none'; tip.hidden = true; cur = null; }
    function idxFromEvent(ev) {
      const r = svg.getBoundingClientRect(); const px = ((ev.clientX - r.left) / r.width) * W;
      return Math.round(((px - P.l) / (W - P.l - P.r)) * (N - 1));
    }
    svg.addEventListener('pointerdown', (ev) => { clearTimeout(hideT); svg.setPointerCapture && svg.setPointerCapture(ev.pointerId); show(idxFromEvent(ev)); });
    svg.addEventListener('pointermove', (ev) => { if (ev.pointerType === 'mouse' || ev.buttons) show(idxFromEvent(ev)); });
    svg.addEventListener('pointerleave', (ev) => { if (ev.pointerType === 'mouse') hide(); });
    svg.addEventListener('pointerup', (ev) => { if (ev.pointerType !== 'mouse') { clearTimeout(hideT); hideT = setTimeout(hide, 3000); } });
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
