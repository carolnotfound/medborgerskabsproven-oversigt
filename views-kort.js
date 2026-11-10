/* Kort: outline map with pins, layers, a Regioner layer with a "Fra 2027" toggle, zoom and pan (adapted from the approved prototype). */
(function () {
  const A = window.App, esc = A.esc, PL = window.PLACES, MAPP = window.MAPP;
  const {MW, MH, P, CITIES, WATERS, POINTS, BRIDGES, MAPHINT, MAPFACTS} = PL;
  const ERAID = {old: 'tidlig', vik: 'vikinge', mid: 'middelalder', ene: 'reformation', mod: 'demokrati', efter: 'efter45'};
  const HIST = PL.HIST.map(h => Object.assign({}, h, {era: ERAID[h.era] || h.era}));
  HIST.push({n: 'Vindeby', era: 'efter45', lon: 11.13, lat: 54.97, d: 'I <b>1991</b> fik Danmark verdens <b>første vindmøllepark på havet</b>, Vindeby, ud for Lolland.', pg: 144, dx: 14, dy: 6});
  const LINK = {Ribe: 'ribe-foerste-byer', Jelling: 'harald-blaatand-doer-987', Trelleborg: 'vikingeborge-og-byer', Fyrkat: 'vikingeborge-og-byer', 'Skåne, Halland og Blekinge': 'danmark-taber-skaane-1658', 'Slesvig og Holsten': 'krigen-1864-slesvig-holsten', Vindeby: 'vindeby-1991', 'Møllehøj': 'emne-hoejeste-punkt'};
  const REGIONS = [
    {n: 'Region Nordjylland', c: '#8ecae6', ell: [[9.4, 57.1, 1.1, 0.55]], lab: [9.0, 57.35], d: 'Nordjylland. Regionerne driver de offentlige <b>sygehuse</b> og har ikke ret til at udskrive skatter.'},
    {n: 'Region Midtjylland', c: '#b5e48c', ell: [[9.2, 56.05, 1.0, 0.55]], lab: [8.7, 56.4], d: 'Øst-, Midt- og Vestjylland. Regionerne driver de offentlige <b>sygehuse</b>.'},
    {n: 'Region Syddanmark', c: '#ffd166', ell: [[9.0, 55.1, 0.8, 0.45], [10.4, 55.35, 0.65, 0.35]], lab: [8.8, 55.0], d: 'Fyn samt Syd- og Sønderjylland. Regionerne driver de offentlige <b>sygehuse</b>.'},
    {n: 'Region Sjælland', c: '#f4a6a6', ell: [[11.45, 55.35, 0.85, 0.4], [11.7, 54.75, 0.6, 0.2]], lab: [11.9, 55.15], d: 'Vestsjælland, Midtsjælland, Sydsjælland og Lolland-Falster.', east: true},
    {n: 'Region Hovedstaden', c: '#cdb4f6', ell: [[12.3, 55.85, 0.5, 0.25], [14.9, 55.12, 0.3, 0.15]], lab: [12.05, 56.08], d: 'København og omegn, Nordsjælland og <b>Bornholm</b>.', east: true}
  ];
  const EAST = {n: 'Region Østdanmark', c: '#e0b0d0', d: 'Fra <b>1. januar 2027</b> bliver Region Hovedstaden og Region Sjælland lagt sammen til <b>Region Østdanmark</b>.'};
  let fra2027 = false;

  /* flat lookup of every pin, shared with the detail sheet (for "Se på kortet") */
  const ALL = {};
  CITIES.forEach((c, i) => { ALL['c' + i] = {t: c.k, n: c.n, d: c.d, pg: c.pg, entry: 'emne-stoerste-byer'}; });
  WATERS.forEach((w, i) => { ALL['w' + i] = {t: 'Farvand', n: w.n, d: w.d, pg: w.pg, entry: 'emne-farvande'}; });
  POINTS.forEach((p, i) => { ALL['p' + i] = {t: p.k, n: p.n, d: p.d, pg: p.pg, entry: LINK[p.n] || 'emne-yderpunkter'}; });
  BRIDGES.forEach((b, i) => { ALL['b' + i] = {t: 'Bro eller tunnel', n: b.n, d: b.d, pg: b.pg, entry: 'emne-broer'}; });
  HIST.forEach((h, i) => { ALL['h' + i] = {t: 'Fra historien', n: h.n, d: h.d, pg: h.pg, entry: LINK[h.n]}; });
  ALL.rE = {t: 'Region', n: EAST.n, d: EAST.d, pg: 80, entry: 'region-oestdanmark-2027', region: true};
  REGIONS.forEach((r, i) => { ALL['r' + i] = {t: 'Region', n: r.n, d: r.d, pg: 80, entry: 'emne-regioner', region: true}; });
  A.placesFor = function (entryId) {
    const ids = Object.keys(ALL).filter(k => ALL[k].entry === entryId);
    if (!ids.length) return [];
    if (ids.length > 2) return [{id: ids[0], n: 'kortet'}];
    return ids.map(k => ({id: k, n: ALL[k].n}));
  };

  function render() {
    const lab = (it, cls = 'lab') => `<text class="${cls}" x="${it.dx || 0}" y="${it.dy || 0}" text-anchor="${it.anchor || 'start'}">${esc(it.n)}</text>`;
    const pinG = (id, name, x, y, inner, geom = '') => `<g class="pin" tabindex="0" role="button" data-pin="${id}" aria-label="${esc(name)}">${geom}<g transform="translate(${x.toFixed(1)},${y.toFixed(1)})"><g class="cs"><circle class="hit" r="24" fill="transparent"/>${inner}</g></g></g>`;
    let svg = `<svg id="gsvg" viewBox="0 0 ${MW} ${MH}" role="img" aria-label="Kort over Danmark"><rect width="${MW}" height="${MH}" fill="#cfeaec"/>
      ${['Sweden', 'Germany', 'Poland'].map(n => `<path d="${MAPP[n]}" fill="#eadfc6" stroke="#cdbf9f" stroke-width="1"/>`).join('')}
      <path d="${MAPP.Denmark}" fill="#FFB400" stroke="#14122b" stroke-width="2" stroke-linejoin="round"/>
      <g transform="translate(760,70)"><g class="cs"><text class="ctry" text-anchor="middle">SVERIGE</text></g></g><g transform="translate(150,705)"><g class="cs"><text class="ctry" text-anchor="middle">TYSKLAND</text></g></g>`;
    svg += '<g data-layer="regions" class="off" id="regionsLayer"></g>';
    svg += '<g data-layer="water">' + WATERS.map((w, i) => {
      const [x, y] = P(w.lon, w.lat); let inner;
      if (w.leader) { const [lx, ly] = w.leader; inner = `<line x1="0" y1="0" x2="${lx}" y2="${ly}" stroke="#0B5D63" stroke-width="1.5"/><circle r="3.5" fill="#0B5D63"/><text class="wlab" x="${lx}" y="${ly}" text-anchor="${lx < 0 ? 'end' : 'middle'}">${esc(w.n)}</text>`; }
      else if (w.lines) inner = `<text class="wlab" x="0" y="0">${w.lines.map((l, j) => `<tspan x="0" dy="${j ? 17 : 0}">${esc(l)}</tspan>`).join('')}</text>`;
      else inner = `<text class="wlab" x="0" y="0" text-anchor="middle">${esc(w.n)}</text>`;
      return pinG('w' + i, w.n, x, y, inner);
    }).join('') + '</g>';
    svg += '<g data-layer="bridges">' + BRIDGES.map((b, i) => {
      const [x1, y1] = P(...b.a), [x2, y2] = P(...b.b);
      const geom = `<line class="brg" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#14122b" stroke-width="8" stroke-linecap="round"/><line class="brg" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#fff" stroke-width="3" stroke-linecap="round"/>`;
      return pinG('b' + i, b.n, (x1 + x2) / 2, (y1 + y2) / 2, lab(b), geom);
    }).join('') + '</g>';
    svg += '<g data-layer="hist">' + HIST.map((h, i) => { const [x, y] = P(h.lon, h.lat), era = A.eraOf(h.era); return pinG('h' + i, h.n, x, y, `<rect class="s" x="-9" y="-9" width="18" height="18" rx="4" fill="${era.bg}" stroke="#fff" stroke-width="2.5"/>${lab(h)}`); }).join('') + '</g>';
    svg += '<g data-layer="points">' + POINTS.map((p, i) => { const [x, y] = P(p.lon, p.lat); return pinG('p' + i, p.n, x, y, `<path class="s" d="M0,-11 L10,0 L0,11 L-10,0 Z" fill="#5B3FD1" stroke="#fff" stroke-width="2.5"/>${lab(p)}`); }).join('') + '</g>';
    svg += '<g data-layer="cities">' + CITIES.map((c, i) => { const [x, y] = P(c.lon, c.lat); return pinG('c' + i, c.n, x, y, `<circle class="s" r="${Math.round(c.r * 0.85)}" fill="#D8372D" stroke="#fff" stroke-width="2.5"/>${lab(c)}`); }).join('') + '</g></svg>';
    const chips = [['cities', 'Byer'], ['water', 'Farvande'], ['points', 'Yderpunkter'], ['bridges', 'Broer'], ['hist', 'Historie']].map(([k, t]) => `<button class="chip" data-layer-btn="${k}" aria-pressed="true">${t}</button>`).join('') +
      '<button class="chip" data-layer-btn="regions" aria-pressed="false">Regioner</button><button class="chip" id="fra2027" aria-pressed="false" disabled title="Slå Regioner til først">Fra 2027</button><button class="chip" id="hideNames" aria-pressed="false">Skjul navne (test dig selv)</button>';
    return `<div class="g-chips">${chips}</div><div class="g-layout"><div class="g-map" id="gmap">${svg}<div class="zoomctl"><button id="zin" aria-label="Zoom ind">+</button><button id="zout" aria-label="Zoom ud">&minus;</button><button id="zreset" aria-label="Nulstil kortet">&#8634;</button></div></div>
      <div class="g-panel" id="gp" aria-live="polite"><button class="gclose" id="gclose" aria-label="Luk">&times;</button><div id="gpbody">${MAPHINT}</div></div></div><section class="g-facts">${MAPFACTS}</section>`;
  }
  function regionsSVG() {
    const P2 = (lon, lat) => P(lon, lat);
    const regs = fra2027 ? REGIONS.filter(r => !r.east).concat([{n: EAST.n, c: EAST.c, ell: REGIONS.filter(r => r.east).flatMap(r => r.ell), lab: [11.9, 55.15], id: 'east'}]) : REGIONS;
    return regs.map(r => {
      const i = r.id === 'east' ? 'east' : REGIONS.indexOf(r);
      const geom = r.ell.map(([lo, la, rx, ry]) => { const [x, y] = P2(lo, la); return `<ellipse class="s" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${(rx * 111.84).toFixed(1)}" ry="${(ry * 200).toFixed(1)}" fill="${r.c}" fill-opacity=".38" stroke="#14122b" stroke-opacity=".5" stroke-width="2" stroke-dasharray="7 5"/>`; }).join('');
      const [x, y] = P2(...r.lab);
      return `<g class="pin" tabindex="0" role="button" data-pin="${r.id === 'east' ? 'rE' : 'r' + i}" aria-label="${esc(r.n)}">${geom}<g transform="translate(${x.toFixed(1)},${y.toFixed(1)})"><g class="cs"><text class="rlab" text-anchor="middle">${esc(r.n.replace('Region ', ''))}</text></g></g></g>`;
    }).join('');
  }
  function bind() {
    const svg = document.getElementById('gsvg'), panel = document.getElementById('gp');
    let dragged = false;
    const show = id => {
      if (dragged) return; const a = ALL[id]; if (!a) return;
      let h = `<div class="p-meta">${esc(a.t)}${a.region ? ' · omtrentlig placering, ikke grænser' : ''}</div><h2>${esc(a.n)}</h2><p>${a.d}</p>`;
      if (a.region && !fra2027 && id !== 'rE') h += '<p>Region Hovedstaden og Region Sjælland bliver <b>1. januar 2027</b> lagt sammen til Region Østdanmark. Tryk på <b>Fra 2027</b> for at se det.</p>';
      h += `<div class="p-src">Kilde: s. ${a.pg}</div>`;
      const e = a.entry && A.byId[a.entry];
      if (e) h += `<button class="linkbtn" data-open="${e.id}">${A.isDated(e) ? 'Se på tidslinjen' : 'Se i Emner'}</button>`;
      document.getElementById('gpbody').innerHTML = h;
      document.querySelectorAll('.g-map .pin').forEach(p => p.classList.toggle('sel', p.dataset.pin === id));
      panel.classList.add('has');
    };
    panel.addEventListener('click', ev => { const b = ev.target.closest('[data-open]'); if (b) A.jump(b.dataset.open); });
    const drawRegions = () => { document.getElementById('regionsLayer').innerHTML = regionsSVG(); wirePins(); };
    function wirePins() {
      document.querySelectorAll('.g-map .pin').forEach(p => {
        p.onclick = () => show(p.dataset.pin);
        p.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); dragged = false; show(p.dataset.pin); } };
      });
    }
    drawRegions();
    document.getElementById('gclose').onclick = () => { panel.classList.remove('has'); document.querySelectorAll('.g-map .pin.sel').forEach(p => p.classList.remove('sel')); };
    document.querySelectorAll('[data-layer-btn]').forEach(b => b.addEventListener('click', () => {
      const on = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', String(on));
      document.querySelector(`[data-layer="${b.dataset.layerBtn}"]`).classList.toggle('off', !on);
      if (b.dataset.layerBtn === 'regions') { const f = document.getElementById('fra2027'); f.disabled = !on; f.title = on ? 'Vis Region Hovedstaden og Region Sjælland som én region' : 'Slå Regioner til først'; }
    }));
    document.getElementById('fra2027').addEventListener('click', e => { fra2027 = !fra2027; e.currentTarget.setAttribute('aria-pressed', String(fra2027)); drawRegions(); panel.classList.remove('has'); });
    const hn = document.getElementById('hideNames');
    hn.addEventListener('click', () => { const on = hn.getAttribute('aria-pressed') !== 'true'; hn.setAttribute('aria-pressed', String(on)); document.getElementById('gmap').classList.toggle('hide', on); });

    /* ----- zoom and pan: buttons, pinch, drag, double-tap, ctrl+wheel ----- */
    const MAXZ = 6, vb = {x: 0, y: 0, w: MW, h: MH}, ro = new ResizeObserver(() => apply());
    function apply() {
      if (!svg.isConnected) { ro.disconnect(); return; }
      vb.w = Math.min(MW, Math.max(MW / MAXZ, vb.w)); vb.h = vb.w * MH / MW;
      vb.x = Math.min(MW - vb.w, Math.max(0, vb.x)); vb.y = Math.min(MH - vb.h, Math.max(0, vb.y));
      svg.setAttribute('viewBox', `${vb.x.toFixed(2)} ${vb.y.toFixed(2)} ${vb.w.toFixed(2)} ${vb.h.toFixed(2)}`);
      svg.style.setProperty('--k', (svg.getBoundingClientRect().width / vb.w).toFixed(4));
      svg.style.touchAction = vb.w < MW - 0.5 ? 'none' : 'pan-y';
      document.getElementById('zout').disabled = vb.w >= MW - 0.5;
      document.getElementById('zin').disabled = vb.w <= MW / MAXZ + 0.5;
    }
    function zoomAt(f, cx, cy) {
      const r = svg.getBoundingClientRect(), px = vb.x + (cx - r.left) / r.width * vb.w, py = vb.y + (cy - r.top) / r.height * vb.h;
      const nw = Math.min(MW, Math.max(MW / MAXZ, vb.w / f)), s = nw / vb.w;
      vb.x = px - (px - vb.x) * s; vb.y = py - (py - vb.y) * s; vb.w = nw; apply();
    }
    function panBy(dx, dy) { const r = svg.getBoundingClientRect(), s = vb.w / r.width; vb.x -= dx * s; vb.y -= dy * s; apply(); }
    const centre = () => { const r = svg.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
    document.getElementById('zin').onclick = () => zoomAt(1.6, ...centre());
    document.getElementById('zout').onclick = () => zoomAt(1 / 1.6, ...centre());
    document.getElementById('zreset').onclick = () => { vb.x = 0; vb.y = 0; vb.w = MW; apply(); };
    svg.addEventListener('dblclick', e => { e.preventDefault(); zoomAt(2, e.clientX, e.clientY); });
    svg.addEventListener('wheel', e => { if (!(e.ctrlKey || e.metaKey)) return; e.preventDefault(); zoomAt(Math.exp(-e.deltaY * 0.01), e.clientX, e.clientY); }, {passive: false});
    const ptrs = new Map(); let start = null;
    svg.addEventListener('pointerdown', e => { ptrs.set(e.pointerId, {x: e.clientX, y: e.clientY}); if (ptrs.size === 1) { dragged = false; start = {x: e.clientX, y: e.clientY}; } });
    svg.addEventListener('pointermove', e => {
      const prev = ptrs.get(e.pointerId); if (!prev) return; const cur = {x: e.clientX, y: e.clientY};
      if (ptrs.size === 1) {
        if (!dragged && Math.hypot(cur.x - start.x, cur.y - start.y) < 6) return;
        if (vb.w >= MW - 0.5) return;
        if (!dragged) { dragged = true; try { svg.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ } }
        panBy(cur.x - prev.x, cur.y - prev.y);
      } else if (ptrs.size === 2) {
        const other = [...ptrs.entries()].find(([id]) => id !== e.pointerId)[1];
        const d0 = Math.hypot(prev.x - other.x, prev.y - other.y), d1 = Math.hypot(cur.x - other.x, cur.y - other.y);
        dragged = true; panBy((cur.x - prev.x) / 2, (cur.y - prev.y) / 2);
        if (d0 > 0) zoomAt(d1 / d0, (cur.x + other.x) / 2, (cur.y + other.y) / 2);
      }
      ptrs.set(e.pointerId, cur);
    });
    const up = e => { ptrs.delete(e.pointerId); if (!ptrs.size) setTimeout(() => { dragged = false; }, 0); };
    ['pointerup', 'pointercancel'].forEach(t => svg.addEventListener(t, up));
    ro.observe(svg); apply();
    A.kortShow = show;
  }
  A.views.kort = {
    render, bind,
    focus(id) {
      if (!id || !ALL[id]) return;
      if (ALL[id].region) { const b = document.querySelector('[data-layer-btn="regions"]'); if (b.getAttribute('aria-pressed') !== 'true') b.click(); }
      A.kortShow(id);
    }
  };
})();
