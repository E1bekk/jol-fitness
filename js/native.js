// Нативные функции Android-приложения. На сайте этот файл почти ничего не делает.
//
// Кнопка «Назад» работает как в обычных приложениях:
//  1) сначала закрывает открытое окно (нижняя панель, меню);
//  2) потом спрашивает экран, что делать (window.JF_onBack — например, выйти из тренировки);
//  3) иначе возвращает на предыдущий экран;
//  4) на главном экране приложение не закрывается от одного нажатия: появляется подсказка
//     «Нажми ещё раз, чтобы выйти», и только второе нажатие за 2 секунды сворачивает приложение.
(function () {
  if (!window.JF_IS_APP) return;
  const P = (window.Capacitor && window.Capacitor.Plugins) || {};

  // ===== Есть ли интернет =====
  // Внутри приложения WebView сам не знает, пропал ли интернет, поэтому спрашиваем Android
  // через плагин @capacitor/network и передаём ответ как обычные события online/offline.
  const Net = P.Network;
  if (Net) {
    let online = null;
    try { Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => online !== false }); } catch (e) {}
    const apply = connected => {
      const was = online;
      online = !!connected;
      if (was !== online && !(was === null && online)) window.dispatchEvent(new Event(online ? 'online' : 'offline'));
    };
    Net.getStatus().then(st => apply(st.connected)).catch(() => {});
    Net.addListener('networkStatusChange', st => apply(st.connected));
  }

  const App = P.App;
  if (!App) { console.warn('Плагин @capacitor/app не установлен — кнопка «Назад» работает по умолчанию'); return; }

  // Возврат в приложение: обновляем экран (новый день, напоминания)
  App.addListener('appStateChange', st => { if (st.isActive) document.dispatchEvent(new CustomEvent('jf:resume')); });

  let exitArmedUntil = 0;
  function backToExit() {
    if (Date.now() < exitArmedUntil) {
      exitArmedUntil = 0;
      if (typeof App.minimizeApp === 'function') App.minimizeApp(); else App.exitApp();
    } else {
      exitArmedUntil = Date.now() + 2000;
      UI.toast('Нажми «Назад» ещё раз, чтобы выйти');
    }
  }

  let busy = false;
  App.addListener('backButton', async function () {
    if (UI.closeTop()) return;                                   // открытая панель
    const rail = document.querySelector('.rail.is-open');
    if (rail) { document.querySelector('[data-menu]').click(); return; } // открытое меню
    if (busy) return;
    busy = true;
    try {
      if (typeof window.JF_onBack === 'function' && await window.JF_onBack()) return;
      const route = (location.hash || '#/home').replace(/^#/, '');
      if (route === '/home' || route === '/' || route === '/start') backToExit();
      else if (history.length > 1) history.back();
      else location.hash = '#/home';
    } finally {
      busy = false;
    }
  });
})();
