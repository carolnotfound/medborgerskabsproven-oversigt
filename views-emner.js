/* Emner: undated knowledge as cards in five shapes, plus person cards. */
(function () {
  const A = window.App, S = A.S, esc = A.esc;
  const TOPICS = S.entries.filter(e => e.kind === 'topic');
  const PEOPLE = S.entries.filter(e => A.isPerson(e)).sort((a, b) => (a.start || 0) - (b.start || 0));
  let topics = TOPICS, people = PEOPLE;
  let areas = S.topicAreas;
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  let chip = 'alle';
  const NUM = /^(\d+(?:[.,]\d+)*)(?=$|[\s;:(])/;
  const items = e => (e.items || []).filter(i => i.value);

  function shapeHTML(e) {
    const it = items(e);
    switch (e.shape) {
      case 'hvem-bestemmer-hvad':
        return '<div class="cols">' + it.map(i => `<div class="col"><span class="l">${esc(i.label)}</span><span class="t">${esc(i.value)}</span></div>`).join('') + '</div>';
      case 'trappe':
        return '<ol class="ladder">' + it.map(i => `<li><span class="l">${esc(i.label)}</span><span class="t">${esc(i.value)}</span></li>`).join('') + '</ol>';
      case 'proces':
        return '<ol class="steps">' + it.map(i => /^\d+$/.test(i.label) ? `<li><span class="num">${i.label}</span><span>${esc(i.value)}</span></li>` : `<li><span class="num w">${esc(i.label)}</span><span>${esc(i.value)}</span></li>`).join('') + '</ol>';
      case 'rettigheder-og-pligter':
        return '<ul class="rp">' + it.map(i => {
          const l = i.label;
          if (/^(Ret|Rettigheder)$/.test(l)) return `<li><span class="tag">Ret</span><span>${esc(i.value)}</span></li>`;
          if (/^Pligt/.test(l)) return `<li><span class="tag p">Pligt</span><span>${esc(i.value)}</span></li>`;
          if (/^(Grænse|Undtagelse)/.test(l)) return `<li><span class="tag p">${esc(l)}</span><span>${esc(i.value)}</span></li>`;
          return `<li><span><span class="lab">${esc(l)}:</span> ${esc(i.value)}</span></li>`;
        }).join('') + '</ul>';
      default:
        return '<div class="tiles">' + it.map(i => {
          const m = NUM.exec(i.value);
          return m ? `<div class="tile"><span class="l">${esc(i.label)}</span><span class="n">${esc(m[1])}</span><span class="t">${esc(i.value.slice(m[1].length).replace(/^[\s,;:]+/, ''))}</span></div>`
            : `<div class="tile"><span class="l">${esc(i.label)}</span><span class="t">${esc(i.value)}</span></div>`;
        }).join('') + '</div>';
    }
  }
  function cardHTML(e) {
    const ex = A.often(e) ? ' ex' : '';
    return `<button class="card${ex}" data-id="${e.id}"><span class="k">${esc(cap(e.topicArea || ''))}</span><h3>${esc(e.title)}</h3><p class="tz">${esc(e.teaser)}</p>${shapeHTML(e)}<div class="src">Kilde: ${esc('s. ' + e.pages.join(', '))}</div></button>`;
  }
  function personHTML(e) {
    const era = A.eraOf(e.era), wk = (e.works || []).map(w => `<li>${esc(w.title)}${w.year ? ' (' + w.year + ')' : ''}</li>`).join('');
    return `<button class="card person${A.often(e) ? ' ex' : ''}" data-id="${e.id}" style="border-left-color:${era.bg}"><span class="k">${esc(cap(e.label))}</span><h3>${esc(e.title)}</h3><p class="yrs">${esc(e.date || '')}${A.rdot(e)}</p><p class="tz">${esc(e.teaser)}</p>${wk ? `<ul class="works">${wk}</ul>` : ''}<div class="src">Kilde: ${esc('s. ' + e.pages.join(', '))}</div></button>`;
  }
  function prep() {
    topics = TOPICS.filter(A.keep); people = PEOPLE.filter(A.keep);
    areas = S.topicAreas.filter(a => topics.some(t => t.topicArea === a));
    if (chip !== 'alle' && chip !== 'personer' && !areas.includes(chip)) chip = 'alle';
  }
  function cardsHTML() {
    if (!(topics.length + people.length)) return '<p class="mode-note">Ingen emner passer.</p>';
    if (chip === 'personer') return people.map(personHTML).join('');
    const list = chip === 'alle' ? areas.flatMap(a => topics.filter(t => t.topicArea === a)) : topics.filter(t => t.topicArea === chip);
    return list.map(cardHTML).join('');
  }
  function chipsHTML() {
    const mk = (k, t, n) => `<button class="chip" data-chip="${k}" aria-pressed="${chip === k}">${esc(t)} <small>${n}</small></button>`;
    return mk('alle', 'Alle', topics.length) + areas.map(a => mk(a, cap(a), topics.filter(t => t.topicArea === a).length)).join('') + mk('personer', 'Personer', people.length);
  }
  function refresh() {
    document.getElementById('cards').innerHTML = cardsHTML();
    document.querySelectorAll('[data-chip]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.chip === chip)));
    bindCards(); A.applyTheme(); markSelCards();
  }
  function markSelCards() { document.querySelectorAll('.card').forEach(c => c.classList.toggle('sel', c.dataset.id === A.sel)); }
  function bindCards() {
    document.querySelectorAll('.card').forEach(c => c.addEventListener('click', () => { if (A.sel === c.dataset.id) A.closeSheet(); else A.openEntry(c.dataset.id); }));
  }
  A.views.emner = {
    render() {
      prep();
      return A.stripsHTML({era: false}) + `<div class="mode-note">Emner er viden uden årstal: tal, regler, hvem der bestemmer hvad. Tryk på et kort for at læse resuméet og se kilden.${A.filtering() ? ' <b>Filter: ' + esc(A.filterLabel()) + ' (' + (topics.length + people.length) + ' kort).</b>' : ''}</div><div class="topic-chips" id="topicChips">${chipsHTML()}</div><div class="cards" id="cards">${cardsHTML()}</div>`;
    },
    bind() {
      A.bindStrips(null);
      document.querySelectorAll('[data-chip]').forEach(b => b.addEventListener('click', () => { chip = b.dataset.chip; refresh(); }));
      bindCards();
    },
    focus(id, open) {
      const e = id && A.byId[id];
      if (!e) return;
      if (e.kind === 'topic') { if (chip !== 'alle' && chip !== e.topicArea) chip = e.topicArea; } else if (A.isPerson(e)) chip = 'personer'; else return;
      refresh();
      const c = document.querySelector(`.card[data-id="${id}"]`);
      if (c && open) { c.scrollIntoView({block: 'center'}); A.openEntry(id); }
    }
  };
})();
