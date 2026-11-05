// JOL Fitness — анимации упражнений: живой человечек (футболка, шорты, кроссовки, лицо).
//
// Как устроено. У человечка настоящий «скелет» с постоянной длиной костей (как у живого человека:
// голова ≈ 1/7 роста, руки до середины бедра). Для каждого упражнения заданы 2–5 ключевых поз,
// а между ними плавно меняются УГЛЫ суставов — поэтому руки и ноги не растягиваются, колени
// и локти гнутся только в свою сторону, а стопы и ладони, стоящие на полу, не скользят.
//
// Поза: t — наклон корпуса в градусах (0 — прямо, 90 — горизонтально вперёд, −90 — лёжа на спине),
//   n — наклон головы относительно корпуса (+ подбородок к груди, − взгляд вверх),
//   c — изгиб спины (+ округлить, − прогнуть).
// Руки ak/ab и ноги lk/lb (k — ближняя к нам, b — дальняя), три способа задать:
//   [a, b] — углы плеча/бедра и предплечья/голени от вертикали вниз (+ вперёд, − назад, 180 — вверх);
//   R(a, b) — те же углы, но относительно корпуса (рука «за головой» поворачивается вместе с телом);
//   T(x, y) — куда поставить кисть/стопу (локоть или колено скелет согнёт сам).
// Положение тела: p: [x, y] — таз; p: [x] + on: 'lk' — таз по x, а высота такая, чтобы стопа lk
//   стояла на полу; foot: ['lk', x, y] — стопа lk стоит в точке (x, y), тело строится от неё.
// Вид спереди (view: 'front'): углы рук и ног — отведение в сторону (+ наружу), t — наклон вбок.
(function () {
  const G = 89;                    // уровень щиколотки стоящей ноги (подошва ≈ 92)
  const L = { torso: 24, neck: 3.4, head: 4.7, up: 13.8, fore: 12.2, thigh: 18.6, shin: 18.6 };
  const SH = 6.6, HP = 3.8;        // вид спереди: половина ширины плеч и таза
  const HAND = 89.6;               // уровень запястья ладони на полу
  const TOE = 84.5;                // уровень щиколотки, когда стоишь на носках в упоре
  const BENCH = 68.6;              // запястье на краю стула
  const R = (a, b) => ({ r: [a, b] }), T = (x, y, bend) => ({ to: [x, y], bend });

  // ---------- готовые части поз ----------
  const HIPS = { ak: [-25, 50], ab: [-22, 48] };                 // руки на поясе (вид сбоку)
  const DOWN = { ak: [-4, 6], ab: [-2, 9] };                     // руки опущены
  const STAND = Object.assign({ t: 0, n: 0, lk: [0, 0], lb: [1.5, 0] }, DOWN);
  const P = (...o) => Object.assign({}, ...o);
  // упор лёжа на прямых руках: щиколотки в точке (ax, TOE), голова слева
  const HIGH = (ax, t, o) => P({ foot: ['lk', ax, TOE], t, n: -8, lk: R(0, 0), lb: R(0, 0), ak: T(ax - 55, HAND), ab: T(ax - 52.5, HAND) }, o);
  // на четвереньках (голова слева)
  const QUAD = (o) => P({ p: [60, 69.6], t: 76, n: -12, lk: [0, -90], lb: [1.5, -90], ak: [0, 0], ab: [1.5, 1.5] }, o);
  // лёжа на спине (голова слева, лицом вверх), колени согнуты
  const BACK = (o) => P({ p: [54, 87.4], t: -90, n: 12, lk: T(72, G), lb: T(71, G), ak: [90, 90], ab: [90, 91] }, o);

  const POSES = {
    'jumping-jacks': { ms: 420, view: 'front', vb: '0 -1 100 100', frames: [
      { p: [50], on: 'lk', lk: [3, 1], lb: [3, 1], ak: [9, 4], ab: [9, 4] },
      { p: [50], on: 'lk', lk: [17, 14], lb: [17, 14], ak: [160, 166], ab: [160, 166] }] },
    'squats': { ms: 850, frames: [
      P(STAND, { foot: ['lk', 50], t: 3, ak: [88, 90], ab: [86, 88] }),
      { foot: ['lk', 50], t: 42, n: -30, lk: [80, -26], lb: [81, -25], ak: [86, 88], ab: [84, 86] }] },
    'pushups': { ms: 800, look: -1, frames: [HIGH(80, 70), HIGH(80, 84, { n: -4 })] },
    'lunges': { ms: 900, frames: [
      P(STAND, HIPS, { p: [46], on: 'lk' }),
      P(HIPS, { foot: ['lk', 64], t: 2, n: -2, lk: [88, 0], lb: T(28, 86) }),
      P(STAND, HIPS, { p: [46], on: 'lk' }),
      P(HIPS, { foot: ['lb', 64], t: 2, n: -2, lb: [88, 0], lk: T(28, 86) })] },
    'plank': { ms: 1500, look: -1, frames: [
      { foot: ['lk', 86, TOE], t: 81, n: -6, lk: R(0, 0), lb: R(0, 0), ak: [0, 90], ab: [2, 91] },
      { foot: ['lk', 86, TOE], t: 80, n: -3, lk: R(0, 0), lb: R(0, 0), ak: [0, 90], ab: [2, 91] }] },
    'glute-bridge': { ms: 950, frames: [
      BACK({ ak: T(54, 90), ab: T(55, 90.5) }),
      BACK({ p: [50.5, 74.5], t: -120.5, n: 42, ak: T(54, 90), ab: T(55, 90.5) })] },
    'mountain': { ms: 340, look: -1, frames: [
      HIGH(82, 70, { foot: null, p: [47, 71.8], lk: [66, -74], lb: T(82, TOE) }),
      HIGH(82, 70, { foot: null, p: [47, 71.8], lb: [66, -74], lk: T(82, TOE) })] },
    'burpees': { ms: 560, vb: '0 -4 102 102', frames: [
      P(STAND, { foot: ['lk', 60] }),
      { foot: ['lk', 62], t: 55, n: -30, lk: [95, -40], lb: [96, -40], ak: T(77, HAND), ab: T(79, HAND) },
      { foot: ['lk', 22, TOE], t: 70, n: -8, lk: R(0, 0), lb: R(0, 0), ak: T(77, HAND), ab: T(79, HAND) },
      { foot: ['lk', 62], t: 55, n: -30, lk: [95, -40], lb: [96, -40], ak: T(77, HAND), ab: T(79, HAND) },
      { p: [60, 47], t: 0, n: -8, lk: [0, -6], lb: [2, -5], ak: [158, 162], ab: [155, 160] }] },
    'high-knees': { ms: 300, frames: [
      { p: [50], on: 'lb', t: -2, n: 0, lb: [-6, -3], lk: [88, -2], ak: [-40, 35], ab: [45, 125] },
      { p: [50], on: 'lk', t: -2, n: 0, lk: [-6, -3], lb: [88, -2], ab: [-40, 35], ak: [45, 125] }] },
    'crunches': { ms: 850, frames: [
      BACK({ ak: [100, 100], ab: [100, 101] }),
      BACK({ t: -64, n: 22, ak: [100, 100], ab: [100, 101] })] },
    'side-plank': { ms: 1500, view: 'front', frames: [
      { foot: ['lk', 86, 86.5], t: -73, n: 0, lk: R(0, 0), lb: R(0, 0), ak: [73, 163], ab: [107, 107] },
      { foot: ['lk', 86, 86.5], t: -76, n: 0, lk: R(0, 0), lb: R(0, 0), ak: [76, 166], ab: [104, 104] }] },
    'superman': { ms: 1000, look: -1, vb: '0 4 102 102', frames: [
      { p: [56, 87.6], t: 90, n: -4, lk: R(0, 0), lb: R(0, 1), ak: [90, 90], ab: [91, 91] },
      { p: [56, 87.6], t: 80, n: -12, lk: [-102, -102], lb: [-101, -101], ak: [102, 102], ab: [103, 103] }] },
    'wall-sit': { ms: 1500, prop: 'wall', frames: [
      { foot: ['lk', 57], t: 0, n: 0, lk: [90, 0], lb: [91, 1], ak: [30, 88], ab: [28, 86] },
      { foot: ['lk', 57], t: 1, n: 3, lk: [90, 0], lb: [91, 1], ak: [30, 88], ab: [28, 86] }] },
    'tricep-dips': { ms: 900, prop: 'bench', frames: [
      { p: [41, 67], t: 0, n: 0, lk: T(72, G), lb: T(70, G), ak: T(37, BENCH), ab: T(35, BENCH) },
      { p: [43, 77], t: -4, n: 4, lk: T(72, G), lb: T(70, G), ak: T(37, BENCH), ab: T(35, BENCH) }] },
    'leg-raises': { ms: 1100, toe: 'up', frames: [
      BACK({ p: [46, 87.4], lk: [97, 97], lb: [96, 96] }),
      BACK({ p: [46, 87.4], lk: [178, 178], lb: [177, 177] })] },
    'jump-squats': { ms: 560, vb: '0 -6 104 104', frames: [
      { foot: ['lk', 50], t: 40, n: -28, lk: [78, -24], lb: [79, -23], ak: [-35, -20], ab: [-33, -18] },
      { p: [50, 46.5], t: 0, n: -6, lk: [0, -8], lb: [2, -6], ak: [160, 165], ab: [158, 163] }] },
    'skater': { ms: 560, view: 'front', frames: [
      { p: [42], on: 'lk', t: -10, n: 4, lk: [8, -6], lb: [-30, 40], ak: [35, 15], ab: [-15, -35] },
      { p: [58], on: 'lb', t: 10, n: -4, lb: [8, -6], lk: [-30, 40], ab: [35, 15], ak: [-15, -35] }] },
    'bird-dog': { ms: 1100, look: -1, vb: '-2 2 104 104', frames: [QUAD({ p: [56, 69.6] }), QUAD({ p: [56, 69.6], ak: [94, 94], lb: [-92, -92] })] },
    'cat-cow': { ms: 1400, look: -1, frames: [QUAD({ c: 4.5, n: 28 }), QUAD({ c: -4, n: -32 })] },
    'child-pose': { ms: 1700, look: -1, frames: [
      { p: [62, 80], t: 100, n: 12, lk: [63, -90], lb: [64, -90], ak: [80, 88], ab: [81, 89] },
      { p: [62, 79.4], t: 98, n: 10, lk: [63, -90], lb: [64, -90], ak: [80, 88], ab: [81, 89] }] },
    'hamstring-stretch': { ms: 1400, toe: 'up', frames: [
      { p: [28, 86.8], t: 4, n: 0, lk: [90, 90], lb: T(52, 88, 'up'), ak: [72, 82], ab: [70, 80] },
      { p: [28, 86.8], t: 52, n: 16, lk: [90, 90], lb: T(52, 88, 'up'), ak: [96, 96], ab: [94, 95] }] },
    'hip-flexor': { ms: 1400, look: -1, frames: [
      { p: [54, 70.6], t: 0, n: 0, lk: T(35, G), lb: [-14, -90], ak: T(37, 68), ab: T(39, 69) },
      { p: [50, 72.2], t: -5, n: -3, lk: T(35, G), lb: [-27, -90], ak: T(37, 68), ab: T(39, 69) }] },
    'chest-opener': { ms: 1400, frames: [
      P(STAND, { p: [50], on: 'lk', ak: [-12, -8], ab: [-10, -6] }),
      P(STAND, { p: [50], on: 'lk', t: -4, n: -8, ak: [-42, -40], ab: [-40, -38] })] },
    'calf-raises': { ms: 800, frames: [
      P(STAND, HIPS, { p: [50], on: 'lk' }),
      P(STAND, HIPS, { p: [50, 47.3] })] },

    'march': { ms: 560, frames: [
      { p: [50], on: 'lb', t: 0, n: 0, lb: [-3, -2], lk: [58, -12], ak: [-28, 20], ab: [32, 95] },
      { p: [50], on: 'lk', t: 0, n: 0, lk: [-3, -2], lb: [58, -12], ab: [-28, 20], ak: [32, 95] }] },
    'butt-kicks': { ms: 320, frames: [
      { p: [50], on: 'lb', t: 4, n: -2, lb: [-2, -4], lk: [-8, -158], ak: [35, 110], ab: [-35, 15] },
      { p: [50], on: 'lk', t: 4, n: -2, lk: [-2, -4], lb: [-8, -158], ab: [35, 110], ak: [-35, 15] }] },
    'sumo-squat': { ms: 950, view: 'front', frames: [
      { p: [50], on: 'lk', lk: [14, 9], lb: [14, 9], ak: [14, -140], ab: [14, -140] },
      { p: [50], on: 'lk', n: 0, lk: [62, 6], lb: [62, 6], ak: [18, -130], ab: [18, -130] }] },
    'reverse-lunge': { ms: 950, frames: [
      P(STAND, HIPS, { foot: ['lk', 60] }),
      P(HIPS, { foot: ['lk', 60], t: 3, n: -2, lk: [86, 0], lb: T(20, 86) })] },
    'side-lunge': { ms: 1000, view: 'front', frames: [
      { p: [50], on: 'lk', lk: [4, 1], lb: [4, 1], ak: [14, -140], ab: [14, -140] },
      { p: [44], on: 'lk', t: -4, lk: [36, 0], lb: [26, 26], ak: [14, -140], ab: [14, -140] },
      { p: [50], on: 'lk', lk: [4, 1], lb: [4, 1], ak: [14, -140], ab: [14, -140] },
      { p: [56], on: 'lb', t: 4, lb: [36, 0], lk: [26, 26], ak: [14, -140], ab: [14, -140] }] },
    'step-ups': { ms: 900, prop: 'step', vb: '2 0 96 96', frames: [
      P(STAND, { p: [44], on: 'lb', t: 7, lk: T(63, 78.4), ak: [30, 60], ab: [-25, 10] }),
      P(STAND, { p: [63.4, 41.4], t: 2, lk: T(63, 78.4), lb: [25, -20], ak: [-20, 10], ab: [20, 45] })] },
    'single-leg-bridge': { ms: 950, frames: [
      BACK({ lb: [128, 128], ak: T(54, 90), ab: T(55, 90.5) }),
      BACK({ p: [50.5, 74.5], t: -120.5, n: 42, lb: [112, 112], ak: T(54, 90), ab: T(55, 90.5) })] },
    'donkey-kicks': { ms: 800, look: -1, frames: [QUAD(), QUAD({ lk: [-98, -182] })] },
    'incline-pushups': { ms: 850, look: -1, prop: 'bench', frames: [
      { foot: ['lk', 90, TOE], t: 52, n: -8, lk: R(0, 0), lb: R(0, 0), ak: T(29, BENCH), ab: T(31, BENCH) },
      { foot: ['lk', 90, TOE], t: 63, n: -6, lk: R(0, 0), lb: R(0, 0), ak: T(29, BENCH), ab: T(31, BENCH) }] },
    'knee-pushups': { ms: 800, look: -1, frames: [
      { p: [44.9, 77.6], t: 54.4, n: -8, lk: [-54.4, -150], lb: [-54.4, -148], ak: T(25, HAND), ab: T(27.5, HAND) },
      { p: [41.8, 84.7], t: 78.6, n: -4, lk: [-78.6, -150], lb: [-78.6, -148], ak: T(25, HAND), ab: T(27.5, HAND) }] },
    'pike-pushups': { ms: 900, look: -1, frames: [
      { p: [55, 53], t: 116, n: 10, lk: T(66, G), lb: T(68, G), ak: T(31, HAND), ab: T(33, HAND) },
      { p: [56, 55], t: 135, n: 18, lk: T(66, G), lb: T(68, G), ak: T(31, HAND), ab: T(33, HAND) }] },
    'plank-shoulder-tap': { ms: 650, look: -1, frames: [
      HIGH(80, 70), HIGH(80, 70, { ak: T(26, 67, 'up') }), HIGH(80, 70), HIGH(80, 70, { ab: T(28, 67, 'up') })] },
    'dead-bug': { ms: 1100, toe: 'up', frames: [
      BACK({ ak: [180, 180], ab: [178, 178], lk: [180, 90], lb: [178, 92] }),
      BACK({ ak: [-100, -100], ab: [178, 178], lk: [180, 90], lb: [95, 95] })] },
    'bicycle-crunch': { ms: 650, toe: 'up', frames: [
      BACK({ t: -68, n: 22, ak: T(22, 75, 'up'), ab: T(23, 76, 'up'), lk: [-150, 70], lb: [95, 95] }),
      BACK({ t: -68, n: 22, ak: T(22, 75, 'up'), ab: T(23, 76, 'up'), lb: [-150, 70], lk: [95, 95] })] },
    'russian-twist': { ms: 750, frames: [
      { p: [50, 86.8], t: -35, n: 10, lk: T(70, 82, 'up'), lb: T(71, 83, 'up'), ak: T(60, 87), ab: T(62, 87.5) },
      { p: [50, 86.8], t: -35, n: 10, lk: T(70, 82, 'up'), lb: T(71, 83, 'up'), ak: [72, 100], ab: [70, 98] }] },
    'flutter-kicks': { ms: 380, toe: 'up', frames: [
      BACK({ p: [46, 87.4], lk: [108, 108], lb: [96, 96] }),
      BACK({ p: [46, 87.4], lk: [96, 96], lb: [108, 108] })] },
    'jump-rope': { ms: 340, view: 'front', frames: [
      { p: [50], on: 'lk', lk: [3, 0], lb: [3, 0], ak: [14, 55], ab: [14, 55] },
      { p: [50, 47.5], lk: [3, -2], lb: [3, -2], ak: [14, 62], ab: [14, 62] }] },
    'inchworm': { ms: 950, look: -1, frames: [
      { foot: ['lk', 80], t: 160, n: 10, lk: [0, 0], lb: [1, 1], ak: T(68, HAND), ab: T(70, HAND) },
      { p: [76, 56], t: 128, n: 4, lk: T(80, G), lb: T(81, G), ak: T(46, HAND), ab: T(48, HAND) },
      HIGH(80, 70),
      { p: [76, 56], t: 128, n: 4, lk: T(80, G), lb: T(81, G), ak: T(46, HAND), ab: T(48, HAND) }] },
    'cobra': { ms: 1500, look: -1, frames: [
      { p: [58, 87.6], t: 90, n: -4, lk: [-90, -90], lb: [-90, -89], ak: T(33, HAND, 'up'), ab: T(35, HAND, 'up') },
      { p: [58, 87.6], t: 50, n: -16, c: -4, lk: [-90, -90], lb: [-90, -89], ak: T(36, HAND, 'up'), ab: T(38, HAND, 'up') }] },
    'quad-stretch': { ms: 1600, frames: [
      { p: [50], on: 'lb', t: 2, n: 0, lb: [0, 0], lk: [-6, -170], ak: T(44, 55), ab: [80, 85] },
      { p: [50], on: 'lb', t: 3, n: 0, lb: [0, 0], lk: [-11, -172], ak: T(43, 54), ab: [82, 87] }] },
    'arm-circles': { ms: 280, view: 'front', frames: [
      { p: [50], on: 'lk', lk: [4, 1], lb: [4, 1], ak: [82, 82], ab: [82, 82] },
      { p: [50], on: 'lk', lk: [4, 1], lb: [4, 1], ak: [90, 100], ab: [90, 100] },
      { p: [50], on: 'lk', lk: [4, 1], lb: [4, 1], ak: [98, 98], ab: [98, 98] },
      { p: [50], on: 'lk', lk: [4, 1], lb: [4, 1], ak: [90, 80], ab: [90, 80] }] },
    'good-morning': { ms: 1100, frames: [
      { foot: ['lk', 52], t: 0, n: 0, lk: [5, -3], lb: [6, -2], ak: R(150, 290), ab: R(148, 288) },
      { foot: ['lk', 52], t: 78, n: -20, lk: [16, -4], lb: [17, -3], ak: R(150, 290), ab: R(148, 288) }] }
  };

  // =========================================================
  //  Скелет
  // =========================================================
  const LIMBS = { ak: ['up', 'fore', 'arm'], ab: ['up', 'fore', 'arm'], lk: ['thigh', 'shin', 'leg'], lb: ['thigh', 'shin', 'leg'] };
  const RAD = Math.PI / 180;
  const add = (a, b) => [a[0] + b[0], a[1] + b[1]], sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
  const mul = (a, k) => [a[0] * k, a[1] * k], len = a => Math.hypot(a[0], a[1]);
  const norm = v => { const l = len(v) || 1; return [v[0] / l, v[1] / l]; };
  const dot2 = (a, b) => a[0] * b[0] + a[1] * b[1];
  const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const lerpA = (a, b, t) => { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return a + d * t; };

  // оси тела: u — от таза к плечам, fw — куда смотрит грудь, sd — сторона ближних (k) рук и ног (вид спереди)
  function axes(t, look, front) {
    if (front) { const u = [Math.sin(t), -Math.cos(t)]; return { u, d: mul(u, -1), fw: [0, 0], sd: [u[1], -u[0]] }; }
    const u = [look * Math.sin(t), -Math.cos(t)];
    return { u, d: mul(u, -1), fw: [look * Math.cos(t), Math.sin(t)] };
  }
  const outOf = (A, k) => k[1] === 'k' ? A.sd : mul(A.sd, -1);
  function bases(p, A, front) {
    const n = add(p, mul(A.u, L.torso));
    if (!front) return { n, ak: n, ab: n, lk: p, lb: p };
    return { n, ak: add(n, mul(A.sd, SH)), ab: add(n, mul(A.sd, -SH)), lk: add(p, mul(A.sd, HP)), lb: add(p, mul(A.sd, -HP)) };
  }
  // направление кости по углу относительно корпуса
  const vec = (A, k, a, front) => add(mul(A.d, Math.cos(a)), mul(front ? outOf(A, k) : A.fw, Math.sin(a)));
  const angOf = (A, k, v, front) => Math.atan2(dot2(v, front ? outOf(A, k) : A.fw), dot2(v, A.d));
  // две кости от B к цели T; сгиб — в сторону pref (колени вперёд, локти назад)
  function ik(B, T, l1, l2, pref) {
    const v = sub(T, B), a0 = Math.atan2(v[1], v[0]);
    const d = Math.max(Math.abs(l1 - l2) + 0.05, Math.min(l1 + l2 - 0.02, len(v)));
    const c = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d))));
    const e = add(B, mul([Math.cos(a0), Math.sin(a0)], d)), mid = lerp(B, e, 0.5);
    const m1 = add(B, mul([Math.cos(a0 + c), Math.sin(a0 + c)], l1)), m2 = add(B, mul([Math.cos(a0 - c), Math.sin(a0 - c)], l1));
    return { m: dot2(sub(m1, mid), pref) >= dot2(sub(m2, mid), pref) ? m1 : m2, e };
  }
  function prefOf(A, k, bend, front) {
    const kind = LIMBS[k][2];
    let p = front ? outOf(A, k) : (kind === 'leg' ? A.fw : mul(A.fw, -1));
    if (bend === 'up') p = [0, -1]; else if (bend === 'down') p = [0, 1];
    else if (bend === 'fw') p = A.fw; else if (bend === 'back') p = mul(A.fw, -1); else if (bend === -1) p = mul(p, -1);
    return p;
  }
  // опора под кистью/стопой: пол, край стула, ступенька
  const onSupport = (pt, meta) => pt[1] >= G - 1 || (meta.prop === 'bench' && Math.abs(pt[1] - BENCH) < 1.5) || (meta.prop === 'step' && Math.abs(pt[1] - 78.4) < 1.5);

  // ключевая поза -> параметры скелета (углы в радианах относительно корпуса)
  function resolve(F, meta) {
    const front = meta.view === 'front', look = meta.look || 1;
    const t = (F.t || 0) * RAD, A = axes(t, look, front);
    const limbs = {};
    for (const k in LIMBS) {
      const s = F[k] || [0, 0];
      if (Array.isArray(s)) limbs[k] = { a1: s[0] * RAD + (front ? 0 : t), a2: s[1] * RAD + (front ? 0 : t) };
      else if (s.r) limbs[k] = { a1: s.r[0] * RAD, a2: s.r[1] * RAD };
      else limbs[k] = { to: s.to, bend: s.bend };
    }
    const endFrom = (p, k) => { const B = bases(p, A, front)[k], x = limbs[k], [l1, l2] = LIMBS[k];
      return add(add(B, mul(vec(A, k, x.a1, front), L[l1])), mul(vec(A, k, x.a2, front), L[l2])); };
    let p, anchor = null;
    if (F.foot) { const [k, x, y] = F.foot, e = endFrom([0, 0], k); p = sub([x, y == null ? G : y], e); anchor = { k, pt: [x, y == null ? G : y] }; }
    else if (F.p && F.p[1] == null) { const on = Array.isArray(F.on) ? F.on : [F.on || 'lk', G]; p = [F.p[0], on[1] - endFrom([F.p[0], 0], on[0])[1]]; }
    else p = F.p.slice();
    const B = bases(p, A, front);
    for (const k in limbs) {
      const x = limbs[k]; if (!x.to) continue;
      const [l1, l2] = LIMBS[k], j = ik(B[k], x.to, L[l1], L[l2], prefOf(A, k, x.bend, front));
      x.a1 = angOf(A, k, sub(j.m, B[k]), front); x.a2 = angOf(A, k, sub(j.e, j.m), front);
      x.pl = onSupport(x.to, meta);
    }
    return { p, t, n: (F.n || 0) * RAD, c: F.c || 0, anchor, limbs };
  }
  function mix(X, Y, s) {
    const o = { p: lerp(X.p, Y.p, s), t: lerpA(X.t, Y.t, s), n: lerpA(X.n, Y.n, s), c: X.c + (Y.c - X.c) * s, limbs: {}, anchor: null };
    if (X.anchor && Y.anchor && X.anchor.k === Y.anchor.k) o.anchor = { k: X.anchor.k, pt: lerp(X.anchor.pt, Y.anchor.pt, s) };
    for (const k in X.limbs) {
      const a = X.limbs[k], b = Y.limbs[k];
      const keep = a.to && b.to && len(sub(a.to, b.to)) < 3;
      o.limbs[k] = { a1: lerpA(a.a1, b.a1, s), a2: lerpA(a.a2, b.a2, s), to: keep ? lerp(a.to, b.to, s) : null, bend: a.bend, pl: keep ? a.pl : (s < 0.5 ? a.pl : b.pl) };
    }
    return o;
  }
  // параметры -> точки суставов
  function joints(S, meta) {
    const front = meta.view === 'front', look = meta.look || 1, A = axes(S.t, look, front);
    const fk = (B, k, x) => { const [l1, l2] = LIMBS[k], m = add(B, mul(vec(A, k, x.a1, front), L[l1])); return { m, e: add(m, mul(vec(A, k, x.a2, front), L[l2])) }; };
    let p = S.p;
    if (S.anchor) p = sub(S.anchor.pt, fk(bases([0, 0], A, front)[S.anchor.k], S.anchor.k, S.limbs[S.anchor.k]).e);
    const B = bases(p, A, front), limbs = {};
    for (const k in LIMBS) {
      const x = S.limbs[k], [l1, l2] = LIMBS[k];
      const j = x.to ? ik(B[k], x.to, L[l1], L[l2], prefOf(A, k, x.bend, front)) : fk(B[k], k, x);
      limbs[k] = { b: B[k], m: j.m, e: j.e, pl: !!x.pl || j.e[1] >= G - 0.8 };
    }
    // ничего не проваливается под пол
    let pen = 0;
    for (const k in limbs) pen = Math.max(pen, limbs[k].e[1] - (k[0] === 'l' ? G + 0.4 : HAND + 0.6), limbs[k].m[1] - (G + 0.5));
    const dy = pen > 0 ? -pen : 0;
    const sh = q => [q[0], q[1] + dy];
    for (const k in limbs) { const o = limbs[k]; o.b = sh(o.b); o.m = sh(o.m); o.e = sh(o.e); }
    const n = sh(B.n), hu = norm(add(mul(A.u, Math.cos(S.n)), mul(front ? [0, 0] : A.fw, Math.sin(S.n))));
    const hf = front ? [0, 0] : (look < 0 ? [hu[1], -hu[0]] : [-hu[1], hu[0]]);
    return { p: sh(p), n, A, front, look, limbs, bend: mul(front ? A.sd : A.fw, -S.c), hu, hf,
      neckTop: add(n, mul(hu, L.neck)), hc: add(n, mul(hu, L.neck + L.head)) };
  }

  // =========================================================
  //  Рисование
  // =========================================================
  const COL = { skin: '#f0bf98', skinB: '#d8a27c', skinD: '#b97f5a', shirt: '#0a7fdc', shirtB: '#0866b8', shorts: '#24324f', shortsB: '#1a2540', shoe: '#c6dc3e', shoeB: '#a5b92e', sole: '#f4f7ea', hair: '#33241b', eye: '#1b1b1f' };
  const f1 = v => (Math.round(v * 10) / 10).toString();
  const P2 = a => f1(a[0]) + ' ' + f1(a[1]);
  // сужающаяся «капсула» — мышца между двумя суставами
  function cap(a, b, ra, rb, fill) {
    const d = sub(b, a), l = len(d) || 0.01, u = [d[0] / l, d[1] / l], n = [-u[1], u[0]];
    return ['path', { d: `M${P2(add(a, mul(n, ra)))}L${P2(add(b, mul(n, rb)))}A${f1(rb)} ${f1(rb)} 0 0 0 ${P2(sub(b, mul(n, rb)))}L${P2(sub(a, mul(n, ra)))}A${f1(ra)} ${f1(ra)} 0 0 0 ${P2(add(a, mul(n, ra)))}Z`, fill }];
  }
  // плавный замкнутый контур (корпус, шорты)
  function blob(pts, fill) {
    const n = pts.length; let d = `M${P2(pts[0])}`;
    for (let i = 0; i < n; i++) {
      const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
      d += `C${P2(add(p1, mul(sub(p2, p0), 1 / 6)))} ${P2(sub(p2, mul(sub(p3, p1), 1 / 6)))} ${P2(p2)}`;
    }
    return ['path', { d: d + 'Z', fill }];
  }
  const circ = (c, r, fill) => ['circle', { cx: f1(c[0]), cy: f1(c[1]), r: f1(r), fill }];

  function leg(J, k, far, meta) {
    const o = J.limbs[k], hip = o.b, knee = o.m, ank = o.e;
    const sk = far ? COL.skinB : COL.skin, sh = far ? COL.shortsB : COL.shorts, so = far ? COL.shoeB : COL.shoe;
    const v = norm(sub(ank, knee)), fwd = J.front ? outOf(J.A, k) : [J.look, 0];
    const perp = want => { const t1 = [-v[1], v[0]]; return dot2(t1, want) >= 0 ? t1 : mul(t1, -1); };
    let toe;
    if (J.front) toe = Math.abs(v[1]) > 0.5 ? fwd : [0, -1];
    else if (o.pl && Math.abs(v[1]) > 0.55) toe = fwd;                                          // стоит на полу — стопа ровно
    else if (meta.toe === 'up') toe = perp([0, -1]);                                            // лёжа/сидя с прямыми ногами — носки на себя
    else if (ank[1] >= G - 2.5 && Math.abs(v[1]) < 0.5) toe = v;                                 // голень на полу — стопа вытянута назад
    else if (v[1] < -0.3) toe = v;                                                               // голень вверх (захлёст, мах назад) — носок тянется
    else if (ank[1] > G - 8 && Math.abs(v[1]) > 0.55) {                                          // на носочках
      const ty = Math.max(0, Math.min(0.95, (G + 0.9 - ank[1]) / 6.6)); toe = [fwd[0] * Math.sqrt(1 - ty * ty), ty];
    } else if (ank[1] > G - 8) toe = norm(add(perp([0, 1]), mul(fwd, 0.55)));                    // у пола (упор, выпад) — на подушечках
    else toe = perp(J.A.fw);
    toe = norm(toe);
    const fl = J.front ? 3.4 : 6.6, heel = sub(ank, mul(toe, J.front ? 1.2 : 2)), tip = add(ank, mul(toe, fl));
    const calf = J.front ? [0, 0] : mul(toe, -0.8), down = mul(norm(sub(ank, knee)), 1.6);
    return [
      cap(hip, knee, 5.4, 3.7, sk),
      cap(knee, ank, 3.5, 2.1, sk),
      cap(add(lerp(knee, ank, 0.1), calf), add(lerp(knee, ank, 0.55), mul(calf, 0.4)), 3.6, 2.5, sk),
      cap(hip, lerp(hip, knee, 0.5), 6.1, 5, sh),
      cap(heel, tip, 2.7, 2.1, so),
      cap(add(heel, down), add(tip, mul(down, 0.9)), 1.05, 0.85, COL.sole)
    ];
  }
  function arm(J, k, far) {
    const o = J.limbs[k], sh = o.b, el = o.m, wr = o.e;
    const sk = far ? COL.skinB : COL.skin, sl = far ? COL.shirtB : COL.shirt;
    let hd = norm(sub(wr, el));
    if (o.pl && !J.front) hd = [J.look, 0];                                    // ладонь лежит на опоре
    return [
      cap(sh, el, 3.4, 2.5, sk),
      cap(el, wr, 2.5, 1.8, sk),
      cap(sh, lerp(sh, el, 0.45), 4.2, 3.6, sl),
      cap(wr, add(wr, mul(hd, 3.1)), 2.05, 1.7, far ? COL.skinD : COL.skinB)
    ];
  }
  // корпус: точки (вдоль позвоночника, поперёк) -> экран, с изгибом спины
  function body(J, pts) {
    const ax = J.front ? J.A.sd : J.A.fw;
    return pts.map(([a, f]) => add(add(add(J.p, mul(J.A.u, a)), mul(ax, f)), mul(J.bend, Math.sin(Math.PI * Math.max(0, Math.min(1, a / L.torso))))));
  }
  const SHIRT_SIDE = [[25, -3.2], [21, -4.5], [12, -3.7], [4, -4.6], [3.2, 4.3], [10, 3.7], [17, 5.2], [22.5, 4.1], [25.2, 1.4]];
  const SHORTS_SIDE = [[5.5, -4.9], [5.5, 4.4], [-1.6, 5.1], [-5.2, 2.2], [-5, -3.4], [-1.8, -6.4]];
  const SHIRT_FRONT = [[25.4, -3.6], [24.4, -7.8], [19, -7], [11, -5.4], [4, -6.4], [4, 6.4], [11, 5.4], [19, 7], [24.4, 7.8], [25.4, 3.6]];
  const SHORTS_FRONT = [[5.5, -6.3], [5.5, 6.3], [-1.5, 7.3], [-6.4, 6.8], [-5.2, 0.9], [-5.2, -0.9], [-6.4, -6.8], [-1.5, -7.3]];

  function head(J) {
    const c = J.hc, hu = J.hu, side = J.front ? J.A.sd : J.hf;
    const at = (a, f) => add(add(c, mul(hu, a)), mul(side, f));
    const neck = cap(add(J.n, mul(hu, -1.5)), J.neckTop, 2.6, 2.3, COL.skinB);
    if (J.front) return [neck,
      circ(at(0.9, 0), 5.5, COL.hair), circ(at(-0.7, 4.9), 1.3, COL.skinB), circ(at(-0.7, -4.9), 1.3, COL.skinB),
      circ(at(-0.4, 0), 4.9, COL.skin), circ(at(-2.4, 0), 3.4, COL.skin), circ(at(4.2, 0), 2.6, COL.hair),
      circ(at(0.2, 1.9), 0.75, COL.eye), circ(at(0.2, -1.9), 0.75, COL.eye),
      ['path', { d: `M${P2(at(-2.7, -1.3))}Q${P2(at(-3.5, 0))} ${P2(at(-2.7, 1.3))}`, fill: 'none', stroke: COL.skinD, 'stroke-width': '0.6', 'stroke-linecap': 'round' }]];
    return [neck,
      circ(at(0.7, -0.9), 5.3, COL.hair),
      circ(at(-0.3, 0.6), 4.8, COL.skin), circ(at(-2.7, 2.2), 2.7, COL.skin), circ(at(-0.4, 4.9), 1.05, COL.skin),
      circ(at(3.2, 1.6), 3.1, COL.hair), circ(at(-0.4, -0.7), 1.3, COL.skinB), circ(at(0.6, 3), 0.75, COL.eye),
      ['path', { d: `M${P2(at(-2.4, 2.4))}Q${P2(at(-3, 3.3))} ${P2(at(-2.5, 4))}`, fill: 'none', stroke: COL.skinD, 'stroke-width': '0.55', 'stroke-linecap': 'round' }]];
  }
  const PROPS = {
    wall: [['rect', { x: 27, y: 14, width: 6, height: 78, rx: 2, class: 'jf-prop' }]],
    bench: [['rect', { x: 12, y: 70, width: 28, height: 5, rx: 2.5, class: 'jf-prop' }], ['rect', { x: 15, y: 73, width: 4, height: 19, rx: 1, class: 'jf-prop' }], ['rect', { x: 33, y: 73, width: 4, height: 19, rx: 1, class: 'jf-prop' }]],
    step: [['rect', { x: 52, y: 80.6, width: 36, height: 11.4, rx: 3, class: 'jf-prop' }]]
  };
  function shapes(J, meta) {
    const xs = ['lk', 'lb', 'ak', 'ab'].map(k => J.limbs[k].e[0]).concat([J.p[0], J.hc[0], J.n[0]]);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2, w = Math.max(13, (Math.max(...xs) - Math.min(...xs)) / 2 + 5);
    const out = (PROPS[meta.prop] || []).slice();
    out.push(['ellipse', { cx: f1(cx), cy: f1(G + 3.4), rx: f1(w), ry: '2.4', class: 'jf-shadow' }]);
    const shirt = blob(body(J, J.front ? SHIRT_FRONT : SHIRT_SIDE), COL.shirt);
    const shorts = blob(body(J, J.front ? SHORTS_FRONT : SHORTS_SIDE), COL.shorts);
    if (J.front) {
      const up = J.limbs.lb.e[1] - J.limbs.lk.e[1];                     // какая нога поднята — та дальше от нас
      const legs = up < -2 ? [leg(J, 'lb', false, meta), leg(J, 'lk', true, meta)] : up > 2 ? [leg(J, 'lk', true, meta), leg(J, 'lb', false, meta)] : [leg(J, 'lk', false, meta), leg(J, 'lb', false, meta)];
      out.push(...legs[0], ...legs[1], ...head(J), shirt, shorts, ...arm(J, 'ak', false), ...arm(J, 'ab', false));
    }
    else out.push(...arm(J, 'ab', true), ...leg(J, 'lb', true, meta), ...head(J), shirt, shorts, ...leg(J, 'lk', false, meta), ...arm(J, 'ak', false));
    return out;
  }
  const attrs = a => Object.keys(a).map(k => `${k}="${a[k]}"`).join(' ');
  const toStr = list => list.map(([t, a]) => `<${t} ${attrs(a)}/>`).join('');
  const svg = (inner, cls, vb) => `<svg class="jf-anim ${cls || ''}" viewBox="${vb || '4 6 92 92'}" aria-hidden="true">${inner}</svg>`;

  const cache = {};
  const keys = id => cache[id] || (cache[id] = POSES[id].frames.map(F => resolve(F, POSES[id])));
  // плавность: у двух поз — мягкий разворот в крайних точках; у серии поз — без остановок в каждой
  const easeK = (x, k) => x - k * Math.sin(2 * Math.PI * x) / (2 * Math.PI);
  function poseAt(id, ms) {
    const a = POSES[id], K = keys(id), n = K.length;
    const x = ms / a.ms, i = Math.floor(x) % n;
    return joints(mix(K[i], K[(i + 1) % n], easeK(x % 1, n > 2 ? 0.6 : 1)), a);
  }
  // Статичная картинка — для списков
  function still(id, cls) {
    const a = POSES[id]; if (!a) return '';
    const K = keys(id);
    return svg(toStr(shapes(joints(K[K.length > 2 ? 1 : K.length - 1], a), a)), cls, a.vb);
  }
  // Живая анимация внутри el. Элементы создаются один раз, дальше меняются только координаты.
  function play(el, id) {
    const a = POSES[id]; if (!el || !a) return () => {};
    const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { el.innerHTML = still(id, 'live'); return () => {}; }
    el.innerHTML = svg('', 'live', a.vb);
    const s = el.firstElementChild, NS = 'http://www.w3.org/2000/svg';
    let nodes = null, raf, stopped = false;
    const start = performance.now();
    function frame(now) {
      if (stopped || !el.isConnected) return;
      const list = shapes(poseAt(id, Math.max(0, now - start)), a);
      if (!nodes || nodes.length !== list.length) { s.textContent = ''; nodes = list.map(([t]) => s.appendChild(document.createElementNS(NS, t))); }
      for (let i = 0; i < list.length; i++) { const at = list[i][1], nd = nodes[i]; for (const k in at) if (nd.getAttribute(k) !== String(at[k])) nd.setAttribute(k, at[k]); }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return () => { stopped = true; cancelAnimationFrame(raf); };
  }

  window.JF_ANIM = { still, play, has: id => !!POSES[id], _poses: POSES, _frame: (id, ms) => svg(toStr(shapes(poseAt(id, ms), POSES[id])), '', POSES[id].vb) };
})();
