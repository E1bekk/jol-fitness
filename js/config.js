// Настройки JOL Fitness: где работает код — на сайте или внутри Android-приложения.
// На сайте запросы к серверу идут на тот же адрес (/api/...).
// При сборке приложения (npm run build:app) строка JF_CONFIG ниже заменяется:
// apiBase становится полным адресом сервера, isApp — true.
window.JF_CONFIG = { apiBase: '', isApp: false };

(function () {
  const c = window.JF_CONFIG;
  // Запасная проверка: если файл почему-то не заменился, но мы внутри приложения
  if (!c.isApp && window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform()) {
    c.isApp = true;
    if (!c.apiBase) c.apiBase = 'https://jol-fitness.vercel.app';
  }
  window.JF_IS_APP = !!c.isApp;
  // Полный адрес запроса к серверу: JF_API('/api/coach')
  window.JF_API = function (path) { return (c.apiBase || '') + path; };
  if (c.isApp) document.documentElement.classList.add('is-app');
})();
