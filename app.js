/* Medborgerskabsprøven - study atlas. Plain JavaScript, no build step. Data comes from data.js (window.SITE). */
(function () {
  const S = window.SITE;
  const ERACOL = {
    tidlig: {bg: '#FFB400', fg: '#14122b', range: 'før ca. 750'},
    vikinge: {bg: '#007C80', fg: '#ffffff', range: 'ca. 750–1050'},
    middelalder: {bg: '#D8372D', fg: '#ffffff', range: 'ca. 1050–1500'},
    reformation: {bg: '#1F7A3A', fg: '#ffffff', range: '1536–1848'},
    demokrati: {bg: '#D6336C', fg: '#ffffff', range: '1849–1945'},
    efter45: {bg: '#5B3FD1', fg: '#ffffff', range: 'efter 1945'}
  };
  const SHORT = {tidlig:'Tidlig',vikinge:'Vikinge',middelalder:'Middel.',reformation:'Reform.',demokrati:'Demokrati',efter45:'Efter 45'};
  const ERAS = S.eras.map(e => Object.assign({}, e, ERACOL[e.id]));
  const byId = {}; S.entries.forEach(e => { byId[e.id] = e; });
  const eraOf = id => ERAS.find(e => e.id === id) || ERAS[0];
  const PEOPLE = new Set(S.people);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
  const isDated = e => e.kind !== 'topic' && e.start != null;
  const isPerson = e => PEOPLE.has(e.label);
  const laneOf = e => (isPerson(e) || e.label === 'værk') ? 'Kultur' : e.label === 'parti' ? 'Partier' : 'Historie';
  const redDate = e => !!e.dateSupp || (e.guess || []).some(g => ['date', 'start', 'end', 'era'].includes(g.field));
  const often = e => (e.exam || []).length >= 2;
  const kindDa = e => e.kind === 'topic' ? 'emne' : (e.kind === 'period' && e.end != null) ? 'periode' : 'begivenhed';
  const FIELD = {date: 'Datoen', start: 'Starten', end: 'Slutningen', 'start/end': 'Start og slut', recap: 'Teksten', era: 'Tidsalderen'};
  const pagesTxt = e => 's. ' + e.pages.join(', ');
  const rdot = e => redDate(e) ? '<span class="rdot" title="Skøn eller dato uden for materialet: se detaljerne"></span>' : '';
  const circ = (e, txt) => often(e) ? `<span class="circ" title="Ofte spurgt om: ${e.exam.length} spørgsmål i de 13 tidligere prøver"><i>${txt}</i></span>` : txt;

  const App = {S, ERAS, byId, eraOf, esc, isDated, isPerson, laneOf, redDate, often, kindDa, rdot, circ, views: {}, current: null, sel: null, theme: null, onlyOften: false, keep: e => !App.onlyOften || often(e), eraCol: ERACOL};
  window.App = App;

  /* ---------- detail sheet ---------- */
  const sheet = document.getElementById('sheet');
  function sheetHTML(e) {
    const era = e.era ? eraOf(e.era) : null;
    const meta = [era ? `<span class="p-era" style="background:${era.bg}"></span>` : '',
      e.date ? esc(e.date) : (e.kind === 'topic' ? 'Emne' : 'Start ikke angivet i materialet'), kindDa(e) !== 'emne' ? ' · ' + kindDa(e) : '', ' · ' + esc(e.label), often(e) ? ' · ofte til prøven' : ''].join('');
    let h = `<div class="p-meta">${meta}</div><h2>${esc(e.title)}</h2><p>${e.recap}</p>`;
    if (e.works && e.works.length) h += '<ul class="wl">' + e.works.map(w => `<li>${esc(w.title)}${w.year ? ' (' + w.year + ')' : ''}</li>`).join('') + '</ul>';
    if (e.kind === 'topic' && e.items && e.items.length) h += '<ul class="items">' + e.items.filter(i => i.value).map(i => `<li><b>${esc(i.label)}:</b> ${esc(i.value)}</li>`).join('') + '</ul>';
    (e.guess || []).forEach(g => { h += `<div class="xtra"><span class="xtag guess">Skøn</span><p>${esc(FIELD[g.field] || 'Dette')} er et skøn: ${esc(g.why)}</p></div>`; });
    if (e.dateSupp) h += `<div class="xtra"><span class="xtag">Ikke fra materialet</span><p>${esc(e.dateSupp.text || 'Datoen er hentet uden for materialet.')}</p><span class="xsrc">Kilde: ${esc(e.dateSupp.source)} · tjekket ${esc(e.dateSupp.checked)}</span></div>`;
    (e.supp || []).forEach(s => { h += `<div class="xtra"><span class="xtag">Ikke fra materialet</span><p>${esc(s.text)}</p><span class="xsrc">Kilde: ${esc(s.source)} · tjekket ${esc(s.checked)}</span></div>`; });
    if (!e.dateSupp && e.start == null && e.kind !== 'topic') h += '<div class="xtra"><span class="xtag guess">Mangler</span><p>Materialet oplyser ikke, hvornår det begyndte. Året vises først, når det er tjekket mod en pålidelig kilde.</p></div>';
    h += `<div class="p-src">Kilde: ${pagesTxt(e)} i læremateriale${often(e) ? ' · ' + e.exam.length + ' spørgsmål i de 13 tidligere prøver' : ''}</div>`;
    let btns = '';
    (e.seeAlso || []).forEach(id => { const o = byId[id]; if (o) btns += `<button data-jump="${id}">${esc(o.title)}</button>`; });
    const pl = (App.placesFor ? App.placesFor(e.id) : []);
    pl.forEach(p => { btns += `<button class="linkbtn" data-place="${p.id}">Se på kortet: ${esc(p.n)}</button>`; });
    if (btns) h += `<div class="also"><span class="p-src">Se også</span><br>${btns}</div>`;
    return h;
  }
  function setSheet(show) {
    sheet.classList.toggle('show', show); sheet.setAttribute('aria-hidden', String(!show));
    document.body.style.paddingBottom = show ? (sheet.offsetHeight + 24) + 'px' : '';
    if (!show) { App.sel = null; markSel(); updateHash(); }
  }
  function markSel() {
    document.querySelectorAll('[data-id]').forEach(el => {
      const on = el.dataset.id === App.sel;
      if (el.classList.contains('d-item') || el.classList.contains('card')) el.classList.toggle('sel', on);
      else el.setAttribute('aria-pressed', String(on));
    });
  }
  App.openEntry = function (id) {
    const e = byId[id]; if (!e) return;
    App.sel = id; document.getElementById('sheetBody').innerHTML = sheetHTML(e);
    setSheet(true); markSel(); updateHash();
    sheet.scrollTop = 0;
  };
  App.closeSheet = () => setSheet(false);
  sheet.addEventListener('click', ev => {
    const j = ev.target.closest('[data-jump]'), p = ev.target.closest('[data-place]');
    if (j) App.jump(j.dataset.jump);
    if (p) App.go('kort', p.dataset.place);
  });
  document.getElementById('closeSheet').onclick = () => setSheet(false);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { toggleDrawer(false); setSheet(false); } });

  /* ---------- navigation ---------- */
  const stage = document.getElementById('stage');
  const NAMES = {soejler: 'Søjler', linje: 'Linje', emner: 'Emner', kort: 'Kort'};
  function updateHash() {
    const h = '#' + App.current + (App.sel ? '/' + App.sel : '');
    try { history.replaceState(null, '', h); } catch (_) { /* ignore */ }
  }
  App.go = function (name, id) {
    const v = App.views[name]; if (!v) return;
    const prevView = App.views[App.current];
    let focus = id || App.sel || null;
    if (!id && !focus && prevView && prevView.visibleId) focus = prevView.visibleId();
    const timeline = n => n === 'soejler' || n === 'linje';
    App.current = name;
    stage.innerHTML = v.render();
    document.querySelectorAll('.seg [data-v]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.v === name)));
    document.title = NAMES[name] + ' · Medborgerskabsprøven';
    if (v.bind) v.bind();
    App.applyTheme();
    if (name === 'kort' || (name === 'emner' && App.sel && byId[App.sel] && byId[App.sel].kind !== 'topic' && !isPerson(byId[App.sel]))) { App.sel = null; setSheet(false); }
    if (v.focus) v.focus(focus, !!id);
    markSel(); updateHash();
    if (!id) window.scrollTo(0, 0);
    if (document.body.style.paddingBottom === '' && sheet.classList.contains('show')) document.body.style.paddingBottom = (sheet.offsetHeight + 24) + 'px';
  };
  /* jump: open an entry in the view where it belongs */
  App.jump = function (id) {
    const e = byId[id]; if (!e) return;
    if (e.kind === 'topic') { App.go('emner', id); return; }
    if (isDated(e)) { if (App.current === 'soejler' || App.current === 'linje') { App.views[App.current].focus(id, true); App.openEntry(id); } else App.go('soejler', id); return; }
    App.openEntry(id);
  };
  document.querySelectorAll('.seg [data-v]').forEach(b => b.addEventListener('click', () => App.go(b.dataset.v)));

  /* ---------- strips (era strip + theme chips), shared by views ---------- */
  App.stripsHTML = function (opts) {
    let h = '<div class="strips">';
    if (opts.era) h += '<div class="era-strip" id="eraStrip">' + ERAS.map(e => `<button style="flex:1 1 0;background:${e.bg};color:${e.fg}" data-era="${e.id}" title="${esc(e.da)} (${e.range})"><span class="full">${esc(e.da)}<small>${e.range}</small></span><span class="sh">${SHORT[e.id]}</span></button>`).join('') + '</div>';
    h += '<div class="theme-row" id="themeRow"><button class="oftenbtn" data-often aria-pressed="' + App.onlyOften + '" title="Vis kun det, der er spurgt om i mindst to af de 13 tidligere prøver"><span class="oc"></span>Ofte til prøven</button><span class="lab">Tema</span>' + S.themes.map(t => `<button data-theme="${esc(t)}" aria-pressed="${App.theme === t}">${esc(t)}</button>`).join('') + '</div>';
    return h + '</div>';
  };
  App.bindStrips = function (jumpEra) {
    const ob = document.querySelector('[data-often]');
    if (ob) ob.addEventListener('click', () => {
      const v = App.views[App.current], keep = (v && v.visibleId && v.visibleId()) || App.sel || null;
      App.onlyOften = !App.onlyOften; App.go(App.current, keep && byId[keep] && App.keep(byId[keep]) ? keep : null);
    });
    document.querySelectorAll('[data-theme]').forEach(b => b.addEventListener('click', () => {
      App.theme = App.theme === b.dataset.theme ? null : b.dataset.theme;
      document.querySelectorAll('[data-theme]').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.theme === App.theme)));
      App.applyTheme();
    }));
    if (jumpEra) document.querySelectorAll('[data-era]').forEach(b => b.addEventListener('click', () => jumpEra(b.dataset.era)));
  };
  App.applyTheme = function () {
    document.querySelectorAll('[data-id]').forEach(el => {
      const e = byId[el.dataset.id];
      el.classList.toggle('faded', !!(App.theme && e && !(e.themes || []).includes(App.theme)));
    });
  };
  App.setEra = function (id) {
    document.querySelectorAll('.era-strip [data-era]').forEach(b => b.setAttribute('aria-current', String(b.dataset.era === id)));
  };

  /* ---------- guess drawer ---------- */
  const drawer = document.getElementById('drawer');
  function toggleDrawer(show) {
    drawer.classList.toggle('show', show); drawer.setAttribute('aria-hidden', String(!show));
    document.getElementById('openGuess').setAttribute('aria-pressed', String(show));
  }
  (function buildDrawer() {
    const withG = S.entries.filter(e => (e.guess || []).length || e.dateSupp || (e.supp || []).length);
    document.getElementById('guessList').innerHTML = withG.map(e => {
      const parts = (e.guess || []).map(g => `<p><span class="f">Skøn · ${esc(FIELD[g.field] || g.field)}</span><br>${esc(g.why)}</p>`)
        .concat(e.dateSupp ? [`<p><span class="f">Dato uden for materialet</span><br>${esc(e.dateSupp.source)}, tjekket ${esc(e.dateSupp.checked)}</p>`] : [])
        .concat((e.supp || []).map(s => `<p><span class="f">Ikke fra materialet</span><br>${esc(s.text)} (${esc(s.source)})</p>`));
      return `<div class="gl"><button data-gjump="${e.id}">${esc(e.title)}</button>${parts.join('')}</div>`;
    }).join('') || '<p>Ingen.</p>';
    document.getElementById('guessCount').textContent = withG.length;
    document.getElementById('guessList').addEventListener('click', ev => { const b = ev.target.closest('[data-gjump]'); if (b) { toggleDrawer(false); App.jump(b.dataset.gjump); App.openEntry(b.dataset.gjump); } });
  })();
  document.getElementById('openGuess').onclick = () => toggleDrawer(!drawer.classList.contains('show'));
  document.getElementById('closeDrawer').onclick = () => toggleDrawer(false);

  /* ---------- start ---------- */
  App.start = function () {
    try { history.scrollRestoration = 'manual'; } catch (_) { /* ignore */ }
    const m = location.hash.slice(1).split('/');
    const name = App.views[m[0]] ? m[0] : 'linje';
    App.go(name, null);
    if (m[1] && byId[m[1]]) {
      if (name === 'emner' || isDated(byId[m[1]]) || name === 'kort') App.jump(m[1]);
      App.openEntry(m[1]);
      const again = () => { const v = App.views[App.current]; if (v && v.focus && App.current !== 'kort') v.focus(m[1], false); };
      window.addEventListener('load', () => setTimeout(again, 50));
    }
  };
  window.addEventListener('hashchange', () => {
    const m = location.hash.slice(1).split('/');
    if (App.views[m[0]] && m[0] !== App.current) App.go(m[0]);
  });
})();
