// JOL Fitness — данные пользователя. Всё хранится только на устройстве (localStorage),
// на сервер ничего не сохраняется. «Удалить все данные» в профиле стирает этот ключ.
(function () {
  const KEY = 'jolFitness';
  const pad = n => String(n).padStart(2, '0');
  const dayKey = d => { d = d || new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const parseKey = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const EMPTY_DAY = () => ({ water: 0, meals: [], workouts: [] });

  function blank() {
    return { v: 1, profile: null, days: {}, weights: [], chat: [], program: { id: 'start', done: {} }, createdAt: Date.now() };
  }
  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (s && s.v === 1) return Object.assign(blank(), s);
    } catch (e) {}
    return blank();
  }
  let S = load();

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {}
    document.dispatchEvent(new CustomEvent('jf:change'));
  }
  function day(k) { k = k || dayKey(); if (!S.days[k]) S.days[k] = EMPTY_DAY(); return S.days[k]; }
  function peek(k) { return S.days[k || dayKey()] || EMPTY_DAY(); }

  // ===== Вес =====
  function weights() { return S.weights.slice().sort((a, b) => a.d < b.d ? -1 : a.d > b.d ? 1 : 0); }
  function currentWeight() {
    const w = weights();
    return w.length ? w[w.length - 1].kg : (S.profile ? S.profile.weight : 70);
  }

  // ===== Нормы (формула Миффлина — Сан-Жеора) =====
  function norms(p) {
    p = p || S.profile;
    if (!p) return null;
    const w = currentWeight();
    const bmr = 10 * w + 6.25 * p.height - 5 * p.age + (p.sex === 'f' ? -161 : 5);
    const tdee = bmr * p.activity;
    let kcal = p.goal === 'lose' ? tdee * 0.85 : p.goal === 'gain' ? tdee * 1.1 : tdee;
    kcal = Math.round(Math.max(kcal, p.sex === 'f' ? 1200 : 1500) / 10) * 10;
    const protein = Math.round(Math.min(w * (p.goal === 'keep' ? 1.4 : 1.7), 200));
    const fat = Math.round(kcal * 0.28 / 9);
    const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
    const waterMl = Math.round(w * 30 / 50) * 50;
    const h = p.height / 100;
    return {
      kcal, protein, fat, carbs, waterMl, glasses: Math.ceil(waterMl / 250),
      bmr: Math.round(bmr), tdee: Math.round(tdee),
      bmi: +(w / (h * h)).toFixed(1),
      healthyMin: Math.round(18.5 * h * h), healthyMax: Math.round(24.9 * h * h)
    };
  }

  function totals(d) {
    const t = { kcal: 0, p: 0, f: 0, c: 0 };
    (d || peek()).meals.forEach(m => { t.kcal += m.kcal; t.p += m.p; t.f += m.f; t.c += m.c; });
    t.kcal = Math.round(t.kcal); t.p = Math.round(t.p); t.f = Math.round(t.f); t.c = Math.round(t.c);
    return t;
  }

  // среднее за n дней (не раньше дня регистрации), fn(dayObj) → число
  function average(n, fn) {
    const start = new Date(S.createdAt || Date.now()); start.setHours(0, 0, 0, 0);
    let sum = 0, cnt = 0;
    for (let i = 0; i < n; i++) {
      const d = addDays(new Date(), -i);
      if (i > 0 && d < start) break;
      sum += fn(peek(dayKey(d))); cnt++;
    }
    return cnt ? sum / cnt : 0;
  }

  // ===== Тренировки =====
  function program() { return S.program.id; }
  function doneList(pid) { return (S.program.done[pid || S.program.id] || []).slice(); }
  function nextIndex(pid) {
    pid = pid || S.program.id;
    const p = JF_DATA.PROGRAMS.find(x => x.id === pid);
    const done = doneList(pid);
    for (let i = 0; i < p.count; i++) if (!done.includes(i)) return i;
    return null; // программа пройдена
  }
  function workoutsBetween(from, to) {
    let n = 0;
    for (let d = new Date(from); d <= to; d = addDays(d, 1)) n += peek(dayKey(d)).workouts.length;
    return n;
  }
  function weekStart(d) { d = new Date(d || new Date()); d.setHours(0, 0, 0, 0); const wd = (d.getDay() + 6) % 7; return addDays(d, -wd); }
  function weekWorkouts() { return workoutsBetween(weekStart(), new Date()); }
  function streak() {
    let n = 0, d = new Date();
    if (!peek(dayKey(d)).workouts.length) d = addDays(d, -1);
    while (peek(dayKey(d)).workouts.length) { n++; d = addDays(d, -1); }
    return n;
  }
  function activeDaysStreak() { // дни подряд, когда что-то отмечено (вода/еда/тренировка)
    let n = 0, d = new Date();
    const has = k => { const x = peek(k); return x.water > 0 || x.meals.length || x.workouts.length; };
    if (!has(dayKey(d))) d = addDays(d, -1);
    while (has(dayKey(d))) { n++; d = addDays(d, -1); }
    return n;
  }

  // ===== Действия =====
  const A = {
    setProfile(p) {
      const first = !S.profile;
      S.profile = Object.assign({}, S.profile || {}, p);
      if (first || !S.weights.length) S.weights.push({ d: dayKey(), kg: S.profile.weight });
      if (first) S.createdAt = Date.now();
      save();
    },
    setWater(glasses) { day().water = Math.max(0, Math.min(40, glasses)); save(); },
    addWater(delta) { A.setWater(peek().water + delta); },
    addMeal(m) {
      day().meals.push(Object.assign({ id: uid(), at: Date.now() }, m,
        { kcal: Math.round(m.kcal), p: +(+m.p).toFixed(1), f: +(+m.f).toFixed(1), c: +(+m.c).toFixed(1) }));
      save();
    },
    removeMeal(id, k) { const d = day(k); d.meals = d.meals.filter(m => m.id !== id); save(); },
    logWorkout(w) {
      day().workouts.push(Object.assign({ id: uid(), at: Date.now() }, w));
      if (w.pid != null && w.idx != null) {
        const list = S.program.done[w.pid] || (S.program.done[w.pid] = []);
        if (!list.includes(w.idx)) list.push(w.idx);
      }
      save();
    },
    setProgram(pid) { S.program.id = pid; save(); },
    resetProgram(pid) { S.program.done[pid] = []; save(); },
    addWeight(kg, k) {
      k = k || dayKey();
      S.weights = S.weights.filter(w => w.d !== k);
      S.weights.push({ d: k, kg: +kg });
      if (S.profile) S.profile.weight = currentWeight();
      save();
    },
    removeWeight(k) { if (S.weights.length > 1) { S.weights = S.weights.filter(w => w.d !== k); save(); } },
    pushChat(msg) { S.chat.push(Object.assign({ at: Date.now() }, msg)); if (S.chat.length > 80) S.chat = S.chat.slice(-80); save(); },
    clearChat() { S.chat = []; save(); },
    wipe() {
      try {
        Object.keys(localStorage).forEach(k => { if (/^jol(Fitness|Fit)/.test(k)) localStorage.removeItem(k); });
      } catch (e) {}
      S = blank();
      document.dispatchEvent(new CustomEvent('jf:change'));
    }
  };

  window.JF = {
    get state() { return S; },
    get profile() { return S.profile; },
    dayKey, addDays, parseKey, peek, totals, norms, weights, currentWeight, average,
    program, doneList, nextIndex, weekWorkouts, weekStart, streak, activeDaysStreak, workoutsBetween,
    ...A
  };
})();
