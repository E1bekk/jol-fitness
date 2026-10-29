// Аккаунт и облако JOL Fitness (Firebase: вход по email и паролю + база Firestore).
//
// Как устроено: всё по-прежнему сначала сохраняется на устройстве (работает без интернета).
// Если человек вошёл в аккаунт, изменения через пару секунд отправляются в облако:
//   users/{uid}            — профиль, вес, программа, чат с ИИ-тренером
//   users/{uid}/days/{дата} — вода, еда и тренировки за день
// При входе на новом устройстве (или после переустановки) всё скачивается обратно.
// Доступ к своим данным есть только у самого пользователя — это задают правила Firestore.
(function () {
  const cfg = window.JF_FIREBASE || {};
  const enabled = !!(cfg.apiKey && cfg.projectId && window.firebase && firebase.initializeApp);
  let auth = null, db = null, user = null, pushing = false, timer = null;
  const st = { lastSync: 0, error: '' };

  const emit = () => document.dispatchEvent(new CustomEvent('jf:account'));
  const ref = () => db.collection('users').doc(user.uid);

  let readyResolve;
  const ready = new Promise(r => { readyResolve = r; });

  if (enabled) {
    firebase.initializeApp(cfg);
    auth = firebase.auth();
    db = firebase.firestore();
    auth.onAuthStateChanged(async u => {
      user = u;
      if (u) { try { await pull(); } catch (e) { st.error = e.message; } schedule(0); }
      readyResolve(); emit();
    });
  } else readyResolve();

  // ---------- отправка в облако ----------
  function schedule(ms) { clearTimeout(timer); timer = setTimeout(push, ms == null ? 2000 : ms); }
  async function push() {
    if (!user || pushing || navigator.onLine === false || !JF.sync.hasPending()) return;
    pushing = true;
    const sent = JF.sync.pending();
    try {
      const keys = Object.keys(sent.days);
      const writes = [];
      if (sent.main && JF.profile) writes.push(b => b.set(ref(), JF.sync.exportMain()));
      keys.forEach(k => writes.push(b => b.set(ref().collection('days').doc(k), JF.sync.exportDay(k))));
      for (let i = 0; i < writes.length; i += 400) {          // в одной пачке Firestore — до 500 записей
        const batch = db.batch();
        writes.slice(i, i + 400).forEach(w => w(batch));
        await batch.commit();
      }
      JF.sync.markSent(sent);
      st.lastSync = Date.now(); st.error = '';
    } catch (e) { st.error = e.code || e.message; console.warn('sync push', e); }
    finally { pushing = false; emit(); if (JF.sync.hasPending() && !st.error) schedule(); }
  }

  // ---------- загрузка из облака ----------
  async function pull() {
    if (!user) return false;
    const main = await ref().get();
    const since = JF.sync.lastPull || 0;
    const q = await ref().collection('days').where('u', '>', since).get();
    const changed = JF.sync.importRemote(main.exists ? main.data() : null, q.docs.map(d => [d.id, d.data()]));
    st.lastSync = Date.now();
    return changed;
  }

  if (enabled) {
    document.addEventListener('jf:change', () => { if (user) schedule(); });
    window.addEventListener('online', () => { if (user) { pull().catch(() => {}); schedule(0); } });
    document.addEventListener('jf:resume', () => { if (user) pull().then(ch => { if (ch) document.dispatchEvent(new CustomEvent('jf:resume-data')); }).catch(() => {}); });
  }

  // ---------- понятные тексты ошибок ----------
  const ERR = {
    'auth/invalid-email': 'Проверь email — похоже, в нём ошибка',
    'auth/missing-password': 'Введи пароль',
    'auth/user-not-found': 'Аккаунт с таким email не найден',
    'auth/wrong-password': 'Неверный email или пароль',
    'auth/invalid-credential': 'Неверный email или пароль',
    'auth/invalid-login-credentials': 'Неверный email или пароль',
    'auth/email-already-in-use': 'Этот email уже зарегистрирован — войди в аккаунт',
    'auth/weak-password': 'Пароль слишком простой: минимум 6 символов',
    'auth/too-many-requests': 'Слишком много попыток. Подожди несколько минут',
    'auth/network-request-failed': 'Нет интернета. Проверь подключение',
    'auth/requires-recent-login': 'Для этого действия войди в аккаунт ещё раз',
    'permission-denied': 'Нет доступа к облаку. Проверь правила Firestore',
    'unavailable': 'Облако сейчас недоступно, попробуй позже'
  };
  const errText = e => ERR[e && e.code] || (e && e.message) || 'Что-то пошло не так';

  // ---------- действия ----------
  async function signUp(email, password) {
    const cr = await auth.createUserWithEmailAndPassword(email.trim(), password);
    user = cr.user;
    JF.sync.markAllDirty();       // всё, что было на устройстве, — в новый аккаунт
    await push();
    emit();
  }
  async function signIn(email, password) {
    const cr = await auth.signInWithEmailAndPassword(email.trim(), password);
    user = cr.user;
    // вход в существующий аккаунт: данные аккаунта главнее того, что было на устройстве без входа
    const main = await ref().get();
    if (main.exists && main.data() && main.data().profile && JF.profile) JF.wipe();
    await pull();
    schedule(0);
    emit();
    return !!JF.profile;
  }
  async function resetPassword(email) {
    auth.languageCode = 'ru';
    await auth.sendPasswordResetEmail(email.trim());
  }
  async function signOut() {
    try { await push(); } catch (e) {}
    await auth.signOut();
    user = null; emit();
  }
  async function deleteAccount(password) {
    const cred = firebase.auth.EmailAuthProvider.credential(user.email, password);
    await user.reauthenticateWithCredential(cred);
    const days = await ref().collection('days').get();
    for (let i = 0; i < days.docs.length; i += 400) {
      const b = db.batch();
      days.docs.slice(i, i + 400).forEach(d => b.delete(d.ref));
      await b.commit();
    }
    await ref().delete();
    await user.delete();
    user = null; emit();
  }

  window.JF_account = {
    enabled, ready,
    get user() { return user; },
    get email() { return user && user.email; },
    get status() { return { lastSync: st.lastSync, error: st.error, pending: JF.sync.hasPending(), pushing }; },
    signUp, signIn, signOut, resetPassword, deleteAccount, push, pull, errText
  };
})();
