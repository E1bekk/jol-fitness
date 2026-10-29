// JOL Fitness — общие элементы интерфейса: иконки, всплывающие окна, уведомления, форматирование.
(function () {
  const S = (d, extra) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"${extra || ''}>${d}</svg>`;
  const F = d => `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${d}</svg>`;
  const ICONS = {
    home: F('<path d="M10.6 2.6a2.2 2.2 0 0 1 2.8 0l7.2 6a2.2 2.2 0 0 1 .8 1.7v9.2A2.5 2.5 0 0 1 18.9 22H5.1a2.5 2.5 0 0 1-2.5-2.5v-9.2c0-.7.3-1.3.8-1.7l7.2-6Z"/><circle class="hole" cx="12" cy="14.6" r="2.4"/>'),
    activity: S('<rect x="3" y="3" width="18" height="18" rx="5"/><polyline points="7 14.5 10 11 13 13.5 17 9"/>'),
    chat: S('<path d="M20.5 11.6c0 4.4-3.8 8-8.5 8-1.3 0-2.5-.3-3.6-.7L3.5 20.5l1.4-4A7.6 7.6 0 0 1 3.5 11.6c0-4.4 3.8-8 8.5-8s8.5 3.6 8.5 8Z"/><path d="M9 11.8h6"/>'),
    bell: S('<path d="M6 9.5a6 6 0 0 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15.5 6 9.5Z"/><path d="M10.2 20.5a2 2 0 0 0 3.6 0"/>'),
    gear: S('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/>'),
    help: S('<circle cx="12" cy="12" r="9"/><path d="M9.5 9.3a2.6 2.6 0 0 1 5 .9c0 1.7-2.5 2.4-2.5 2.4"/><line x1="12" y1="16.6" x2="12" y2="16.7"/>'),
    logout: S('<path d="M9.5 21H6a2.5 2.5 0 0 1-2.5-2.5v-13A2.5 2.5 0 0 1 6 3h3.5"/><polyline points="15.5 16.5 20.5 12 15.5 7.5"/><line x1="20.5" y1="12" x2="9" y2="12"/>'),
    menu: S('<line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="14" y2="17"/>', ' stroke-width="1.9"'),
    search: S('<circle cx="11" cy="11" r="7"/><line x1="16.2" y1="16.2" x2="20.5" y2="20.5"/>', ' stroke-width="1.9"'),
    crown: '<svg viewBox="0 0 24 24" fill="#d7f17c" aria-hidden="true"><path d="M3.2 7.6l4.4 3.6 3.6-6a.9.9 0 0 1 1.6 0l3.6 6 4.4-3.6a.6.6 0 0 1 1 .6l-2 10.3H4.2l-2-10.3a.6.6 0 0 1 1-.6Z"/><rect x="4.4" y="19.3" width="15.2" height="1.9" rx=".95"/></svg>',
    play: '<svg viewBox="0 0 18 18" fill="currentColor" aria-hidden="true"><path d="M4 2.6c0-1 1.1-1.6 2-1.1l10 6.4c.8.5.8 1.7 0 2.2l-10 6.4c-.9.5-2-.1-2-1.1Z"/></svg>',
    pause: F('<rect x="6" y="4.5" width="4" height="15" rx="1.4"/><rect x="14" y="4.5" width="4" height="15" rx="1.4"/>'),
    arrow: S('<line x1="5" y1="12" x2="19" y2="12"/><polyline points="13 6 19 12 13 18"/>', ' stroke-width="2"'),
    thumbs: S('<path d="M7 10.5v10H4.5a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1Z"/><path d="M7 10.5l4-7.5a2.3 2.3 0 0 1 2.4 2.6l-.6 3.4h5.6a2 2 0 0 1 2 2.4l-1.4 7.4a2 2 0 0 1-2 1.7H7"/>', ' stroke-width="1.9"'),
    moon: F('<path d="M20.6 14.6A8.6 8.6 0 0 1 9.4 3.4a.6.6 0 0 0-.8-.7 9.6 9.6 0 1 0 12.7 12.7.6.6 0 0 0-.7-.8Z"/>'),
    chevL: S('<polyline points="15 5 8 12 15 19"/>', ' stroke-width="2"'),
    chevR: S('<polyline points="9 5 16 12 9 19"/>', ' stroke-width="2"'),
    flame: F('<path d="M12.6 2.3c.4 3-1.4 4.5-3 6.2C8 10.2 6.5 12 6.5 14.8A5.5 5.5 0 0 0 12 20.5a5.5 5.5 0 0 0 5.5-5.6c0-2.2-1-3.8-2-5-.2 1.4-.9 2.4-2 2.8.6-3.6-.1-7.4-.9-10.4Z"/>'),
    arrowsLR: S('<line x1="3.5" y1="12" x2="20.5" y2="12"/><polyline points="7.5 8 3.5 12 7.5 16"/><polyline points="16.5 8 20.5 12 16.5 16"/>', ' stroke-width="2"'),
    dumbbell: S('<path d="M6.5 6.5v11M3.5 9v6M17.5 6.5v11M20.5 9v6M6.5 12h11"/>', ' stroke-width="2"'),
    apple: S('<path d="M12 7.5c-1.4-1-3.6-1.6-5.4-.6C4.2 8.3 3.8 12 5 15.3c1.1 3 3 5.4 5 5.2 1 0 1.2-.5 2-.5s1 .5 2 .5c2 .2 3.9-2.2 5-5.2 1.2-3.3.8-7-1.6-8.4-1.8-1-4-.4-5.4.6Z"/><path d="M12 7.5c0-2 1-3.6 3-4.5"/>'),
    camera: S('<path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.3l1.3-2h5.8l1.3 2h1.3A2.5 2.5 0 0 1 20 8.5v9a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5Z"/><circle cx="12" cy="13" r="3.6"/>'),
    image: S('<rect x="3.5" y="4.5" width="17" height="15" rx="3"/><circle cx="9" cy="10" r="1.7"/><path d="M20.5 15.5l-4.5-4.5-8 8"/>'),
    plus: S('<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>', ' stroke-width="2"'),
    minus: S('<line x1="5" y1="12" x2="19" y2="12"/>', ' stroke-width="2"'),
    trash: S('<path d="M4 7h16M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13"/><path d="M10 11v5M14 11v5"/>'),
    check: S('<polyline points="5 12.5 10 17.5 19 7"/>', ' stroke-width="2.2"'),
    close: S('<line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>', ' stroke-width="2"'),
    chart: S('<path d="M3.5 20.5h17"/><path d="M4 16l4.5-5 4 3 7-8"/><polyline points="15 6 19.5 6 19.5 10.5"/>'),
    timer: S('<circle cx="12" cy="13.5" r="7.5"/><path d="M12 9.5v4l2.5 2M9.5 2.5h5"/>'),
    drop: S('<path d="M12 3.2S5.5 10 5.5 14.5a6.5 6.5 0 0 0 13 0C18.5 10 12 3.2 12 3.2Z"/>'),
    spark: S('<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9Z"/><path d="M19 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8Z"/>'),
    send: S('<path d="M21 3 10.5 13.5M21 3l-6.5 18-4-7.5L3 9.5Z"/>'),
    user: S('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'),
    edit: S('<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16Z"/><path d="M13.5 6.5l4 4"/>'),
    shield: S('<path d="M12 3l7.5 3v5.5c0 4.6-3.2 8.3-7.5 9.5-4.3-1.2-7.5-4.9-7.5-9.5V6Z"/><polyline points="9 12 11.2 14.2 15.5 9.8"/>'),
    info: S('<circle cx="12" cy="12" r="9"/><line x1="12" y1="11" x2="12" y2="16.5"/><line x1="12" y1="7.6" x2="12" y2="7.7"/>'),
    zap: S('<path d="M13 2.5 4.5 13.5H12l-1 8 8.5-11H12Z"/>'),
    leaf: S('<path d="M5 19c0-8 5-13.5 15-14-.5 10-6 15-14 15"/><path d="M5 19c3-4 6-6.5 9.5-8"/>'),
    run: S('<circle cx="14.5" cy="4.5" r="1.8"/><path d="M8 21l3-6 3 2.5V22M6 11.5l3.5-3h4l2.5 3.5 3 1"/><path d="M13.5 8.5 11 15"/>'),
    calendar: S('<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>'),
    scale: S('<rect x="3.5" y="3.5" width="17" height="17" rx="4.5"/><path d="M8.5 9.5a5 5 0 0 1 7 0L12 13Z"/>'),
    refresh: S('<path d="M20 11a8 8 0 0 0-14.5-4.5L4 8M4 4v4h4M4 13a8 8 0 0 0 14.5 4.5L20 16M20 20v-4h-4"/>'),
    lock: S('<rect x="4.5" y="10.5" width="15" height="10" rx="2.5"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>'),
    skip: F('<path d="M5 5.3c0-.9 1-1.4 1.7-.9l8.2 6.1c.6.5.6 1.4 0 1.9l-8.2 6.1c-.7.5-1.7 0-1.7-.9Z"/><rect x="16.5" y="4.5" width="2.8" height="15" rx="1.2"/>')
  };
  window.icon = n => ICONS[n] || '';

  // ===== Форматирование =====
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const num = n => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');   // 2 350
  const dec = (n, d) => (+n).toFixed(d == null ? 1 : d).replace('.', ',').replace(/,0+$/, '');
  function plural(n, a, b, c) { n = Math.abs(n) % 100; const n1 = n % 10; if (n > 10 && n < 20) return c; if (n1 > 1 && n1 < 5) return b; if (n1 === 1) return a; return c; }
  const MONTHS = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  const dateShort = d => d.getDate() + ' ' + MONTHS[d.getMonth()];

  // ===== Уведомление внизу экрана =====
  let toastEl;
  function toast(text) {
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'toast'; toastEl.setAttribute('role', 'status'); document.body.appendChild(toastEl); }
    toastEl.textContent = text;
    toastEl.classList.add('show');
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(() => toastEl.classList.remove('show'), 2200);
  }

  // ===== Нижняя панель (sheet) =====
  // openSheet({ title, html, onMount(el, close) }) → close()
  const stack = [];
  function openSheet(o) {
    const wrap = document.createElement('div');
    wrap.className = 'sheet-wrap';
    wrap.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(o.title || '')}">
      <div class="sheet-grip" aria-hidden="true"></div>
      ${o.title ? `<div class="sheet-head"><h3>${esc(o.title)}</h3><button class="icon-btn" data-close aria-label="Закрыть">${icon('close')}</button></div>` : ''}
      <div class="sheet-body">${o.html || ''}</div></div>`;
    document.body.appendChild(wrap);
    requestAnimationFrame(() => wrap.classList.add('open'));
    let closed = false;
    const close = () => {
      if (closed) return; closed = true;
      const i = stack.indexOf(close); if (i >= 0) stack.splice(i, 1);
      wrap.classList.remove('open');
      setTimeout(() => wrap.remove(), 220);
      if (o.onClose) o.onClose();
    };
    wrap.addEventListener('click', e => { if (e.target === wrap || e.target.closest('[data-close]')) close(); });
    stack.push(close);
    if (o.onMount) o.onMount(wrap.querySelector('.sheet'), close);
    return close;
  }
  function closeTop() { const c = stack[stack.length - 1]; if (c) { c(); return true; } return false; }

  function confirmBox(o) {
    return new Promise(resolve => {
      let result = false;
      openSheet({
        title: o.title,
        html: `<p class="muted" style="margin:0 0 1.25rem">${esc(o.text || '')}</p>
          ${o.typeWord ? `<input class="input" data-word placeholder="Впиши: ${esc(o.typeWord)}" autocomplete="off" style="margin-bottom:1rem">` : ''}
          <button class="btn ${o.danger ? 'btn-danger' : 'btn-dark'} btn-block" data-ok ${o.typeWord ? 'disabled' : ''}>${esc(o.ok || 'Да')}</button>
          <button class="btn btn-ghost btn-block" data-close style="margin-top:.625rem">${esc(o.cancel || 'Отмена')}</button>`,
        onMount(el, close) {
          const ok = el.querySelector('[data-ok]');
          const word = el.querySelector('[data-word]');
          if (word) word.addEventListener('input', () => { ok.disabled = word.value.trim().toUpperCase() !== o.typeWord; });
          ok.addEventListener('click', () => { result = true; close(); });
        },
        onClose() { resolve(result); }
      });
    });
  }

  // короткий звуковой сигнал (таймер тренировки)
  let actx;
  function beep(freq, ms) {
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const o = actx.createOscillator(), g = actx.createGain();
      o.frequency.value = freq || 880; o.type = 'sine';
      g.gain.setValueAtTime(0.0001, actx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.25, actx.currentTime + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + (ms || 180) / 1000);
      o.connect(g); g.connect(actx.destination); o.start(); o.stop(actx.currentTime + (ms || 180) / 1000 + 0.02);
    } catch (e) {}
    try { if (navigator.vibrate) navigator.vibrate(ms > 300 ? [120, 80, 120] : 60); } catch (e) {}
  }

  window.UI = { esc, num, dec, plural, dateShort, MONTHS, toast, openSheet, closeTop, confirm: confirmBox, beep };
})();
