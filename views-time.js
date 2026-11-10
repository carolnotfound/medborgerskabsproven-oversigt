/* Søjler (time on a bent scale, three lanes) and Linje (order, alternating line). */
(function () {
  const A = window.App, S = A.S, esc = A.esc;
  const DALL = S.entries.map((e, i) => [e, i]).filter(([e]) => A.isDated(e)).sort((a, b) => a[0].start - b[0].start || a[1] - b[1]).map(x => x[0]);
  let D = DALL;
  const nodate = () => S.entries.filter(e => e.kind !== 'topic' && e.start == null && A.keep(e));
  const filterNote = () => A.filtering() ? ' <b>Filter: ' + esc(A.filterLabel()) + ' (' + D.length + ' ud af ' + DALL.length + ').</b>' : '';
  const isBar = e => e.kind === 'period' && (e.end != null || e.precision === 'årti');
  const barEnd = e => e.end === 'nu' ? 2026 : e.end != null ? e.end : e.start + 10;
  const fmtYear = y => y < 0 ? Math.abs(y).toLocaleString('da-DK') + ' f.Kr.' : String(y);
  function shortYear(e) {
    let d = (e.date || '').replace('fra omkring', 'ca.').replace('omkring', 'ca.');
    if (d.length <= 18) return d;
    return (e.precision === 'ca.' || e.precision === 'årti' ? 'ca. ' : '') + fmtYear(e.start);
  }
  const nodateHTML = cls => nodate().length ? `<div class="${cls}">Start ikke angivet i materialet (vises, når året er tjekket): ${nodate().map(e => `<button data-id="${e.id}" data-nd="1" aria-pressed="false">${esc(e.title)}</button>`).join('')}</div>` : '';
  function bindNodate() { document.querySelectorAll('[data-nd]').forEach(b => b.addEventListener('click', () => A.openEntry(b.dataset.id))); }
  /* sticky header outside the scroll area, mirrored sideways with the chart */
  const stickyHead = (inner, W, H) => `<div class="e-head" id="stickyHead"><div class="e-headin" style="width:${W}px;height:${H}px">${inner}</div></div>`;
  function syncHead(scr) {
    const hi = document.querySelector('.e-headin'); if (!hi) return;
    const f = () => {
      const sl = scr.scrollLeft; hi.style.transform = `translateX(${-sl}px)`;
      hi.querySelectorAll('[data-x0]').forEach(el => {
        const sp = el.firstElementChild, x0 = +el.dataset.x0, w = +el.dataset.w;
        sp.style.transform = `translateX(${Math.max(0, Math.min(sl - x0, w - sp.offsetWidth - 24))}px)`;
      });
    };
    scr.addEventListener('scroll', f, {passive: true}); f();
    const setTop = () => { const m = document.querySelector('.menu'), s = document.querySelector('.strips'); document.documentElement.style.setProperty('--stickyTop', (m.offsetHeight + s.offsetHeight) + 'px'); };
    setTop(); window.addEventListener('resize', setTop);
  }
  function leftmost(container) {
    const c = container.getBoundingClientRect().left; let best = null, bl = 1e9;
    container.querySelectorAll('[data-id]:not([data-nd])').forEach(el => { const r = el.getBoundingClientRect(); if (r.right > c + 8 && r.left >= c - 4 && r.left < bl) { bl = r.left; best = el; } });
    return best && best.dataset.id;
  }

  /* ================= Søjler ================= */
  const KN = [[-12500, 0], [750, 160], [1500, 520], [1800, 900], [1900, 1300], [1945, 1750], [1990, 2350], [2026, 3000]];
  function X(y) {
    for (let i = 1; i < KN.length; i++) if (y <= KN[i][0] || i === KN.length - 1) { const [a, b] = KN[i - 1], [c, d] = KN[i]; return b + (y - a) / (c - a) * (d - b); }
  }
  const LW = t => t.replace(/<[^>]+>/g, '').length * 8.6 + 18;
  function pack(items, gap) {
    const ends = [];
    items.forEach(it => { let r = ends.findIndex(end => end + gap <= it.x); if (r < 0) { r = ends.length; ends.push(0); } ends[r] = it.x + it.w; it.r = r; });
    return ends.length;
  }
  function renderE() {
    D = DALL.filter(A.keep);
    if (!D.length) return A.stripsHTML({era: true}) + `<div class="mode-note">${filterNote()} Ingen indlæg passer.</div>`;
    const PH = 38, EH = 34, LH = 34;
    let y = 10, lanes = '', items = '';
    ['Historie', 'Partier', 'Kultur'].forEach(lane => {
      const L = D.filter(e => A.laneOf(e) === lane);
      const bars = L.filter(isBar).map(e => {
        const x = X(e.start), bw = Math.max(X(barEnd(e)) - x, 6), title = e.title + (e.end === 'nu' && /^født/.test(e.date || '') ? ' · ' + e.date.replace('født', 'f.') : '');
        return {e, x, bw, title, inside: bw >= LW(title) + 4, w: Math.max(bw, bw + LW(title) + 8)};
      }).sort((a, b) => a.x - b.x);
      const evs = L.filter(e => !isBar(e)).map(e => ({e, x: X(e.start) - 7, w: LW(shortYear(e) + ' ' + e.title) + 40})).sort((a, b) => a.x - b.x);
      lanes += `<div class="e-lane" style="top:${y}px"><span>${lane}</span></div>`; y += LH + 10;
      if (bars.length) {
        if (evs.length) { items += `<div class="e-sub" style="top:${y}px"><span>Perioder</span></div>`; y += 24; }
        const rows = pack(bars, 10);
        bars.forEach(p => {
          const e = p.e, era = A.eraOf(e.era), cls = ['e-bar', e.precision === 'ca.' ? 'ca' : '', e.precision === 'årti' ? 'dec' : '', e.end === 'nu' ? 'open' : ''].join(' ');
          const wk = (e.works || []).filter(w => w.year && w.year >= e.start && w.year <= barEnd(e)).map(w => `<i class="wk" title="${esc(w.title)} (${w.year})" style="left:${X(w.year) - p.x}px;top:-6px"></i>`).join('');
          items += `<button class="${cls}" data-id="${e.id}" aria-pressed="false" style="left:${p.x}px;top:${y + p.r * PH}px;width:${p.bw}px"><span class="fill" style="background:${era.bg}"></span>${p.inside ? `<span class="in" style="color:${era.fg}">${esc(p.title)}${A.rdot(e)}</span>` : `<span class="out">${esc(p.title)}${A.rdot(e)}</span>`}${wk}</button>`;
        });
        y += rows * PH + 10;
      }
      if (evs.length) {
        if (bars.length) { items += `<div class="e-sub" style="top:${y}px"><span>Begivenheder</span></div>`; y += 24; }
        const rows = pack(evs, 8);
        evs.forEach(v => {
          const e = v.e, era = A.eraOf(e.era);
          items += `<button class="e-ev${e.precision === 'ca.' ? ' ca' : ''}" data-id="${e.id}" aria-pressed="false" style="left:${v.x}px;top:${y + v.r * EH}px;--bg:${era.bg}"><span class="dot"></span><span><b>${A.circ(e, esc(shortYear(e)))}</b>&nbsp; ${esc(e.title)}${A.rdot(e)}</span></button>`;
        });
        y += rows * EH + 14;
      }
    });
    const H = y + 20, W = X(2026) + 320;
    let h = '', heads = '';
    A.ERAS.forEach(era => {
      const x0 = X(era.from == null ? -12500 : era.from), x1 = X(era.to == null ? 2026 : era.to);
      h += `<div class="e-band" data-era-band="${era.id}" style="left:${x0}px;width:${x1 - x0}px;background:color-mix(in srgb,${era.bg} 14%,#fbf4e4)"></div>`;
      heads += `<div class="e-bh" data-x0="${x0}" data-w="${x1 - x0}" style="left:${x0}px;width:${x1 - x0}px;background:${era.bg};color:${era.fg}"><span>${esc(era.da)}</span></div>`;
    });
    [-12500, 750, 1000, 1250, 1500, 1750, 1900, 1945, 2000].forEach(yr => { h += `<div class="e-tick" style="left:${X(yr)}px"></div>`; heads += `<div class="e-tl" style="left:${X(yr)}px"><span>${fmtYear(yr)}</span></div>`; });
    h += `<div class="e-today" style="left:${X(2026)}px"></div>`; heads += `<div class="e-tl" style="left:${X(2026)}px"><span>i dag</span></div>`;
    return A.stripsHTML({era: true}) + `<div class="mode-note">Søjler viser tid: jo længere til højre, jo nyere. Tryk på en søjle eller en prik for at læse mere. Rød prik = skøn eller dato uden for materialet.${filterNote()}</div>${stickyHead(heads, W, 66)}<div class="e-scroll" id="scr"><div class="e-chart" style="width:${W}px;height:${H}px">${h}${lanes}${items}</div></div>` + nodateHTML('e-nodate');
  }
  function bindE() {
    if (!document.getElementById('scr')) { A.bindStrips(null); return; }
    const scr = document.getElementById('scr'); syncHead(scr);
    document.querySelectorAll('.e-chart [data-id]').forEach(b => b.addEventListener('click', () => { if (b.getAttribute('aria-pressed') === 'true') A.closeSheet(); else A.openEntry(b.dataset.id); }));
    bindNodate();
    const upd = () => { const id = leftmost(scr); if (id) A.setEra(A.byId[id].era); };
    scr.addEventListener('scroll', upd, {passive: true});
    A.bindStrips(era => { const er = A.eraOf(era); scr.scrollTo({left: Math.max(0, X(er.from == null ? -12500 : er.from) - 8), behavior: 'smooth'}); A.setEra(era); });
    setTimeout(upd, 0);
  }
  A.views.soejler = {
    render: renderE, bind: bindE,
    visibleId: () => { const s = document.getElementById('scr'); return s && leftmost(s); },
    focus(id, open) {
      const scr = document.getElementById('scr'), el = id && scr.querySelector(`.e-chart [data-id="${id}"]`);
      if (el) { scr.scrollLeft = Math.max(0, el.offsetLeft - 90); const r = el.getBoundingClientRect(); window.scrollTo({top: window.scrollY + r.top - 260}); }
    }
  };

  /* ================= Linje ================= */
  const SLOT = 215, PAD = 70;
  function renderD() {
    D = DALL.filter(A.keep);
    if (!D.length) return A.stripsHTML({era: true}) + `<div class="mode-note">${filterNote()} Ingen indlæg passer.</div>`;
    const W = D.length * SLOT + PAD * 2;
    let ribbon = `<div style="width:${PAD}px;flex:none"></div>`, x0 = PAD, line = `<div style="width:${PAD}px;background:var(--rule)"></div>`;
    A.ERAS.forEach(era => {
      const c = D.filter(e => e.era === era.id).length; if (!c) return;
      ribbon += `<div class="d-seg" data-x0="${x0}" data-w="${c * SLOT}" style="width:${c * SLOT}px;background:${era.bg};color:${era.fg}"><span>${esc(era.da)}<small>${era.range}</small></span></div>`; x0 += c * SLOT;
      line += `<div style="width:${c * SLOT}px;background:${era.bg}"></div>`;
    });
    let items = '';
    D.forEach((e, i) => {
      const era = A.eraOf(e.era), x = PAD + i * SLOT + SLOT / 2, up = i % 2 === 0;
      const yr = e.date || fmtYear(e.start);
      items += `<div class="d-item ${up ? 'up' : 'down'}${isBar(e) ? ' per' : ''}" data-id="${e.id}" style="left:${x}px;--bg:${era.bg}"><span class="d-stem"></span><span class="d-dot"></span>
        <button class="d-box"><span class="d-year${yr.length > 10 ? ' long' : ''}">${A.circ(e, esc(yr))}${A.rdot(e)}<span class="bar"></span></span>
        <span class="d-ttl">${esc(e.title)}</span><span class="d-tz">${esc(e.teaser)}</span><span class="d-kind">${A.kindDa(e)}</span></button></div>`;
    });
    return A.stripsHTML({era: true}) + `${A.filtering() ? `<div class="mode-note">${filterNote()}</div>` : ''}${stickyHead(`<div class="d-ribbon">${ribbon}</div>`, W, 40)}<div class="d-track" id="scr"><div class="d-inner" style="width:${W}px"><div class="d-ribbon"></div><div class="d-line">${line}</div>${items}</div></div>` + nodateHTML('d-none');
  }
  /* fit the card area to the tallest card above and below the line, so there is no empty space */
  function fitD() {
    const inner = document.querySelector('.d-inner'); if (!inner) return;
    let up = 0, dn = 0;
    inner.querySelectorAll('.d-item.up .d-box').forEach(b => { up = Math.max(up, b.offsetHeight); });
    inner.querySelectorAll('.d-item.down .d-box').forEach(b => { dn = Math.max(dn, b.offsetHeight); });
    const lt = up + 56;
    inner.style.setProperty('--lt', lt + 'px'); inner.style.height = (lt + 10 + 46 + dn + 14) + 'px';
  }
  function bindD() {
    if (!document.getElementById('scr')) { A.bindStrips(null); return; }
    fitD(); if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitD); window.addEventListener('load', fitD);
    const scr = document.getElementById('scr'); syncHead(scr);
    document.querySelectorAll('.d-item .d-box').forEach(b => b.addEventListener('click', () => { const id = b.parentElement.dataset.id; if (A.sel === id) A.closeSheet(); else A.openEntry(id); }));
    bindNodate();
    const upd = () => { const id = leftmost(scr); if (id) A.setEra(A.byId[id].era); };
    scr.addEventListener('scroll', upd, {passive: true});
    A.bindStrips(era => { const i = D.findIndex(e => e.era === era); if (i >= 0) scr.scrollTo({left: Math.max(0, PAD + i * SLOT - 20), behavior: 'smooth'}); A.setEra(era); });
    setTimeout(upd, 0);
  }
  A.views.linje = {
    render: renderD, bind: bindD,
    visibleId: () => { const s = document.getElementById('scr'); return s && leftmost(s); },
    focus(id, open) {
      const scr = document.getElementById('scr'), el = id && scr.querySelector(`.d-item[data-id="${id}"]`);
      if (el) { scr.scrollLeft = Math.max(0, el.offsetLeft - 120); const r = scr.querySelector('.d-line').getBoundingClientRect(); window.scrollTo({top: window.scrollY + r.top - 330}); }
    }
  };
})();
