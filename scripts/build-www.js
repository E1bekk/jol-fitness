// Сборка веб-части для Android-приложения: копирует сайт в папку www.
// Запуск: npm run build:app   (или сразу всё: npm run sync)
//
// Что делает:
//  1. Очищает www и копирует туда страницы, css, js и img.
//  2. Записывает js/config.js с настройками для приложения (полный адрес сервера).
//  3. Кладёт шрифт Inter внутрь приложения — чтобы всё открывалось без интернета.
//  4. Скачивает фото для главного экрана (один раз, в img/hero.webp) — тоже для работы без интернета.
//  5. Проверяет, что страницы больше ничего не грузят из интернета.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'www');
const API_BASE = 'https://jol-fitness.vercel.app'; // адрес сервера на Vercel (поменять, если Vercel дал другой)

const PAGES = ['index.html', 'privacy.html', 'delete-data.html'];
const DIRS = ['css', 'js', 'img'];
const FONT_WEIGHTS = [300, 400, 500, 600, 700, 800];
const FONT_SUBSETS = ['latin', 'latin-ext', 'cyrillic', 'cyrillic-ext'];
const HERO_URL = 'https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260730_081846_b55b106b-17b3-4020-8473-cacf0dcc852f.png&w=1920&q=85';

function fail(msg) { console.error('\n❌ ' + msg + '\n'); process.exit(1); }
function need(file, hint) { if (!fs.existsSync(file)) fail(`Не найден ${path.relative(ROOT, file)}. ${hint}`); }
function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name), d = path.join(dst, e.name);
    if (e.isDirectory()) copyDir(s, d); else fs.copyFileSync(s, d);
  }
}

(async function main() {
  // 0. Фото для главного экрана — скачиваем один раз в img/hero.webp
  const heroFile = path.join(ROOT, 'img', 'hero.webp');
  if (!fs.existsSync(heroFile)) {
    try {
      const r = await fetch(HERO_URL);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      fs.writeFileSync(heroFile, Buffer.from(await r.arrayBuffer()));
      console.log('🖼  Фото для главного экрана скачано: img/hero.webp');
    } catch (e) {
      console.warn('⚠️  Не удалось скачать фото для главного экрана (' + e.message + '). Без интернета на его месте будет синий фон.');
    }
  }

  // 1. Чистая папка www
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  for (const p of PAGES) { need(path.join(ROOT, p), ''); fs.copyFileSync(path.join(ROOT, p), path.join(OUT, p)); }
  for (const d of DIRS) { need(path.join(ROOT, d), ''); copyDir(path.join(ROOT, d), path.join(OUT, d)); }

  // 2. Настройки для приложения
  const cfgPath = path.join(OUT, 'js', 'config.js');
  const cfg = fs.readFileSync(cfgPath, 'utf8');
  const cfgLine = /window\.JF_CONFIG = \{[^}]*\};/;
  if (!cfgLine.test(cfg)) fail('В js/config.js не найдена строка window.JF_CONFIG = { ... };');
  fs.writeFileSync(cfgPath, cfg.replace(cfgLine, `window.JF_CONFIG = { apiBase: '${API_BASE}', isApp: true };`));

  // 3. Шрифт Inter внутрь приложения
  const dir = path.join(ROOT, 'node_modules', '@fontsource', 'inter');
  need(dir, 'Выполни: npm install');
  const fontsDir = path.join(OUT, 'fonts');
  fs.mkdirSync(fontsDir, { recursive: true });
  let fontCss = '/* Шрифт Inter внутри приложения (собрано scripts/build-www.js) */\n';
  for (const w of FONT_WEIGHTS) {
    const css = fs.readFileSync(path.join(dir, `${w}.css`), 'utf8');
    for (const block of css.split('/* ').slice(1)) {
      const name = block.slice(0, block.indexOf(' */'));                 // например inter-cyrillic-400-normal
      const subset = name.replace('inter-', '').replace(`-${w}-normal`, '');
      if (!FONT_SUBSETS.includes(subset)) continue;
      const file = `${name}.woff2`;
      fs.copyFileSync(path.join(dir, 'files', file), path.join(fontsDir, file));
      const face = block.slice(block.indexOf('@font-face')).replace(/src:[^;]+;/, `src: url(../fonts/${file}) format('woff2');`);
      fontCss += face.trim() + '\n';
    }
  }
  fs.writeFileSync(path.join(OUT, 'css', 'fonts.css'), fontCss);

  // 4. Фото главного экрана — из папки приложения
  if (fs.existsSync(heroFile)) {
    const appCss = path.join(OUT, 'css', 'app.css');
    fs.writeFileSync(appCss, fs.readFileSync(appCss, 'utf8').replace(/url\("https:\/\/images\.higgs\.ai[^"]*"\)/, 'url("../img/hero.webp")'));
  }

  // 5. Страницы: локальные шрифты вместо интернета
  for (const p of PAGES) {
    const file = path.join(OUT, p);
    let html = fs.readFileSync(file, 'utf8');
    html = html
      .replace(/\s*<link rel="preconnect"[^>]*>/g, '')
      .replace(/<link href="https:\/\/fonts\.googleapis\.com\/[^"]*" rel="stylesheet">/g, '<link rel="stylesheet" href="css/fonts.css">');
    fs.writeFileSync(file, html);
  }

  // 6. Проверка: ничего не должно грузиться из интернета
  const problems = [];
  for (const p of PAGES) {
    const html = fs.readFileSync(path.join(OUT, p), 'utf8');
    const re = /<(script|link)\b[^>]*(?:src|href)="(https?:[^"]+)"/g;
    let m;
    while ((m = re.exec(html))) problems.push(`${p}: ${m[2]}`);
  }
  if (problems.length) fail('Эти файлы всё ещё грузятся из интернета:\n  ' + problems.join('\n  '));

  const count = d => fs.readdirSync(d, { withFileTypes: true }).reduce((n, e) => n + (e.isDirectory() ? count(path.join(d, e.name)) : 1), 0);
  console.log(`\n✅ Готово: www собрана (${count(OUT)} файлов). Сервер ИИ: ${API_BASE}`);
  console.log('   Дальше: npx cap sync android\n');
})();
