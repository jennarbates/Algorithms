/* Routing, progress, question cards, flashcards, review queue and the exam. */
(function () {
  const DATA = JSON.parse(document.getElementById('guide-data').textContent);
  const KEY = 'cs311-midterm-guide-v1';
  const blank = () => ({ marks: {}, known: {}, exam: { startedAt: null, finished: false, scores: {}, answers: {}, elapsed: 0 }, last: null });
  let store = blank();
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) store = { ...blank(), ...JSON.parse(raw) };
  } catch { /* A blocked store just means progress lasts for this visit. */ }
  const save = () => {
    try { localStorage.setItem(KEY, JSON.stringify(store)); } catch { /* same */ }
  };
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  const allQ = $$('.view .q[data-qid]');
  const qCount = (lesson) => allQ.filter((q) => lesson === undefined || q.dataset.lesson === String(lesson));

  /* --- routing ------------------------------------------------------------ */
  const views = $$('.view');
  const mounted = new Set();
  function show(id) {
    const v = views.find((x) => x.dataset.view === id) || views[0];
    const vid = v.dataset.view;
    views.forEach((x) => (x.hidden = x !== v));
    $$('.nav__item').forEach((a) => a.classList.toggle('is-on', a.dataset.view === vid));
    $$('.widget', v).forEach((w) => {
      if (!mounted.has(w)) { mounted.add(w); window.mountWidget(w); }
    });
    if (vid === 'start') renderHome();
    if (vid === 'cards') renderCards();
    if (vid === 'review') renderReview();
    if (vid === 'exam') renderExam();
    if (/^lesson-|^math$|^cheat$/.test(vid)) { store.last = vid; save(); }
    window.scrollTo(0, 0);
    $('#nav').classList.remove('is-open');
    $('#menu').setAttribute('aria-expanded', 'false');
    observeRail(v);
  }
  const route = () => show(location.hash.replace('#', '') || 'start');
  window.addEventListener('hashchange', route);
  $('#menu').addEventListener('click', () => {
    const open = $('#nav').classList.toggle('is-open');
    $('#menu').setAttribute('aria-expanded', open);
  });

  /* "On this page" scrolls rather than navigates, so the hash stays a view name. */
  document.addEventListener('click', (e) => {
    const a = e.target.closest('[data-scroll]');
    if (!a) return;
    e.preventDefault();
    const t = document.getElementById(a.dataset.scroll);
    if (t) t.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  });
  let railObs;
  function observeRail(v) {
    if (railObs) railObs.disconnect();
    const links = $$('.rail a', v);
    if (!links.length || !('IntersectionObserver' in window)) return;
    railObs = new IntersectionObserver((ents) => {
      ents.forEach((en) => {
        if (!en.isIntersecting) return;
        links.forEach((l) => l.classList.toggle('is-here', l.dataset.scroll === en.target.id));
      });
    }, { rootMargin: '-10% 0px -80% 0px' });
    $$('h3[id]', v).forEach((h) => railObs.observe(h));
  }

  /* --- question cards ----------------------------------------------------- */
  const STATE_TEXT = { got: 'Got it', review: 'Flagged for review' };
  function paintQ(q) {
    const st = store.marks[q.dataset.qid];
    if (st) q.dataset.state = st; else delete q.dataset.state;
    $('.q__state', q).textContent = STATE_TEXT[st] || '';
    $$('[data-mark]', q).forEach((b) => b.classList.toggle('is-on', b.dataset.mark === st));
  }
  function paintProgress() {
    (DATA.lessons || []).forEach((m) => {
      const qs = qCount(m.n);
      const done = qs.filter((q) => store.marks[q.dataset.qid] === 'got').length;
      const pct = qs.length ? (done / qs.length) * 100 : 0;
      const bar = $(`.nav__item[data-view="${m.id}"] .nav__bar i`);
      if (bar) bar.style.width = `${pct}%`;
      const box = $(`[data-progress="${m.id}"]`);
      if (box) {
        const flagged = qs.filter((q) => store.marks[q.dataset.qid] === 'review').length;
        box.innerHTML = `<span class="lessonprog__bar"><i style="width:${pct}%"></i></span><span>${done} of ${qs.length} questions solid${flagged ? `, ${flagged} flagged` : ''}</span>`;
      }
    });
    const n = Object.values(store.marks).filter((x) => x === 'review').length;
    const c = $('#review-count');
    c.hidden = !n;
    c.textContent = n;
  }
  allQ.forEach(paintQ);
  paintProgress();
  document.addEventListener('click', (e) => {
    const rev = e.target.closest('[data-act="reveal"]');
    if (rev) {
      const q = rev.closest('.q');
      const a = $('.q__answer', q);
      a.hidden = !a.hidden;
      rev.textContent = a.hidden ? 'Show answer' : 'Hide answer';
      return;
    }
    const mark = e.target.closest('[data-mark]');
    if (mark) {
      const q = mark.closest('.q');
      const id = q.dataset.qid;
      if (store.marks[id] === mark.dataset.mark) delete store.marks[id];
      else store.marks[id] = mark.dataset.mark;
      save();
      $$(`.q[data-qid="${id}"]`).forEach(paintQ);
      paintProgress();
    }
  });

  /* --- home --------------------------------------------------------------- */
  function renderHome() {
    const total = allQ.length;
    const got = allQ.filter((q) => store.marks[q.dataset.qid] === 'got').length;
    const flagged = allQ.filter((q) => store.marks[q.dataset.qid] === 'review').length;
    const known = Object.keys(store.known).length;
    const ex = store.exam;
    const examTxt = ex.finished ? `${examScore()} / 12` : ex.startedAt ? 'Running' : 'Not taken';
    $('#home-stats').innerHTML = [[`${got} / ${total}`, 'questions solid'], [flagged, 'flagged for review'], [`${known} / ${DATA.cards.length}`, 'flashcards known'], [examTxt, 'practice exam']].map(([b, s]) => `<div class="stat"><b>${b}</b><span>${s}</span></div>`).join('');
    const next = store.last || 'lesson-1';
    const nm = store.last ? `Continue: ${labelOf(next)}` : 'Start with Lesson 1';
    $('#home-resume').innerHTML = `<a class="btn btn--primary" href="#${next}">${nm}</a> <a class="btn" href="#exam">Practice exam</a> <a class="btn" href="#cards">Flashcards</a>`;
    $('#home-lessons').innerHTML = DATA.lessons.map((m) => {
      const qs = qCount(m.n);
      const done = qs.filter((q) => store.marks[q.dataset.qid] === 'got').length;
      return `<a class="lessonrow" href="#${m.id}"><span class="lessonrow__n">${m.n}</span><span class="lessonrow__t">${m.title}</span><span class="lessonrow__p">${done} / ${qs.length}</span><span class="lessonrow__b">${m.big.split('. ')[0]}.</span></a>`;
    }).join('');
  }
  function labelOf(id) {
    const m = DATA.lessons.find((x) => x.id === id);
    if (m) return `Lesson ${m.n}`;
    return id === 'math' ? 'Math toolkit' : 'Proof cheat sheet';
  }

  /* --- flashcards --------------------------------------------------------- */
  let deck = [];
  let cardFilter = 'all';
  let flipped = false;
  const cardRoot = $('#cards-root');
  function buildDeck() {
    deck = DATA.cards.map((c, i) => ({ ...c, i })).filter((c) => (cardFilter === 'all' ? true : cardFilter === 'ref' ? c.l === null : String(c.l) === cardFilter));
    deck = deck.filter((c) => !store.known[c.f]).concat(deck.filter((c) => store.known[c.f]));
    flipped = false;
  }
  function renderCards() {
    if (!deck.length) buildDeck();
    drawCard();
  }
  function drawCard() {
    const lessons = [...new Set(DATA.cards.map((c) => c.l).filter((x) => x !== null))];
    const scope = DATA.cards.filter((c) => (cardFilter === 'all' ? true : cardFilter === 'ref' ? c.l === null : String(c.l) === cardFilter));
    const knownN = scope.filter((c) => store.known[c.f]).length;
    const opts = [['all', 'All cards'], ...lessons.map((l) => [String(l), `Lesson ${l}`]), ['ref', 'Running times and proof patterns']];
    const c = deck[0];
    const allKnown = knownN === scope.length;
    cardRoot.innerHTML = `<div class="fc__bar"><select id="fc-filter" class="select" aria-label="Which cards">${opts.map(([v, t]) => `<option value="${v}" ${v === cardFilter ? 'selected' : ''}>${t}</option>`).join('')}</select><span>${knownN} of ${scope.length} known</span>${knownN ? '<button class="btn btn--quiet" type="button" id="fc-reset">Forget these</button>' : ''}</div>` +
      (allKnown ? `<div class="empty">You know all ${scope.length} of these. Pick another set, or forget them and go again.</div>` :
        `<article class="fc"><div><div class="fc__meta">${c.l ? `Lesson ${c.l}` : 'Reference'}</div><div class="fc__front">${c.f}</div></div>${flipped ? `<div class="fc__back">${c.b}</div>` : ''}<div class="fc__row">${flipped ? '<button class="btn btn--good" type="button" id="fc-yes">I knew it</button><button class="btn btn--warn" type="button" id="fc-no">Show again soon</button>' : '<button class="btn btn--primary" type="button" id="fc-flip">Show the answer</button>'}<span class="note" style="color:var(--ink-faint);font-size:12.5px">State it exactly, out loud or on paper, before you flip.</span></div></article>`);
  }
  cardRoot.addEventListener('change', (e) => {
    if (e.target.id === 'fc-filter') { cardFilter = e.target.value; buildDeck(); drawCard(); }
  });
  cardRoot.addEventListener('click', (e) => {
    const id = e.target.id;
    if (id === 'fc-flip') { flipped = true; drawCard(); }
    else if (id === 'fc-yes') {
      store.known[deck[0].f] = true;
      save();
      deck.push(deck.shift());
      deck = deck.filter((c) => !store.known[c.f]).concat(deck.filter((c) => store.known[c.f]));
      flipped = false;
      drawCard();
    } else if (id === 'fc-no') {
      const c = deck.shift();
      deck.splice(Math.min(3, deck.length), 0, c);
      flipped = false;
      drawCard();
    } else if (id === 'fc-reset') {
      DATA.cards.forEach((c) => { if (cardFilter === 'all' || (cardFilter === 'ref' ? c.l === null : String(c.l) === cardFilter)) delete store.known[c.f]; });
      save();
      buildDeck();
      drawCard();
    }
  });

  /* --- review queue ------------------------------------------------------- */
  function renderReview() {
    const root = $('#review-root');
    root.innerHTML = '';
    const flagged = allQ.filter((q) => store.marks[q.dataset.qid] === 'review');
    if (!flagged.length) {
      root.innerHTML = '<div class="empty">Nothing flagged yet. When a question gives you trouble, open its answer and press Review later. It will appear here so you can retry it just before the exam.</div>';
      return;
    }
    flagged.forEach((q) => {
      const copy = q.cloneNode(true);
      $('.q__answer', copy).hidden = true;
      $('[data-act="reveal"]', copy).textContent = 'Show answer';
      const m = DATA.lessons.find((x) => String(x.n) === q.dataset.lesson);
      if (m) $('.q__tag', copy).innerHTML += ` · <a href="#${m.id}">Lesson ${m.n}</a>`;
      root.append(copy);
    });
  }

  /* --- practice exam ------------------------------------------------------ */
  const EXAM_MS = 2 * 60 * 60 * 1000;
  let examTick = null;
  const examScore = () => Object.values(store.exam.scores).reduce((a, s) => a + (s === 'full' ? 1 : s === 'part' ? 0.5 : 0), 0);
  const fmtTime = (ms) => {
    const s = Math.max(0, Math.round(ms / 1000));
    const pad = (n) => String(n).padStart(2, '0');
    return `${Math.floor(s / 3600)}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
  };
  const elapsed = () => (store.exam.startedAt ? Date.now() - store.exam.startedAt : 0);
  function renderExam() {
    const ex = store.exam;
    const bar = $('#exam-bar');
    clearInterval(examTick);
    const cards_ = $$('[data-exam]');
    const scored = Object.keys(ex.scores).length;
    if (ex.finished) {
      bar.innerHTML = `<span class="timer">${examScore()} / 12</span><span class="exambar__note">${scored < 12 ? `Score the other ${12 - scored} problem${12 - scored > 1 ? 's' : ''} from the solutions below.` : 'All 12 scored. Flag the weak topics and retake it later.'} Took ${fmtTime(ex.elapsed)}.</span><button class="btn" type="button" id="exam-again">Start over</button>`;
    } else if (ex.startedAt) {
      bar.innerHTML = `<span class="timer" id="exam-clock" role="timer"></span><span class="exambar__note">Closed book, no electronics. Solutions open when you finish.</span><button class="btn btn--primary" type="button" id="exam-finish">Finish and see solutions</button>`;
      const clock = $('#exam-clock');
      const tick = () => {
        const left = EXAM_MS - elapsed();
        clock.textContent = fmtTime(left);
        clock.classList.toggle('is-low', left < 10 * 60 * 1000);
        if (left <= 0) { clearInterval(examTick); finishExam(); }
      };
      tick();
      examTick = setInterval(tick, 1000);
    } else {
      bar.innerHTML = '<span class="timer">2:00:00</span><span class="exambar__note">Timing is optional. You can also just study the problems below and open each solution as you go.</span><button class="btn btn--primary" type="button" id="exam-start">Start the timer</button>';
    }
    cards_.forEach((c) => {
      const id = c.dataset.exam;
      const ans = $('.q__answer', c);
      const ta = $('textarea', c);
      if (document.activeElement !== ta) ta.value = ex.answers[id] || '';
      let open = $('[data-exam-open]', c);
      if (ex.finished) { ans.hidden = false; if (open) open.hidden = true; }
      else if (ex.startedAt) { ans.hidden = true; if (open) open.hidden = true; }
      else {
        if (!open) {
          open = document.createElement('button');
          open.className = 'btn btn--quiet';
          open.type = 'button';
          open.dataset.examOpen = '1';
          open.style.alignSelf = 'flex-start';
          c.insertBefore(open, ans);
        }
        open.hidden = false;
        open.textContent = ans.hidden ? 'Show solution' : 'Hide solution';
      }
      $$('[data-score]', c).forEach((b) => b.classList.toggle('is-on', ex.scores[id] === b.dataset.score));
    });
  }
  function finishExam() {
    store.exam.elapsed = elapsed();
    store.exam.finished = true;
    save();
    renderExam();
  }
  document.addEventListener('click', (e) => {
    if (e.target.id === 'exam-start') { store.exam = { ...blank().exam, answers: store.exam.answers, startedAt: Date.now() }; save(); renderExam(); }
    if (e.target.id === 'exam-finish') finishExam();
    if (e.target.id === 'exam-again') { store.exam = blank().exam; save(); $$('[data-exam] .q__answer').forEach((a) => (a.hidden = true)); renderExam(); }
    if (e.target.dataset && e.target.dataset.examOpen) {
      const ans = $('.q__answer', e.target.closest('[data-exam]'));
      ans.hidden = !ans.hidden;
      e.target.textContent = ans.hidden ? 'Show solution' : 'Hide solution';
    }
    const sc = e.target.closest('[data-score]');
    if (sc) {
      const id = sc.closest('[data-exam]').dataset.exam;
      if (store.exam.scores[id] === sc.dataset.score) delete store.exam.scores[id];
      else store.exam.scores[id] = sc.dataset.score;
      save();
      renderExam();
    }
  });
  document.addEventListener('input', (e) => {
    const c = e.target.closest && e.target.closest('[data-exam]');
    if (c && e.target.tagName === 'TEXTAREA') { store.exam.answers[c.dataset.exam] = e.target.value; save(); }
  });

  /* --- search ------------------------------------------------------------- */
  const index = [];
  $$('.view[data-view]').forEach((v) => {
    const vid = v.dataset.view;
    const vt = ($('h1', v) || {}).textContent || '';
    $$('.sub', v).forEach((s) => {
      const c = s.cloneNode(true);
      $$('.q__answer, .widget, .q__act', c).forEach((x) => x.remove());
      const h = $('h3', c);
      index.push({ vid, vt, sub: s.dataset.sub, title: h ? h.textContent : vt, text: c.textContent.replace(/\s+/g, ' ') });
    });
  });
  const searchIn = $('#search');
  const searchOut = $('#search-out');
  const safe = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
  searchIn.addEventListener('input', () => {
    const q = searchIn.value.trim().toLowerCase();
    if (q.length < 2) { searchOut.hidden = true; return; }
    const hits = index.filter((r) => r.text.toLowerCase().includes(q) || r.title.toLowerCase().includes(q)).slice(0, 12);
    searchOut.hidden = false;
    searchOut.innerHTML = hits.length ? hits.map((r) => {
      const i = r.text.toLowerCase().indexOf(q);
      const from = Math.max(0, i - 30);
      const snip = i >= 0 ? `${from ? '…' : ''}${safe(r.text.slice(from, i))}<mark>${safe(r.text.slice(i, i + q.length))}</mark>${safe(r.text.slice(i + q.length, i + q.length + 40))}…` : '';
      return `<a href="#${r.vid}" data-goto="${r.sub}"><small>${safe(r.vt)}</small>${safe(r.title)}<small>${snip}</small></a>`;
    }).join('') : '<div class="search__none">No matches in the guide.</div>';
  });
  searchOut.addEventListener('click', (e) => {
    const a = e.target.closest('[data-goto]');
    if (!a) return;
    e.preventDefault();
    const vid = a.getAttribute('href').slice(1);
    if (location.hash.slice(1) !== vid) location.hash = vid;
    else show(vid);
    setTimeout(() => {
      const s = document.querySelector(`[data-sub="${a.dataset.goto}"]`);
      if (s) s.scrollIntoView();
    }, 40);
  });

  route();
})();
