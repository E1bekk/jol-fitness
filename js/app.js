// JOL Fitness — экраны и навигация (одностраничное приложение, адреса вида #/food).
(function () {
  const D = JF_DATA, { esc, num, dec, plural, toast, openSheet } = UI;
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  const go = h => { if (location.hash !== h) location.hash = h; else render(); };
  const MEALS = [['breakfast', 'Завтрак'], ['lunch', 'Обед'], ['dinner', 'Ужин'], ['snack', 'Перекус']];
  const mealNow = () => { const h = new Date().getHours(); return h < 11 ? 'breakfast' : h < 16 ? 'lunch' : h < 22 ? 'dinner' : 'snack'; };
  const GOALS = { lose: 'Похудеть', keep: 'Держать форму', gain: 'Набрать массу' };
  const ACTIVITY = [
    [1.2, 'Почти без движения', 'Сидячая работа или учёба, спорта нет'],
    [1.375, 'Лёгкая активность', '1–3 тренировки в неделю'],
    [1.55, 'Средняя активность', '3–5 тренировок в неделю'],
    [1.725, 'Высокая активность', '6–7 тренировок в неделю']
  ];
  const BUB = (a, b, c, cls) => `<div class="stack ${cls || ''}" aria-hidden="true"><span class="bub">${icon(a)}</span><span class="bub">${icon(b)}</span><span class="bub">${icon(c)}</span></div>`;
  const avatar = () => `<span class="avatar">${esc(((JF.profile && JF.profile.name) || '?').trim().charAt(0).toUpperCase())}</span>`;
  const cupSvg = cls => `<svg class="${cls}" viewBox="0 0 35 43" aria-hidden="true"><use href="#cup"/></svg>`;

  // ===== Экран входа/анкеты: слева (сверху на телефоне) карточка с фото, как на главной =====
  function authLayout(hero, body) {
    return `<div class="auth">
      <section class="auth-hero">
        <div class="hero-photo" aria-hidden="true"></div>
        <div class="auth-hero-in">
          <div class="auth-brand"><svg viewBox="0 0 45 45" aria-hidden="true">${logoDots('#d7f17c')}</svg>JOL Fitness</div>
          <div>
            <h2>${hero.title}</h2>
            ${hero.sub ? `<p class="auth-sub">${hero.sub}</p>` : ''}
            <div class="glass">${(hero.pills || [['spark', 'ИИ-тренер'], ['camera', 'Калории по фото'], ['dumbbell', 'Тренировки дома']]).map(([ic, t]) => `<span>${icon(ic)}${t}</span>`).join('')}</div>
          </div>
        </div>
      </section>
      <section class="auth-card"><div class="auth-card-in">${body}</div></section>
    </div>`;
  }

  // ===== Логотип: ромб из точек =====
  function logoDots(color) {
    let s = '';
    for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) {
      if (Math.abs(i - 2) + Math.abs(j - 2) > 2) continue;
      s += `<circle cx="${(22.5 + (j - 2) * 9.4).toFixed(1)}" cy="${(22.5 + (i - 2) * 9.4).toFixed(1)}" r="3.7" fill="${color || '#8f9f05'}"/>`;
    }
    return s;
  }
  $('#logo').innerHTML = logoDots();

  // ===== Состояние экранов =====
  let current = null;          // текущий экран (для destroy)
  let waterRange = 'D';
  let tipIndex = (new Date().getDate()) % D.TIPS.length;
  let onb = { step: 0, d: {} };
  let pendingScan = null;      // { img, status:'loading'|'done'|'error', items, comment, error }
  let coachBusy = false;
  let cupPour = null;          // какие стаканы только что наполнились (для анимации)
  let tipSwap = false;         // совет только что сменился (для анимации)
  function setWater(nw) {
    const before = JF.peek().water, n = JF.norms();
    JF.setWater(nw);
    cupPour = nw > before ? [before, nw] : null;
    if (before < n.glasses && nw >= n.glasses) { UI.confetti(); toast('Норма воды на сегодня выполнена! 💧'); }
  }

  const top = $('#top'), view = $('#view'), rail = $('.rail');

  // =========================================================
  //  РОУТЕР
  // =========================================================
  function parse() {
    const h = (location.hash || '').replace(/^#\/?/, '');
    const parts = h.split('/').filter(Boolean);
    return { name: parts[0] || 'home', args: parts.slice(1) };
  }
  function render(keepScroll) {
    const r = parse();
    const OPEN = ['start', 'login', 'signup'];   // экраны, доступные до заполнения анкеты
    if (!JF.profile && !OPEN.includes(r.name)) { location.replace('#/start'); return; }
    if (JF.profile && r.name === 'start') { location.replace('#/home'); return; }
    const sy = window.scrollY, vy = view.scrollTop;
    if (keepScroll !== true) while (UI.closeTop()) { /* при переходе закрываем открытые панели */ }
    if (current && current.destroy) current.destroy();
    window.JF_onBack = null;
    const screen = SCREENS[r.name] || SCREENS.home;
    current = screen.apply(null, r.args) || {};
    if (current.redirect) { location.replace(current.redirect); return; }
    document.body.classList.toggle('no-rail', !!current.noRail);
    $$('.nav-b[data-go]').forEach(b => {
      const on = b.getAttribute('data-go') === (current.nav || r.name);
      b.classList.toggle('is-active', on);
      if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
    $('#rail-ava').innerHTML = avatar();
    top.innerHTML = current.top === false ? '' : topbar(current.top || {}, r.name);
    top.hidden = current.top === false;
    $('.main').classList.toggle('no-top', current.top === false);
    view.className = 'view ' + (current.cls || 'page');
    view.innerHTML = current.html || '';
    view.onclick = null; view.oninput = null; view.onchange = null; view.onkeydown = null;
    if (current.mount) current.mount(view);
    if (keepScroll === true) { window.scrollTo(0, sy); view.scrollTop = vy; }
    else { window.scrollTo(0, 0); view.scrollTop = 0; enterAnim(); }
    cupPour = null; tipSwap = false;
    closeMenu();
  }
  const refresh = () => render(true);
  // Появление экрана: карточки «всплывают» по очереди, столбики растут, числа досчитываются
  function enterAnim() {
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    view.classList.remove('enter'); void view.offsetWidth; view.classList.add('enter');
    $$('.card,.hero,.hydra,.prog-hero,.scan-cta,.auth-hero,.auth-card,.pl-card', view).slice(0, 14)
      .forEach((el, i) => { el.style.animationDelay = (i * 45) + 'ms'; });
    $$('[data-count]', view).forEach(countUp);
    clearTimeout(enterAnim.t); enterAnim.t = setTimeout(() => view.classList.remove('enter'), 1600);
  }
  function countUp(el) {
    const to = parseFloat(el.getAttribute('data-count')) || 0, d = +el.getAttribute('data-dec') || 0;
    if (!to) return;
    const t0 = performance.now(), dur = 750;
    const fmt = v => d ? dec(v, d) : num(v);
    (function step(now) {
      if (!el.isConnected) return;
      const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      el.textContent = fmt(to * e);
      if (k < 1) requestAnimationFrame(step); else el.textContent = fmt(to);
    })(t0);
  }
  window.addEventListener('hashchange', () => render());
  document.addEventListener('jf:resume', () => { if (current && current.live) refresh(); });
  document.addEventListener('jf:resume-data', () => { if (current && current.live) refresh(); });
  document.addEventListener('jf:account', () => { const n = parse().name; if (n === 'profile') refresh(); });
  const ACC = () => window.JF_account && JF_account.enabled ? JF_account : null;

  // =========================================================
  //  ВЕРХНЯЯ ПАНЕЛЬ: заголовок, поиск, Pro
  // =========================================================
  function topbar(t, name) {
    const isHome = name === 'home';
    return `<div class="hello">
        ${t.back ? `<button class="back-b" data-back="${esc(t.back)}">${icon('chevL')}Назад</button>` : ''}
        <h1>${esc(t.title || '')}</h1>${t.sub ? `<p>${esc(t.sub)}</p>` : ''}
      </div>
      <button class="me-top" data-go-to="#/profile" aria-label="Профиль">${avatar()}</button>
      <div class="top-actions ${isHome ? '' : 'secondary'}">
        <label class="search">${icon('search')}<span class="sr-only">Поиск</span>
          <input type="search" id="q" placeholder="Поиск: еда, упражнения" autocomplete="off" enterkeyhint="search">
          <div class="search-pop" id="q-pop" role="listbox"></div>
        </label>
        <button class="upgrade" data-pro>${icon('crown')}Pro</button>
      </div>`;
  }
  top.addEventListener('click', e => {
    const b = e.target.closest('[data-back],[data-go-to],[data-pro],[data-q]');
    if (!b) return;
    if (b.hasAttribute('data-back')) { if (history.length > 1) history.back(); else go(b.getAttribute('data-back')); }
    else if (b.hasAttribute('data-go-to')) go(b.getAttribute('data-go-to'));
    else if (b.hasAttribute('data-pro')) proSheet();
    else if (b.hasAttribute('data-q')) {
      const [kind, id] = b.getAttribute('data-q').split(':');
      $('#q').value = ''; $('#q-pop').classList.remove('open');
      if (kind === 'food') addFoodSheet(D.FOODS[+id]);
      else if (kind === 'ex') exerciseSheet(id);
      else if (kind === 'go') go(id);
    }
  });
  top.addEventListener('input', e => { if (e.target.id === 'q') searchUpdate(e.target.value); });
  top.addEventListener('focusout', () => setTimeout(() => { const p = $('#q-pop'); if (p && !top.contains(document.activeElement)) p.classList.remove('open'); }, 150));
  function searchUpdate(q) {
    const pop = $('#q-pop');
    q = q.trim().toLowerCase();
    if (!q) { pop.classList.remove('open'); return; }
    const res = [];
    [['Главная', '#/home', 'home'], ['Тренировки', '#/workouts', 'activity'], ['Питание', '#/food', 'apple'], ['Сканер еды', '#/food', 'camera'],
      ['ИИ-тренер', '#/coach', 'chat'], ['Прогресс', '#/progress', 'chart'], ['Вес', '#/progress', 'scale'], ['Напоминания', '#/reminders', 'bell'],
      ['Профиль', '#/profile', 'gear'], ['Помощь', '#/help', 'help']]
      .forEach(([n, h, ic]) => { if (n.toLowerCase().includes(q)) res.push(`<button data-q="go:${h}">${icon(ic)}${esc(n)}<small>раздел</small></button>`); });
    D.all().forEach(p => { if (p.title.toLowerCase().includes(q)) res.push(`<button data-q="go:#/program/${p.id}">${icon('activity')}${esc(p.title)}<small>программа</small></button>`); });
    Object.keys(D.EXERCISES).forEach(id => { const ex = D.EXERCISES[id]; if (ex.name.toLowerCase().includes(q)) res.push(`<button data-q="ex:${id}">${icon(ex.icon)}${esc(ex.name)}<small>упражнение</small></button>`); });
    D.FOODS.forEach((f, i) => { if (f.name.toLowerCase().includes(q)) res.push(`<button data-q="food:${i}">${icon('apple')}${esc(f.name)}<small>${f.kcal} ккал/100 г</small></button>`); });
    pop.innerHTML = res.slice(0, 12).join('') || '<div class="empty">Ничего не нашлось</div>';
    pop.classList.add('open');
  }
  function proSheet() {
    openSheet({ title: 'JOL Fitness Pro', html: `
      <div class="note" style="margin-bottom:1rem">${icon('crown')}<div>Сейчас все функции JOL Fitness бесплатны. Скоро появится Pro: персональные программы от ИИ, разбор техники и расширенная статистика.</div></div>
      <button class="btn btn-dark btn-block" data-close>Понятно</button>` });
  }

  // =========================================================
  //  МЕНЮ (левая панель / нижняя панель на телефоне)
  // =========================================================
  const menuBtn = $('[data-menu]');
  function setMenu(v) { rail.classList.toggle('is-open', v); menuBtn.setAttribute('aria-expanded', v ? 'true' : 'false'); }
  function closeMenu() { setMenu(false); }
  menuBtn.addEventListener('click', e => { e.stopPropagation(); setMenu(!rail.classList.contains('is-open')); });
  document.addEventListener('click', e => { if (rail.classList.contains('is-open') && !rail.contains(e.target)) closeMenu(); });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (UI.closeTop()) return;
    if (rail.classList.contains('is-open')) { closeMenu(); menuBtn.focus(); }
  });
  rail.addEventListener('click', e => { const b = e.target.closest('[data-go]'); if (b) go('#/' + b.getAttribute('data-go')); });

  // =========================================================
  //  ОБЩИЕ КАРТОЧКИ
  // =========================================================
  function caloriesCard(tap) {
    const n = JF.norms(), t = JF.totals();
    const rem = n.kcal - t.kcal;
    const on = Math.min(30, Math.round(t.kcal / n.kcal * 30));
    let bars = '';
    for (let k = 0; k < 30; k++) bars += `<i${k < on ? ' class="on"' : ''} style="--i:${k}"></i>`;
    return `<article class="card card--md pad ${tap ? 'tap' : ''}" ${tap ? 'data-go-card="#/food"' : ''}>
      <div class="c-head">
        <div class="c-title"><span class="chip">${icon('flame')}</span>Калории</div>
        <div class="c-val">${num(n.kcal)}<span>ккал</span></div>
      </div>
      <div class="c-sub"><span>${rem >= 0 ? `Осталось ${num(rem)} ккал` : `Сверх нормы на ${num(-rem)} ккал`}</span><span>Дневная норма</span></div>
      <div class="kcal-big"><em data-count="${t.kcal}">${num(t.kcal)}</em><span>/ккал</span></div>
      <div class="scale"><span>0</span><span>${num(n.kcal)}</span></div>
      <div class="bars ${t.kcal > n.kcal ? 'over' : ''}" role="img" aria-label="${num(t.kcal)} из ${num(n.kcal)} ккал">${bars}</div>
      <div class="macros">
        <div><b>${t.c}<small>/${n.carbs}</small></b>г углеводов</div>
        <div><b>${t.p}<small>/${n.protein}</small></b>г белков</div>
        <div><b>${t.f}<small>/${n.fat}</small></b>г жиров</div>
      </div>
    </article>`;
  }

  // плавная кривая по точкам (для графиков веса)
  function smoothPath(pts) {
    if (pts.length < 2) return '';
    let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += `C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
    }
    return d;
  }
  function sparkSvg() {
    const w = JF.weights().slice(-10);
    let d, dot;
    if (w.length < 2) {   // пока одна запись — декоративная волна
      d = 'M6 96C30 96 48 14 81 14C114 14 126 74 164 74C200 74 214 40 252 40C288 40 304 66 345 58';
      dot = [81, 14];
    } else {
      const kg = w.map(x => x.kg), mn = Math.min(...kg), mx = Math.max(...kg);
      const pts = w.map((x, i) => [6 + i * (339 / (w.length - 1)), mx === mn ? 57 : 100 - (x.kg - mn) / (mx - mn) * 86]);
      d = smoothPath(pts); dot = pts[pts.length - 1];
    }
    return `<svg class="spark" viewBox="0 0 351 116" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="wg1" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#6ec0da" stop-opacity=".15"/><stop offset=".25" stop-color="#6ec0da" stop-opacity="1"/><stop offset="1" stop-color="#6ec0da" stop-opacity=".35"/></linearGradient>
        <linearGradient id="wg2" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#6ec0da" stop-opacity=".05"/><stop offset=".5" stop-color="#6ec0da" stop-opacity=".28"/><stop offset="1" stop-color="#6ec0da" stop-opacity=".1"/></linearGradient>
      </defs>
      <path d="${d}" fill="none" stroke="url(#wg2)" stroke-width="11" stroke-linecap="round" transform="translate(0 16)"/>
      <path d="${d}" fill="none" stroke="url(#wg1)" stroke-width="11" stroke-linecap="round"/>
      <circle cx="${dot[0].toFixed(1)}" cy="${dot[1].toFixed(1)}" r="9" fill="#83c5dd" stroke="#fff" stroke-width="4"/>
    </svg>`;
  }

  function weightCard(tap) {
    const p = JF.profile, n = JF.norms(), cw = JF.currentWeight();
    const target = p.perWeek || 3, done = JF.weekWorkouts();
    const pct = Math.min(100, Math.round(done / target * 100));
    return `<article class="card card--md pad ${tap ? 'tap' : ''}" ${tap ? 'data-go-card="#/progress"' : ''}>
      <div class="c-head">
        <div class="c-title"><span class="chip">${icon('arrowsLR')}</span>Вес</div>
        <div class="c-val">${p.height}<span>см</span></div>
      </div>
      <div class="c-sub"><span>Здоровый вес: ${n.healthyMin}–${n.healthyMax} кг</span><span>Твой рост</span></div>
      ${sparkSvg()}
      <div class="w-foot">
        <div class="w-big"><em data-count="${cw}" data-dec="1">${dec(cw)}</em><span>кг</span></div>
        <p class="w-note">Недельный план<br>выполнен на ${pct}%<b>${pct >= 100 ? 'Отлично!' : pct >= 34 ? 'Так держать!' : 'Ты справишься!'}</b></p>
      </div>
    </article>`;
  }

  // =========================================================
  //  ЭКРАНЫ
  // =========================================================
  const SCREENS = {};

  // ---------- Главная ----------
  SCREENS.home = function () {
    const p = JF.profile, n = JF.norms(), day = JF.peek();
    const pid = JF.program(), prog = D.find(pid), next = JF.nextIndex(pid), done = JF.doneList(pid).length;
    // вода
    let cups = '';
    for (let i = 0; i < 24; i++) {
      const cls = i < day.water ? 'full' : i < n.glasses ? 'empty' : 'extra';
      const pour = cls === 'full' && cupPour && i >= cupPour[0] && i < cupPour[1];
      cups += `<button data-cup="${i}" class="${pour ? 'pop' : ''}" aria-label="${i < day.water ? 'Убрать стакан' : 'Отметить стакан'} ${i + 1}">${pour ? cupSvg('empty') + cupSvg('full pour') : cupSvg(cls)}</button>`;
    }
    const days = waterRange === 'D' ? 1 : waterRange === 'W' ? 7 : 30;
    const liters = (days === 1 ? day.water : JF.average(days, d => d.water)) * 0.25;
    const reached = day.water >= n.glasses;
    const tip = D.TIPS[tipIndex];
    const h = new Date().getHours();
    const hi = h < 5 ? 'Доброй ночи' : h < 12 ? 'Доброе утро' : h < 18 ? 'Привет' : 'Добрый вечер';
    return {
      cls: 'home', live: true,
      top: { title: `${hi}, ${p.name}!`, sub: 'Давай посмотрим на твою активность за день.' },
      html: `
      <section class="row-a">
        <article class="card card--lg hero">
          <div class="hero-photo" aria-hidden="true"></div>
          <h2>Тренировка дома начинается здесь!</h2>
          <div class="hero-mid">
            <button class="play" data-act="play" aria-label="Начать тренировку">${icon('play')}</button>
            <button class="explore" data-act="program">Смотреть программу</button>
          </div>
          <div class="hero-bottom">
            <div class="join">
              <p class="join-l">Твоя программа: ${esc(prog.title)}</p>
              <div class="join-row">${BUB('dumbbell', 'run', 'leaf')}
                <div class="join-n"><b>${done}/${prog.count}</b><span>тренировок</span></div>
              </div>
            </div>
            <button class="trial" data-act="play">${next == null ? 'Выбрать программу' : 'Начать тренировку'}<i>${icon('arrow')}</i></button>
          </div>
        </article>

        <article class="card card--lg hydra">
          <div class="hydra-head">
            <h3>Водный баланс</h3>
            <p>Пей воду в течение дня.<br>Нажми на стакан, чтобы отметить его.</p>
          </div>
          <button class="welldone" data-act="${reached ? 'water-info' : 'water-add'}">${reached ? 'Норма есть ' + icon('thumbs') : icon('plus') + ' Стакан'}</button>
          <div class="cups" id="cups" role="group" aria-label="${day.water} из ${n.glasses} стаканов">${cups}</div>
          <div class="range" role="group" aria-label="Период">
            ${['D', 'W', 'M'].map(r => `<button data-range="${r}" aria-pressed="${waterRange === r}" aria-label="${r === 'D' ? 'Сегодня' : r === 'W' ? 'Неделя' : 'Месяц'}">${r === 'D' ? 'Д' : r === 'W' ? 'Н' : 'М'}</button>`).join('')}
          </div>
          <div class="liters"><em>${waterRange === 'D' ? 'сегодня' : 'в среднем'}<br>норма ${dec(n.waterMl / 1000, 2)} л</em><b><i data-count="${liters}" data-dec="2">${dec(liters, 2)}</i>л</b><span>/День</span></div>
        </article>
      </section>

      <section class="row-b">
        <article class="card card--md pad sleep">
          <div class="sleep-top">
            ${BUB('moon', 'drop', 'apple', 'stack--s')}
            <span class="tag">${icon(tip.icon)}${esc(tip.tag)}</span>
          </div>
          <h3 class="${tipSwap ? 'swap' : ''}">${esc(tip.title)}</h3>
          <p class="${tipSwap ? 'swap' : ''}">${esc(tip.text)}</p>
          <div class="sleep-foot">
            <div class="count"><b>${tipIndex + 1}</b>/${D.TIPS.length}</div>
            <div class="pager">
              <button data-tip="-1" aria-label="Предыдущий совет">${icon('chevL')}</button>
              <button data-tip="1" aria-label="Следующий совет">${icon('chevR')}</button>
            </div>
          </div>
        </article>
        ${caloriesCard(true)}
        ${weightCard(true)}
      </section>`,
      mount(v) {
        v.onclick = e => {
          const t = e.target;
          const cup = t.closest('[data-cup]');
          if (cup) { const i = +cup.getAttribute('data-cup'); setWater(i < JF.peek().water ? i : i + 1); return refresh(); }
          const rg = t.closest('[data-range]');
          if (rg) { waterRange = rg.getAttribute('data-range'); return refresh(); }
          const tp = t.closest('[data-tip]');
          if (tp) { tipIndex = (tipIndex + +tp.getAttribute('data-tip') + D.TIPS.length) % D.TIPS.length; tipSwap = true; return refresh(); }
          const a = t.closest('[data-act]');
          if (a) {
            const act = a.getAttribute('data-act');
            if (act === 'play') return next == null ? go('#/workouts') : go(`#/workout/${pid}/${next}`);
            if (act === 'program') return go('#/program/' + pid);
            if (act === 'water-add') { setWater(JF.peek().water + 1); toast(`+250 мл · ${JF.peek().water} из ${n.glasses} стаканов`); return refresh(); }
            if (act === 'water-info') return toast(`Норма на сегодня выполнена: ${dec(JF.peek().water * 0.25, 2)} л`);
          }
          const card = t.closest('[data-go-card]');
          if (card) go(card.getAttribute('data-go-card'));
        };
      }
    };
  };

  // ---------- Онбординг ----------
  SCREENS.start = function () {
    const s = onb, d = s.d, total = 5;
    const HERO = [
      { title: 'Твой ИИ-тренер в телефоне', sub: 'Тренировки дома, план питания и подсчёт калорий по фото — всё в одном приложении.' },
      { title: 'Давай знакомиться', sub: 'Тренер будет обращаться к тебе по имени.', pills: [['user', 'Шаг 1 из 4'], ['shield', 'Данные под защитой']] },
      { title: 'Посчитаем твою норму', sub: 'По формуле Миффлина — Сан-Жеора, как у диетологов.', pills: [['scale', 'Шаг 2 из 4'], ['flame', 'Калории и БЖУ']] },
      { title: 'К чему идём?', sub: 'Цель меняет калории и программу тренировок.', pills: [['flame', 'Шаг 3 из 4'], ['activity', 'Своя программа']] },
      { title: 'Последний вопрос', sub: 'Учтём, сколько ты двигаешься в обычную неделю.', pills: [['run', 'Шаг 4 из 4'], ['drop', 'Норма воды']] },
      { title: 'Всё готово!', sub: 'Начни с первой тренировки или отметь стакан воды.', pills: [['check', 'План готов'], ['spark', 'ИИ-тренер ждёт']] }
    ];
    const steps = `<div class="onb-steps" aria-hidden="true">${Array.from({ length: total }, (_, i) => `<i class="${i < s.step ? 'on' : ''}"></i>`).join('')}</div>`;
    let body = '';
    if (s.step === 0) {
      body = `<h1>Добро пожаловать!</h1><p class="lead">Ответь на 4 коротких вопроса — посчитаем твою норму калорий, белков и воды и подберём программу тренировок.</p>
        <div class="feat"><span class="chip">${icon('spark')}</span>ИИ-тренер ответит на любой вопрос и составит план</div>
        <div class="feat"><span class="chip">${icon('camera')}</span>Сфотографируй еду — узнаешь калории и БЖУ</div>
        <div class="feat"><span class="chip">${icon('dumbbell')}</span>Программы тренировок без инвентаря</div>
        <div class="onb-foot"><button class="btn btn-dark" data-next>Начать${icon('arrow')}</button></div>
        ${ACC() ? `<button class="btn btn-ghost btn-block" data-go-login style="margin-top:.625rem">${icon('user')}У меня уже есть аккаунт</button>
          <p class="disclaimer" style="margin-top:1rem">Войди, чтобы вернуть свои данные после переустановки или на другом устройстве.</p>`
          : '<p class="disclaimer" style="margin-top:1rem">Твои данные хранятся только на этом устройстве.</p>'}`;
    } else if (s.step === 1) {
      body = `${steps}<h1>Как тебя зовут?</h1><p class="lead">Так ИИ-тренер будет обращаться к тебе.</p>
        <div class="field"><label class="label" for="f-name">Имя</label><input class="input" id="f-name" maxlength="30" value="${esc(d.name || '')}" placeholder="Например, Айбек" autocomplete="given-name"></div>
        <label class="label">Пол (нужен для расчёта нормы калорий)</label>
        <div class="seg" data-pick="sex">
          <button data-v="m" aria-pressed="${d.sex === 'm'}">Мужской</button><button data-v="f" aria-pressed="${d.sex === 'f'}">Женский</button>
        </div>
        <div class="onb-foot"><button class="btn btn-ghost" data-prev>Назад</button><button class="btn btn-dark" data-next>Дальше</button></div>`;
    } else if (s.step === 2) {
      body = `${steps}<h1>Твои параметры</h1><p class="lead">Нужны, чтобы посчитать норму калорий, белков и воды.</p>
        <div class="field"><label class="label" for="f-age">Возраст, лет</label><input class="input" id="f-age" type="number" inputmode="numeric" min="14" max="90" value="${d.age || ''}" placeholder="25"></div>
        <div class="field"><label class="label" for="f-h">Рост, см</label><input class="input" id="f-h" type="number" inputmode="numeric" min="120" max="230" value="${d.height || ''}" placeholder="175"></div>
        <div class="field"><label class="label" for="f-w">Вес, кг</label><input class="input" id="f-w" type="number" inputmode="decimal" step="0.1" min="30" max="300" value="${d.weight || ''}" placeholder="72,5"></div>
        <div class="onb-foot"><button class="btn btn-ghost" data-prev>Назад</button><button class="btn btn-dark" data-next>Дальше</button></div>`;
    } else if (s.step === 3) {
      body = `${steps}<h1>Какая у тебя цель?</h1><p class="lead">Под неё подстроим калории и программу тренировок.</p>
        <div data-pick="goal">
          ${[['lose', 'Похудеть', 'Дефицит калорий и жиросжигающие тренировки', 'flame'], ['keep', 'Держать форму', 'Баланс калорий, тонус и здоровье', 'leaf'], ['gain', 'Набрать массу', 'Профицит калорий и силовые тренировки', 'dumbbell']]
            .map(([v, t, sub, ic]) => `<button class="opt" data-v="${v}" aria-pressed="${d.goal === v}"><span class="chip">${icon(ic)}</span><span><b>${t}</b><small>${sub}</small></span></button>`).join('')}
        </div>
        <div class="field" ${d.goal && d.goal !== 'keep' ? '' : 'hidden'} id="gw-field"><label class="label" for="f-gw">Желаемый вес, кг</label>
          <input class="input" id="f-gw" type="number" inputmode="decimal" step="0.1" value="${d.goalWeight || ''}" placeholder="${d.weight ? Math.round(d.weight * (d.goal === 'gain' ? 1.06 : 0.92)) : 68}"></div>
        <div class="onb-foot"><button class="btn btn-ghost" data-prev>Назад</button><button class="btn btn-dark" data-next>Дальше</button></div>`;
    } else if (s.step === 4) {
      body = `${steps}<h1>Насколько ты активен?</h1><p class="lead">Учитываем обычную неделю, без новых тренировок.</p>
        <div data-pick="activity">
          ${ACTIVITY.map(([v, t, sub], i) => `<button class="opt" data-v="${v}" aria-pressed="${d.activity === v}"><span class="chip">${icon(['user', 'run', 'activity', 'zap'][i])}</span><span><b>${t}</b><small>${sub}</small></span></button>`).join('')}
        </div>
        <div class="onb-foot"><button class="btn btn-ghost" data-prev>Назад</button><button class="btn btn-dark" data-next>Посчитать</button></div>`;
    } else {
      const n = JF.norms(Object.assign({}, d));
      const rec = recommendProgram(d);
      body = `${steps}<h1>Твой план готов, ${esc(d.name)}!</h1><p class="lead">Нормы можно поменять в профиле в любой момент.</p>
        <div class="norms">
          <div class="big"><b>${num(n.kcal)} ккал</b><span>в день · цель: ${GOALS[d.goal].toLowerCase()}</span></div>
          <div><b>${n.protein} г</b><span>белков</span></div><div><b>${n.fat} г</b><span>жиров</span></div>
          <div><b>${n.carbs} г</b><span>углеводов</span></div><div><b>${dec(n.waterMl / 1000, 2)} л</b><span>воды (${n.glasses} стаканов)</span></div>
        </div>
        <div class="note">${icon('activity')}<div>Программа для старта: <b>${esc(rec.title)}</b> — ${esc(rec.sub.toLowerCase())}, 3 тренировки в неделю.</div></div>
        <div class="onb-foot"><button class="btn btn-ghost" data-prev>Назад</button><button class="btn btn-lime" data-finish>Поехали${icon('arrow')}</button></div>`;
    }
    return {
      top: false, noRail: true, cls: 'page',
      html: authLayout(HERO[Math.min(s.step, 5)], body),
      mount(v) {
        window.JF_onBack = () => { if (onb.step > 0) { collect(v); onb.step--; refresh(); return true; } return false; };
        v.onclick = e => {
          const pick = e.target.closest('[data-pick] [data-v]');
          if (pick) {
            const key = pick.closest('[data-pick]').getAttribute('data-pick');
            let val = pick.getAttribute('data-v'); if (key === 'activity') val = +val;
            collect(v); onb.d[key] = val;
            $$('[data-v]', pick.parentNode).forEach(b => b.setAttribute('aria-pressed', b === pick));
            if (key === 'goal') { const f = $('#gw-field'); f.hidden = val === 'keep'; }
            return;
          }
          if (e.target.closest('[data-go-login]')) return go('#/login');
          if (e.target.closest('[data-prev]')) { collect(v); onb.step--; return refresh(); }
          if (e.target.closest('[data-next]')) {
            collect(v);
            const err = validate(onb.step, onb.d);
            if (err) return toast(err);
            onb.step++; return refresh();
          }
          if (e.target.closest('[data-finish]')) {
            const dd = onb.d;
            const prof = { name: dd.name, sex: dd.sex, age: dd.age, height: dd.height, weight: dd.weight, goal: dd.goal,
              goalWeight: dd.goal === 'keep' ? dd.weight : dd.goalWeight, activity: dd.activity, perWeek: 3 };
            JF.setProfile(prof);
            JF.setProgram(recommendProgram(dd).id);
            onb = { step: 0, d: {} };
            location.replace(ACC() && !ACC().user ? '#/signup/onb' : '#/home');
          }
        };
        v.onkeydown = e => { if (e.key === 'Enter' && e.target.tagName === 'INPUT') { const n = $('[data-next]', v); if (n) n.click(); } };
        const first = $('input', v); if (first && onb.step > 0 && window.innerWidth > 620) first.focus();
      }
    };
  };
  function collect(v) {
    const val = id => { const el = $('#' + id, v); return el ? el.value.trim() : undefined; };
    const d = onb.d;
    if (val('f-name') !== undefined) d.name = val('f-name');
    const numv = (id, key) => { const x = val(id); if (x !== undefined) d[key] = x === '' ? undefined : +x.replace(',', '.'); };
    numv('f-age', 'age'); numv('f-h', 'height'); numv('f-w', 'weight'); numv('f-gw', 'goalWeight');
  }
  function validate(step, d) {
    if (step === 1) { if (!d.name) return 'Напиши своё имя'; if (!d.sex) return 'Выбери пол'; }
    if (step === 2) {
      if (!(d.age >= 14 && d.age <= 90)) return 'Возраст — от 14 до 90 лет';
      if (!(d.height >= 120 && d.height <= 230)) return 'Рост — от 120 до 230 см';
      if (!(d.weight >= 30 && d.weight <= 300)) return 'Вес — от 30 до 300 кг';
    }
    if (step === 3) {
      if (!d.goal) return 'Выбери цель';
      if (d.goal !== 'keep') {
        if (!(d.goalWeight >= 30 && d.goalWeight <= 300)) return 'Укажи желаемый вес';
        if (d.goal === 'lose' && d.goalWeight >= d.weight) return 'Для похудения желаемый вес должен быть меньше текущего';
        if (d.goal === 'gain' && d.goalWeight <= d.weight) return 'Для набора массы желаемый вес должен быть больше текущего';
      }
    }
    if (step === 4 && !d.activity) return 'Выбери уровень активности';
    return '';
  }
  function recommendProgram(d) {
    const id = d.goal === 'gain' ? 'strength' : d.goal === 'lose' && d.activity >= 1.55 ? 'burn' : 'start';
    return D.PROGRAMS.find(p => p.id === id);
  }

  // ---------- Тренировки ----------
  SCREENS.workouts = function () {
    const pid = JF.program(), prog = D.find(pid);
    const next = JF.nextIndex(pid), done = JF.doneList(pid).length, w = JF.currentWeight();
    const nw = next == null ? null : D.workout(pid, next), np = nw && D.plan(nw, w);
    const total = Object.values(JF.state.days).reduce((s, d) => s + d.workouts.length, 0);
    const exIds = Object.keys(D.EXERCISES);
    return {
      top: { title: 'Тренировки', sub: 'Программы без инвентаря — дома, в парке, в поездке.' },
      html: `<div class="grid grid-2">
        <div class="prog-hero">
          <div class="pills"><span class="pill lime">Текущая программа</span><span class="pill dark">${esc(prog.level)}</span></div>
          <h2 class="h2">${esc(prog.title)}</h2>
          <small>${esc(prog.about)}</small>
          <div class="bar"><i style="width:${Math.round(done / prog.count * 100)}%"></i></div>
          <small>Пройдено ${done} из ${prog.count} ${plural(prog.count, 'тренировки', 'тренировок', 'тренировок')}</small>
          ${nw ? `<button class="btn btn-lime btn-block" data-go-btn="#/workout/${pid}/${next}">${icon('play')}${esc(nw.title)} · ~${np.min} мин</button>`
            : `<button class="btn btn-lime btn-block" data-reset="${pid}">${icon('refresh')}Пройти программу заново</button>`}
          <button class="btn btn-white btn-block" data-go-btn="#/program/${pid}">Все тренировки программы</button>
        </div>
        <div class="card pad" style="gap:1rem">
          <div class="h3">Твоя активность</div>
          <div class="grid grid-3 keep">
            <div class="kpi"><b>${JF.weekWorkouts()}<small>/${JF.profile.perWeek || 3}</small></b><span>на этой неделе</span></div>
            <div class="kpi"><b>${JF.streak()}</b><span>${plural(JF.streak(), 'день', 'дня', 'дней')} подряд</span></div>
            <div class="kpi"><b>${total}</b><span>всего</span></div>
          </div>
          <div class="note">${icon('info')}<div>Для результата достаточно 3 тренировок в неделю. Между силовыми тренировками давай телу день отдыха.</div></div>
        </div>
      </div>
      <div class="ai-plan">
        <span class="chip">${icon('spark')}</span>
        <div class="li-main"><b>Программа от ИИ-тренера</b><small>Под твою цель, уровень, время и пожелания — например, «болит колено» или «только пресс».</small></div>
        <button class="btn btn-dark" data-ai-plan>${icon('spark')}Создать</button>
      </div>
      <div class="sec"><h2>Программы</h2></div>
      <div class="grid grid-2">
        ${D.all().map(p => {
          const dn = JF.doneList(p.id).length, pl = D.plan(D.workout(p.id, 0), w);
          return `<button class="card pad prog-card tap ${p.id === pid ? 'is-current' : ''}" data-go-btn="#/program/${p.id}">
            <div class="c-head"><span class="prog-dot" style="background:${p.color}">${icon(p.ai ? 'spark' : p.id === 'mobility' ? 'leaf' : p.id === 'burn' ? 'flame' : 'dumbbell')}</span>
              <span class="pills">${p.ai ? '<span class="pill">ИИ</span>' : ''}${p.id === pid ? '<span class="pill lime">Текущая</span>' : ''}</span></div>
            <div><div class="h3">${esc(p.title)}</div><div class="muted" style="font-size:.875rem;margin-top:.25rem">${esc(p.sub)}</div></div>
            <div class="pills"><span class="pill">${esc(p.level)}</span><span class="pill">${icon('calendar')}${p.count} трен.</span><span class="pill">${icon('timer')}~${pl.min} мин</span></div>
            <div class="bar"><i style="width:${Math.round(dn / p.count * 100)}%"></i></div>
          </button>`;
        }).join('')}
      </div>
      <div class="sec"><h2>Упражнения</h2></div>
      <div class="card pad"><div class="list">
        ${exIds.map(id => { const ex = D.EXERCISES[id]; return `<button class="li" data-ex="${id}"><span class="ex-thumb">${JF_ANIM.still(id)}</span><span class="li-main"><b>${esc(ex.name)}</b><small>${esc(ex.muscles)}</small></span>${icon('chevR').replace('<svg', '<svg style="width:1rem;height:1rem;color:var(--muted-2)"')}</button>`; }).join('')}
      </div></div>`,
      mount(v) { v.onclick = e => { if (e.target.closest('[data-ai-plan]')) return planSheet(); commonClicks(e); }; }
    };
  };
  function commonClicks(e) {
    const g = e.target.closest('[data-go-btn]');
    if (g) return go(g.getAttribute('data-go-btn'));
    const ex = e.target.closest('[data-ex]');
    if (ex) return exerciseSheet(ex.getAttribute('data-ex'), ex.getAttribute('data-amount'));
    const rs = e.target.closest('[data-reset]');
    if (rs) {
      UI.confirm({ title: 'Начать программу заново?', text: 'Отметки о пройденных тренировках этой программы сбросятся. История в «Прогрессе» останется.', ok: 'Начать заново' })
        .then(ok => { if (ok) { JF.resetProgram(rs.getAttribute('data-reset')); refresh(); } });
    }
  }
  function amountText(id, amount) {
    const ex = D.EXERCISES[id];
    return (ex.type === 'time' ? `${amount} с` : `×${amount}`) + (ex.sides ? ' на каждую сторону' : '');
  }
  function exerciseSheet(id, amount) {
    const ex = D.EXERCISES[id]; if (!ex) return;
    openSheet({ title: ex.name, html: `
      <div class="ex-anim" data-anim></div>
      <div class="pills" style="margin-bottom:1rem"><span class="pill">${icon(ex.icon)}${esc(ex.muscles)}</span>${amount ? `<span class="pill lime">${amountText(id, amount)}</span>` : ''}</div>
      <p class="lead" style="color:var(--ink-2)">${esc(ex.how)}</p>
      <button class="btn btn-dark btn-block" data-close style="margin-top:1.25rem">Понятно</button>`,
      onMount(sheet) { JF_ANIM.play($('[data-anim]', sheet), id); } });
  }


  SCREENS.program = function (pid) {
    const p = D.find(pid);
    if (!p) return { redirect: '#/workouts' };
    const done = JF.doneList(pid), next = JF.nextIndex(pid), w = JF.currentWeight(), isCur = JF.program() === pid;
    return {
      nav: 'workouts',
      top: { title: p.title, sub: p.sub, back: '#/workouts' },
      html: `<div class="grid grid-2">
        <div class="card pad" style="gap:1rem">
          <div class="pills"><span class="pill">${esc(p.level)}</span><span class="pill">${p.count} ${plural(p.count, 'тренировка', 'тренировки', 'тренировок')}</span>${isCur ? '<span class="pill lime">Текущая</span>' : ''}</div>
          <p class="lead">${esc(p.about)}</p>
          <div class="bar"><i style="width:${Math.round(done.length / p.count * 100)}%"></i></div>
          <div class="muted" style="font-size:.875rem">Пройдено ${done.length} из ${p.count}</div>
          ${isCur ? '' : `<button class="btn btn-dark btn-block" data-set-prog="${pid}">Сделать текущей программой</button>`}
          ${p.ai ? `<button class="btn btn-ghost btn-block" data-del-prog style="color:var(--danger)">${icon('trash')}Удалить эту программу</button>` : ''}
          ${next == null ? `<button class="btn btn-ghost btn-block" data-reset="${pid}">${icon('refresh')}Пройти заново</button>` : ''}
        </div>
        <div class="card pad"><div class="list">
          ${Array.from({ length: p.count }, (_, i) => {
            const wk = D.workout(pid, i), pl = D.plan(wk, w), isDone = done.includes(i), isNext = i === next;
            return `<button class="li ${isDone ? 'done' : isNext ? 'next' : ''}" data-go-btn="#/workout/${pid}/${i}">
              <span class="chip">${isDone ? icon('check') : `<b>${i + 1}</b>`}</span>
              <span class="li-main"><b>${esc(wk.short)}</b><small>${pl.min} мин · ~${pl.kcal} ккал · ${wk.rounds} ${plural(wk.rounds, 'раунд', 'раунда', 'раундов')}</small></span>
              ${isNext ? '<span class="pill lime">Следующая</span>' : ''}</button>`;
          }).join('')}
        </div></div>
      </div>`,
      mount(v) {
        v.onclick = e => {
          const sp = e.target.closest('[data-set-prog]');
          if (sp) { JF.setProgram(pid); toast('Программа выбрана'); return refresh(); }
          if (e.target.closest('[data-del-prog]')) {
            UI.confirm({ title: 'Удалить программу?', text: `«${p.title}» и отметки о её тренировках удалятся. История в «Прогрессе» останется.`, ok: 'Удалить', danger: true })
              .then(ok => { if (ok) { JF.removeCustomProgram(pid); toast('Программа удалена'); location.replace('#/workouts'); } });
            return;
          }
          commonClicks(e);
        };
      }
    };
  };

  SCREENS.workout = function (pid, idx) {
    const p = D.find(pid);
    idx = +idx;
    if (!p || !(idx >= 0 && idx < p.count)) return { redirect: '#/workouts' };
    const wk = D.workout(pid, idx), pl = D.plan(wk, JF.currentWeight()), isDone = JF.doneList(pid).includes(idx);
    return {
      nav: 'workouts',
      top: { title: wk.short, sub: `${p.title} · день ${idx + 1}`, back: '#/program/' + pid },
      html: `<div class="grid grid-2">
        <div class="prog-hero">
          <div class="pills"><span class="pill dark">${icon('timer')}~${pl.min} мин</span><span class="pill dark">${icon('flame')}~${pl.kcal} ккал</span><span class="pill dark">${wk.rounds} ${plural(wk.rounds, 'раунд', 'раунда', 'раундов')}</span></div>
          <h2 class="h2">${esc(wk.title)}</h2>
          <small>Выполни все упражнения по кругу ${wk.rounds} ${plural(wk.rounds, 'раз', 'раза', 'раз')}. Отдых между упражнениями — ${wk.rest} секунд. ${isDone ? 'Эту тренировку ты уже прошёл — можно повторить.' : ''}</small>
          <button class="btn btn-lime btn-block" data-go-btn="#/play/${pid}/${idx}">${icon('play')}Начать тренировку</button>
        </div>
        <div class="card pad"><div class="h3" style="margin-bottom:.25rem">Упражнения</div><div class="list">
          ${wk.items.map((it, k) => { const ex = D.EXERCISES[it.id]; return `<button class="ex-row" data-ex="${it.id}" data-amount="${it.amount}"><span class="ex-thumb">${JF_ANIM.still(it.id)}<i>${k + 1}</i></span>
            <span class="li-main"><b>${esc(ex.name)}</b><small>${esc(ex.muscles)}</small></span><span class="li-end">${amountText(it.id, it.amount).replace(' на каждую сторону', ' ×2')}</span></button>`; }).join('')}
        </div>
        <p class="disclaimer" style="text-align:left;margin-top:1rem">Нажми на упражнение, чтобы посмотреть технику. При боли или головокружении остановись.</p></div>
      </div>`,
      mount(v) { v.onclick = commonClicks; }
    };
  };

  // ---------- Плеер тренировки ----------
  SCREENS.play = function (pid, idx) {
    const p = D.find(pid);
    idx = +idx;
    if (!p || !(idx >= 0 && idx < p.count)) return { redirect: '#/workouts' };
    const wk = D.workout(pid, idx), weight = JF.currentWeight(), plan = D.plan(wk, weight);
    const steps = [];
    for (let r = 0; r < wk.rounds; r++) wk.items.forEach((it, k) => {
      steps.push({ kind: 'ex', it, r, k });
      const last = r === wk.rounds - 1 && k === wk.items.length - 1;
      if (!last) steps.push({ kind: 'rest', sec: k === wk.items.length - 1 ? wk.rest + 25 : wk.rest });
    });
    const exCount = steps.filter(s => s.kind === 'ex').length;
    const st = { i: -1, endAt: 0, left: 0, paused: false, started: 0, doneEx: 0, kcal: 0, timer: null, finished: false, lastBeep: null };

    function stepDur(s) { return s.kind === 'rest' ? s.sec : D.EXERCISES[s.it.id].type === 'time' ? D.exSeconds(s.it) : 0; }
    function startStep(i) {
      st.i = i; st.paused = false; st.lastBeep = null;
      if (i >= steps.length) return finish();
      const s = steps[i], dur = stepDur(s);
      st.endAt = dur ? Date.now() + dur * 1000 : 0;
      UI.beep(s.kind === 'rest' ? 520 : 880, 160);
      draw();
    }
    function completeEx() {
      const s = steps[st.i];
      if (s && s.kind === 'ex') {
        st.doneEx++;
        st.kcal += D.EXERCISES[s.it.id].met * 3.5 * weight / 200 * (D.exSeconds(s.it) / 60);
      }
      startStep(st.i + 1);
    }
    function tick() {
      if (st.i < 0 || st.paused || st.finished) return;
      const s = steps[st.i]; if (!s || !st.endAt) return;
      const left = Math.max(0, Math.ceil((st.endAt - Date.now()) / 1000));
      const el = $('#pl-t', view); if (el) el.textContent = left;
      const ring = $('#pl-ring', view);
      if (ring) { const dur = stepDur(s); ring.style.strokeDashoffset = (2 * Math.PI * 54 * (1 - left / dur)).toFixed(1); }
      if (left <= 3 && left > 0 && st.lastBeep !== left) { st.lastBeep = left; UI.beep(660, 90); }
      if (left === 0) { if (s.kind === 'ex') completeEx(); else startStep(st.i + 1); }
    }
    function togglePause() {
      const s = steps[st.i]; if (!s || !st.endAt) return;
      if (st.paused) { st.endAt = Date.now() + st.left; st.paused = false; }
      else { st.left = st.endAt - Date.now(); st.paused = true; }
      draw();
    }
    function finish() {
      st.finished = true;
      const min = Math.max(1, Math.round((Date.now() - st.started) / 60000));
      const kcal = Math.round(st.kcal + weight * 0.04 * 2);
      JF.logWorkout({ pid, idx, title: wk.title, min, kcal, ex: st.doneEx });
      UI.beep(990, 500); UI.confetti();
      view.innerHTML = `<div class="player"><div class="pl-card finish">
        <div class="pl-ic">${icon('check')}</div>
        <div class="pl-name">Тренировка завершена!</div>
        <p class="muted">${esc(wk.title)}</p>
        <div class="grid grid-3 keep" style="width:100%;max-width:26rem;margin:.5rem 0">
          <div class="kpi"><b>${min}</b><span>${plural(min, 'минута', 'минуты', 'минут')}</span></div>
          <div class="kpi"><b>~${kcal}</b><span>ккал</span></div>
          <div class="kpi"><b>${st.doneEx}</b><span>${plural(st.doneEx, 'упражнение', 'упражнения', 'упражнений')}</span></div>
        </div>
        <div class="pl-ctrl" style="width:100%;max-width:26rem;flex-direction:column">
          <button class="btn btn-dark btn-block" data-go-btn="#/home">На главную</button>
          <button class="btn btn-ghost btn-block" data-go-btn="#/coach">${icon('chat')}Спросить ИИ-тренера</button>
        </div></div></div>`;
      window.JF_onBack = null;
    }
    function draw() {
      const s = steps[st.i];
      const prog = steps.map((x, k) => x.kind === 'ex' ? `<i class="${k < st.i || (k === st.i && false) ? 'on' : ''}"></i>` : '').join('');
      const head = `<div class="pl-top"><button class="icon-btn" data-quit aria-label="Выйти">${icon('close')}</button>
        <div style="text-align:center"><b>${esc(wk.short)}</b><div class="muted" style="font-size:.8125rem">${s && s.kind === 'ex' ? `Раунд ${s.r + 1}/${wk.rounds} · упражнение ${s.k + 1}/${wk.items.length}` : st.i < 0 ? `${exCount} подходов · ~${plan.min} мин` : 'Отдых'}</div></div>
        <span style="width:2.75rem"></span></div><div class="pl-steps">${prog}</div>`;
      let card;
      if (st.i < 0) {
        const f = D.EXERCISES[wk.items[0].id];
        card = `<div class="pl-card"><div class="pl-anim" data-anim="${wk.items[0].id}"></div><div class="pl-name">Готов?</div>
          <p class="pl-how">Первое упражнение — «${esc(f.name)}». Сделай лёгкую разминку: покрути плечами, тазом, пройдись на месте 1–2 минуты.</p>
          <button class="btn btn-lime" data-start style="min-width:14rem">${icon('play')}Старт</button></div>`;
      } else if (s.kind === 'rest') {
        const nx = steps[st.i + 1], nex = nx && D.EXERCISES[nx.it.id];
        card = `<div class="pl-card rest"><div class="muted">Отдых</div>
          <div class="ring"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="8"/>
            <circle id="pl-ring" cx="60" cy="60" r="54" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round" stroke-dasharray="${(2 * Math.PI * 54).toFixed(1)}" stroke-dashoffset="0"/></svg>
            <div class="t" id="pl-t">${s.sec}</div></div>
          ${nex ? `<div class="muted">Дальше: <b style="color:#fff">${esc(nex.name)}</b> · ${amountText(nx.it.id, nx.it.amount)}</div>` : ''}
          <div class="pl-ctrl"><button class="btn btn-white" data-pause>${icon(st.paused ? 'play' : 'pause')}${st.paused ? 'Продолжить' : 'Пауза'}</button>
          <button class="btn btn-white" data-skip>${icon('skip')}Пропустить</button></div></div>`;
      } else {
        const ex = D.EXERCISES[s.it.id], timed = ex.type === 'time';
        card = `<div class="pl-card"><div class="pl-anim" data-anim="${s.it.id}"></div>
          <div class="pl-name">${esc(ex.name)}</div>
          ${timed ? `<div class="ring"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="54" fill="none" stroke="#eef6fc" stroke-width="8"/>
              <circle id="pl-ring" cx="60" cy="60" r="54" fill="none" stroke="#94a103" stroke-width="8" stroke-linecap="round" stroke-dasharray="${(2 * Math.PI * 54).toFixed(1)}" stroke-dashoffset="0"/></svg>
              <div class="t" id="pl-t">${D.exSeconds(s.it)}</div></div>${ex.sides ? '<div class="muted">Поменяй сторону на середине</div>' : ''}`
            : `<div class="pl-big">×${s.it.amount}${ex.sides ? '<small>на сторону</small>' : ''}</div>`}
          <p class="pl-how">${esc(ex.how)}</p>
          <div class="pl-ctrl">
            ${timed ? `<button class="btn btn-ghost" data-pause>${icon(st.paused ? 'play' : 'pause')}${st.paused ? 'Продолжить' : 'Пауза'}</button><button class="btn btn-ghost" data-skip>${icon('skip')}Дальше</button>`
              : `<button class="btn btn-lime" data-done style="min-width:14rem">${icon('check')}Готово</button><button class="btn btn-ghost" data-skip>${icon('skip')}Пропустить</button>`}
          </div></div>`;
      }
      view.innerHTML = `<div class="player">${head}${card}</div>`;
      const an = $('[data-anim]', view); if (an) JF_ANIM.play(an, an.getAttribute('data-anim'));
      tick();
    }
    async function quit() {
      if (st.finished || st.i < 0) { go(`#/workout/${pid}/${idx}`); return true; }
      const wasPaused = st.paused;
      if (!wasPaused) togglePause();
      const ok = await UI.confirm({ title: 'Завершить тренировку?', text: st.doneEx >= exCount / 2 ? 'Ты сделал больше половины — сохраним её как выполненную.' : 'Тренировка не сохранится. Можно вернуться к ней позже.', ok: st.doneEx >= exCount / 2 ? 'Сохранить и выйти' : 'Выйти', cancel: 'Продолжить тренировку' });
      if (ok) {
        if (st.doneEx >= exCount / 2) finish(); else { st.finished = true; history.length > 1 ? history.back() : go('#/workouts'); }
      } else if (!wasPaused) togglePause();
      return true;
    }
    return {
      nav: 'workouts', noRail: true, top: false, cls: 'page',
      html: '',
      mount(v) {
        draw();
        st.timer = setInterval(tick, 250);
        window.JF_onBack = quit;
        v.onclick = e => {
          if (e.target.closest('[data-start]')) { st.started = Date.now(); return startStep(0); }
          if (e.target.closest('[data-done]')) return completeEx();
          if (e.target.closest('[data-skip]')) { const s = steps[st.i]; return s && s.kind === 'rest' ? startStep(st.i + 1) : completeEx(); }
          if (e.target.closest('[data-pause]')) return togglePause();
          if (e.target.closest('[data-quit]')) return quit();
          commonClicks(e);
        };
      },
      destroy() { clearInterval(st.timer); }
    };
  };

  // ---------- Питание ----------
  SCREENS.food = function () {
    const day = JF.peek(), yesterday = JF.peek(JF.dayKey(JF.addDays(new Date(), -1)));
    return {
      live: true,
      top: { title: 'Питание', sub: 'Сфотографируй еду — ИИ посчитает калории и БЖУ.' },
      html: `<div class="grid grid-2">
        <div class="scan-cta">
          <div class="c-head"><div class="c-title">${icon('spark').replace('<svg', '<svg style="width:1.5rem;height:1.5rem"')}Сканер еды с ИИ</div></div>
          <p>Сфотографируй тарелку сверху при хорошем свете. ИИ найдёт блюда, оценит вес порции и посчитает калории, белки, жиры и углеводы.</p>
          <div class="row-btns">
            <label class="btn btn-lime" style="flex:1">${icon('camera')}Сфотографировать<input type="file" accept="image/*" capture="environment" data-photo hidden></label>
            <label class="btn btn-white" style="flex:1">${icon('image')}Из галереи<input type="file" accept="image/*" data-photo hidden></label>
          </div>
          <button class="btn btn-dark btn-block" data-manual>${icon('plus')}Добавить вручную</button>
        </div>
        ${caloriesCard(false)}
      </div>
      <div class="sec"><h2>Дневник за сегодня</h2></div>
      <div class="grid grid-2">
        ${MEALS.map(([key, name]) => {
          const items = day.meals.filter(m => m.meal === key);
          const sum = items.reduce((s, m) => s + m.kcal, 0);
          const yest = items.length ? [] : yesterday.meals.filter(m => m.meal === key);
          const ySum = yest.reduce((s, m) => s + m.kcal, 0);
          return `<div class="card pad"><div class="meal-head"><b>${name}</b><span>${num(sum)} ккал</span></div>
            ${items.length ? `<div class="list">${items.map(m => `<div class="li"><span class="li-main"><b>${esc(m.name)}</b><small>${m.grams ? m.grams + ' г · ' : ''}Б ${dec(m.p)} · Ж ${dec(m.f)} · У ${dec(m.c)}</small></span>
              <span class="li-end">${num(m.kcal)} ккал</span>
              <button class="del fav ${JF.isFavorite(m.name) ? 'on' : ''}" data-fav="${m.id}" aria-label="${JF.isFavorite(m.name) ? 'Убрать из избранного' : 'В избранное'}">${icon('star')}</button>
              <button class="del" data-del="${m.id}" aria-label="Удалить ${esc(m.name)}">${icon('trash')}</button></div>`).join('')}</div>`
              : `<p class="muted" style="font-size:.875rem;margin-top:.5rem">Пока пусто</p>`}
            <div class="row-btns" style="margin-top:.875rem">
              <button class="btn btn-ghost btn-sm" data-manual="${key}">${icon('plus')}Добавить</button>
              ${yest.length ? `<button class="btn btn-ghost btn-sm" data-repeat="${key}" title="${esc(yest.map(m => m.name).join(', '))}">${icon('refresh')}Как вчера · ${num(ySum)} ккал</button>` : ''}
            </div>
          </div>`;
        }).join('')}
      </div>`,
      mount(v) {
        v.onclick = e => {
          const del = e.target.closest('[data-del]');
          if (del) { JF.removeMeal(del.getAttribute('data-del')); toast('Удалено'); return refresh(); }
          const fav = e.target.closest('[data-fav]');
          if (fav) {
            const m = JF.peek().meals.find(x => x.id === fav.getAttribute('data-fav'));
            if (m) toast(JF.toggleFavorite(m) ? `«${m.name}» — в избранном ⭐` : 'Убрано из избранного');
            return refresh();
          }
          const rp = e.target.closest('[data-repeat]');
          if (rp) {
            const key = rp.getAttribute('data-repeat');
            const list = JF.peek(JF.dayKey(JF.addDays(new Date(), -1))).meals.filter(m => m.meal === key);
            list.forEach(m => JF.addMeal({ name: m.name, grams: m.grams, meal: key, kcal: m.kcal, p: m.p, f: m.f, c: m.c }));
            toast(`Добавлено как вчера: ${list.length} ${plural(list.length, 'блюдо', 'блюда', 'блюд')}`);
            return refresh();
          }
          const man = e.target.closest('[data-manual]');
          if (man) return addFoodSheet(null, man.getAttribute('data-manual') || null);
        };
        v.onchange = e => {
          if (!e.target.matches('[data-photo]') || !e.target.files || !e.target.files[0]) return;
          const file = e.target.files[0];
          e.target.value = '';
          startScan(file);
        };
      }
    };
  };

  function compress(file) {
    return new Promise((res, rej) => {
      const url = URL.createObjectURL(file), img = new Image();
      img.onload = () => {
        const k = Math.min(1, 1024 / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        res(c.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('bad image')); };
      img.src = url;
    });
  }
  async function api(path, body, ms) {
    if (navigator.onLine === false) throw new Error('offline');
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), ms || 45000);
    try {
      const r = await fetch(JF_API(path), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctl.signal });
      const data = await r.json().catch(() => ({}));
      if (!r.ok || !data.ok) throw new Error(data.error || 'server ' + r.status);
      return data;
    } finally { clearTimeout(t); }
  }
  async function startScan(file) {
    let img;
    try { img = await compress(file); } catch (e) { return toast('Не получилось открыть фото'); }
    pendingScan = { img, status: 'loading', meal: mealNow() };
    go('#/scan');
    runScan();
  }
  async function runScan() {
    const s = pendingScan; if (!s) return;
    s.status = 'loading'; s.error = '';
    if (parse().name === 'scan') refresh();
    try {
      const data = await api('/api/scan', { image: s.img.split(',')[1], mimeType: 'image/jpeg' }, 62000);
      if (pendingScan !== s) return;
      s.items = (data.items || []).map(it => {
        const g = Math.max(1, +it.grams || 100);
        return { name: String(it.name || 'Блюдо').slice(0, 60), grams: Math.round(g),
          per: { kcal: (+it.kcal || 0) / g, p: (+it.protein || 0) / g, f: (+it.fat || 0) / g, c: (+it.carbs || 0) / g } };
      });
      s.comment = data.comment || '';
      s.status = s.items.length ? 'done' : 'error';
      if (!s.items.length) s.error = data.comment || 'На фото не нашлось еды. Попробуй сфотографировать ближе и при хорошем свете.';
    } catch (e) {
      if (pendingScan !== s) return;
      s.status = 'error';
      s.error = e.message === 'offline' ? 'Нет интернета. Сканеру нужен интернет — пока можно добавить еду вручную.' : 'Сервер ИИ сейчас не ответил. Попробуй ещё раз через минуту или добавь еду вручную.';
    }
    if (parse().name === 'scan') refresh();
  }
  SCREENS.scan = function () {
    const s = pendingScan;
    if (!s) return { redirect: '#/food' };
    const it = x => ({ kcal: x.per.kcal * x.grams, p: x.per.p * x.grams, f: x.per.f * x.grams, c: x.per.c * x.grams });
    let body;
    if (s.status === 'loading') {
      body = `<div class="card pad" style="align-items:center;gap:1rem;text-align:center;padding-top:3rem;padding-bottom:3rem"><div class="spinner"></div>
        <div class="h3">ИИ анализирует фото…</div><p class="muted" style="font-size:.875rem">Обычно это занимает 5–15 секунд</p></div>`;
    } else if (s.status === 'error') {
      body = `<div class="card pad" style="gap:1rem"><div class="note warn">${icon('info')}<div>${esc(s.error)}</div></div>
        <button class="btn btn-dark btn-block" data-retry>${icon('refresh')}Попробовать ещё раз</button>
        <button class="btn btn-ghost btn-block" data-manual>${icon('plus')}Добавить вручную</button></div>`;
    } else {
      const tot = s.items.reduce((a, x) => { const v = it(x); a.kcal += v.kcal; a.p += v.p; a.f += v.f; a.c += v.c; return a; }, { kcal: 0, p: 0, f: 0, c: 0 });
      body = `<div class="card pad">
        <div class="h3" style="margin-bottom:.875rem">Что нашёл ИИ</div>
        ${s.items.map((x, k) => { const v = it(x); return `<div class="scan-item"><div class="top"><b>${esc(x.name)}</b><span class="kc">${num(v.kcal)} ккал</span></div>
          <div class="mac">Б ${dec(v.p)} г · Ж ${dec(v.f)} г · У ${dec(v.c)} г</div>
          <div class="g"><button data-g="${k}:-25" aria-label="Меньше">${icon('minus')}</button><span>${x.grams} г</span><button data-g="${k}:25" aria-label="Больше">${icon('plus')}</button>
          <button class="rm" data-rm="${k}" aria-label="Убрать">${icon('trash')}</button></div></div>`; }).join('')}
        ${s.comment ? `<p class="muted" style="font-size:.8125rem;margin:.25rem 0 .75rem">${esc(s.comment)}</p>` : ''}
        <div class="scan-sum"><span class="muted">Итого</span><b>${num(tot.kcal)} ккал</b></div>
        <label class="label">Приём пищи</label>
        <div class="seg" data-meal style="margin-bottom:1.25rem">${MEALS.map(([k, n]) => `<button data-v="${k}" aria-pressed="${s.meal === k}">${n}</button>`).join('')}</div>
        <button class="btn btn-dark btn-block" data-save>${icon('check')}Добавить в дневник</button>
        <p class="disclaimer">Вес порции ИИ оценивает по фото примерно. Поправь граммы кнопками «−» и «+».</p></div>`;
    }
    return {
      nav: 'food',
      top: { title: 'Сканер еды', sub: 'Калории и БЖУ по фото', back: '#/food' },
      html: `<div class="grid grid-2"><div><img class="photo-prev" src="${s.img}" alt="Фото еды"></div>${body}</div>`,
      mount(v) {
        v.onclick = e => {
          const g = e.target.closest('[data-g]');
          if (g) { const [k, d] = g.getAttribute('data-g').split(':').map(Number); s.items[k].grams = Math.max(10, s.items[k].grams + d); return refresh(); }
          const rm = e.target.closest('[data-rm]');
          if (rm) { s.items.splice(+rm.getAttribute('data-rm'), 1); if (!s.items.length) { s.status = 'error'; s.error = 'Все блюда убраны. Сделай новое фото или добавь еду вручную.'; } return refresh(); }
          const m = e.target.closest('[data-meal] [data-v]');
          if (m) { s.meal = m.getAttribute('data-v'); return refresh(); }
          if (e.target.closest('[data-retry]')) return runScan();
          if (e.target.closest('[data-manual]')) return addFoodSheet(null, s.meal);
          if (e.target.closest('[data-save]')) {
            s.items.forEach(x => { const val = it(x); JF.addMeal({ name: x.name, grams: x.grams, meal: s.meal, kcal: val.kcal, p: val.p, f: val.f, c: val.c, src: 'ai' }); });
            toast(`Добавлено: ${s.items.length} ${plural(s.items.length, 'блюдо', 'блюда', 'блюд')}`);
            pendingScan = null;
            location.replace('#/food');
          }
        };
      }
    };
  };

  // Добавление еды вручную (поиск по справочнику или своё блюдо)
  function addFoodSheet(food, meal) {
    meal = meal || mealNow();
    // sel — продукт на 100 г ({name,kcal,p,f,c,portion}); fixed — блюдо без веса ({name,kcal,p,f,c}), считаем порциями
    let close, el, sel = food || null, grams = food ? food.portion : 100, custom = false, fixed = null, mult = 1;
    const favs = JF.state.favorites || [];
    const recent = JF.recentFoods(8).filter(m => !JF.isFavorite(m.name));
    const personal = { fav: favs, rec: recent };
    // запись из дневника/избранного → продукт для степпера
    function fromEntry(m) {
      if (m.grams > 0) { const k = 100 / m.grams; return { sel: { name: m.name, kcal: m.kcal * k, p: m.p * k, f: m.f * k, c: m.c * k, portion: m.grams } }; }
      return { fixed: { name: m.name, kcal: m.kcal, p: m.p, f: m.f, c: m.c } };
    }
    const pRow = (m, ref) => `<button class="li" data-pf="${ref}"><span class="li-main"><b>${esc(m.name)}</b><small>${m.grams ? m.grams + ' г · ' : ''}${num(m.kcal)} ккал · Б ${dec(m.p)} · Ж ${dec(m.f)} · У ${dec(m.c)}</small></span>${icon('plus').replace('<svg', '<svg style="width:1.125rem;height:1.125rem;color:var(--muted-2)"')}</button>`;
    const dbRow = (f, i) => `<button class="li" data-food="${i}"><span class="li-main"><b>${esc(f.name)}</b><small>${f.kcal} ккал · Б ${dec(f.p)} · Ж ${dec(f.f)} · У ${dec(f.c)} на 100 г</small></span>${icon('plus').replace('<svg', '<svg style="width:1.125rem;height:1.125rem;color:var(--muted-2)"')}</button>`;
    const listHtml = q => {
      q = (q || '').trim().toLowerCase();
      const hit = n => !q || n.toLowerCase().includes(q);
      const f = favs.map((m, i) => [m, 'fav:' + i]).filter(([m]) => hit(m.name));
      const r = recent.map((m, i) => [m, 'rec:' + i]).filter(([m]) => hit(m.name));
      const db = D.FOODS.map((x, i) => [x, i]).filter(([x]) => hit(x.name)).slice(0, q ? 40 : 14);
      let html = '';
      if (f.length) html += `<div class="list-h">${icon('star')}Избранное</div>` + f.map(([m, ref]) => pRow(m, ref)).join('');
      if (r.length) html += `<div class="list-h">${icon('refresh')}Недавние</div>` + r.map(([m, ref]) => pRow(m, ref)).join('');
      if (db.length) html += `<div class="list-h">${icon('apple')}${q ? 'Справочник' : 'Популярное'}</div>` + db.map(([x, i]) => dbRow(x, i)).join('');
      return html || `<div class="empty-box">Не нашлось. Добавь как своё блюдо 👇</div>`;
    };
    const mealSeg = () => `<label class="label">Приём пищи</label><div class="seg" data-meal style="margin-bottom:1.25rem">${MEALS.map(([k, n]) => `<button data-v="${k}" aria-pressed="${meal === k}">${n}</button>`).join('')}</div>`;
    const favBtn = name => `<button class="btn btn-ghost btn-sm fav-toggle ${JF.isFavorite(name) ? 'on' : ''}" data-fav-toggle>${icon('star')}${JF.isFavorite(name) ? 'В избранном' : 'В избранное'}</button>`;
    function current() {
      if (fixed) return { name: fixed.name, grams: 0, kcal: fixed.kcal * mult, p: fixed.p * mult, f: fixed.f * mult, c: fixed.c * mult };
      const k = grams / 100;
      return { name: sel.name, grams, kcal: sel.kcal * k, p: sel.p * k, f: sel.f * k, c: sel.c * k };
    }
    function draw() {
      let html;
      if (custom) {
        html = `<div class="field"><label class="label" for="c-name">Название</label><input class="input" id="c-name" maxlength="60" placeholder="Например, домашний суп"></div>
          <div class="grid grid-2 keep" style="gap:.625rem">
            <div class="field"><label class="label" for="c-k">Калории, ккал</label><input class="input" id="c-k" type="number" inputmode="decimal"></div>
            <div class="field"><label class="label" for="c-p">Белки, г</label><input class="input" id="c-p" type="number" inputmode="decimal"></div>
            <div class="field"><label class="label" for="c-f">Жиры, г</label><input class="input" id="c-f" type="number" inputmode="decimal"></div>
            <div class="field"><label class="label" for="c-c">Углеводы, г</label><input class="input" id="c-c" type="number" inputmode="decimal"></div>
          </div>${mealSeg()}
          <button class="btn btn-dark btn-block" data-add-custom>${icon('check')}Добавить</button>
          <button class="btn btn-ghost btn-block" data-back-list style="margin-top:.625rem">Назад к списку</button>`;
      } else if (sel || fixed) {
        const v = current();
        html = `<div class="c-head" style="margin-bottom:.25rem"><div class="h3">${esc(v.name)}</div>${favBtn(v.name)}</div>
          <p class="muted" style="font-size:.875rem;margin:0 0 1.25rem">${fixed ? 'Порция как в прошлый раз' : `${Math.round(sel.kcal)} ккал на 100 г`}</p>
          ${fixed
            ? `<div class="stepper" style="margin-bottom:1.25rem"><button data-mult="-0.5" aria-label="Меньше">${icon('minus')}</button><div class="val">×${dec(mult)}<small>порц.</small></div><button data-mult="0.5" aria-label="Больше">${icon('plus')}</button></div>`
            : `<div class="stepper" style="margin-bottom:1rem"><button data-step="-10" aria-label="Меньше">${icon('minus')}</button><div class="val">${grams}<small>г</small></div><button data-step="10" aria-label="Больше">${icon('plus')}</button></div>
               <div class="seg" style="justify-content:center;margin-bottom:1.25rem">${[...new Set([50, 100, 150, 200, 300, sel.portion])].sort((a, b) => a - b).map(g => `<button data-gram="${g}" aria-pressed="${g === grams}">${g} г</button>`).join('')}</div>`}
          <div class="norms"><div class="big"><b>${num(v.kcal)} ккал</b><span>Б ${dec(v.p)} г · Ж ${dec(v.f)} г · У ${dec(v.c)} г</span></div></div>
          ${mealSeg()}
          <button class="btn btn-dark btn-block" data-add>${icon('check')}Добавить в дневник</button>
          ${food ? '' : `<button class="btn btn-ghost btn-block" data-back-list style="margin-top:.625rem">Назад к списку</button>`}`;
      } else {
        html = `<input class="input" id="food-q" type="search" placeholder="Найти: плов, гречка, банан…" autocomplete="off">
          <div class="list food-res" id="food-list">${listHtml('')}</div>
          <button class="btn btn-ghost btn-block" data-custom>${icon('edit')}Своё блюдо</button>`;
      }
      el.querySelector('.sheet-body').innerHTML = html;
      const q = el.querySelector('#food-q'); if (q && window.innerWidth > 620) q.focus();
    }
    close = openSheet({
      title: 'Добавить еду', html: '',
      onMount(sheet, c) {
        el = sheet; draw();
        sheet.addEventListener('input', e => { if (e.target.id === 'food-q') sheet.querySelector('#food-list').innerHTML = listHtml(e.target.value); });
        sheet.addEventListener('click', e => {
          const t = e.target;
          const f = t.closest('[data-food]'); if (f) { sel = D.FOODS[+f.getAttribute('data-food')]; fixed = null; grams = sel.portion; return draw(); }
          const pf = t.closest('[data-pf]');
          if (pf) { const [kind, i] = pf.getAttribute('data-pf').split(':'); const r = fromEntry(personal[kind][+i]); sel = r.sel || null; fixed = r.fixed || null; mult = 1; grams = sel ? sel.portion : 100; return draw(); }
          const st = t.closest('[data-step]'); if (st) { grams = Math.max(10, Math.min(2000, grams + +st.getAttribute('data-step'))); return draw(); }
          const mu = t.closest('[data-mult]'); if (mu) { mult = Math.max(0.5, Math.min(5, mult + +mu.getAttribute('data-mult'))); return draw(); }
          const gr = t.closest('[data-gram]'); if (gr) { grams = +gr.getAttribute('data-gram'); return draw(); }
          const m = t.closest('[data-meal] [data-v]');
          if (m) { meal = m.getAttribute('data-v'); $$('[data-meal] [data-v]', sheet).forEach(b => b.setAttribute('aria-pressed', b === m)); return; }
          if (t.closest('[data-fav-toggle]')) { const v = current(); toast(JF.toggleFavorite(v) ? `«${v.name}» — в избранном ⭐` : 'Убрано из избранного'); return draw(); }
          if (t.closest('[data-back-list]')) { sel = null; fixed = null; custom = false; return draw(); }
          if (t.closest('[data-custom]')) { custom = true; return draw(); }
          if (t.closest('[data-add]')) {
            const v = current();
            JF.addMeal(Object.assign(v, { meal }));
            toast(`${v.name}: +${num(v.kcal)} ккал`); c(); afterAdd();
          }
          if (t.closest('[data-add-custom]')) {
            const v = id => +((sheet.querySelector('#' + id).value || '0').replace(',', '.')) || 0;
            const name = sheet.querySelector('#c-name').value.trim();
            if (!name) return toast('Напиши название');
            if (!(v('c-k') > 0)) return toast('Укажи калории');
            JF.addMeal({ name, grams: 0, meal, kcal: v('c-k'), p: v('c-p'), f: v('c-f'), c: v('c-c') });
            toast(`${name}: +${num(v('c-k'))} ккал`); c(); afterAdd();
          }
        });
      }
    });
    function afterAdd() { const n = parse().name; if (n === 'scan') { pendingScan = null; location.replace('#/food'); } else if (n === 'food' || n === 'home') refresh(); else go('#/food'); }
  }

  // ---------- Программа от ИИ-тренера ----------
  function planSheet() {
    const p = JF.profile;
    const o = { days: p.perWeek || 3, minutes: 25, level: 'beginner', focus: p.goal === 'lose' ? 'Похудение' : p.goal === 'gain' ? 'Сила и мышцы' : 'Всё тело', wish: '' };
    const FOCUS = ['Всё тело', 'Похудение', 'Сила и мышцы', 'Ноги и ягодицы', 'Пресс и кор', 'Руки и спина', 'Здоровая спина', 'Гибкость'];
    const seg = (key, items) => `<div class="seg" data-o="${key}" style="margin-bottom:1.125rem">${items.map(([v, t]) => `<button data-v="${v}" aria-pressed="${String(o[key]) === String(v)}">${t}</button>`).join('')}</div>`;
    openSheet({
      title: 'Программа от ИИ-тренера', html: '',
      onMount(sheet, close) {
        let busy = false;
        const draw = () => {
          sheet.querySelector('.sheet-body').innerHTML = busy
            ? `<div style="text-align:center;padding:2rem 0"><div class="spinner"></div><div class="h3" style="margin-top:1rem">ИИ составляет программу…</div><p class="muted" style="font-size:.875rem;margin-top:.375rem">Обычно 10–20 секунд</p></div>`
            : `<label class="label">Тренировок в неделю</label>${seg('days', [[2, '2'], [3, '3'], [4, '4'], [5, '5']])}
              <label class="label">Время на одну тренировку</label>${seg('minutes', [[15, '15 мин'], [25, '25 мин'], [35, '35 мин'], [45, '45 мин']])}
              <label class="label">Уровень</label>${seg('level', [['beginner', 'Новичок'], ['middle', 'Средний'], ['advanced', 'Продвинутый']])}
              <label class="label">Акцент</label>${seg('focus', FOCUS.map(f => [f, f]))}
              <div class="field"><label class="label" for="pl-wish">Пожелания (необязательно)</label>
                <input class="input" id="pl-wish" maxlength="200" value="${esc(o.wish)}" placeholder="Например: болит колено, без прыжков"></div>
              <button class="btn btn-dark btn-block" data-make>${icon('spark')}Составить программу</button>
              <p class="disclaimer">Программа собирается из упражнений приложения — у каждого есть анимация и техника.</p>`;
        };
        draw();
        sheet.addEventListener('click', async e => {
          const b = e.target.closest('[data-o] [data-v]');
          if (b) { const k = b.closest('[data-o]').getAttribute('data-o'); const w = $('#pl-wish', sheet); if (w) o.wish = w.value; o[k] = /^\d+$/.test(b.getAttribute('data-v')) ? +b.getAttribute('data-v') : b.getAttribute('data-v'); return draw(); }
          if (!e.target.closest('[data-make]') || busy) return;
          o.wish = ($('#pl-wish', sheet) || {}).value || '';
          busy = true; draw();
          try {
            const exercises = Object.keys(D.EXERCISES).map(id => ({ id, name: D.EXERCISES[id].name, type: D.EXERCISES[id].type, muscles: D.EXERCISES[id].muscles }));
            const prof = { sex: p.sex === 'f' ? 'женский' : 'мужской', age: p.age, weight: JF.currentWeight(), height: p.height, goal: GOALS[p.goal] };
            const data = await api('/api/plan', Object.assign({}, o, { exercises, profile: prof }), 55000);
            const pr = data.program;
            const id = 'ai-' + Date.now().toString(36);
            const LV = { beginner: 'Новичок', middle: 'Средний', advanced: 'Продвинутый' };
            JF.addCustomProgram({
              id, ai: true, title: pr.title, sub: `От ИИ-тренера · ${o.focus.toLowerCase()}`, level: LV[o.level], color: '#94a103',
              about: pr.about || `${o.days} тренировки в неделю по ~${o.minutes} минут.`, count: Math.min(16, o.days * 4),
              rest: o.level === 'advanced' ? 15 : o.level === 'middle' ? 20 : 25,
              templates: pr.workouts.map(w => ({ title: w.title, items: w.items })), createdAt: Date.now()
            });
            JF.setProgram(id);
            close(); UI.confetti(); toast('Программа готова и выбрана текущей');
            go('#/program/' + id);
          } catch (err) {
            busy = false; draw();
            toast(err.message === 'offline' ? 'Нужен интернет, чтобы ИИ составил программу' : 'ИИ сейчас не ответил. Попробуй ещё раз через минуту', 4000);
          }
        });
      }
    });
  }

  // ---------- ИИ-тренер ----------
  const CHIPS = ['Составь план похудения на неделю', 'Что съесть на ужин?', 'Тренировка на 20 минут', 'Как убрать живот?', 'Сколько белка мне нужно?', 'Болит спина после тренировки'];
  SCREENS.coach = function () {
    const msgs = JF.state.chat;
    const bubble = m => `<div class="msg ${m.role === 'user' ? 'me' : 'ai'}${m.err ? ' err' : ''}">${esc(m.content)}</div>`;
    return {
      top: { title: 'ИИ-тренер', sub: 'Спроси о тренировках, питании и восстановлении.' },
      html: `<div class="coach">
        <div class="chat" id="chat">
          ${msgs.length ? msgs.map(bubble).join('') : `<div class="coach-intro"><div class="chip">${icon('spark')}</div>
            <div class="h3">Привет, ${esc(JF.profile.name)}! Я твой ИИ-тренер.</div>
            <p class="lead" style="max-width:26rem;margin:.5rem auto 0">Я знаю твою цель, нормы и программу. Могу составить план тренировок или питания, подсказать технику и ответить на вопросы.</p></div>`}
          ${coachBusy ? '<div class="msg ai typing"><span class="typing-dots"><i></i><i></i><i></i></span></div>' : ''}
        </div>
        <div class="chips"><button data-plan-chip class="chip-ai">${icon('spark')}Создать программу тренировок</button>${CHIPS.map(c => `<button data-chip>${esc(c)}</button>`).join('')}${msgs.length ? `<button data-clear>${'Очистить чат'}</button>` : ''}</div>
        <form class="composer" id="composer"><textarea id="msg" rows="1" maxlength="1000" placeholder="Напиши вопрос…" aria-label="Сообщение"></textarea>
          <button class="send" type="submit" aria-label="Отправить" ${coachBusy ? 'disabled' : ''}>${icon('send')}</button></form>
        <p class="disclaimer">ИИ может ошибаться и не заменяет врача.</p>
      </div>`,
      mount(v) {
        const chat = $('#chat', v); chat.scrollTop = chat.scrollHeight;
        const ta = $('#msg', v);
        ta.addEventListener('input', () => { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 128) + 'px'; });
        ta.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey && window.innerWidth > 620) { e.preventDefault(); send(ta.value); } });
        $('#composer', v).addEventListener('submit', e => { e.preventDefault(); send(ta.value); });
        v.onclick = e => {
          if (e.target.closest('[data-plan-chip]')) return planSheet();
          const c = e.target.closest('[data-chip]'); if (c) return send(c.textContent);
          if (e.target.closest('[data-clear]')) UI.confirm({ title: 'Очистить чат?', text: 'Вся переписка с ИИ-тренером удалится.', ok: 'Очистить' }).then(ok => { if (ok) { JF.clearChat(); refresh(); } });
        };
      }
    };
  };
  function coachContext() {
    const p = JF.profile, n = JF.norms(), t = JF.totals(), d = JF.peek(), pid = JF.program(), prog = D.find(pid);
    return {
      name: p.name, sex: p.sex === 'f' ? 'женский' : 'мужской', age: p.age, height: p.height, weight: JF.currentWeight(), startWeight: JF.weights()[0] ? JF.weights()[0].kg : p.weight,
      goal: GOALS[p.goal], goalWeight: p.goalWeight, activity: (ACTIVITY.find(a => a[0] === p.activity) || [0, ''])[1],
      norms: { kcal: n.kcal, protein: n.protein, fat: n.fat, carbs: n.carbs, waterL: +(n.waterMl / 1000).toFixed(2) },
      today: { kcal: t.kcal, protein: t.p, fat: t.f, carbs: t.c, waterGlasses: d.water, steps: d.steps || 0, workouts: d.workouts.map(w => w.title), meals: d.meals.map(m => m.name).slice(0, 15) },
      program: `${prog.title}: пройдено ${JF.doneList(pid).length} из ${prog.count}`, workoutsThisWeek: JF.weekWorkouts()
    };
  }
  async function send(text) {
    text = String(text || '').trim();
    if (!text || coachBusy) return;
    JF.pushChat({ role: 'user', content: text.slice(0, 1000) });
    coachBusy = true; refresh();
    let answer, err = false;
    try {
      const msgs = JF.state.chat.filter(m => !m.err).slice(-12).map(m => ({ role: m.role, content: m.content }));
      const data = await api('/api/coach', { messages: msgs, context: coachContext() }, 50000);
      answer = data.text;
    } catch (e) {
      err = true;
      answer = e.message === 'offline' ? 'Нет интернета — ИИ-тренеру нужно подключение. Тренировки, дневник питания и вода работают и без него.' : 'Не получилось получить ответ. Попробуй ещё раз через минуту.';
    }
    coachBusy = false;
    JF.pushChat({ role: 'assistant', content: answer, err });
    if (parse().name === 'coach') refresh();
  }

  // ---------- Прогресс ----------
  SCREENS.progress = function () {
    const p = JF.profile, n = JF.norms(), ws = JF.weights(), cw = JF.currentWeight(), first = ws[0] ? ws[0].kg : cw;
    const diff = cw - first;
    const bmiCat = n.bmi < 18.5 ? 'ниже нормы' : n.bmi < 25 ? 'в норме' : n.bmi < 30 ? 'выше нормы' : 'сильно выше нормы';
    const bmiPos = Math.max(0, Math.min(100, (n.bmi - 15) / 20 * 100));
    const toGoal = p.goal === 'keep' ? null : +(cw - p.goalWeight).toFixed(1);
    // график веса
    const pts = ws.slice(-30);
    let chart = '<div class="empty-box">Добавь вес ещё раз через несколько дней — здесь появится график.</div>';
    if (pts.length >= 2) {
      const kg = pts.map(x => x.kg), mn = Math.min(...kg, p.goal !== 'keep' ? Math.min(p.goalWeight, ...kg) : Infinity) - 0.5, mx = Math.max(...kg) + 0.5;
      const W = 600, H = 190, X = i => 30 + i * ((W - 50) / (pts.length - 1)), Y = v => 14 + (mx - v) / (mx - mn) * (H - 44);
      const P = pts.map((x, i) => [X(i), Y(x.kg)]);
      const goalY = p.goal !== 'keep' ? Y(p.goalWeight) : null;
      chart = `<svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="График веса">
        ${goalY != null && goalY > 0 && goalY < H ? `<line x1="30" x2="${W - 20}" y1="${goalY}" y2="${goalY}" stroke="#d2e659" stroke-width="2" stroke-dasharray="6 6"/><text x="${W - 20}" y="${goalY - 6}" text-anchor="end">цель ${dec(p.goalWeight)}</text>` : ''}
        <path d="${smoothPath(P)}" fill="none" stroke="#6ec0da" stroke-width="5" stroke-linecap="round"/>
        ${P.map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${i === P.length - 1 ? 7 : 4}" fill="${i === P.length - 1 ? '#83c5dd' : '#fff'}" stroke="#6ec0da" stroke-width="2.5"/>`).join('')}
        <text x="30" y="${H - 6}">${UI.dateShort(JF.parseKey(pts[0].d))}</text><text x="${W - 20}" y="${H - 6}" text-anchor="end">${UI.dateShort(JF.parseKey(pts[pts.length - 1].d))}</text>
      </svg>`;
    }
    // 7 дней: калории и вода
    const week = Array.from({ length: 7 }, (_, i) => { const d = JF.addDays(new Date(), i - 6); return { d, day: JF.peek(JF.dayKey(d)) }; });
    const WD = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    const kcals = week.map(x => JF.totals(x.day).kcal), kmax = Math.max(n.kcal * 1.2, ...kcals);
    const waters = week.map(x => x.day.water), wmax = Math.max(n.glasses, ...waters);
    const monthStart = JF.addDays(new Date(), -29);
    // шаги
    const H = window.JF_health, stepsGoal = 8000, today = JF.peek(), stepsToday = today.steps || 0;
    const stepsWeek = week.map(x => x.day.steps || 0), smax = Math.max(stepsGoal, ...stepsWeek);
    const stepsKcal = Math.round(stepsToday * 0.04 * cw / 70);
    // отчёт недели
    const wk = JF.dayKey(JF.weekStart()), rep = (JF.state.reports || {})[wk];
    return {
      live: true,
      top: { title: 'Прогресс', sub: 'Вес, калории, вода и тренировки.' },
      html: `<div class="grid grid-2">
        <div class="card pad" style="gap:1rem">
          <div class="c-head"><div class="c-title"><span class="chip">${icon('scale')}</span>Вес</div><button class="btn btn-dark btn-sm" data-add-weight>${icon('plus')}Записать вес</button></div>
          <div class="grid grid-3 keep">
            <div class="kpi"><b>${dec(cw)}<small>кг</small></b><span>сейчас</span></div>
            <div class="kpi"><b>${diff > 0 ? '+' : ''}${dec(diff)}<small>кг</small></b><span>с начала</span></div>
            <div class="kpi"><b>${toGoal == null ? dec(p.goalWeight) : dec(Math.abs(toGoal))}<small>кг</small></b><span>${toGoal == null ? 'держим вес' : (p.goal === 'lose' ? toGoal > 0 : toGoal < 0) ? 'до цели' : 'цель достигнута 🎉'}</span></div>
          </div>
          ${chart}
        </div>
        <div class="card pad" style="gap:1rem">
          <div class="c-title"><span class="chip">${icon('info')}</span>Индекс массы тела</div>
          <div class="kpi"><b>${dec(n.bmi)}</b><span>${bmiCat} · здоровый вес при твоём росте: ${n.healthyMin}–${n.healthyMax} кг</span></div>
          <div style="position:relative;height:.75rem;border-radius:.375rem;background:linear-gradient(90deg,#5db0e9 0 17.5%,#929e08 17.5% 50%,#e8b04a 50% 75%,#d23c2b 75%)">
            <span style="position:absolute;top:-.3125rem;left:calc(${bmiPos}% - .6875rem);width:1.375rem;height:1.375rem;border-radius:50%;background:#fff;border:.25rem solid #000"></span></div>
          <div class="c-sub" style="margin-top:0"><span>15</span><span>18,5</span><span>25</span><span>30</span><span>35</span></div>
          <p class="disclaimer" style="text-align:left">ИМТ — ориентир, он не учитывает мышцы. Для оценки здоровья лучше обратиться к врачу.</p>
        </div>
      </div>
      <div class="grid grid-3 keep">
        <div class="card pad kpi"><b>${JF.weekWorkouts()}<small>/${p.perWeek || 3}</small></b><span>тренировок на неделе</span></div>
        <div class="card pad kpi"><b>${JF.workoutsBetween(monthStart, new Date())}</b><span>за 30 дней</span></div>
        <div class="card pad kpi"><b>${JF.activeDaysStreak()}</b><span>${plural(JF.activeDaysStreak(), 'день', 'дня', 'дней')} подряд с отметками</span></div>
      </div>
      <div class="grid grid-2">
        <div class="card pad"><div class="c-head"><div class="c-title"><span class="chip">${icon('flame')}</span>Калории за 7 дней</div><span class="muted" style="font-size:.875rem">норма ${num(n.kcal)}</span></div>
          <div class="week-bars">${week.map((x, i) => `<div><i class="${kcals[i] > n.kcal * 1.05 ? 'over' : kcals[i] ? 'on' : ''}" style="--i:${i};height:${Math.max(3, kcals[i] / kmax * 100)}%" title="${num(kcals[i])} ккал"></i><span>${WD[x.d.getDay()]}</span></div>`).join('')}</div></div>
        <div class="card pad"><div class="c-head"><div class="c-title"><span class="chip">${icon('drop')}</span>Вода за 7 дней</div><span class="muted" style="font-size:.875rem">норма ${n.glasses} стак.</span></div>
          <div class="week-bars">${week.map((x, i) => `<div><i class="${waters[i] >= n.glasses ? 'on' : ''}" style="--i:${i};height:${Math.max(3, waters[i] / wmax * 100)}%;${waters[i] && waters[i] < n.glasses ? 'background:#5db0e9' : ''}" title="${waters[i]} стак."></i><span>${WD[x.d.getDay()]}</span></div>`).join('')}</div></div>
      </div>
      <div class="grid grid-2">
        <div class="card pad" style="gap:1rem">
          <div class="c-head"><div class="c-title"><span class="chip">${icon('steps')}</span>Шаги</div>
            ${H && H.supported ? (H.connected ? `<button class="btn btn-ghost btn-sm" data-steps-sync>${icon('refresh')}Обновить</button>` : '') : `<button class="btn btn-ghost btn-sm" data-steps-manual>${icon('edit')}Ввести</button>`}</div>
          <div class="grid grid-3 keep">
            <div class="kpi"><b><em data-count="${stepsToday}">${num(stepsToday)}</em></b><span>сегодня</span></div>
            <div class="kpi"><b>${Math.min(100, Math.round(stepsToday / stepsGoal * 100))}<small>%</small></b><span>от цели ${num(stepsGoal)}</span></div>
            <div class="kpi"><b>~${num(stepsKcal)}</b><span>ккал сожжено</span></div>
          </div>
          <div class="week-bars">${week.map((x, i) => `<div><i class="${stepsWeek[i] >= stepsGoal ? 'on' : ''}" style="--i:${i};height:${Math.max(3, stepsWeek[i] / smax * 100)}%;${stepsWeek[i] && stepsWeek[i] < stepsGoal ? 'background:#5db0e9' : ''}" title="${num(stepsWeek[i])} шагов"></i><span>${WD[x.d.getDay()]}</span></div>`).join('')}</div>
          ${H && H.supported && !H.connected ? `<div class="note">${icon('steps')}<div>Подключи <b>Health Connect</b> — шаги будут подтягиваться из телефона, Samsung Health, Google Fit или часов. JOL Fitness только читает шаги.
            <div style="margin-top:.625rem"><button class="btn btn-dark btn-sm" data-steps-connect>Подключить</button></div></div></div>` : ''}
        </div>
        <div class="card pad report" style="gap:1rem">
          <div class="c-head"><div class="c-title"><span class="chip">${icon('spark')}</span>Отчёт недели</div>
            ${rep ? `<span class="muted" style="font-size:.8125rem">${UI.dateShort(new Date(rep.at))}</span>` : ''}</div>
          ${rep ? `<div class="report-text">${esc(rep.text)}</div><button class="btn btn-ghost btn-sm" data-report style="align-self:flex-start">${icon('refresh')}Обновить отчёт</button>`
            : `<p class="lead">ИИ-тренер разберёт твою неделю: калории, белок, воду, тренировки, шаги и вес — и даст 2–3 конкретных совета.</p>
               <button class="btn btn-dark" data-report style="align-self:flex-start">${icon('spark')}Получить отчёт</button>`}
        </div>
      </div>
      <div class="sec"><h2>История веса</h2></div>
      <div class="card pad"><div class="list">
        ${ws.slice().reverse().slice(0, 20).map((w, i, arr) => { const prev = arr[i + 1]; const ch = prev ? w.kg - prev.kg : 0;
          return `<div class="li"><span class="chip">${icon('scale')}</span><span class="li-main"><b>${dec(w.kg)} кг</b><small>${UI.dateShort(JF.parseKey(w.d))}${prev ? ` · ${ch > 0 ? '+' : ''}${dec(ch)} кг` : ''}</small></span>
          ${ws.length > 1 ? `<button class="del" data-del-w="${w.d}" aria-label="Удалить запись">${icon('trash')}</button>` : ''}</div>`; }).join('')}
      </div></div>`,
      mount(v) {
        v.onclick = e => {
          if (e.target.closest('[data-add-weight]')) return weightSheet();
          if (e.target.closest('[data-steps-manual]')) return stepsSheet();
          if (e.target.closest('[data-steps-sync]')) { JF_health.sync(14).then(() => { toast('Шаги обновлены'); refresh(); }); return; }
          if (e.target.closest('[data-steps-connect]')) {
            JF_health.connect().then(r => {
              if (r.ok) { toast('Health Connect подключён'); refresh(); }
              else if (r.reason === 'denied') toast('Разрешение не выдано. Можно включить в настройках Health Connect', 4000);
              else toast('Health Connect недоступен на этом телефоне. На Android 13 и ниже установи его из Play Маркета', 5000);
            });
            return;
          }
          const rb = e.target.closest('[data-report]');
          if (rb) { weeklyReport(rb); return; }
          const d = e.target.closest('[data-del-w]');
          if (d) UI.confirm({ title: 'Удалить запись веса?', ok: 'Удалить' }).then(ok => { if (ok) { JF.removeWeight(d.getAttribute('data-del-w')); refresh(); } });
        };
      }
    };
  };
  function stepsSheet() {
    let n = JF.peek().steps || 0;
    openSheet({
      title: 'Шаги за сегодня', html: `<p class="muted" style="margin-bottom:1rem;font-size:.9375rem">Посмотри количество шагов в шагомере или часах и впиши сюда.</p>
        <input class="input time-in" id="st-n" type="number" inputmode="numeric" value="${n || ''}" placeholder="0" style="margin-bottom:1.25rem">
        <button class="btn btn-dark btn-block" data-save>${icon('check')}Сохранить</button>`,
      onMount(sheet, close) {
        sheet.addEventListener('click', e => {
          if (!e.target.closest('[data-save]')) return;
          const v = +$('#st-n', sheet).value;
          if (!(v >= 0 && v < 100000)) return toast('Проверь число шагов');
          JF.setSteps(JF.dayKey(), v); close(); toast('Шаги сохранены'); refresh();
        });
      }
    });
  }
  async function weeklyReport(btn) {
    const p = JF.profile, n = JF.norms();
    const days = Array.from({ length: 7 }, (_, i) => { const d = JF.addDays(new Date(), i - 6), k = JF.dayKey(d), x = JF.peek(k), t = JF.totals(x);
      return { date: k, kcal: t.kcal, protein: t.p, fat: t.f, carbs: t.c, waterGlasses: x.water, workouts: x.workouts.length, steps: x.steps || 0, logged: !!(x.meals.length || x.water || x.workouts.length) }; });
    const ws = JF.weights(), weekAgo = JF.dayKey(JF.addDays(new Date(), -7));
    const before = ws.filter(w => w.d <= weekAgo).pop() || ws[0];
    const stats = {
      name: p.name, goal: GOALS[p.goal], goalWeight: p.goalWeight, norms: { kcal: n.kcal, protein: n.protein, fat: n.fat, carbs: n.carbs, waterGlasses: n.glasses, stepsGoal: 8000 },
      plannedWorkoutsPerWeek: p.perWeek || 3, days, daysLogged: days.filter(d => d.logged).length,
      weightWeekAgo: before ? before.kg : null, weightNow: JF.currentWeight()
    };
    btn.disabled = true; btn.innerHTML = '<span class="spinner" style="width:1.25rem;height:1.25rem;border-width:.1875rem;margin:0"></span>ИИ пишет отчёт…';
    try {
      const data = await api('/api/report', { stats }, 50000);
      JF.saveReport(JF.dayKey(JF.weekStart()), data.text);
      toast('Отчёт готов'); refresh();
    } catch (e) {
      btn.disabled = false; btn.innerHTML = icon('spark') + 'Получить отчёт';
      toast(e.message === 'offline' ? 'Нужен интернет для отчёта' : 'ИИ сейчас не ответил. Попробуй через минуту', 4000);
    }
  }
  function weightSheet() {
    let kg = JF.currentWeight();
    openSheet({
      title: 'Записать вес', html: '',
      onMount(sheet, close) {
        const draw = () => {
          sheet.querySelector('.sheet-body').innerHTML = `<p class="muted" style="margin-bottom:1rem;font-size:.9375rem">Взвешивайся утром натощак — так цифры честнее.</p>
            <div class="stepper" style="margin-bottom:1.25rem"><button data-s="-0.1" aria-label="Минус 0,1">${icon('minus')}</button>
              <div class="val"><input class="input time-in" id="kg" type="number" inputmode="decimal" step="0.1" value="${kg.toFixed(1)}" style="border:0;background:none;padding:0"></div>
              <button data-s="0.1" aria-label="Плюс 0,1">${icon('plus')}</button></div>
            <button class="btn btn-dark btn-block" data-save>${icon('check')}Сохранить за сегодня</button>`;
        };
        draw();
        sheet.addEventListener('click', e => {
          const s = e.target.closest('[data-s]');
          if (s) { kg = Math.round((+($('#kg', sheet).value.replace(',', '.')) + +s.getAttribute('data-s')) * 10) / 10; $('#kg', sheet).value = kg.toFixed(1); return; }
          if (e.target.closest('[data-save]')) {
            const v = +($('#kg', sheet).value.replace(',', '.'));
            if (!(v >= 30 && v <= 300)) return toast('Вес — от 30 до 300 кг');
            JF.addWeight(Math.round(v * 10) / 10); toast('Вес сохранён'); close(); refresh();
          }
        });
      }
    });
  }

  // ---------- Напоминания ----------
  SCREENS.reminders = function () {
    const R = JF_reminders, s = R.settings();
    const row = a => `<div class="alarm ${a.on ? '' : 'off'}">
      <button class="t" data-edit="${a.id}">${R.pad(a.hour)}:${R.pad(a.minute)}</button>
      <button class="li-main" data-edit="${a.id}" style="text-align:left"><b>${esc(R.TYPES[a.type].name)}</b><small>${R.repeatText(a.days)}${a.on && R.available ? ' · ' + R.nextText(a) : ''}</small></button>
      <button class="switch" role="switch" aria-checked="${a.on}" data-toggle="${a.id}" aria-label="Включить напоминание"></button></div>`;
    return {
      top: { title: 'Напоминания', sub: 'Вода, тренировки, еда и взвешивание — в нужное время.' },
      html: `<div class="grid grid-2">
        <div class="card pad" style="gap:1rem">
          ${R.available ? '<div id="perm"></div>' : `<div class="note">${icon('info')}<div>Напоминания приходят в Android-приложении JOL Fitness. На сайте их можно настроить, но уведомления не придут.</div></div>`}
          ${s.alarms.length ? `<div>${s.alarms.map(row).join('')}</div>` : `<div class="empty-box"><span class="chip">${icon('bell')}</span>Пока нет напоминаний.<br>Начни с готового набора или добавь своё.</div>
            <button class="btn btn-lime btn-block" data-preset>${icon('spark')}Готовый набор: вода, тренировки, вес, отчёт</button>`}
          <button class="btn btn-dark btn-block" data-new ${s.alarms.length >= R.MAX_ALARMS ? 'disabled' : ''}>${icon('plus')}Добавить напоминание</button>
        </div>
        <div class="card pad" style="gap:1rem">
          <div class="set-row" style="border:0;padding:0"><span class="chip">${icon('spark')}</span><span class="li-main"><b>Умный режим</b><small>Не напоминать о тренировке, если она уже сделана, и о воде, если норма выполнена</small></span>
            <button class="switch" role="switch" aria-checked="${s.smart}" data-smart aria-label="Умный режим"></button></div>
          ${R.available ? `<button class="btn btn-ghost btn-block" data-test>${icon('bell')}Проверить уведомление</button>` : ''}
          <div class="note">${icon('info')}<div>Если уведомления не приходят: разреши их в настройках Android, включи «Будильники и напоминания» и отключи экономию батареи для JOL Fitness.</div></div>
        </div>
      </div>`,
      mount(v) {
        if (R.available) permBanner();
        v.onclick = async e => {
          const t = e.target;
          const tg = t.closest('[data-toggle]');
          if (tg) {
            const st = R.settings(), a = st.alarms.find(x => x.id === tg.getAttribute('data-toggle'));
            if (a) { a.on = !a.on; if (a.on && R.available) await R.ensurePermission(); R.save(st); }
            return refresh();
          }
          const ed = t.closest('[data-edit]'); if (ed) return alarmSheet(ed.getAttribute('data-edit'));
          if (t.closest('[data-new]')) return alarmSheet(null);
          if (t.closest('[data-smart]')) { const st = R.settings(); st.smart = !st.smart; R.save(st); return refresh(); }
          if (t.closest('[data-preset]')) {
            const st = R.settings(), A = R.ALL.slice();
            [[10, 0, 'water', A], [13, 0, 'water', A], [16, 0, 'water', A], [19, 0, 'water', A], [18, 30, 'workout', [1, 3, 5]], [8, 0, 'weigh', [1]], [20, 0, 'report', [0]]]
              .forEach(([h, m, type, days]) => st.alarms.push({ id: R.newId(), type, hour: h, minute: m, days, on: true }));
            if (R.available) await R.ensurePermission();
            R.save(st); toast('Напоминания добавлены'); return refresh();
          }
          if (t.closest('[data-test]')) { const ok = await R.test(); toast(ok ? 'Уведомление придёт через 5 секунд' : 'Уведомления запрещены — разреши их в настройках'); return permBanner(); }
          if (t.closest('[data-perm]')) { await R.ensurePermission(); return refresh(); }
          if (t.closest('[data-exact]')) { await R.requestExact(); return refresh(); }
        };
      }
    };
  };
  async function permBanner() {
    const R = JF_reminders, el = $('#perm'); if (!el) return;
    const p = await R.permission(), ex = await R.exactPermission();
    if (p !== 'granted') el.innerHTML = `<div class="note warn">${icon('bell')}<div>Уведомления выключены. Без разрешения напоминания не придут.<br><button class="btn btn-dark btn-sm" data-perm style="margin-top:.625rem">Разрешить уведомления</button></div></div>`;
    else if (ex !== 'granted') el.innerHTML = `<div class="note warn">${icon('timer')}<div>Android может задерживать напоминания до часа. Включи точное время — придут минута в минуту.<br><button class="btn btn-dark btn-sm" data-exact style="margin-top:.625rem">Включить точное время</button></div></div>`;
    else el.innerHTML = '';
  }
  function alarmSheet(id) {
    const R = JF_reminders, st = R.settings();
    const a = id ? st.alarms.find(x => x.id === id) : { id: R.newId(), type: 'water', hour: 9, minute: 0, days: R.ALL.slice(), on: true };
    if (!a) return;
    const tmp = Object.assign({}, a, { days: a.days.slice() });
    openSheet({
      title: id ? 'Напоминание' : 'Новое напоминание', html: '',
      onMount(sheet, close) {
        const draw = () => {
          sheet.querySelector('.sheet-body').innerHTML = `
            <input class="input time-in" type="time" id="tm" value="${R.pad(tmp.hour)}:${R.pad(tmp.minute)}" style="margin-bottom:1.25rem" aria-label="Время">
            <label class="label">Что напомнить</label>
            <div class="seg" data-type style="margin-bottom:1.25rem">${Object.keys(R.TYPES).map(k => `<button data-v="${k}" aria-pressed="${tmp.type === k}">${R.TYPES[k].name}</button>`).join('')}</div>
            <label class="label">Повтор: ${R.repeatText(tmp.days)}</label>
            <div class="seg seg--days" data-days style="margin-bottom:1.5rem">${R.ALL.map(d => `<button data-v="${d}" aria-pressed="${tmp.days.includes(d)}">${R.SHORT[d]}</button>`).join('')}</div>
            <button class="btn btn-dark btn-block" data-save>${icon('check')}Сохранить</button>
            ${id ? `<button class="btn btn-ghost btn-block" data-delete style="margin-top:.625rem;color:var(--danger)">${icon('trash')}Удалить</button>` : ''}`;
        };
        draw();
        sheet.addEventListener('change', e => { if (e.target.id === 'tm' && e.target.value) { const [h, m] = e.target.value.split(':').map(Number); tmp.hour = h; tmp.minute = m; } });
        sheet.addEventListener('click', async e => {
          const ty = e.target.closest('[data-type] [data-v]'); if (ty) { tmp.type = ty.getAttribute('data-v'); return draw(); }
          const dy = e.target.closest('[data-days] [data-v]');
          if (dy) { const d = +dy.getAttribute('data-v'); tmp.days = tmp.days.includes(d) ? tmp.days.filter(x => x !== d) : tmp.days.concat(d); if (!tmp.days.length) tmp.days = R.ALL.slice(); return draw(); }
          if (e.target.closest('[data-save]')) {
            const tm = $('#tm', sheet).value; if (tm) { const [h, m] = tm.split(':').map(Number); tmp.hour = h; tmp.minute = m; }
            tmp.on = true;
            const i = st.alarms.findIndex(x => x.id === tmp.id);
            if (i >= 0) st.alarms[i] = tmp; else st.alarms.push(tmp);
            st.alarms.sort((x, y) => x.hour * 60 + x.minute - (y.hour * 60 + y.minute));
            if (R.available) await R.ensurePermission();
            R.save(st); close(); toast('Сохранено'); refresh();
          }
          if (e.target.closest('[data-delete]')) { st.alarms = st.alarms.filter(x => x.id !== tmp.id); R.save(st); close(); refresh(); }
        });
      }
    });
  }

  // ---------- Профиль ----------
  SCREENS.profile = function () {
    const p = JF.profile, n = JF.norms();
    return {
      top: { title: 'Профиль', sub: 'Твои данные, нормы и настройки.' },
      html: `<div class="grid grid-2">
        <div class="card pad" style="gap:1.25rem">
          <div class="me-card"><div class="ava">${avatar()}</div><div><div class="h2">${esc(p.name)}</div>
            <div class="muted" style="font-size:.875rem;margin-top:.25rem">${p.age} ${plural(p.age, 'год', 'года', 'лет')} · ${p.height} см · ${dec(JF.currentWeight())} кг</div>
            <div class="pills" style="margin-top:.625rem"><span class="pill lime">${GOALS[p.goal]}${p.goal !== 'keep' ? ' до ' + dec(p.goalWeight) + ' кг' : ''}</span></div></div></div>
          <div class="norms" style="margin:0">
            <div class="big"><b>${num(n.kcal)} ккал</b><span>норма в день · обмен веществ ${num(n.bmr)}, расход ${num(n.tdee)}</span></div>
            <div><b>${n.protein} г</b><span>белков</span></div><div><b>${n.fat} г</b><span>жиров</span></div>
            <div><b>${n.carbs} г</b><span>углеводов</span></div><div><b>${dec(n.waterMl / 1000, 2)} л</b><span>воды</span></div>
          </div>
          <button class="btn btn-dark btn-block" data-edit-profile>${icon('edit')}Изменить данные и цель</button>
        </div>
        <div class="card pad">
          ${accountBlock()}
          <button class="set-row" data-go-btn="#/workouts"><span class="chip">${icon('activity')}</span>Программа тренировок<span class="end">${esc(D.find(JF.program()).title)}${icon('chevR')}</span></button>
          <button class="set-row" data-perweek><span class="chip">${icon('calendar')}</span>Тренировок в неделю<span class="end">${p.perWeek || 3}${icon('chevR')}</span></button>
          <button class="set-row" data-go-btn="#/reminders"><span class="chip">${icon('bell')}</span>Напоминания<span class="end">${icon('chevR')}</span></button>
          <button class="set-row" data-theme-pick><span class="chip">${icon(document.documentElement.getAttribute('data-theme') === 'dark' ? 'moonO' : 'sun')}</span>Оформление<span class="end">${{ system: 'Как в системе', light: 'Светлое', dark: 'Тёмное' }[JF.settings.theme || 'system']}${icon('chevR')}</span></button>
          ${window.JF_health && JF_health.supported ? `<button class="set-row" data-hc><span class="chip">${icon('steps')}</span>Шаги (Health Connect)<span class="end">${JF_health.connected ? 'подключено' : 'не подключено'}${icon('chevR')}</span></button>` : ''}
          <button class="set-row" data-go-btn="#/help"><span class="chip">${icon('help')}</span>Помощь<span class="end">${icon('chevR')}</span></button>
          <a class="set-row" href="privacy.html"><span class="chip">${icon('shield')}</span>Политика конфиденциальности<span class="end">${icon('chevR')}</span></a>
          ${ACC() && ACC().user ? `<button class="set-row danger" data-del-acc><span class="chip">${icon('trash')}</span>Удалить аккаунт и все данные</button>`
            : `<button class="set-row danger" data-wipe><span class="chip">${icon('trash')}</span>Удалить все мои данные</button>`}
          <p class="disclaimer" style="margin-top:1rem">JOL Fitness · версия 1.0.0 · JOL.AI</p>
        </div>
      </div>`,
      mount(v) {
        v.onclick = async e => {
          if (e.target.closest('[data-edit-profile]')) return profileSheet();
          if (e.target.closest('[data-perweek]')) return perWeekSheet();
          if (e.target.closest('[data-theme-pick]')) return themeSheet();
          if (e.target.closest('[data-hc]')) {
            if (JF_health.connected) { JF_health.openSettings(); return; }
            const r = await JF_health.connect(); toast(r.ok ? 'Health Connect подключён' : 'Не получилось подключить Health Connect', 3500); return refresh();
          }
          if (e.target.closest('[data-acc-signup]')) return go('#/signup');
          if (e.target.closest('[data-acc-login]')) return go('#/login');
          if (e.target.closest('[data-acc-sync]')) { await ACC().push(); toast(ACC().status.error ? 'Не получилось: ' + ACC().status.error : 'Сохранено в облаке'); return refresh(); }
          const lo = e.target.closest('[data-acc-logout],[data-acc-switch]');
          if (lo) {
            const sw = lo.hasAttribute('data-acc-switch');
            const ok = await UI.confirm({ title: sw ? 'Войти в другой аккаунт?' : 'Выйти из аккаунта?', ok: sw ? 'Продолжить' : 'Выйти',
              text: 'Данные текущего аккаунта останутся в облаке, а с этого устройства удалятся. Чтобы вернуть их, просто войди в него снова.' });
            if (!ok) return;
            try { await ACC().signOut(); } catch (err) { return toast(ACC().errText(err)); }
            if (window.JF_reminders) await JF_reminders.removeAll();
            JF.wipe(); onb = { step: 0, d: {} }; pendingScan = null;
            location.replace(sw ? '#/login' : '#/start'); toast(sw ? 'Войди в другой аккаунт или создай новый' : 'Ты вышел из аккаунта');
            return;
          }
          if (e.target.closest('[data-del-acc]')) return deleteAccountSheet();
          if (e.target.closest('[data-wipe]')) {
            const ok = await UI.confirm({ title: 'Удалить все данные?', danger: true, typeWord: 'УДАЛИТЬ', ok: 'Удалить навсегда',
              text: 'Профиль, дневник питания, вода, вес, тренировки, переписка с ИИ-тренером и напоминания будут удалены с этого устройства. Восстановить их будет нельзя.' });
            if (!ok) return;
            if (window.JF_reminders) await JF_reminders.removeAll();
            JF.wipe(); onb = { step: 0, d: {} }; pendingScan = null;
            location.replace('#/start'); toast('Все данные удалены');
            return;
          }
          commonClicks(e);
        };
      }
    };
  };

  // ---------- Аккаунт ----------
  function ago(t) {
    if (!t) return '';
    const m = Math.round((Date.now() - t) / 60000);
    return m < 1 ? 'только что' : m < 60 ? `${m} мин назад` : `${Math.round(m / 60)} ч назад`;
  }
  function accountBlock() {
    const A = ACC();
    if (!A) return '';
    if (!A.user) return `<div class="note warn" style="margin-bottom:.75rem">${icon('info')}<div><b>Данные только на этом устройстве.</b> Создай аккаунт, чтобы не потерять их при удалении приложения и открывать JOL Fitness на ноутбуке.
        <div class="row-btns" style="margin-top:.75rem"><button class="btn btn-dark btn-sm" data-acc-signup>Создать аккаунт</button><button class="btn btn-white btn-sm" data-acc-login>Войти</button></div></div></div>`;
    const s = A.status;
    const line = s.error ? `не сохранено: ${esc(s.error)}` : s.pending ? 'ждёт отправки в облако' : `сохранено в облаке ${ago(s.lastSync)}`;
    return `<div class="set-row" style="cursor:default"><span class="chip">${icon('user')}</span><span class="li-main"><b>${esc(A.email)}</b><small>${line}</small></span>
        <button class="icon-btn" data-acc-sync aria-label="Сохранить сейчас">${icon('refresh')}</button></div>
      <button class="set-row" data-acc-switch><span class="chip">${icon('refresh')}</span>Войти в другой аккаунт<span class="end">${icon('chevR')}</span></button>
      <button class="set-row" data-acc-logout><span class="chip">${icon('logout')}</span>Выйти из аккаунта<span class="end">${icon('chevR')}</span></button>`;
  }
  function deleteAccountSheet() {
    const A = ACC();
    openSheet({
      title: 'Удалить аккаунт?', html: `<p class="muted" style="margin:0 0 1rem">Аккаунт ${esc(A.email)} и все данные в облаке и на этом устройстве будут удалены навсегда: профиль, дневник, вес, тренировки, переписка с ИИ-тренером. Восстановить их будет нельзя.</p>
        <div class="field"><label class="label" for="del-pw">Для подтверждения введи пароль</label><input class="input" id="del-pw" type="password" autocomplete="current-password"></div>
        <button class="btn btn-danger btn-block" data-del-ok>${icon('trash')}Удалить навсегда</button>
        <button class="btn btn-ghost btn-block" data-close style="margin-top:.625rem">Отмена</button>`,
      onMount(sheet, close) {
        sheet.addEventListener('click', async e => {
          const b = e.target.closest('[data-del-ok]'); if (!b) return;
          const pw = $('#del-pw', sheet).value;
          if (!pw) return toast('Введи пароль');
          b.disabled = true; b.textContent = 'Удаляем…';
          try {
            await A.deleteAccount(pw);
            if (window.JF_reminders) await JF_reminders.removeAll();
            JF.wipe(); onb = { step: 0, d: {} }; pendingScan = null;
            close(); location.replace('#/start'); toast('Аккаунт и все данные удалены');
          } catch (err) { b.disabled = false; b.innerHTML = icon('trash') + 'Удалить навсегда'; toast(A.errText(err)); }
        });
      }
    });
  }
  function authScreen(mode, arg) {
    const A = ACC();
    if (!A) return { redirect: JF.profile ? '#/profile' : '#/start' };
    if (A.user) return { redirect: JF.profile ? '#/profile' : '#/start' };
    const isUp = mode === 'signup', afterOnb = arg === 'onb';
    const title = isUp ? (afterOnb ? 'Сохрани свой прогресс' : 'Создать аккаунт') : 'Вход в аккаунт';
    const lead = isUp ? 'С аккаунтом данные не пропадут при удалении приложения, и их можно открыть на телефоне и ноутбуке.'
      : 'Введи email и пароль — мы вернём твой профиль, дневник, вес и тренировки.';
    return {
      top: false, noRail: true, cls: 'page',
      html: authLayout(isUp ? { title: afterOnb ? 'Не потеряй свой прогресс' : 'Твои данные — в облаке', sub: 'Вход с любого телефона и ноутбука. Переустановка приложения больше не страшна.', pills: [['shield', 'Только у тебя'], ['refresh', 'Синхронизация']] }
          : { title: 'С возвращением!', sub: 'Войди, и твой профиль, дневник, вес и тренировки вернутся.', pills: [['user', 'Твой аккаунт'], ['refresh', 'Всё на месте']] }, `
        ${afterOnb ? '' : `<button class="back-b" data-auth-back>${icon('chevL')}Назад</button>`}
        <h1>${title}</h1><p class="lead">${lead}</p>
        ${!isUp && JF.profile ? `<div class="note warn" style="margin-bottom:1rem">${icon('info')}<div>Если в аккаунте уже есть данные, они заменят то, что сейчас на этом устройстве.</div></div>` : ''}
        <form id="auth-form" novalidate>
          <div class="field"><label class="label" for="a-email">Email</label><input class="input" id="a-email" type="email" inputmode="email" autocomplete="email" placeholder="name@mail.com" required></div>
          <div class="field"><label class="label" for="a-pw">Пароль${isUp ? ' (минимум 6 символов)' : ''}</label>
            <div style="position:relative"><input class="input" id="a-pw" type="password" autocomplete="${isUp ? 'new-password' : 'current-password'}" required style="padding-right:3.5rem">
            <button type="button" class="icon-btn" data-pw-eye aria-label="Показать пароль" style="position:absolute;right:.375rem;top:.375rem">${icon('lock')}</button></div></div>
          <button class="btn btn-dark btn-block" type="submit" id="a-go">${isUp ? 'Создать аккаунт' : 'Войти'}</button>
        </form>
        ${isUp ? (afterOnb ? `<button class="btn btn-ghost btn-block" data-later style="margin-top:.625rem">Позже</button>` : '')
          : `<button class="btn btn-ghost btn-block" data-reset style="margin-top:.625rem">Забыли пароль?</button>`}
        <p class="disclaimer" style="margin-top:1rem">${isUp ? `Уже есть аккаунт? <a href="#/login">Войти</a>` : `Нет аккаунта? <a href="${JF.profile ? '#/signup' : '#/start'}">Создать новый</a>`}</p>
        <p class="disclaimer">Продолжая, ты соглашаешься с <a href="privacy.html">политикой конфиденциальности</a>.</p>`),
      mount(v) {
        const email = $('#a-email', v), pw = $('#a-pw', v), btn = $('#a-go', v);
        if (window.innerWidth > 620) email.focus();
        $('#auth-form', v).addEventListener('submit', async e => {
          e.preventDefault();
          if (!/^\S+@\S+\.\S+$/.test(email.value.trim())) return toast('Проверь email');
          if (pw.value.length < 6) return toast('Пароль — минимум 6 символов');
          btn.disabled = true; btn.textContent = isUp ? 'Создаём…' : 'Входим…';
          try {
            if (isUp) {
              await A.signUp(email.value, pw.value);
              toast('Аккаунт создан — данные сохранены в облаке');
              location.replace(afterOnb ? '#/home' : '#/profile');
            } else {
              const has = await A.signIn(email.value, pw.value);
              toast(has ? 'С возвращением, ' + JF.profile.name + '!' : 'Вход выполнен. Заполни анкету');
              location.replace(has ? '#/home' : '#/start');
            }
          } catch (err) { btn.disabled = false; btn.textContent = isUp ? 'Создать аккаунт' : 'Войти'; toast(A.errText(err)); }
        });
        v.onclick = async e => {
          if (e.target.closest('[data-auth-back]')) { history.length > 1 ? history.back() : go(JF.profile ? '#/profile' : '#/start'); return; }
          if (e.target.closest('[data-later]')) return location.replace('#/home');
          if (e.target.closest('[data-pw-eye]')) { pw.type = pw.type === 'password' ? 'text' : 'password'; return; }
          if (e.target.closest('[data-reset]')) {
            if (!/^\S+@\S+\.\S+$/.test(email.value.trim())) return toast('Сначала впиши свой email');
            try {
              await A.resetPassword(email.value);
              toast('Если аккаунт с адресом ' + email.value.trim() + ' существует, письмо придёт в течение пары минут. Проверь папку «Спам».', 7000);
            }
            catch (err) { toast(A.errText(err)); }
          }
        };
      }
    };
  }
  SCREENS.login = () => authScreen('login');
  SCREENS.signup = arg => authScreen('signup', arg);
  function themeSheet() {
    const cur = JF.settings.theme || 'system';
    openSheet({
      title: 'Оформление', html: [['system', 'Как в системе', 'Днём светлое, ночью тёмное — как на телефоне', 'refresh'], ['light', 'Светлое', 'Голубой фон, белые карточки', 'sun'], ['dark', 'Тёмное', 'Бережёт глаза вечером', 'moonO']]
        .map(([v, t, sub, ic]) => `<button class="opt" data-th="${v}" aria-pressed="${cur === v}"><span class="chip">${icon(ic)}</span><span><b>${t}</b><small>${sub}</small></span></button>`).join(''),
      onMount(sheet, close) {
        sheet.addEventListener('click', e => {
          const b = e.target.closest('[data-th]'); if (!b) return;
          JF.setTheme(b.getAttribute('data-th')); UI.applyTheme(JF.settings.theme); close(); refresh();
        });
      }
    });
  }
  function perWeekSheet() {
    openSheet({
      title: 'Тренировок в неделю', html: `<div class="seg" style="justify-content:center;margin-bottom:1rem">${[2, 3, 4, 5].map(k => `<button data-k="${k}" aria-pressed="${(JF.profile.perWeek || 3) === k}">${k}</button>`).join('')}</div>
        <p class="muted" style="font-size:.875rem;text-align:center">Для новичков лучше всего 3 тренировки в неделю.</p>`,
      onMount(sheet, close) { sheet.addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (b) { JF.setProfile({ perWeek: +b.getAttribute('data-k') }); close(); refresh(); } }); }
    });
  }
  function profileSheet() {
    const p = JF.profile;
    const d = { name: p.name, sex: p.sex, age: p.age, height: p.height, weight: JF.currentWeight(), goal: p.goal, goalWeight: p.goalWeight, activity: p.activity };
    openSheet({
      title: 'Мои данные', html: '',
      onMount(sheet, close) {
        const draw = () => {
          sheet.querySelector('.sheet-body').innerHTML = `
            <div class="field"><label class="label" for="e-name">Имя</label><input class="input" id="e-name" maxlength="30" value="${esc(d.name)}"></div>
            <div class="seg" data-pick="sex" style="margin-bottom:1.125rem"><button data-v="m" aria-pressed="${d.sex === 'm'}">Мужской</button><button data-v="f" aria-pressed="${d.sex === 'f'}">Женский</button></div>
            <div class="grid grid-3 keep" style="gap:.625rem">
              <div class="field"><label class="label" for="e-age">Возраст</label><input class="input" id="e-age" type="number" inputmode="numeric" value="${d.age}"></div>
              <div class="field"><label class="label" for="e-h">Рост, см</label><input class="input" id="e-h" type="number" inputmode="numeric" value="${d.height}"></div>
              <div class="field"><label class="label" for="e-gw">Цель, кг</label><input class="input" id="e-gw" type="number" inputmode="decimal" step="0.1" value="${d.goalWeight}"></div>
            </div>
            <label class="label">Цель</label>
            <div class="seg" data-pick="goal" style="margin-bottom:1.125rem">${Object.keys(GOALS).map(k => `<button data-v="${k}" aria-pressed="${d.goal === k}">${GOALS[k]}</button>`).join('')}</div>
            <label class="label">Активность</label>
            <div class="seg" data-pick="activity" style="margin-bottom:1.5rem">${ACTIVITY.map(([v, t]) => `<button data-v="${v}" aria-pressed="${d.activity === v}">${t}</button>`).join('')}</div>
            <p class="muted" style="font-size:.8125rem;margin-bottom:1rem">Вес меняется в разделе «Прогресс» → «Записать вес».</p>
            <button class="btn btn-dark btn-block" data-save>${icon('check')}Сохранить и пересчитать нормы</button>`;
        };
        const read = () => {
          const v = id => $('#' + id, sheet).value.trim();
          d.name = v('e-name'); d.age = +v('e-age'); d.height = +v('e-h'); d.goalWeight = +v('e-gw').replace(',', '.');
        };
        draw();
        sheet.addEventListener('click', e => {
          const b = e.target.closest('[data-pick] [data-v]');
          if (b) { read(); const k = b.closest('[data-pick]').getAttribute('data-pick'); d[k] = k === 'activity' ? +b.getAttribute('data-v') : b.getAttribute('data-v'); return draw(); }
          if (e.target.closest('[data-save]')) {
            read();
            if (d.goal === 'keep') d.goalWeight = d.weight;
            const err = validate(1, d) || validate(2, d) || validate(3, d);
            if (err) return toast(err);
            JF.setProfile({ name: d.name, sex: d.sex, age: d.age, height: d.height, goal: d.goal, goalWeight: d.goalWeight, activity: d.activity });
            close(); toast('Нормы пересчитаны'); refresh();
          }
        });
      }
    });
  }

  // ---------- Помощь ----------
  SCREENS.help = function () {
    const FAQ = [
      ['Как работает сканер еды?', 'Ты фотографируешь тарелку, фото отправляется на сервер JOL Fitness и анализируется ИИ (Google Gemini). ИИ определяет блюда, оценивает вес порции и считает калории и БЖУ. Фото не сохраняется ни на сервере, ни в приложении.'],
      ['Насколько точны калории?', 'По фото ИИ оценивает порцию примерно, ошибка может быть 10–30%. Поправь граммы кнопками «−» и «+» перед добавлением. Для точности можно взвешивать еду и добавлять её вручную.'],
      ['Как считается моя норма?', 'По формуле Миффлина — Сан-Жеора с учётом пола, возраста, роста, веса и активности. Для похудения — минус 15%, для набора массы — плюс 10%. Белок — 1,4–1,7 г на кг веса.'],
      ['Где хранятся мои данные?', 'Без аккаунта — только на твоём устройстве. С аккаунтом — ещё и в защищённом облаке (Google Firebase), поэтому после переустановки или на ноутбуке достаточно войти по email и паролю. Вопросы ИИ-тренеру и фото еды отправляются на сервер только для ответа и не сохраняются. Удалить всё можно в «Профиле».'],
      ['Забыл пароль — что делать?', 'На экране входа впиши свой email и нажми «Забыли пароль?». Придёт письмо со ссылкой для нового пароля (проверь папку «Спам»).'],
      ['Почему не приходят напоминания?', 'Проверь, что уведомления разрешены, включи «Будильники и напоминания» (кнопка на экране напоминаний) и отключи экономию батареи для JOL Fitness в настройках Android.'],
      ['Почему ИИ-тренер не отвечает?', 'ИИ-тренеру и сканеру нужен интернет. Если сеть есть — подожди минуту и попробуй снова: бесплатный лимит ИИ иногда временно заканчивается.'],
      ['Можно ли заниматься с травмами?', 'JOL Fitness не заменяет врача. При болезнях сердца, суставов, спины, при беременности или после травм посоветуйся с врачом перед тренировками. Если во время упражнения появилась боль — остановись.']
    ];
    return {
      nav: 'help',
      top: { title: 'Помощь', sub: 'Ответы на частые вопросы.' },
      html: `<div class="card pad"><div class="list">${FAQ.map(([q, a]) => `<details class="li" style="display:block"><summary style="font-weight:600;cursor:pointer;list-style-position:outside">${esc(q)}</summary><p class="lead" style="margin-top:.625rem">${esc(a)}</p></details>`).join('')}</div></div>
        <div class="row-btns"><a class="btn btn-ghost" href="privacy.html">${icon('shield')}Политика конфиденциальности</a><a class="btn btn-ghost" href="delete-data.html">${icon('trash')}Как удалить данные</a></div>`
    };
  };

  // =========================================================
  //  Запуск
  // =========================================================
  // новый день, пока приложение открыто
  let lastDay = JF.dayKey();
  setInterval(() => { if (JF.dayKey() !== lastDay) { lastDay = JF.dayKey(); if (current && current.live) refresh(); } }, 60000);
  UI.applyTheme(JF.settings.theme || 'system');
  document.addEventListener('jf:resume-data', () => UI.applyTheme(JF.settings.theme || 'system'));
  const start = () => { const b = document.getElementById('boot'); if (b) b.remove(); UI.applyTheme(JF.settings.theme || 'system'); render(); };
  if (!JF.profile && ACC()) Promise.race([ACC().ready, new Promise(r => setTimeout(r, 4000))]).then(start);
  else start();
})();
