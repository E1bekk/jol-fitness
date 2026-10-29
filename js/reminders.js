// Напоминания — как будильники в «Часах»: несколько штук, точное время, повтор по дням недели,
// тип (вода, тренировка, еда, взвешивание), у каждого свой переключатель.
// Работает только в Android-приложении (плагин @capacitor/local-notifications).
//
// План: на 14 дней вперёд ставятся одноразовые уведомления. Чтобы они приходили минута в минуту,
// нужно разрешение Android «Будильники и напоминания» (точные будильники) — кнопка на экране напоминаний.
// План пересчитывается при открытии приложения, возврате в него и после любых изменений.
// «Умный режим»: если сегодня тренировка уже сделана — сегодняшние напоминания о тренировке не приходят;
// если норма воды выполнена — сегодняшние напоминания о воде тоже.
(function () {
  const LN = window.JF_IS_APP && window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications;
  const KEY = 'jolFitnessReminders';
  const HORIZON = 14, MAX_ALARMS = 12;
  const ID_MIN = 2000, ID_MAX = 2999, TEST_ID = 2999;
  const CHANNEL = 'jf_reminders';
  const ALL = [1, 2, 3, 4, 5, 6, 0];
  const SHORT = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  const pad = v => String(v).padStart(2, '0');
  const sameDay = (a, b) => a.toDateString() === b.toDateString();
  const newId = () => 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

  const TYPES = {
    water: { name: 'Вода', icon: 'drop', msgs: [
      ['💧 Время выпить воды', 'Стакан воды сейчас — и ты ближе к дневной норме. Отметь его в JOL Fitness.'],
      ['💧 Не забывай про воду', 'Даже лёгкое обезвоживание снижает энергию. Сделай пару глотков.']] },
    workout: { name: 'Тренировка', icon: 'dumbbell', msgs: [
      ['💪 Пора на тренировку', 'Сегодняшняя тренировка займёт меньше получаса. Начнём?'],
      ['🔥 Не теряй темп', 'Регулярность важнее интенсивности. Даже 20 минут сегодня — это плюс.']] },
    meal: { name: 'Приём пищи', icon: 'apple', msgs: [
      ['🍽 Время поесть', 'Сфотографируй тарелку — ИИ посчитает калории и БЖУ.'],
      ['🍽 Запиши, что ты съел', 'Так проще держать норму калорий и белка.']] },
    weigh: { name: 'Взвешивание', icon: 'scale', msgs: [
      ['⚖️ Время взвеситься', 'Взвешивайся утром натощак — так цифры честнее. Запиши вес в «Прогрессе».']] },
    report: { name: 'Отчёт недели', icon: 'chart', msgs: [
      ['📊 Подведём итоги недели?', 'ИИ-тренер разберёт твою неделю и даст советы. Открой «Прогресс» → «Отчёт недели».']] }
  };

  function settings() {
    let raw = {};
    try { raw = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) {}
    return {
      asked: !!raw.asked, exactAsked: !!raw.exactAsked, smart: raw.smart !== false,
      alarms: (Array.isArray(raw.alarms) ? raw.alarms : []).filter(a => a && a.id && TYPES[a.type]).map(a => ({
        id: a.id, type: a.type, hour: +a.hour || 0, minute: +a.minute || 0,
        days: Array.isArray(a.days) ? a.days.filter(d => d >= 0 && d <= 6) : ALL.slice(), on: a.on !== false
      }))
    };
  }
  function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} refresh(); }

  function repeatText(days) {
    const d = (days || []).slice().sort();
    if (d.length === 7 || !d.length) return 'Ежедневно';
    if (d.join() === '1,2,3,4,5') return 'По будням';
    if (d.join() === '0,6') return 'По выходным';
    return ALL.filter(x => d.includes(x)).map(x => SHORT[x]).join(', ');
  }

  function today() {
    const d = window.JF ? JF.peek() : { water: 0, workouts: [] };
    const n = window.JF && JF.profile ? JF.norms() : null;
    return { trained: d.workouts.length > 0, waterDone: !!(n && d.water >= n.glasses) };
  }

  function plan(s, now) {
    now = now || new Date();
    const t = today();
    const out = [];
    s.alarms.slice(0, MAX_ALARMS).forEach((a, ai) => {
      if (!a.on) return;
      const days = a.days.length ? a.days : ALL;
      for (let d = 0; d < HORIZON; d++) {
        const at = new Date(now); at.setDate(now.getDate() + d); at.setHours(a.hour, a.minute, 0, 0);
        if (!days.includes(at.getDay()) || at <= now) continue;
        if (d === 0 && s.smart && ((a.type === 'workout' && t.trained) || (a.type === 'water' && t.waterDone))) continue;
        out.push({ a, ai, at, d });
      }
    });
    return out.sort((x, y) => x.at - y.at);
  }

  async function cancelAll() {
    try {
      const res = await LN.getPending();
      const ids = ((res && res.notifications) || []).map(n => +n.id).filter(id => id >= ID_MIN && id <= ID_MAX && id !== TEST_ID);
      if (ids.length) await LN.cancel({ notifications: ids.map(id => ({ id })) });
    } catch (e) {
      const ids = [];
      for (let i = 0; i < MAX_ALARMS; i++) for (let d = 0; d < HORIZON; d++) ids.push(ID_MIN + i * 20 + d);
      try { await LN.cancel({ notifications: ids.map(id => ({ id })) }); } catch (e2) {}
    }
  }
  async function permission() {
    if (!LN) return 'unavailable';
    try { return (await LN.checkPermissions()).display; } catch (e) { return 'unavailable'; }
  }
  async function ensurePermission() {
    if (!LN) return false;
    let p = await permission();
    if (p !== 'granted') { try { p = (await LN.requestPermissions()).display; } catch (e) {} }
    const s = settings(); s.asked = true; try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {}
    return p === 'granted';
  }
  async function exactPermission() {
    if (!LN || typeof LN.checkExactNotificationSetting !== 'function') return 'granted';
    try { return (await LN.checkExactNotificationSetting()).exact_alarm || 'denied'; } catch (e) { return 'granted'; }
  }
  async function requestExact() {
    if (!LN || typeof LN.changeExactNotificationSetting !== 'function') return true;
    let st = 'denied';
    try { st = (await LN.changeExactNotificationSetting()).exact_alarm; } catch (e) {}
    const s = settings(); s.exactAsked = true; try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {}
    await refresh();
    return st === 'granted';
  }
  let channelReady = null;
  function ensureChannel() {
    if (!channelReady) channelReady = Promise.resolve(LN.createChannel && LN.createChannel({
      id: CHANNEL, name: 'Напоминания JOL Fitness', description: 'Вода, тренировки, еда и взвешивание',
      importance: 4, visibility: 1, vibration: true
    })).catch(() => {});
    return channelReady;
  }

  let running = Promise.resolve();
  function refresh() { running = running.then(doRefresh, doRefresh); return running; }
  async function doRefresh() {
    if (!LN) return;
    await cancelAll();
    try {
      if ((await permission()) !== 'granted') return;
      await ensureChannel();
      const exact = (await exactPermission()) === 'granted';
      const s = settings();
      const list = plan(s).map((it, k) => {
        const m = TYPES[it.a.type].msgs[(it.at.getDate() + k) % TYPES[it.a.type].msgs.length];
        return {
          id: ID_MIN + it.ai * 20 + it.d, title: m[0], body: m[1], channelId: CHANNEL,
          schedule: { at: it.at, allowWhileIdle: exact }, extra: { route: ({ water: '/home', meal: '/food', weigh: '/progress', report: '/progress', workout: '/workouts' })[it.a.type] || '/home' }
        };
      });
      if (list.length) await LN.schedule({ notifications: list });
    } catch (e) { console.warn('reminders', e); }
  }

  async function test() {
    if (!LN) return false;
    if (!(await ensurePermission())) return false;
    await ensureChannel();
    const exact = (await exactPermission()) === 'granted';
    await LN.schedule({ notifications: [{
      id: TEST_ID, title: '✅ Напоминания работают', body: 'Так будут выглядеть напоминания JOL Fitness.',
      channelId: CHANNEL, schedule: { at: new Date(Date.now() + 5000), allowWhileIdle: exact }
    }] });
    return true;
  }

  async function removeAll() {
    try { localStorage.removeItem(KEY); } catch (e) {}
    if (!LN) return;
    await cancelAll();
    try { await LN.cancel({ notifications: [{ id: TEST_ID }] }); } catch (e) {}
  }

  function nextText(a) {
    const it = plan({ alarms: [Object.assign({}, a, { on: true })], smart: false })[0];
    if (!it) return '';
    const now = new Date(), tm = new Date(now); tm.setDate(now.getDate() + 1);
    const t = pad(it.at.getHours()) + ':' + pad(it.at.getMinutes());
    return sameDay(it.at, now) ? 'сегодня в ' + t : sameDay(it.at, tm) ? 'завтра в ' + t : SHORT[it.at.getDay()] + ' в ' + t;
  }

  if (LN) {
    // нажатие на уведомление открывает нужный экран
    LN.addListener('localNotificationActionPerformed', ev => {
      const r = ev && ev.notification && ev.notification.extra && ev.notification.extra.route;
      if (r) location.hash = '#' + r;
    });
    let t;
    document.addEventListener('jf:change', () => { clearTimeout(t); t = setTimeout(refresh, 800); });
    document.addEventListener('jf:resume', refresh);
    setTimeout(refresh, 1500);
  }

  window.JF_reminders = {
    available: !!LN, TYPES, ALL, SHORT, MAX_ALARMS, pad, newId,
    settings, save, refresh, permission, ensurePermission, exactPermission, requestExact, test, removeAll, repeatText, nextText
  };
})();
