/* Prøve: simulation of the real exam. 25 questions, 30 minutes, pass at 20 correct.
   Results are kept in localStorage (this browser only); a backup file can be saved and loaded again. */
(function () {
  const A = window.App, esc = A.esc, Q = window.QUIZ;
  const KEY = 'mbp.prove.v1', RUN = 'mbp.prove.run.v1';
  const TOTAL = Q.total, PASS = Q.pass, SECS = Q.minutes * 60;
  const LET = ['A', 'B', 'C'];
  const MONTH = {'05': 'maj', '06': 'juni', '11': 'november'};
  const KEEP_DETAILS = 30;      // full question-by-question review is kept for the latest results

  /* ---------- storage (falls back to memory when the browser refuses) ---------- */
  let mem = null, memRun = null, storageOk = true;
  const rd = k => { try { return JSON.parse(localStorage.getItem(k)); } catch (_) { storageOk = false; return null; } };
  const wr = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (_) { storageOk = false; } };
  function load() {
    const d = rd(KEY);
    if (d && Array.isArray(d.results)) return d;
    return mem || (mem = {results: [], seen: {}});
  }
  function save(d) { mem = d; wr(KEY, d); }
  const loadRun = () => rd(RUN) || memRun;
  const saveRun = r => { memRun = r; wr(RUN, r); };

  /* ---------- building a test ---------- */
  const past = Q.questions.filter(q => q.s === 'p'), fresh = Q.questions.filter(q => q.s === 'n');
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  function weight(q, seen) {
    const s = seen[q.id];
    let w = s ? (1 + 1.5 * (s.w / s.n)) / (1 + 0.25 * (s.n - s.w)) : 3;   // new ones first, missed ones come back, mastered ones fade
    if (q.s === 'p') w *= 1 + 0.5 * Math.min(q.n - 1, 3);                  // often asked in the real exams
    return Math.max(w, 0.15);
  }
  function pick(pool, n, used, seen) {
    const out = [], cand = pool.slice();
    while (out.length < n && cand.length) {
      const ws = cand.map(q => weight(q, seen));
      let r = Math.random() * ws.reduce((a, b) => a + b, 0), i = 0;
      for (; i < cand.length - 1; i++) { r -= ws[i]; if (r <= 0) break; }
      const q = cand.splice(i, 1)[0];
      if (used.has(q.e)) continue;           // one question per topic entry in a test
      used.add(q.e); out.push(q);
    }
    return out;
  }
  function buildTest() {
    const seen = load().seen, used = new Set();
    const a = pick(past, 16, used, seen), b = pick(fresh, TOTAL - a.length, used, seen);
    let qs = a.concat(b);
    if (qs.length < TOTAL) qs = qs.concat(pick(past, TOTAL - qs.length, used, seen));
    return shuffle(qs).map(q => {
      const vi = Math.floor(Math.random() * q.v.length), v = q.v[vi];
      const ord = v.o.map((_, i) => i);
      if (!v.fx) shuffle(ord);
      return {id: q.id, v: vi, ord, c: null};
    });
  }
  const byId = {}; Q.questions.forEach(q => { byId[q.id] = q; });
  function resolve(it) {
    const q = byId[it.id], v = q.v[it.v];
    return {q, text: q.q, opts: it.ord.map(i => v.o[i]), a: it.ord.indexOf(v.a)};
  }

  /* ---------- state ---------- */
  let mode = 'home', viewing = null, confirmSubmit = false, confirmClear = false, filter = 'wrong', showAll = false, msg = '', timer = null;
  let run = null;

  const fmtTime = s => String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  const fmtNum = n => (Math.round(n * 10) / 10).toString().replace('.', ',');
  const fmtDate = t => new Date(t).toLocaleString('da-DK', {day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'});
  const examLabel = x => { const m = /^(\d{4})-(\d{2})#(\d+)$/.exec(x); return m ? `${MONTH[m[2]] || m[2]} ${m[1]} (nr. ${m[3]})` : x; };
  const answered = () => run.items.filter(i => i.c != null).length;
  const left = () => Math.max(0, Math.ceil((run.deadline - Date.now()) / 1000));

  /* ---------- statistics ---------- */
  function stats(res) {
    if (!res.length) return null;
    const sc = res.map(r => r.score);
    return {n: res.length, best: Math.max(...sc), worst: Math.min(...sc), avg: sc.reduce((a, b) => a + b, 0) / sc.length, passed: res.filter(r => r.passed).length};
  }

  /* ---------- finishing ---------- */
  function finish(auto) {
    const d = load(), secs = Math.min(SECS, Math.round((Date.now() - run.start) / 1000));
    let score = 0;
    const items = run.items.map(it => {
      const r = resolve(it), ok = it.c === r.a;
      if (ok) score++;
      const s = d.seen[it.id] || (d.seen[it.id] = {n: 0, w: 0});
      s.n++; if (!ok) s.w++;
      const xs = []; r.q.v.forEach(v => v.x.forEach(x => { if (!xs.includes(x)) xs.push(x); }));
      return {q: it.id, t: r.text, o: r.opts, a: r.a, c: it.c, e: r.q.e, p: r.q.p, s: r.q.s, x: xs.slice(0, 6), ad: r.q.ad || 0};
    });
    const res = {id: String(run.start), t: Date.now(), score, total: TOTAL, secs: auto ? SECS : secs, auto: !!auto, passed: score >= PASS, items};
    d.results.push(res);
    d.results.forEach((r, i) => { if (r.items && i < d.results.length - KEEP_DETAILS) delete r.items; });
    save(d); saveRun(null); run = null;
    mode = 'result'; viewing = res.id; confirmSubmit = false; filter = res.passed && score === TOTAL ? 'all' : 'wrong';
    if (timer) { clearInterval(timer); timer = null; }
  }
  function start() {
    run = {start: Date.now(), deadline: Date.now() + SECS * 1000, items: buildTest(), cur: 0};
    saveRun(run); mode = 'run'; confirmSubmit = false; msg = '';
  }

  /* ---------- rendering ---------- */
  function homeHTML() {
    const d = load(), res = d.results, st = stats(res), last = res.slice(-20);
    let h = `<section class="pv"><div class="pv-hero"><div><h1>Prøve</h1>
      <p class="pv-lead">Øv dig som til den rigtige prøve. Hver gang får du et nyt sæt spørgsmål.</p>
      <ul class="pv-rules"><li><b>${TOTAL}</b> spørgsmål</li><li><b>${Q.minutes}</b> minutter</li><li>2 eller 3 svarmuligheder, <b>ét kryds</b> pr. spørgsmål</li><li>Du kan rette dit svar, så længe tiden løber</li><li>For at bestå skal du have mindst <b>${PASS} af ${TOTAL}</b> rigtige</li></ul>
      <p class="pv-note">Cirka to tredjedele af spørgsmålene er fra de 13 tidligere prøver (juni 2020 til juni 2026). Resten er nye spørgsmål lavet ud fra materialet, med sidehenvisning. Spørgsmål, du ikke har set, kommer først, og spørgsmål, du har svaret forkert på, kommer oftere.</p></div>
      <div class="pv-startbox"><button class="pv-start" data-act="start">Start prøve</button><span>Banken har ${Q.questions.length} spørgsmål: ${past.length} fra tidligere prøver og ${fresh.length} nye.</span></div></div>`;
    if (msg) h += `<p class="pv-msg" role="status">${esc(msg)}</p>`;
    if (!storageOk) h += '<p class="pv-warn">Din browser vil ikke gemme på denne enhed (måske et privat vindue). Resultaterne forsvinder, når du lukker siden.</p>';
    h += '<h2 class="pv-h2">Mine resultater</h2>';
    if (!st) h += '<p class="pv-empty">Ingen prøver endnu. Dine resultater gemmes her på denne enhed, når du har taget en prøve.</p>';
    else {
      const card = (l, v, s) => `<div class="pv-stat"><span class="l">${l}</span><span class="v">${v}</span>${s ? `<span class="s">${s}</span>` : ''}</div>`;
      h += `<div class="pv-stats">${card('Prøver', st.n, '')}${card('Bedste', st.best + ' / ' + TOTAL, '')}${card('Laveste', st.worst + ' / ' + TOTAL, '')}${card('Gennemsnit', fmtNum(st.avg), 'af ' + TOTAL)}${card('Bestået', st.passed + ' af ' + st.n, Math.round(100 * st.passed / st.n) + ' %')}</div>`;
      h += `<div class="pv-chart" role="img" aria-label="Seneste resultater: ${last.map(r => r.score).join(', ')} af ${TOTAL}. Beståelsesgrænsen er ${PASS}."><div class="pv-pass" style="bottom:${100 * PASS / TOTAL}%"><span>${PASS} = bestået</span></div>` +
        last.map(r => `<div class="pv-col"><span class="n">${r.score}</span><div class="bar ${r.passed ? 'ok' : 'no'}" style="height:${Math.max(3, 100 * r.score / TOTAL)}%"></div></div>`).join('') + '</div>';
      const list = showAll ? res.slice().reverse() : res.slice(-10).reverse();
      h += '<table class="pv-tbl"><thead><tr><th>Dato</th><th>Resultat</th><th>Tid</th><th></th></tr></thead><tbody>' + list.map(r =>
        `<tr><td>${esc(fmtDate(r.t))}</td><td><b>${r.score} / ${r.total}</b> <span class="pv-badge ${r.passed ? 'ok' : 'no'}">${r.passed ? 'Bestået' : 'Ikke bestået'}</span></td><td>${fmtTime(r.secs)}${r.auto ? ' (tiden gik)' : ''}</td><td>${r.items ? `<button class="pv-link" data-act="view" data-id="${r.id}">Se svar</button>` : ''}</td></tr>`).join('') + '</tbody></table>';
      if (res.length > 10) h += `<button class="pv-link" data-act="more">${showAll ? 'Vis kun de seneste 10' : 'Vis alle ' + res.length}</button>`;
    }
    h += `<div class="pv-tools"><span>Resultaterne ligger kun i denne browser.</span> <button class="pv-link" data-act="export"${res.length ? '' : ' disabled'}>Gem sikkerhedskopi</button> <label class="pv-link">Hent sikkerhedskopi<input type="file" accept="application/json,.json" id="pvImport" hidden></label>`;
    if (res.length) h += confirmClear ? ' <span class="pv-sure">Slet alle resultater? <button class="pv-link danger" data-act="clear-yes">Ja, slet</button> <button class="pv-link" data-act="clear-no">Nej</button></span>' : ' <button class="pv-link danger" data-act="clear">Slet alle resultater</button>';
    return h + '</div></section>';
  }

  function runHTML() {
    const it = run.items[run.cur], r = resolve(it), n = run.items.length, last = run.cur === n - 1;
    let h = `<section class="pv pv-run"><div class="pv-bar"><div>Spørgsmål <b>${run.cur + 1}</b> af ${n} <span class="pv-ans">· besvaret ${answered()}</span></div><div class="pv-time" id="pvTime" role="timer" aria-label="Tid tilbage">${fmtTime(left())}</div></div>
      <div class="pv-pills" role="group" aria-label="Gå til spørgsmål">${run.items.map((x, i) => `<button class="${x.c != null ? 'done' : ''}${i === run.cur ? ' cur' : ''}" data-act="goto" data-i="${i}" aria-label="Spørgsmål ${i + 1}${x.c != null ? ', besvaret' : ''}"${i === run.cur ? ' aria-current="true"' : ''}>${i + 1}</button>`).join('')}</div>
      <div class="pv-card"><h2 id="pvq">${esc(r.text)}</h2><div role="radiogroup" aria-labelledby="pvq" class="pv-opts">${r.opts.map((o, i) => `<button role="radio" aria-checked="${it.c === i}" data-act="pick" data-i="${i}"><span class="k">${LET[i]}</span><span>${esc(o)}</span></button>`).join('')}</div></div>
      <div class="pv-nav"><button class="pv-btn" data-act="prev"${run.cur === 0 ? ' disabled' : ''}>&larr; Forrige</button>${last ? '<button class="pv-btn go" data-act="submit">Aflever prøven</button>' : '<button class="pv-btn go" data-act="next">Næste &rarr;</button>'}</div>
      <p class="pv-hint">Tast A, B eller C for at svare, og pil højre og venstre for at skifte spørgsmål.</p>`;
    if (confirmSubmit) {
      const miss = n - answered();
      h += `<div class="pv-confirm" role="alertdialog" aria-label="Aflever prøven"><p>${miss ? `Du har <b>${miss}</b> ubesvarede spørgsmål. De tæller som forkerte.` : 'Du har besvaret alle spørgsmål.'} Vil du aflevere nu?</p><button class="pv-btn" data-act="cancel">Tilbage til prøven</button><button class="pv-btn go" data-act="finish">Aflever</button></div>`;
    }
    return h + '<div class="visually-hidden" id="pvLive" aria-live="polite"></div></section>';
  }

  function resultHTML() {
    const d = load(), res = d.results.find(r => r.id === viewing);
    if (!res) { mode = 'home'; return homeHTML(); }
    const st = stats(d.results), wrong = res.items ? res.items.filter(i => i.c !== i.a).length : TOTAL - res.score;
    let h = `<section class="pv"><div class="pv-result ${res.passed ? 'ok' : 'no'}"><div class="pv-score"><span>${res.score}</span> / ${res.total}</div><div><h1>${res.passed ? 'Bestået' : 'Ikke bestået'}</h1>
      <p>${res.passed ? `Du havde ${res.score} rigtige. Grænsen er ${PASS}.` : `Du havde ${res.score} rigtige. Du skal have mindst ${PASS}, så der manglede ${PASS - res.score}.`}</p>
      <p>Tid: ${fmtTime(res.secs)} af ${Q.minutes}:00${res.auto ? '. Tiden løb ud, og prøven blev afleveret automatisk.' : '.'} · ${esc(fmtDate(res.t))}</p>
      <p>Din bedste: <b>${st.best}</b> · laveste: <b>${st.worst}</b> · gennemsnit: <b>${fmtNum(st.avg)}</b> (${st.n} ${st.n === 1 ? 'prøve' : 'prøver'})</p></div></div>
      <div class="pv-nav"><button class="pv-btn go" data-act="start">Tag en ny prøve</button><button class="pv-btn" data-act="home">Mine resultater</button></div>`;
    if (!res.items) return h + '<p class="pv-empty">Svarene til denne prøve er ikke gemt længere (kun de seneste ' + KEEP_DETAILS + ' prøver gemmer svar).</p></section>';
    h += `<h2 class="pv-h2">Gennemgang</h2><div class="pv-filter"><button class="chip" data-act="filter" data-f="wrong" aria-pressed="${filter === 'wrong'}">Forkerte og ubesvarede <small>${wrong}</small></button><button class="chip" data-act="filter" data-f="all" aria-pressed="${filter === 'all'}">Alle <small>${res.items.length}</small></button></div><div class="pv-review">`;
    const shown = res.items.map((it, i) => [it, i]).filter(([it]) => filter === 'all' || it.c !== it.a);
    if (!shown.length) h += '<p class="pv-empty">Du svarede rigtigt på alle spørgsmål.</p>';
    h += shown.map(([it, i]) => {
      const ok = it.c === it.a, state = it.c == null ? 'skip' : ok ? 'ok' : 'no';
      const src = it.s === 'p' ? 'Fra tidligere prøve: ' + it.x.map(examLabel).join(', ') + (it.ad ? ' (tilpasset: kongen i stedet for dronningen)' : '') : 'Nyt spørgsmål lavet ud fra materialet';
      return `<article class="rv ${state}"><div class="rv-h"><span class="rv-n">${i + 1}</span><h3>${esc(it.t)}</h3></div><ul class="rv-o">${it.o.map((o, k) => {
        const tag = k === it.a ? '<b class="t right">Rigtigt svar</b>' : k === it.c ? '<b class="t wrong">Dit svar</b>' : '';
        return `<li class="${k === it.a ? 'right' : k === it.c ? 'wrong' : ''}"><span class="k">${LET[k]}</span><span>${esc(o)}</span>${tag}</li>`;
      }).join('')}</ul>${it.c == null ? '<p class="rv-skip">Ikke besvaret.</p>' : ''}<p class="rv-m">${esc(src)} · Kilde: s. ${it.p.join(', ')} <button class="pv-link" data-act="open" data-id="${it.e}">Læs i oversigten</button></p></article>`;
    }).join('') + '</div>';
    return h + '</section>';
  }

  function render() {
    run = loadRun();
    if (run && run.deadline && !run.done) {
      if (Date.now() >= run.deadline) finish(true);
      else if (mode !== 'result') mode = 'run';
    }
    if (mode === 'run' && !run) mode = 'home';
    return mode === 'run' ? runHTML() : mode === 'result' ? resultHTML() : homeHTML();
  }

  /* ---------- behaviour ---------- */
  const stage = () => document.getElementById('stage');
  function redraw(top) {
    stage().innerHTML = render(); bind();
    if (top) window.scrollTo(0, 0);
  }
  function tick() {
    if (A.current !== 'prove' || mode !== 'run' || !run) { clearInterval(timer); timer = null; return; }
    const s = left(), el = document.getElementById('pvTime');
    if (el) { el.textContent = fmtTime(s); el.classList.toggle('low', s <= 300); }
    const live = document.getElementById('pvLive');
    if (live && (s === 300 || s === 60)) live.textContent = s === 300 ? 'Fem minutter tilbage' : 'Ét minut tilbage';
    if (s <= 0) { finish(true); redraw(true); }
  }
  function select(i) {
    const it = run.items[run.cur];
    if (i >= it.ord.length) return;
    it.c = it.c === i ? null : i; saveRun(run);
    document.querySelectorAll('.pv-opts [role=radio]').forEach((b, k) => b.setAttribute('aria-checked', String(it.c === k)));
    const pill = document.querySelector(`.pv-pills [data-i="${run.cur}"]`);
    if (pill) pill.classList.toggle('done', it.c != null);
    const a = document.querySelector('.pv-ans'); if (a) a.textContent = '· besvaret ' + answered();
  }
  function go(i) { run.cur = Math.max(0, Math.min(run.items.length - 1, i)); saveRun(run); confirmSubmit = false; redraw(true); }

  function exportData() {
    const blob = new Blob([JSON.stringify(load())], {type: 'application/json'});
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = 'medborgerskabsproeven-resultater.json'; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 0);
  }
  function importData(file) {
    const fr = new FileReader();
    fr.onload = () => {
      try {
        const inc = JSON.parse(fr.result);
        if (!inc || !Array.isArray(inc.results) || inc.results.some(r => typeof r.score !== 'number' || typeof r.t !== 'number' || r.id == null)) throw new Error('format');
        const d = load(), have = new Set(d.results.map(r => r.id));
        let added = 0;
        inc.results.forEach(r => { if (!have.has(String(r.id))) { r.id = String(r.id); d.results.push(r); added++; } });
        d.results.sort((a, b) => a.t - b.t);
        d.results.forEach((r, i) => { if (r.items && i < d.results.length - KEEP_DETAILS) delete r.items; });
        Object.entries(inc.seen || {}).forEach(([k, s]) => { const m = d.seen[k]; if (!m) d.seen[k] = s; else { m.n = Math.max(m.n, s.n); m.w = Math.max(m.w, s.w); } });
        save(d); msg = added ? `${added} resultater hentet.` : 'Ingen nye resultater i filen.';
      } catch (_) { msg = 'Filen kunne ikke læses. Brug en sikkerhedskopi fra denne side.'; }
      redraw();
    };
    fr.readAsText(file);
  }

  function bind() {
    const root = document.querySelector('.pv'); if (!root) return;
    root.addEventListener('click', ev => {
      const b = ev.target.closest('[data-act]'); if (!b || b.disabled) return;
      const act = b.dataset.act;
      if (act === 'start') { start(); redraw(true); }
      else if (act === 'pick') select(+b.dataset.i);
      else if (act === 'next') go(run.cur + 1);
      else if (act === 'prev') go(run.cur - 1);
      else if (act === 'goto') go(+b.dataset.i);
      else if (act === 'submit') { confirmSubmit = true; redraw(); const c = document.querySelector('.pv-confirm'); if (c) c.scrollIntoView({block: 'center'}); }
      else if (act === 'cancel') { confirmSubmit = false; redraw(); }
      else if (act === 'finish') { finish(false); redraw(true); }
      else if (act === 'view') { mode = 'result'; viewing = b.dataset.id; filter = 'all'; redraw(true); }
      else if (act === 'home') { mode = 'home'; msg = ''; redraw(true); }
      else if (act === 'filter') { filter = b.dataset.f; redraw(); }
      else if (act === 'more') { showAll = !showAll; redraw(); }
      else if (act === 'open') A.openEntry(b.dataset.id);
      else if (act === 'export') exportData();
      else if (act === 'clear') { confirmClear = true; redraw(); }
      else if (act === 'clear-no') { confirmClear = false; redraw(); }
      else if (act === 'clear-yes') { const d = load(); d.results = []; d.seen = {}; save(d); confirmClear = false; msg = 'Alle resultater er slettet.'; redraw(); }
    });
    const imp = document.getElementById('pvImport');
    if (imp) imp.addEventListener('change', () => { if (imp.files[0]) importData(imp.files[0]); });
    if (mode === 'run') { if (timer) clearInterval(timer); timer = setInterval(tick, 1000); tick(); }
  }

  document.addEventListener('keydown', e => {
    if (A.current !== 'prove' || mode !== 'run' || !run || confirmSubmit || e.ctrlKey || e.metaKey || e.altKey) return;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement || {}).tagName || '')) return;
    const k = e.key.toLowerCase();
    if ('abc'.includes(k) && k.length === 1) select('abc'.indexOf(k));
    else if (['1', '2', '3'].includes(k)) select(+k - 1);
    else if (e.key === 'ArrowRight') go(run.cur + 1);
    else if (e.key === 'ArrowLeft') go(run.cur - 1);
  });

  A.prove = {buildTest, stats, weight};   // handy for testing in the console
  A.views.prove = {render, bind};
})();
