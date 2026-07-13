'use strict';

/* ============================== STORAGE ============================== */
const Store = {
  get(key, fallback){
    try{ const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
    catch(e){ return fallback; }
  },
  set(key, val){ try{ localStorage.setItem(key, JSON.stringify(val)); }catch(e){} }
};

const KEYS = {
  favorites: 'noor.favorites',
  notes: 'noor.notes',
  journal: 'noor.journal',
  dhikrHistory: 'noor.dhikr.history',
  dhikrTarget: 'noor.dhikr.target',
  goodDeeds: 'noor.gooddeeds',
  memProgress: 'noor.mem.progress',
  quizStats: 'noor.quiz.stats',
  fontScale: 'noor.fontScale',
  highContrast: 'noor.highContrast'
};

const CATEGORY_COLORS = {
  Mercy:'#5FA88C', Forgiveness:'#7C9E6B', Knowledge:'#6E9BC7', Power:'#B3563C',
  Creation:'#8E7BC0', Sustenance:'#C9A34E', Guidance:'#4FB0AE', Protection:'#5B7FB5',
  Justice:'#A4763B', Love:'#C4577A', Patience:'#8A9A5B', Majesty:'#C9A34E', Beauty:'#C48A4E'
};

let state = {
  view: 'names',
  search: '',
  category: 'All',
  onlyFav: false,
  activeModalId: null,
  memSet: null,
  memIndex: 0,
  quiz: null
};

/* ============================== HELPERS ============================== */
function todayKey(){ return new Date().toISOString().slice(0,10); }
function dayOfYear(d){ const start = new Date(d.getFullYear(),0,0); return Math.floor((d-start)/86400000); }
function nameById(id){ return NAMES_DATA.find(n => n.id === id); }
function toast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(()=>t.classList.remove('show'), 2200);
}
function catColor(cat){ return CATEGORY_COLORS[cat] || '#C9A34E'; }
function escapeHtml(s){ return (s+'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

const STAR_SVG = `<svg viewBox="0 0 24 24" fill="currentColor" class="star-glyph"><path d="M12 1l2.6 6.2L21 8.2l-5 4.6 1.5 6.9L12 16.4 6.5 19.7 8 12.8 3 8.2l6.4-1 2.6-6.2z"/></svg>`;
const CORNER_SVG = `<svg class="corner" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 2h8M2 2v8"/><circle cx="2" cy="2" r="1.2" fill="currentColor" stroke="none"/></svg>`;

/* ============================== NAVIGATION ============================== */
function setView(view){
  state.view = view;
  document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === 'view-' + view));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  if(view === 'quiz' && !state.quiz) initQuiz();
  if(view === 'memorize') renderMemorize();
  if(view === 'dashboard') renderDashboard();
  if(view === 'journal') renderJournal();
  if(view === 'dhikr') renderDhikr();
  window.scrollTo({top:0, behavior:'smooth'});
}

/* ============================== NAME OF THE DAY ============================== */
function getDailyName(){
  const idx = dayOfYear(new Date()) % 99;
  return NAMES_DATA[idx];
}

function renderHero(){
  const n = getDailyName();
  document.getElementById('hero-ar').textContent = n.ar;
  document.getElementById('hero-translit').textContent = n.translit;
  document.getElementById('hero-meaning').textContent = n.meaning;
  document.getElementById('hero-reflection').textContent = '"' + n.reflection + '"';
  document.getElementById('hero-action').textContent = n.action;
  document.getElementById('hero-open').onclick = () => openModal(n.id);
  const doneToday = Store.get(KEYS.goodDeeds, {})[todayKey()+'-'+n.id];
  const btn = document.getElementById('hero-done-btn');
  btn.textContent = doneToday ? '✓ Marked done today' : 'Mark today\'s action done';
  btn.classList.toggle('btn-gold', !doneToday);
  btn.onclick = () => {
    const gd = Store.get(KEYS.goodDeeds, {});
    gd[todayKey()+'-'+n.id] = true;
    Store.set(KEYS.goodDeeds, gd);
    toast('Marked — may it be accepted.');
    renderHero();
  };
}

/* ============================== NAME GRID ============================== */
function filteredNames(){
  const s = state.search.trim().toLowerCase();
  return NAMES_DATA.filter(n => {
    if(state.category !== 'All' && n.category !== state.category) return false;
    if(state.onlyFav){
      const favs = Store.get(KEYS.favorites, []);
      if(!favs.includes(n.id)) return false;
    }
    if(!s) return true;
    return n.ar.includes(s) || n.translit.toLowerCase().includes(s) ||
           n.meaning.toLowerCase().includes(s) || n.category.toLowerCase().includes(s);
  });
}

function renderGrid(){
  const grid = document.getElementById('name-grid');
  const list = filteredNames();
  if(list.length === 0){
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
      <div>No names match your search. Try a different word or clear the filter.</div>
    </div>`;
    return;
  }
  const favs = Store.get(KEYS.favorites, []);
  grid.innerHTML = list.map(n => `
    <div class="name-card" data-id="${n.id}" tabindex="0" role="button" aria-label="${n.translit}, ${n.meaning}">
      ${CORNER_SVG.replace('corner','corner tl')}
      <div class="cat-dot" style="background:${catColor(n.category)}" title="${n.category}"></div>
      <div class="num">${String(n.id).padStart(2,'0')} · ${n.category}</div>
      <div class="ar">${n.ar}</div>
      <div class="tl">${n.translit}</div>
      <div class="mn">${n.meaning}</div>
      <button class="fav-btn ${favs.includes(n.id)?'active':''}" data-fav="${n.id}" aria-label="Toggle favorite">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="${favs.includes(n.id)?'currentColor':'none'}" stroke="currentColor" stroke-width="1.5"><path d="M12 21s-7.5-4.6-10-9.3C0.3 8 2 4.5 5.6 4c2-.3 3.8.6 4.9 2.3C11.6 4.6 13.4 3.7 15.4 4c3.6.5 5.3 4 3.6 7.7C16.5 16.4 12 21 12 21z"/></svg>
      </button>
    </div>
  `).join('');

  grid.querySelectorAll('.name-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if(e.target.closest('.fav-btn')) return;
      openModal(Number(card.dataset.id));
    });
    card.addEventListener('keydown', e => { if(e.key === 'Enter') openModal(Number(card.dataset.id)); });
  });
  grid.querySelectorAll('.fav-btn').forEach(btn => {
    btn.addEventListener('click', () => toggleFavorite(Number(btn.dataset.fav)));
  });
}

function toggleFavorite(id){
  let favs = Store.get(KEYS.favorites, []);
  if(favs.includes(id)){ favs = favs.filter(x => x !== id); toast('Removed from favorites'); }
  else { favs.push(id); toast('Added to favorites'); }
  Store.set(KEYS.favorites, favs);
  renderGrid();
  if(state.activeModalId === id) renderModalFavState(id);
}

/* ============================== MODAL ============================== */
function openModal(id){
  const n = nameById(id);
  state.activeModalId = id;
  const overlay = document.getElementById('modal-overlay');
  document.getElementById('modal-num').textContent = String(n.id).padStart(2,'0') + ' / 99';
  document.getElementById('modal-ar').textContent = n.ar;
  document.getElementById('modal-tl').textContent = n.translit;
  document.getElementById('modal-mn').textContent = n.meaning;
  const catEl = document.getElementById('modal-cat');
  catEl.textContent = n.category;
  catEl.style.background = catColor(n.category) + '33';
  catEl.style.color = catColor(n.category);
  document.getElementById('modal-short').textContent = n.short;
  document.getElementById('modal-deep').textContent = n.deep;
  document.getElementById('modal-ref-wrap').style.display = n.ref ? 'block' : 'none';
  document.getElementById('modal-ref').textContent = n.ref || '';
  document.getElementById('modal-reflection').textContent = n.reflection;
  document.getElementById('modal-action').textContent = n.action;
  const notes = Store.get(KEYS.notes, {});
  document.getElementById('modal-notes').value = notes[id] || '';
  renderModalFavState(id);
  overlay.classList.add('open');
  document.getElementById('modal-close').focus();
}
function renderModalFavState(id){
  const favs = Store.get(KEYS.favorites, []);
  const btn = document.getElementById('modal-fav');
  btn.classList.toggle('active', favs.includes(id));
}
function closeModal(){
  document.getElementById('modal-overlay').classList.remove('open');
  state.activeModalId = null;
}

function initModal(){
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal-overlay').addEventListener('click', e => { if(e.target.id === 'modal-overlay') closeModal(); });
  document.addEventListener('keydown', e => { if(e.key === 'Escape') closeModal(); });
  document.getElementById('modal-fav').addEventListener('click', () => toggleFavorite(state.activeModalId));
  document.getElementById('modal-copy').addEventListener('click', () => {
    const n = nameById(state.activeModalId);
    const text = `${n.ar} — ${n.translit} (${n.meaning})`;
    navigator.clipboard?.writeText(text).then(()=>toast('Copied to clipboard'));
  });
  document.getElementById('modal-share').addEventListener('click', () => {
    const n = nameById(state.activeModalId);
    const text = `${n.ar} — ${n.translit}: ${n.meaning}`;
    if(navigator.share){ navigator.share({ title: 'Asma-ul-Husna', text }); }
    else { navigator.clipboard?.writeText(text); toast('Copied — sharing not supported here'); }
  });
  document.getElementById('modal-notes').addEventListener('input', (e) => {
    const notes = Store.get(KEYS.notes, {});
    notes[state.activeModalId] = e.target.value;
    Store.set(KEYS.notes, notes);
  });
}

/* ============================== SEARCH / FILTER UI ============================== */
function initControls(){
  const search = document.getElementById('search-input');
  search.addEventListener('input', e => { state.search = e.target.value; renderGrid(); });

  const catSelect = document.getElementById('category-select');
  const cats = ['All', ...Array.from(new Set(NAMES_DATA.map(n=>n.category))).sort()];
  catSelect.innerHTML = cats.map(c => `<option value="${c}">${c}</option>`).join('');
  catSelect.addEventListener('change', e => { state.category = e.target.value; renderGrid(); });

  document.getElementById('fav-filter-btn').addEventListener('click', (e) => {
    state.onlyFav = !state.onlyFav;
    e.currentTarget.classList.toggle('active', state.onlyFav);
    renderGrid();
  });
}

/* ============================== DHIKR COUNTER ============================== */
const COMMON_ADHKAR = [
  { label: 'SubhanAllah (33x)', target: 33 },
  { label: 'Alhamdulillah (33x)', target: 33 },
  { label: 'Allahu Akbar (34x)', target: 34 },
  { label: 'Astaghfirullah (100x)', target: 100 },
  { label: 'La ilaha illallah (100x)', target: 100 }
];

function renderDhikr(){
  const history = Store.get(KEYS.dhikrHistory, {});
  const today = history[todayKey()] || { count: 0 };
  const target = Store.get(KEYS.dhikrTarget, 33);
  document.getElementById('tasbih-count').textContent = today.count;
  document.getElementById('tasbih-target').textContent = 'Target: ' + target;
  const pct = Math.min(100, Math.round((today.count/target)*100));
  document.getElementById('tasbih-ring-fill').style.background =
    `conic-gradient(var(--gold) ${pct*3.6}deg, transparent 0deg)`;

  const list = document.getElementById('dhikr-preset-list');
  list.innerHTML = COMMON_ADHKAR.map(d => `<button data-target="${d.target}">${d.label}</button>`).join('');
  list.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      Store.set(KEYS.dhikrTarget, Number(btn.dataset.target));
      renderDhikr();
    });
  });

  renderStreaks();
}

function tapDhikr(){
  const history = Store.get(KEYS.dhikrHistory, {});
  const key = todayKey();
  if(!history[key]) history[key] = { count: 0 };
  history[key].count += 1;
  Store.set(KEYS.dhikrHistory, history);
  renderDhikr();
  if(navigator.vibrate) navigator.vibrate(8);
}

function currentStreak(){
  const history = Store.get(KEYS.dhikrHistory, {});
  let streak = 0;
  let d = new Date();
  while(true){
    const key = d.toISOString().slice(0,10);
    if(history[key] && history[key].count > 0){ streak++; d.setDate(d.getDate()-1); }
    else break;
  }
  return streak;
}

function renderStreaks(){
  const streak = currentStreak();
  const history = Store.get(KEYS.dhikrHistory, {});
  const totalAllTime = Object.values(history).reduce((a,b)=>a+(b.count||0),0);
  document.getElementById('streak-badges').innerHTML = `
    <div class="streak-badge">🔥 ${streak} day streak</div>
    <div class="streak-badge">Σ ${totalAllTime} total dhikr</div>
  `;
}

function initDhikr(){
  document.getElementById('tasbih-tap').addEventListener('click', tapDhikr);
  document.getElementById('tasbih-reset').addEventListener('click', () => {
    const history = Store.get(KEYS.dhikrHistory, {});
    history[todayKey()] = { count: 0 };
    Store.set(KEYS.dhikrHistory, history);
    renderDhikr();
  });
}

/* ============================== REFLECTION JOURNAL ============================== */
function renderJournal(){
  const entries = Store.get(KEYS.journal, []);
  const list = document.getElementById('journal-list');
  if(entries.length === 0){
    list.innerHTML = `<div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 4h16v16H4z"/><path d="M8 8h8M8 12h8M8 16h5"/></svg><div>No reflections yet. Write your first one.</div></div>`;
    return;
  }
  list.innerHTML = entries.slice().reverse().map((e, revIdx) => {
    const idx = entries.length - 1 - revIdx;
    const n = e.nameId ? nameById(e.nameId) : null;
    return `<div class="journal-entry">
      <div class="je-head"><span>${e.date}${n ? ' · ' + n.translit : ''}</span>
      <button class="je-del" data-idx="${idx}" aria-label="Delete entry">✕</button></div>
      <div class="je-body">${escapeHtml(e.text)}</div>
    </div>`;
  }).join('');
  list.querySelectorAll('.je-del').forEach(btn => {
    btn.addEventListener('click', () => {
      const entries = Store.get(KEYS.journal, []);
      entries.splice(Number(btn.dataset.idx), 1);
      Store.set(KEYS.journal, entries);
      renderJournal();
    });
  });
}

function initJournal(){
  document.getElementById('journal-save').addEventListener('click', () => {
    const textarea = document.getElementById('journal-input');
    const text = textarea.value.trim();
    if(!text) return;
    const entries = Store.get(KEYS.journal, []);
    entries.push({ date: new Date().toLocaleDateString(), text, nameId: getDailyName().id });
    Store.set(KEYS.journal, entries);
    textarea.value = '';
    renderJournal();
    toast('Reflection saved');
  });
}

/* ============================== QUIZ MODE ============================== */
function shuffle(arr){ return arr.map(v=>[Math.random(),v]).sort((a,b)=>a[0]-b[0]).map(v=>v[1]); }

function buildQuizQuestions(mode, count){
  const pool = shuffle(NAMES_DATA).slice(0, count);
  return pool.map(n => {
    const distractors = shuffle(NAMES_DATA.filter(x => x.id !== n.id)).slice(0,3);
    if(mode === 'meaning-to-name'){
      const options = shuffle([n, ...distractors]);
      return { q: `Which Name means: "${n.meaning}"?`, options: options.map(o=>o.translit + ' — ' + o.ar), correct: options.findIndex(o=>o.id===n.id) };
    } else if(mode === 'name-to-meaning'){
      const options = shuffle([n, ...distractors]);
      return { q: `What does ${n.translit} (${n.ar}) mean?`, options: options.map(o=>o.meaning), correct: options.findIndex(o=>o.id===n.id) };
    } else {
      const options = shuffle([n, ...distractors]);
      return { q: `Which transliteration matches ${n.ar}?`, options: options.map(o=>o.translit), correct: options.findIndex(o=>o.id===n.id) };
    }
  });
}

function initQuiz(mode){
  mode = mode || 'meaning-to-name';
  state.quiz = { mode, questions: buildQuizQuestions(mode, 10), idx: 0, score: 0, answered: false };
  renderQuiz();
}

function renderQuiz(){
  const q = state.quiz;
  if(q.idx >= q.questions.length){
    const stats = Store.get(KEYS.quizStats, { best: 0, played: 0 });
    stats.played += 1;
    stats.best = Math.max(stats.best, q.score);
    Store.set(KEYS.quizStats, stats);
    document.getElementById('quiz-body').innerHTML = `
      <div class="quiz-card">
        <div class="quiz-score">${q.score} / ${q.questions.length}</div>
        <p class="muted">Quiz complete. Best score so far: ${stats.best}/10.</p>
        <button class="btn btn-gold" id="quiz-restart">Play again</button>
      </div>`;
    document.getElementById('quiz-restart').addEventListener('click', () => initQuiz(q.mode));
    return;
  }
  const item = q.questions[q.idx];
  document.getElementById('quiz-progress-fill').style.width = ((q.idx)/q.questions.length*100) + '%';
  document.getElementById('quiz-body').innerHTML = `
    <div class="quiz-card">
      <p class="muted">Question ${q.idx+1} of ${q.questions.length} · Score: ${q.score}</p>
      <div class="quiz-q">${item.q}</div>
      <div class="quiz-options">
        ${item.options.map((o,i)=>`<button class="quiz-opt" data-i="${i}">${o}</button>`).join('')}
      </div>
    </div>`;
  document.querySelectorAll('.quiz-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      if(q.answered) return;
      q.answered = true;
      const i = Number(btn.dataset.i);
      document.querySelectorAll('.quiz-opt').forEach((b,bi) => {
        if(bi === item.correct) b.classList.add('correct');
        else if(bi === i) b.classList.add('wrong');
      });
      if(i === item.correct) q.score++;
      setTimeout(() => { q.idx++; q.answered = false; renderQuiz(); }, 900);
    });
  });
}

function initQuizControls(){
  document.querySelectorAll('.quiz-mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.quiz-mode-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      initQuiz(btn.dataset.mode);
    });
  });
}

/* ============================== MEMORIZATION MODE ============================== */
const MEM_SETS = [
  { label: 'First 5', ids: [1,2,3,4,5] },
  { label: 'First 10', ids: Array.from({length:10},(_,i)=>i+1) },
  { label: 'First 20', ids: Array.from({length:20},(_,i)=>i+1) },
  { label: 'All 99', ids: Array.from({length:99},(_,i)=>i+1) }
];

function renderMemorize(){
  if(!state.memSet) state.memSet = MEM_SETS[0];
  const btnsWrap = document.getElementById('mem-set-buttons');
  btnsWrap.innerHTML = MEM_SETS.map(s => `<button class="mem-set-btn ${s===state.memSet?'active':''}" data-label="${s.label}">${s.label}</button>`).join('');
  btnsWrap.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      state.memSet = MEM_SETS.find(s=>s.label===btn.dataset.label);
      state.memIndex = 0;
      renderMemorize();
    });
  });
  renderFlashcard();
}

function renderFlashcard(){
  const set = state.memSet;
  const id = set.ids[state.memIndex];
  const n = nameById(id);
  const card = document.getElementById('flashcard');
  card.classList.remove('flipped');
  card.innerHTML = `
    <div class="front"><div class="ar">${n.ar}</div><div class="hint">Tap to reveal meaning</div></div>
    <div class="back"><div class="tl" style="font-family:var(--font-serif);font-style:italic;color:var(--parchment);font-size:1.3rem">${n.translit}</div>
      <p style="color:var(--ink-dim);margin-top:8px">${n.meaning}</p></div>`;
  card.onclick = () => card.classList.toggle('flipped');
  document.getElementById('mem-progress-text').textContent = `Card ${state.memIndex+1} of ${set.ids.length} · ${set.label}`;

  const progress = Store.get(KEYS.memProgress, {});
  progress[id] = true;
  Store.set(KEYS.memProgress, progress);
}

function initMemorizeNav(){
  document.getElementById('mem-prev').addEventListener('click', () => {
    state.memIndex = Math.max(0, state.memIndex - 1);
    renderFlashcard();
  });
  document.getElementById('mem-next').addEventListener('click', () => {
    state.memIndex = Math.min(state.memSet.ids.length - 1, state.memIndex + 1);
    renderFlashcard();
  });
}

/* ============================== DASHBOARD ============================== */
function renderDashboard(){
  const favs = Store.get(KEYS.favorites, []);
  const journal = Store.get(KEYS.journal, []);
  const memProgress = Store.get(KEYS.memProgress, {});
  const quizStats = Store.get(KEYS.quizStats, {best:0,played:0});
  const dhikrHistory = Store.get(KEYS.dhikrHistory, {});
  const totalDhikr = Object.values(dhikrHistory).reduce((a,b)=>a+(b.count||0),0);
  const goodDeeds = Store.get(KEYS.goodDeeds, {});
  const streak = currentStreak();

  document.getElementById('stat-grid').innerHTML = `
    <div class="stat-box"><div class="val">${Object.keys(memProgress).length}</div><div class="lab">Names Viewed</div></div>
    <div class="stat-box"><div class="val">${favs.length}</div><div class="lab">Favorites</div></div>
    <div class="stat-box"><div class="val">${journal.length}</div><div class="lab">Reflections</div></div>
    <div class="stat-box"><div class="val">${totalDhikr}</div><div class="lab">Total Dhikr</div></div>
    <div class="stat-box"><div class="val">${streak}</div><div class="lab">Day Streak</div></div>
    <div class="stat-box"><div class="val">${quizStats.best}/10</div><div class="lab">Best Quiz Score</div></div>
    <div class="stat-box"><div class="val">${Object.keys(goodDeeds).length}</div><div class="lab">Deeds Marked</div></div>
  `;

  const achievements = [
    { label: 'First Name Learned', done: Object.keys(memProgress).length >= 1 },
    { label: '10 Names Viewed', done: Object.keys(memProgress).length >= 10 },
    { label: '50 Names Viewed', done: Object.keys(memProgress).length >= 50 },
    { label: 'All 99 Viewed', done: Object.keys(memProgress).length >= 99 },
    { label: 'First Reflection', done: journal.length >= 1 },
    { label: '7-Day Streak', done: streak >= 7 },
    { label: '100 Dhikr', done: totalDhikr >= 100 },
    { label: 'Quiz Champion (10/10)', done: quizStats.best >= 10 }
  ];
  document.getElementById('achievements').innerHTML = achievements.map(a => `
    <div class="streak-badge" style="${a.done?'':'opacity:.35'}">${a.done ? '✓' : '○'} ${a.label}</div>
  `).join('');
}

/* ============================== ACCESSIBILITY ============================== */
function initA11y(){
  const scale = Store.get(KEYS.fontScale, 1);
  document.documentElement.style.fontSize = (16*scale) + 'px';
  document.getElementById('font-inc').addEventListener('click', () => {
    const s = Math.min(1.3, Store.get(KEYS.fontScale,1) + 0.1);
    Store.set(KEYS.fontScale, s);
    document.documentElement.style.fontSize = (16*s) + 'px';
  });
  document.getElementById('font-dec').addEventListener('click', () => {
    const s = Math.max(0.85, Store.get(KEYS.fontScale,1) - 0.1);
    Store.set(KEYS.fontScale, s);
    document.documentElement.style.fontSize = (16*s) + 'px';
  });
  const contrastBtn = document.getElementById('contrast-toggle');
  const hc = Store.get(KEYS.highContrast, false);
  document.body.classList.toggle('high-contrast', hc);
  contrastBtn.classList.toggle('active', hc);
  contrastBtn.addEventListener('click', () => {
    const now = !document.body.classList.contains('high-contrast');
    document.body.classList.toggle('high-contrast', now);
    contrastBtn.classList.toggle('active', now);
    Store.set(KEYS.highContrast, now);
  });
}

/* ============================== INIT ============================== */
function init(){
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => setView(btn.dataset.view));
  });
  renderHero();
  initControls();
  renderGrid();
  initModal();
  initDhikr();
  initJournal();
  initQuizControls();
  initMemorizeNav();
  initA11y();
  setView('names');
}

document.addEventListener('DOMContentLoaded', init);