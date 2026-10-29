// JOL Fitness — анимации упражнений: фигурка из «палочек», которая показывает движение.
// Для каждого упражнения заданы 2–4 позы (координаты суставов в квадрате 100×100),
// между ними фигурка плавно двигается по кругу. Работает без интернета и без картинок.
//
// Суставы: h — голова, n — шея/плечи, p — таз, s — середина спины (необязательно, для изгиба),
// ek/hk — локоть/кисть ближней руки, eb/hb — дальней; kk/fk — колено/стопа ближней ноги, kb/fb — дальней;
// tk/tb — носки (необязательно). Дальние руки и ноги рисуются светлее.
(function () {
  const G = 89; // уровень пола
  // ---------- базовые позы ----------
  const STAND = { h: [50, 17], n: [50, 27], p: [50, 52], ek: [53, 40], hk: [55, 52], eb: [47, 40], hb: [45, 52], kk: [52, 70], fk: [53, G], kb: [48, 70], fb: [47, G] };
  const FRONT = { h: [50, 17], n: [50, 27], p: [50, 52], ek: [43, 39], hk: [41, 51], eb: [57, 39], hb: [59, 51], kk: [46, 70], fk: [45, G], kb: [54, 70], fb: [55, G] };
  const P = (base, over) => Object.assign({}, base, over);
  const shiftY = (pose, dy, keys) => { const o = {}; for (const k in pose) o[k] = (!keys || keys.includes(k)) ? [pose[k][0], pose[k][1] + dy] : pose[k]; return o; };
  // высокая планка (голова слева), body — точки ног/таза для прямой линии
  const PLANK_UP = { h: [21, 53], n: [28, 58], p: [56, 72], ek: [28, 73], hk: [28, G], eb: [31, 73], hb: [31, G], kk: [71, 80], fk: [86, 88], kb: [72, 80], fb: [84, 88] };
  const PLANK_DOWN = { h: [23, 71], n: [30, 74], p: [57, 81], ek: [37, 77], hk: [28, G], eb: [40, 78], hb: [31, G], kk: [72, 84], fk: [86, 88], kb: [72, 84], fb: [84, 88] };
  const LIE_BACK = { h: [17, 83], n: [26, 85], p: [52, 86], ek: [36, 87], hk: [46, 88], eb: [36, 87], hb: [46, 88], kk: [64, 70], fk: [74, G], kb: [63, 71], fb: [72, G] };
  const QUAD = { h: [28, 56], n: [36, 63], p: [62, 63], ek: [36, 76], hk: [36, G], eb: [39, 76], hb: [39, G], kk: [62, G], fk: [78, G], kb: [65, G], fb: [80, G] };

  const POSES = {
    'jumping-jacks': { ms: 420, frames: [FRONT, P(FRONT, { h: [50, 13], n: [50, 23], p: [50, 49], ek: [40, 18], hk: [35, 6], eb: [60, 18], hb: [65, 6], kk: [41, 68], fk: [33, G], kb: [59, 68], fb: [67, G] })] },
    'squats': { ms: 800, frames: [P(STAND, { ek: [60, 37], hk: [70, 37], eb: [58, 38], hb: [68, 38] }),
      { h: [57, 31], n: [52, 39], p: [38, 62], ek: [63, 42], hk: [74, 41], eb: [61, 43], hb: [72, 42], kk: [56, 66], fk: [53, G], kb: [54, 67], fb: [50, G] }] },
    'pushups': { ms: 750, frames: [PLANK_UP, PLANK_DOWN] },
    'lunges': { ms: 850, frames: [P(STAND, { ek: [58, 44], hk: [53, 54], eb: [42, 44], hb: [47, 54] }),
      { h: [48, 32], n: [48, 41], p: [47, 66], ek: [56, 56], hk: [51, 66], eb: [40, 56], hb: [45, 66], kk: [64, 67], fk: [66, G], kb: [40, 85], fb: [27, 88] },
      P(STAND, { ek: [58, 44], hk: [53, 54], eb: [42, 44], hb: [47, 54] }),
      { h: [52, 32], n: [52, 41], p: [53, 66], ek: [60, 56], hk: [55, 66], eb: [44, 56], hb: [49, 66], kk: [60, 85], fk: [73, 88], kb: [36, 67], fb: [34, G] }] },
    'plank': { ms: 1300, frames: [
      { h: [22, 62], n: [30, 68], p: [57, 77], ek: [30, 86], hk: [17, 87], eb: [33, 86], hb: [20, 87], kk: [72, 82], fk: [86, 88], kb: [72, 82], fb: [84, 88] },
      { h: [22, 61], n: [30, 67], p: [57, 75], ek: [30, 86], hk: [17, 87], eb: [33, 86], hb: [20, 87], kk: [72, 81], fk: [86, 88], kb: [72, 81], fb: [84, 88] }] },
    'glute-bridge': { ms: 900, frames: [LIE_BACK, P(LIE_BACK, { p: [52, 70], kk: [66, 66], kb: [65, 67] })] },
    'mountain': { ms: 330, frames: [
      P(PLANK_UP, { kk: [46, 76], fk: [55, 84], kb: [71, 80], fb: [84, 88] }),
      P(PLANK_UP, { kk: [71, 80], fk: [86, 88], kb: [47, 76], fb: [56, 84] })] },
    'burpees': { ms: 520, frames: [
      P(STAND, {}),
      { h: [63, 54], n: [56, 58], p: [42, 68], ek: [60, 72], hk: [62, G], eb: [58, 72], hb: [59, G], kk: [56, 70], fk: [52, G], kb: [54, 71], fb: [49, G] },
      P(PLANK_UP, {}),
      P(shiftY(STAND, -9), { ek: [55, 16], hk: [57, 4], eb: [46, 16], hb: [44, 4], fk: [53, 82], fb: [47, 82] })] },
    'high-knees': { ms: 300, frames: [
      P(STAND, { kk: [66, 52], fk: [64, 70], ek: [44, 40], hk: [50, 32], eb: [58, 42], hb: [56, 54] }),
      P(STAND, { kb: [66, 52], fb: [64, 70], eb: [44, 40], hb: [50, 32], ek: [58, 42], hk: [56, 54] })] },
    'crunches': { ms: 800, frames: [
      P(LIE_BACK, { ek: [24, 76], hk: [20, 81], eb: [26, 77], hb: [21, 82] }),
      P(LIE_BACK, { h: [30, 66], n: [35, 74], ek: [33, 64], hk: [28, 69], eb: [35, 65], hb: [29, 70] })] },
    'side-plank': { ms: 1200, frames: [
      { h: [23, 51], n: [30, 58], p: [56, 72], ek: [30, 86], hk: [42, 88], eb: [32, 45], hb: [33, 33], kk: [71, 80], fk: [86, 88], kb: [71, 80], fb: [86, 88] },
      { h: [23, 52], n: [30, 59], p: [56, 75], ek: [30, 86], hk: [42, 88], eb: [32, 46], hb: [33, 34], kk: [71, 82], fk: [86, 88], kb: [71, 82], fb: [86, 88] }] },
    'superman': { ms: 900, frames: [
      { h: [20, 81], n: [28, 85], p: [55, 86], ek: [17, 87], hk: [7, 87], eb: [18, 87], hb: [8, 87], kk: [71, 87], fk: [87, 87], kb: [71, 87], fb: [86, 87] },
      { h: [20, 74], n: [28, 80], p: [55, 86], ek: [18, 76], hk: [8, 70], eb: [19, 77], hb: [9, 71], kk: [71, 83], fk: [87, 76], kb: [71, 83], fb: [86, 77] }] },
    'wall-sit': { ms: 1300, prop: 'wall', frames: [
      { h: [38, 31], n: [38, 40], p: [38, 64], ek: [47, 50], hk: [41, 53], eb: [45, 51], hb: [39, 54], kk: [61, 64], fk: [61, G], kb: [59, 65], fb: [59, G] },
      { h: [38, 32], n: [38, 41], p: [38, 65], ek: [47, 51], hk: [41, 54], eb: [45, 52], hb: [39, 55], kk: [61, 65], fk: [61, G], kb: [59, 66], fb: [59, G] }] },
    'tricep-dips': { ms: 850, prop: 'bench', frames: [
      { h: [40, 32], n: [41, 42], p: [45, 66], ek: [38, 54], hk: [36, 66], eb: [40, 54], hb: [38, 66], kk: [63, 70], fk: [77, G], kb: [62, 71], fb: [75, G] },
      { h: [42, 46], n: [43, 56], p: [47, 78], ek: [29, 58], hk: [36, 66], eb: [31, 58], hb: [38, 66], kk: [64, 74], fk: [77, G], kb: [63, 75], fb: [75, G] }] },
    'leg-raises': { ms: 1000, frames: [
      P(LIE_BACK, { kk: [68, 86], fk: [84, 86], kb: [68, 87], fb: [83, 87] }),
      P(LIE_BACK, { kk: [55, 70], fk: [58, 54], kb: [56, 71], fb: [59, 55] })] },
    'jump-squats': { ms: 520, frames: [
      { h: [57, 31], n: [52, 39], p: [38, 62], ek: [44, 52], hk: [36, 60], eb: [46, 53], hb: [38, 61], kk: [56, 66], fk: [53, G], kb: [54, 67], fb: [50, G] },
      P(shiftY(STAND, -10), { ek: [55, 16], hk: [57, 5], eb: [46, 16], hb: [44, 5] })] },
    'skater': { ms: 520, frames: [
      { h: [35, 26], n: [38, 35], p: [43, 58], ek: [48, 42], hk: [56, 48], eb: [32, 44], hb: [26, 52], kk: [38, 73], fk: [36, G], kb: [50, 72], fb: [56, 85] },
      { h: [65, 26], n: [62, 35], p: [57, 58], ek: [52, 42], hk: [44, 48], eb: [68, 44], hb: [74, 52], kk: [62, 73], fk: [64, G], kb: [50, 72], fb: [44, 85] }] },
    'bird-dog': { ms: 1000, frames: [QUAD, P(QUAD, { ek: [25, 60], hk: [12, 58], kk: [77, 62], fk: [92, 60] })] },
    'cat-cow': { ms: 1300, frames: [
      P(QUAD, { s: [49, 46], h: [30, 74], n: [36, 66] }),
      P(QUAD, { s: [49, 76], h: [27, 52], n: [36, 62] })] },
    'child-pose': { ms: 1600, frames: [
      { h: [31, 83], n: [40, 79], s: [52, 74], p: [64, 80], ek: [25, 86], hk: [12, 87], eb: [27, 86], hb: [14, 87], kk: [55, 88], fk: [76, 88], kb: [57, 88], fb: [78, 88] },
      { h: [31, 82], n: [40, 77], s: [52, 71], p: [64, 79], ek: [25, 86], hk: [12, 87], eb: [27, 86], hb: [14, 87], kk: [55, 88], fk: [76, 88], kb: [57, 88], fb: [78, 88] }] },
    'hamstring-stretch': { ms: 1300, frames: [
      { h: [51, 53], n: [51, 62], p: [55, 86], ek: [60, 72], hk: [70, 80], eb: [59, 73], hb: [68, 81], kk: [72, 86], fk: [88, 86], kb: [66, 76], fb: [60, 87] },
      { h: [69, 64], n: [63, 70], p: [55, 86], ek: [73, 76], hk: [84, 81], eb: [72, 77], hb: [82, 82], kk: [72, 86], fk: [88, 86], kb: [66, 76], fb: [60, 87] }] },
    'hip-flexor': { ms: 1300, frames: [
      { h: [50, 39], n: [50, 48], p: [51, 72], ek: [44, 58], hk: [35, 66], eb: [46, 59], hb: [37, 67], kk: [33, 70], fk: [30, G], kb: [66, 88], fb: [84, 88] },
      { h: [47, 43], n: [47, 52], p: [46, 76], ek: [41, 61], hk: [34, 68], eb: [43, 62], hb: [36, 69], kk: [31, 71], fk: [30, G], kb: [64, 88], fb: [84, 88] }] },
    'chest-opener': { ms: 1300, frames: [
      P(STAND, { ek: [45, 41], hk: [44, 55], eb: [46, 41], hb: [45, 55] }),
      P(STAND, { h: [52, 17], n: [51, 27], ek: [41, 42], hk: [33, 53], eb: [42, 42], hb: [34, 53] })] },
    'calf-raises': { ms: 700, frames: [
      P(STAND, { fk: [52, 87], tk: [58, G], fb: [48, 87], tb: [54, G] }),
      P(shiftY(STAND, -5), { fk: [52, 82], tk: [57, G], fb: [48, 82], tb: [53, G] })] }
  };

  const ease = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  function blend(A, B, t) {
    const o = {};
    for (const k in A) o[k] = B[k] ? lerp(A[k], B[k], t) : A[k];
    for (const k in B) if (!A[k]) o[k] = B[k];
    return o;
  }
  const L = (a, b, cls) => a && b ? `<line class="${cls}" x1="${a[0].toFixed(1)}" y1="${a[1].toFixed(1)}" x2="${b[0].toFixed(1)}" y2="${b[1].toFixed(1)}"/>` : '';
  function draw(p, prop) {
    const torso = p.s
      ? `<path class="jf-b" d="M${p.n[0].toFixed(1)} ${p.n[1].toFixed(1)} Q${p.s[0].toFixed(1)} ${p.s[1].toFixed(1)} ${p.p[0].toFixed(1)} ${p.p[1].toFixed(1)}" fill="none"/>`
      : L(p.n, p.p, 'jf-b');
    return `${prop === 'wall' ? '<rect x="28" y="20" width="6" height="70" rx="2" class="jf-prop"/>' : ''}
      ${prop === 'bench' ? '<rect x="14" y="65" width="26" height="5" rx="2" class="jf-prop"/><rect x="16" y="68" width="4" height="22" class="jf-prop"/><rect x="34" y="68" width="4" height="22" class="jf-prop"/>' : ''}
      <line class="jf-floor" x1="4" y1="${G + 2.8}" x2="96" y2="${G + 2.8}"/>
      ${L(p.p, p.kb, 'jf-f')}${L(p.kb, p.fb, 'jf-f')}${L(p.fb, p.tb, 'jf-f')}${L(p.n, p.eb, 'jf-f')}${L(p.eb, p.hb, 'jf-f')}
      ${torso}
      ${L(p.p, p.kk, 'jf-b')}${L(p.kk, p.fk, 'jf-b')}${L(p.fk, p.tk, 'jf-b')}${L(p.n, p.ek, 'jf-b')}${L(p.ek, p.hk, 'jf-b')}
      <circle class="jf-head" cx="${p.h[0].toFixed(1)}" cy="${p.h[1].toFixed(1)}" r="6.2"/>`;
  }
  const svg = (inner, cls) => `<svg class="jf-anim ${cls || ''}" viewBox="0 0 100 100" aria-hidden="true">${inner}</svg>`;

  // Статичная картинка (первая поза) — для списков
  function still(id, cls) {
    const a = POSES[id]; if (!a) return '';
    return svg(draw(a.frames[a.frames.length > 2 ? 1 : a.frames.length - 1], a.prop), cls);
  }
  // Живая анимация внутри el. Останавливается сама, когда el убирают со страницы.
  function play(el, id) {
    const a = POSES[id]; if (!el || !a) return () => {};
    const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.innerHTML = svg('', 'live');
    const s = el.firstElementChild;
    const n = a.frames.length;
    const seq = n === 2 ? [0, 1] : a.frames.map((_, i) => i);
    let raf, start = performance.now(), stopped = false;
    function frame(now) {
      if (stopped || !el.isConnected) return;
      const total = Math.max(0, now - start) / a.ms;
      const i = Math.floor(total) % seq.length, t = ease(total % 1);
      const A = a.frames[seq[i]], B = a.frames[seq[(i + 1) % seq.length]];
      s.innerHTML = draw(blend(A, B, t), a.prop);
      raf = requestAnimationFrame(frame);
    }
    if (reduce) s.innerHTML = draw(a.frames[n > 2 ? 1 : n - 1], a.prop);
    else raf = requestAnimationFrame(frame);
    return () => { stopped = true; cancelAnimationFrame(raf); };
  }

  window.JF_ANIM = { still, play, has: id => !!POSES[id] };
})();
