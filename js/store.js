// JOL Fitness — данные пользователя. Всё хранится только на устройстве (localStorage),
// на сервер ничего не сохраняется. «Удалить все данные» в профиле стирает этот ключ.
(function () {
  const KEY = 'jolFitness';
  const SYNC_KEY = 'jolFitnessSync';   // что ещё не отправлено в облако (только для аккаунта)
  const pad = n => String(n).padStart(2, '0');
  const dayKey = d => { d = d || new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const parseKey = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const EMPTY_DAY = () => ({ water: 0, meals: [], workouts: [] });

  function blank() {
    return { v: 1, profile: null, days: {}, weights: [], chat: [], program: { id: 'start', done: {} }, createdAt: Date.now(),
      favorites: [], customPrograms: [], reports: {}, settings: { theme: 'system' } };
  }
  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (s && s.v === 1) return Object.assign(blank(), s);
    } catch (e) {}
    return blank();
  }
  let S = load();
  const applyCustom = () => { if (window.JF_DATA) JF_DATA.setCustom(S.customPrograms); };
  applyCustom();

  // ===== Синхронизация с облаком =====
  // У каждого дня и у «основных» данных есть отметка времени u. Изменённое помечается как «грязное»,
  // js/sync.js отправляет это в Firebase и снимает пометку.
  function loadSync() {
    try { const x = JSON.parse(localStorage.getItem(SYNC_KEY) || 'null'); if (x) return { main: x.main || 0, days: x.days || {}, lastPull: x.lastPull || 0 }; } catch (e) {}
    return { main: 0, days: {}, lastPull: 0 };
  }
  let Y = loadSync();
  function saveSync() { try { localStorage.setItem(SYNC_KEY, JSON.stringify(Y)); } catch (e) {} }
  function touchMain() { S.u = Date.now(); Y.main = S.u; saveSync(); }
  function touchDay(k) { const d = day(k); d.u = Date.now(); Y.days[k || dayKey()] = d.u; saveSync(); }

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
  function program() { return JF_DATA.find(S.program.id) ? S.program.id : 'start'; }
  function doneList(pid) { return (S.program.done[pid || S.program.id] || []).slice(); }
  function nextIndex(pid) {
    pid = pid || S.program.id;
    const p = JF_DATA.find(pid);
    if (!p) return null;
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

  // ===== Недавние продукты: что ел за последние 30 дней (чаще и недавнее — выше) =====
  const foodKey = n => String(n || '').trim().toLowerCase();
  function recentFoods(limit) {
    const map = {};
    for (let i = 0; i < 30; i++) {
      const d = peek(dayKey(addDays(new Date(), -i)));
      d.meals.forEach(m => {
        const k = foodKey(m.name); if (!k) return;
        const r = map[k] || (map[k] = { count: 0, last: 0, meal: m });
        r.count++;
        if ((m.at || 0) > r.last) { r.last = m.at || 0; r.meal = m; }
      });
    }
    return Object.values(map).sort((a, b) => b.count - a.count || b.last - a.last).slice(0, limit || 8).map(r => r.meal);
  }
  const isFavorite = name => S.favorites.some(f => foodKey(f.name) === foodKey(name));

  // ===== Действия =====
  const A = {
    setProfile(p) {
      const first = !S.profile;
      S.profile = Object.assign({}, S.profile || {}, p);
      if (first || !S.weights.length) S.weights.push({ d: dayKey(), kg: S.profile.weight });
      if (first) S.createdAt = Date.now();
      touchMain(); save();
    },
    setWater(glasses) { day().water = Math.max(0, Math.min(40, glasses)); touchDay(); save(); },
    addWater(delta) { A.setWater(peek().water + delta); },
    addMeal(m) {
      day().meals.push(Object.assign({ id: uid(), at: Date.now() }, m,
        { kcal: Math.round(m.kcal), p: +(+m.p).toFixed(1), f: +(+m.f).toFixed(1), c: +(+m.c).toFixed(1) }));
      touchDay(); save();
    },
    removeMeal(id, k) { const d = day(k); d.meals = d.meals.filter(m => m.id !== id); touchDay(k); save(); },
    logWorkout(w) {
      day().workouts.push(Object.assign({ id: uid(), at: Date.now() }, w));
      if (w.pid != null && w.idx != null) {
        const list = S.program.done[w.pid] || (S.program.done[w.pid] = []);
        if (!list.includes(w.idx)) list.push(w.idx);
      }
      touchDay(); touchMain(); save();
    },
    setProgram(pid) { S.program.id = pid; touchMain(); save(); },
    resetProgram(pid) { S.program.done[pid] = []; touchMain(); save(); },
    addWeight(kg, k) {
      k = k || dayKey();
      S.weights = S.weights.filter(w => w.d !== k);
      S.weights.push({ d: k, kg: +kg });
      if (S.profile) S.profile.weight = currentWeight();
      touchMain(); save();
    },
    removeWeight(k) { if (S.weights.length > 1) { S.weights = S.weights.filter(w => w.d !== k); touchMain(); save(); } },
    pushChat(msg) { S.chat.push(Object.assign({ at: Date.now() }, msg)); if (S.chat.length > 60) S.chat = S.chat.slice(-60); touchMain(); save(); },
    clearChat() { S.chat = []; touchMain(); save(); },
    toggleFavorite(m) {
      if (isFavorite(m.name)) S.favorites = S.favorites.filter(f => foodKey(f.name) !== foodKey(m.name));
      else S.favorites.unshift({ name: m.name, grams: m.grams || 0, kcal: m.kcal, p: m.p, f: m.f, c: m.c });
      S.favorites = S.favorites.slice(0, 40);
      touchMain(); save();
      return isFavorite(m.name);
    },
    addCustomProgram(pr) { S.customPrograms = S.customPrograms.filter(x => x.id !== pr.id).concat(pr).slice(-10); applyCustom(); touchMain(); save(); },
    removeCustomProgram(id) {
      S.customPrograms = S.customPrograms.filter(x => x.id !== id); delete S.program.done[id];
      if (S.program.id === id) S.program.id = 'start';
      applyCustom(); touchMain(); save();
    },
    saveReport(week, text) {
      S.reports[week] = { text, at: Date.now() };
      const keys = Object.keys(S.reports).sort(); while (keys.length > 8) delete S.reports[keys.shift()];
      touchMain(); save();
    },
    setTheme(t) { S.settings = Object.assign({}, S.settings, { theme: t }); touchMain(); save(); },
    setSteps(k, n) {
      n = Math.max(0, Math.round(n || 0));
      const d = day(k);
      if (d.steps === n) return false;
      d.steps = n; touchDay(k); save(); return true;
    },
    wipe() {
      try {
        Object.keys(localStorage).forEach(k => { if (/^jol(Fitness|Fit)/.test(k)) localStorage.removeItem(k); });
      } catch (e) {}
      S = blank(); Y = { main: 0, days: {}, lastPull: 0 }; applyCustom();
      document.dispatchEvent(new CustomEvent('jf:change'));
    }
  };


  // ===== Для js/sync.js =====
  const Sync = {
    pending() { return { main: Y.main, days: Object.assign({}, Y.days) }; },
    hasPending() { return !!Y.main || Object.keys(Y.days).length > 0; },
    exportMain() {
      return { v: 1, profile: S.profile, weights: S.weights, program: S.program, createdAt: S.createdAt || Date.now(),
        chat: S.chat.slice(-40).map(m => ({ role: m.role, content: String(m.content).slice(0, 2500), at: m.at || 0, err: !!m.err })),
        favorites: S.favorites || [], customPrograms: S.customPrograms || [], reports: S.reports || {}, settings: S.settings || {}, u: S.u || Date.now() };
    },
    exportDay(k) { const d = S.days[k] || EMPTY_DAY(); return { water: d.water || 0, meals: d.meals || [], workouts: d.workouts || [], steps: d.steps || 0, u: d.u || Date.now() }; },
    // после успешной отправки снимаем пометку, если с тех пор ничего не менялось
    markSent(sent) {
      if (sent.main && Y.main === sent.main) Y.main = 0;
      Object.keys(sent.days).forEach(k => { if (Y.days[k] === sent.days[k]) delete Y.days[k]; });
      saveSync();
    },
    // при первом входе в новый аккаунт отправляем всё, что накопилось без аккаунта
    markAllDirty() {
      if (S.profile) Y.main = S.u = S.u || Date.now();
      Object.keys(S.days).forEach(k => { const d = S.days[k]; d.u = d.u || Date.now(); Y.days[k] = d.u; });
      saveSync(); try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {}
    },
    get lastPull() { return Y.lastPull; },
    // данные из облака: берём то, что новее (по отметке времени)
    importRemote(main, days) {
      let changed = false, maxU = Y.lastPull;
      if (main && main.profile && (!S.profile || (main.u || 0) > (S.u || 0))) {
        S.profile = main.profile; S.weights = main.weights || []; S.program = main.program || S.program;
        S.chat = main.chat || []; S.createdAt = main.createdAt || S.createdAt; S.u = main.u || 0;
        S.favorites = main.favorites || []; S.customPrograms = main.customPrograms || []; S.reports = main.reports || {};
        S.settings = Object.assign({ theme: 'system' }, main.settings || {}); applyCustom();
        if (Y.main && Y.main <= S.u) Y.main = 0;
        changed = true;
      } else if (S.profile && (!main || (S.u || 0) > (main.u || 0))) {
        Y.main = S.u = S.u || Date.now();   // на устройстве новее — отправим
      }
      (days || []).forEach(([k, d]) => {
        maxU = Math.max(maxU, d.u || 0);
        const local = S.days[k];
        if (!local || (d.u || 0) > (local.u || 0)) {
          S.days[k] = { water: d.water || 0, meals: d.meals || [], workouts: d.workouts || [], steps: d.steps || 0, u: d.u || 0 };
          if (Y.days[k] && Y.days[k] <= (d.u || 0)) delete Y.days[k];
          changed = true;
        }
      });
      Y.lastPull = maxU; saveSync();
      if (changed) save();
      return changed;
    }
  };

  window.JF = {
    get state() { return S; },
    get profile() { return S.profile; },
    get settings() { return S.settings || { theme: 'system' }; },
    recentFoods, isFavorite,
    dayKey, addDays, parseKey, peek, totals, norms, weights, currentWeight, average,
    program, doneList, nextIndex, weekWorkouts, weekStart, streak, activeDaysStreak, workoutsBetween,
    ...A,
    sync: Sync
  };
})();
