// JOL Fitness — анимации упражнений: живой человечек (футболка, шорты, кроссовки, лицо),
// который показывает движение. Для каждого упражнения заданы 2–4 позы (координаты суставов
// в квадрате 100×100), между ними фигурка плавно двигается по кругу. Работает без интернета.
//
// Суставы: h — голова, n — плечи, p — таз, s — середина спины (необязательно, для изгиба),
// ek/hk — локоть/кисть ближней руки, eb/hb — дальней; kk/fk — колено/стопа ближней ноги, kb/fb — дальней.
// Настройки упражнения: look: -1 — смотрит влево (голова слева, лицом вниз в упоре),
// view: 'front' — вид спереди, toe: 'up' — носки вверх (сидя/лёжа с прямыми ногами), prop — опора.
(function () {
  const G = 89; // уровень пола
  // ---------- базовые позы ----------
  const STAND = { h: [50, 17], n: [50, 27], p: [50, 52], ek: [53, 40], hk: [55, 52], eb: [47, 40], hb: [45, 52], kk: [52, 70], fk: [53, G], kb: [48, 70], fb: [47, G] };
  const FRONT = { h: [50, 17], n: [50, 27], p: [50, 52], ek: [43, 39], hk: [41, 51], eb: [57, 39], hb: [59, 51], kk: [46, 70], fk: [45, G], kb: [54, 70], fb: [55, G] };
  const P = (base, over) => Object.assign({}, base, over);
  const shift = (pose, dx, dy) => { const o = {}; for (const k in pose) o[k] = [pose[k][0] + dx, pose[k][1] + dy]; return o; };
  const shiftY = (pose, dy) => shift(pose, 0, dy);
  const mirror = pose => { const o = {}; for (const k in pose) o[k] = [100 - pose[k][0], pose[k][1]]; return o; };
  // высокая планка (голова слева)
  const PLANK_UP = { h: [21, 53], n: [28, 58], p: [56, 72], ek: [28, 73], hk: [28, G], eb: [31, 73], hb: [31, G], kk: [71, 80], fk: [86, 88], kb: [72, 80], fb: [84, 88] };
  const PLANK_DOWN = { h: [23, 71], n: [30, 74], p: [57, 81], ek: [37, 77], hk: [28, G], eb: [40, 78], hb: [31, G], kk: [72, 84], fk: [86, 88], kb: [72, 84], fb: [84, 88] };
  const LIE_BACK = { h: [17, 83], n: [26, 85], p: [52, 86], ek: [36, 87], hk: [46, 88], eb: [36, 87], hb: [46, 88], kk: [64, 70], fk: [74, G], kb: [63, 71], fb: [72, G] };
  const QUAD = { h: [28, 56], n: [36, 63], p: [62, 63], ek: [36, 76], hk: [36, G], eb: [39, 76], hb: [39, G], kk: [62, G], fk: [78, G], kb: [65, G], fb: [80, G] };
  const HIPS = { ek: [58, 44], hk: [53, 54], eb: [42, 44], hb: [47, 54] };            // руки на поясе
  const HEAD_HANDS = { ek: [58, 22], hk: [49, 18], eb: [42, 22], hb: [47, 18] };      // руки за головой
  const CRUNCH_HANDS = { ek: [24, 76], hk: [20, 81], eb: [26, 77], hb: [21, 82] };

  const POSES = {
    'jumping-jacks': { ms: 420, view: 'front', frames: [FRONT, P(FRONT, { h: [50, 13], n: [50, 23], p: [50, 49], ek: [40, 18], hk: [35, 6], eb: [60, 18], hb: [65, 6], kk: [41, 68], fk: [33, G], kb: [59, 68], fb: [67, G] })] },
    'squats': { ms: 800, frames: [P(STAND, { ek: [60, 37], hk: [70, 37], eb: [58, 38], hb: [68, 38] }),
      { h: [57, 31], n: [52, 39], p: [38, 62], ek: [63, 42], hk: [74, 41], eb: [61, 43], hb: [72, 42], kk: [56, 66], fk: [53, G], kb: [54, 67], fb: [50, G] }] },
    'pushups': { ms: 750, look: -1, frames: [PLANK_UP, PLANK_DOWN] },
    'lunges': { ms: 850, frames: [P(STAND, HIPS),
      { h: [48, 32], n: [48, 41], p: [47, 66], ek: [56, 56], hk: [51, 66], eb: [40, 56], hb: [45, 66], kk: [64, 67], fk: [66, G], kb: [40, 85], fb: [27, 88] },
      P(STAND, HIPS),
      { h: [52, 32], n: [52, 41], p: [53, 66], ek: [60, 56], hk: [55, 66], eb: [44, 56], hb: [49, 66], kk: [60, 85], fk: [73, 88], kb: [36, 67], fb: [34, G] }] },
    'plank': { ms: 1300, look: -1, frames: [
      { h: [22, 62], n: [30, 68], p: [57, 77], ek: [30, 86], hk: [17, 87], eb: [33, 86], hb: [20, 87], kk: [72, 82], fk: [86, 88], kb: [72, 82], fb: [84, 88] },
      { h: [22, 61], n: [30, 67], p: [57, 75], ek: [30, 86], hk: [17, 87], eb: [33, 86], hb: [20, 87], kk: [72, 81], fk: [86, 88], kb: [72, 81], fb: [84, 88] }] },
    'glute-bridge': { ms: 900, frames: [LIE_BACK, P(LIE_BACK, { p: [52, 70], kk: [66, 66], kb: [65, 67] })] },
    'mountain': { ms: 330, look: -1, frames: [
      P(PLANK_UP, { kk: [46, 76], fk: [55, 84], kb: [71, 80], fb: [84, 88] }),
      P(PLANK_UP, { kk: [71, 80], fk: [86, 88], kb: [47, 76], fb: [56, 84] })] },
    'burpees': { ms: 520, frames: [
      P(STAND, {}),
      { h: [63, 54], n: [56, 58], p: [42, 68], ek: [60, 72], hk: [62, G], eb: [58, 72], hb: [59, G], kk: [56, 70], fk: [52, G], kb: [54, 71], fb: [49, G] },
      mirror(PLANK_UP),
      P(shiftY(STAND, -9), { ek: [55, 16], hk: [57, 4], eb: [46, 16], hb: [44, 4], fk: [53, 82], fb: [47, 82] })] },
    'high-knees': { ms: 300, frames: [
      P(STAND, { kk: [66, 52], fk: [64, 70], ek: [44, 40], hk: [50, 32], eb: [58, 42], hb: [56, 54] }),
      P(STAND, { kb: [66, 52], fb: [64, 70], eb: [44, 40], hb: [50, 32], ek: [58, 42], hk: [56, 54] })] },
    'crunches': { ms: 800, frames: [
      P(LIE_BACK, CRUNCH_HANDS),
      P(LIE_BACK, { h: [30, 66], n: [35, 74], ek: [33, 64], hk: [28, 69], eb: [35, 65], hb: [29, 70] })] },
    'side-plank': { ms: 1200, look: -1, frames: [
      { h: [23, 51], n: [30, 58], p: [56, 72], ek: [30, 86], hk: [42, 88], eb: [32, 45], hb: [33, 33], kk: [71, 80], fk: [86, 88], kb: [71, 80], fb: [86, 88] },
      { h: [23, 52], n: [30, 59], p: [56, 75], ek: [30, 86], hk: [42, 88], eb: [32, 46], hb: [33, 34], kk: [71, 82], fk: [86, 88], kb: [71, 82], fb: [86, 88] }] },
    'superman': { ms: 900, look: -1, frames: [
      { h: [20, 81], n: [28, 85], p: [55, 86], ek: [17, 87], hk: [7, 87], eb: [18, 87], hb: [8, 87], kk: [71, 87], fk: [87, 87], kb: [71, 87], fb: [86, 87] },
      { h: [20, 74], n: [28, 80], p: [55, 86], ek: [18, 76], hk: [8, 70], eb: [19, 77], hb: [9, 71], kk: [71, 83], fk: [87, 76], kb: [71, 83], fb: [86, 77] }] },
    'wall-sit': { ms: 1300, prop: 'wall', frames: [
      { h: [38, 31], n: [38, 40], p: [38, 64], ek: [47, 50], hk: [41, 53], eb: [45, 51], hb: [39, 54], kk: [61, 64], fk: [61, G], kb: [59, 65], fb: [59, G] },
      { h: [38, 32], n: [38, 41], p: [38, 65], ek: [47, 51], hk: [41, 54], eb: [45, 52], hb: [39, 55], kk: [61, 65], fk: [61, G], kb: [59, 66], fb: [59, G] }] },
    'tricep-dips': { ms: 850, prop: 'bench', frames: [
      { h: [40, 32], n: [41, 42], p: [45, 66], ek: [38, 54], hk: [36, 66], eb: [40, 54], hb: [38, 66], kk: [63, 70], fk: [77, G], kb: [62, 71], fb: [75, G] },
      { h: [42, 46], n: [43, 56], p: [47, 78], ek: [29, 58], hk: [36, 66], eb: [31, 58], hb: [38, 66], kk: [64, 74], fk: [77, G], kb: [63, 75], fb: [75, G] }] },
    'leg-raises': { ms: 1000, toe: 'up', frames: [
      P(LIE_BACK, { kk: [68, 86], fk: [84, 86], kb: [68, 87], fb: [83, 87] }),
      P(LIE_BACK, { kk: [55, 70], fk: [58, 54], kb: [56, 71], fb: [59, 55] })] },
    'jump-squats': { ms: 520, frames: [
      { h: [57, 31], n: [52, 39], p: [38, 62], ek: [44, 52], hk: [36, 60], eb: [46, 53], hb: [38, 61], kk: [56, 66], fk: [53, G], kb: [54, 67], fb: [50, G] },
      P(shiftY(STAND, -10), { ek: [55, 16], hk: [57, 5], eb: [46, 16], hb: [44, 5] })] },
    'skater': { ms: 520, view: 'front', frames: [
      { h: [35, 26], n: [38, 35], p: [43, 58], ek: [48, 42], hk: [56, 48], eb: [32, 44], hb: [26, 52], kk: [38, 73], fk: [36, G], kb: [50, 72], fb: [56, 85] },
      { h: [65, 26], n: [62, 35], p: [57, 58], ek: [52, 42], hk: [44, 48], eb: [68, 44], hb: [74, 52], kk: [62, 73], fk: [64, G], kb: [50, 72], fb: [44, 85] }] },
    'bird-dog': { ms: 1000, look: -1, frames: [QUAD, P(QUAD, { ek: [25, 60], hk: [12, 58], kk: [77, 62], fk: [92, 60] })] },
    'cat-cow': { ms: 1300, look: -1, frames: [
      P(QUAD, { s: [49, 46], h: [30, 74], n: [36, 66] }),
      P(QUAD, { s: [49, 76], h: [27, 52], n: [36, 62] })] },
    'child-pose': { ms: 1600, look: -1, frames: [
      { h: [31, 83], n: [40, 79], s: [52, 74], p: [64, 80], ek: [25, 86], hk: [12, 87], eb: [27, 86], hb: [14, 87], kk: [55, 88], fk: [76, 88], kb: [57, 88], fb: [78, 88] },
      { h: [31, 82], n: [40, 77], s: [52, 71], p: [64, 79], ek: [25, 86], hk: [12, 87], eb: [27, 86], hb: [14, 87], kk: [55, 88], fk: [76, 88], kb: [57, 88], fb: [78, 88] }] },
    'hamstring-stretch': { ms: 1300, toe: 'up', frames: [
      { h: [51, 53], n: [51, 62], p: [55, 86], ek: [60, 72], hk: [70, 80], eb: [59, 73], hb: [68, 81], kk: [72, 86], fk: [88, 86], kb: [66, 76], fb: [60, 87] },
      { h: [69, 64], n: [63, 70], p: [55, 86], ek: [73, 76], hk: [84, 81], eb: [72, 77], hb: [82, 82], kk: [72, 86], fk: [88, 86], kb: [66, 76], fb: [60, 87] }] },
    'hip-flexor': { ms: 1300, look: -1, frames: [
      { h: [50, 39], n: [50, 48], p: [51, 72], ek: [44, 58], hk: [35, 66], eb: [46, 59], hb: [37, 67], kk: [33, 70], fk: [30, G], kb: [66, 88], fb: [84, 88] },
      { h: [47, 43], n: [47, 52], p: [46, 76], ek: [41, 61], hk: [34, 68], eb: [43, 62], hb: [36, 69], kk: [31, 71], fk: [30, G], kb: [64, 88], fb: [84, 88] }] },
    'chest-opener': { ms: 1300, frames: [
      P(STAND, { ek: [45, 41], hk: [44, 55], eb: [46, 41], hb: [45, 55] }),
      P(STAND, { h: [52, 17], n: [51, 27], ek: [41, 42], hk: [33, 53], eb: [42, 42], hb: [34, 53] })] },
    'calf-raises': { ms: 700, frames: [P(STAND, HIPS), P(shiftY(STAND, -5), P(HIPS, { ek: [58, 39], hk: [53, 49], eb: [42, 39], hb: [47, 49] }))] },

    // ---------- новые упражнения ----------
    'march': { ms: 520, frames: [
      P(STAND, { kk: [60, 60], fk: [60, 78], ek: [46, 40], hk: [50, 50], eb: [55, 40], hb: [58, 50] }),
      P(STAND, { kb: [60, 60], fb: [60, 78], eb: [46, 40], hb: [50, 50], ek: [55, 40], hk: [58, 50] })] },
    'butt-kicks': { ms: 320, frames: [
      P(STAND, { kk: [50, 71], fk: [37, 62], ek: [56, 40], hk: [62, 34], eb: [44, 41], hb: [40, 50] }),
      P(STAND, { kb: [50, 71], fb: [37, 62], eb: [56, 40], hb: [62, 34], ek: [44, 41], hk: [40, 50] })] },
    'sumo-squat': { ms: 900, view: 'front', frames: [
      P(FRONT, { ek: [44, 40], hk: [49, 47], eb: [56, 40], hb: [51, 47], kk: [42, 70], fk: [36, G], kb: [58, 70], fb: [64, G] }),
      P(FRONT, { h: [50, 31], n: [50, 41], p: [50, 64], ek: [43, 52], hk: [49, 58], eb: [57, 52], hb: [51, 58], kk: [35, 69], fk: [34, G], kb: [65, 69], fb: [66, G] })] },
    'reverse-lunge': { ms: 900, frames: [P(STAND, HIPS),
      { h: [53, 32], n: [53, 41], p: [52, 66], ek: [61, 56], hk: [56, 66], eb: [45, 56], hb: [50, 66], kk: [64, 70], fk: [62, G], kb: [42, 85], fb: [28, 88] }] },
    'side-lunge': { ms: 950, view: 'front', frames: [
      P(FRONT, { ek: [44, 40], hk: [49, 47], eb: [56, 40], hb: [51, 47] }),
      { h: [41, 30], n: [42, 39], p: [40, 62], ek: [37, 50], hk: [43, 56], eb: [49, 50], hb: [45, 56], kk: [30, 72], fk: [30, G], kb: [56, 75], fb: [72, G] },
      P(FRONT, { ek: [44, 40], hk: [49, 47], eb: [56, 40], hb: [51, 47] }),
      { h: [59, 30], n: [58, 39], p: [60, 62], ek: [51, 50], hk: [55, 56], eb: [63, 50], hb: [57, 56], kk: [44, 75], fk: [28, G], kb: [70, 72], fb: [70, G] }] },
    'step-ups': { ms: 800, prop: 'step', frames: [
      P(STAND, { h: [44, 17], n: [44, 27], p: [44, 52], ek: [47, 40], hk: [49, 52], eb: [41, 40], hb: [39, 52], kk: [57, 63], fk: [62, 78], kb: [42, 70], fb: [41, G] }),
      P(shift(STAND, 18, -11), { kb: [62, 64], fb: [58, 78] })] },
    'single-leg-bridge': { ms: 900, frames: [
      P(LIE_BACK, { kb: [66, 74], fb: [80, 66] }),
      P(LIE_BACK, { p: [52, 72], kk: [66, 67], kb: [68, 62], fb: [83, 54] })] },
    'donkey-kicks': { ms: 750, look: -1, frames: [QUAD, P(QUAD, { kk: [76, 56], fk: [79, 40] })] },
    'incline-pushups': { ms: 800, look: -1, prop: 'bench', frames: [
      { h: [28, 44], n: [34, 49], p: [58, 67], ek: [32, 58], hk: [30, 66], eb: [35, 58], hb: [33, 66], kk: [72, 78], fk: [86, 88], kb: [72, 78], fb: [84, 88] },
      { h: [26, 55], n: [33, 59], p: [58, 73], ek: [42, 61], hk: [30, 66], eb: [45, 62], hb: [33, 66], kk: [72, 81], fk: [86, 88], kb: [72, 81], fb: [84, 88] }] },
    'knee-pushups': { ms: 750, look: -1, frames: [
      { h: [21, 53], n: [28, 58], p: [52, 70], ek: [28, 73], hk: [28, G], eb: [31, 73], hb: [31, G], kk: [66, 86], fk: [80, 78], kb: [67, 86], fb: [81, 79] },
      { h: [23, 70], n: [30, 74], p: [53, 79], ek: [37, 77], hk: [28, G], eb: [40, 78], hb: [31, G], kk: [66, 86], fk: [80, 78], kb: [67, 86], fb: [81, 79] }] },
    'pike-pushups': { ms: 850, look: -1, frames: [
      { h: [34, 72], n: [37, 64], p: [57, 44], ek: [33, 76], hk: [30, G], eb: [35, 76], hb: [32, G], kk: [68, 66], fk: [80, G], kb: [69, 66], fb: [82, G] },
      { h: [31, 82], n: [36, 74], p: [56, 50], ek: [42, 81], hk: [30, G], eb: [44, 81], hb: [32, G], kk: [68, 69], fk: [80, G], kb: [69, 69], fb: [82, G] }] },
    'plank-shoulder-tap': { ms: 600, look: -1, frames: [
      P(PLANK_UP, { ek: [36, 70], hk: [31, 60] }), PLANK_UP,
      P(PLANK_UP, { eb: [37, 70], hb: [32, 60] }), PLANK_UP] },
    'dead-bug': { ms: 1000, toe: 'up', frames: [
      P(LIE_BACK, { ek: [27, 75], hk: [28, 63], eb: [29, 75], hb: [30, 63], kk: [53, 70], fk: [66, 70], kb: [54, 70], fb: [67, 70] }),
      P(LIE_BACK, { ek: [16, 82], hk: [6, 85], eb: [29, 75], hb: [30, 63], kk: [53, 70], fk: [66, 70], kb: [69, 82], fb: [85, 84] })] },
    'bicycle-crunch': { ms: 600, toe: 'up', frames: [
      P(LIE_BACK, { h: [30, 67], n: [35, 75], ek: [42, 68], hk: [28, 70], eb: [33, 66], hb: [29, 71], kk: [46, 70], fk: [58, 74], kb: [68, 80], fb: [84, 78] }),
      P(LIE_BACK, { h: [30, 67], n: [35, 75], ek: [33, 66], hk: [28, 70], eb: [42, 68], hb: [29, 71], kb: [46, 70], fb: [58, 74], kk: [68, 80], fk: [84, 78] })] },
    'russian-twist': { ms: 700, frames: [
      { h: [35, 56], n: [39, 65], p: [52, 86], ek: [44, 78], hk: [47, 86], eb: [46, 78], hb: [49, 86], kk: [64, 70], fk: [75, 82], kb: [65, 71], fb: [76, 83] },
      { h: [36, 57], n: [40, 65], p: [52, 86], ek: [52, 74], hk: [62, 80], eb: [53, 75], hb: [63, 81], kk: [64, 70], fk: [75, 82], kb: [65, 71], fb: [76, 83] }] },
    'flutter-kicks': { ms: 360, toe: 'up', frames: [
      P(LIE_BACK, { kk: [68, 80], fk: [84, 74], kb: [68, 84], fb: [84, 84] }),
      P(LIE_BACK, { kb: [68, 80], fb: [84, 74], kk: [68, 84], fk: [84, 84] })] },
    'jump-rope': { ms: 330, view: 'front', frames: [
      P(FRONT, { ek: [42, 44], hk: [36, 54], eb: [58, 44], hb: [64, 54] }),
      P(shiftY(FRONT, -5), { ek: [42, 39], hk: [36, 49], eb: [58, 39], hb: [64, 49] })] },
    'inchworm': { ms: 900, look: -1, frames: [
      { h: [42, 78], n: [46, 70], p: [60, 50], ek: [42, 80], hk: [40, G], eb: [44, 80], hb: [42, G], kk: [60, 70], fk: [61, G], kb: [61, 70], fb: [63, G] },
      { h: [30, 66], n: [35, 70], p: [62, 56], ek: [30, 80], hk: [27, G], eb: [32, 80], hb: [29, G], kk: [63, 72], fk: [66, G], kb: [64, 72], fb: [68, G] },
      { h: [17, 53], n: [24, 58], p: [52, 72], ek: [24, 73], hk: [24, G], eb: [27, 73], hb: [27, G], kk: [67, 80], fk: [82, 88], kb: [68, 80], fb: [80, 88] },
      { h: [30, 66], n: [35, 70], p: [62, 56], ek: [30, 80], hk: [27, G], eb: [32, 80], hb: [29, G], kk: [63, 72], fk: [66, G], kb: [64, 72], fb: [68, G] }] },
    'cobra': { ms: 1400, look: -1, frames: [
      { h: [20, 81], n: [28, 85], p: [55, 86], ek: [36, 82], hk: [30, G], eb: [37, 82], hb: [31, G], kk: [71, 87], fk: [87, 87], kb: [71, 87], fb: [86, 87] },
      { h: [24, 60], n: [31, 67], s: [43, 80], p: [55, 86], ek: [30, 78], hk: [29, G], eb: [31, 78], hb: [30, G], kk: [71, 87], fk: [87, 87], kb: [71, 87], fb: [86, 87] }] },
    'quad-stretch': { ms: 1500, frames: [
      P(STAND, { kk: [52, 71], fk: [40, 58], ek: [46, 46], hk: [41, 57], eb: [57, 36], hb: [65, 31] }),
      P(STAND, { kk: [53, 71], fk: [39, 56], ek: [46, 45], hk: [40, 55], eb: [57, 35], hb: [65, 30] })] },
    'arm-circles': { ms: 260, view: 'front', frames: [
      P(FRONT, { ek: [38, 28], hk: [27, 23], eb: [62, 28], hb: [73, 23] }),
      P(FRONT, { ek: [38, 27], hk: [24, 27], eb: [62, 27], hb: [76, 27] }),
      P(FRONT, { ek: [38, 28], hk: [27, 32], eb: [62, 28], hb: [73, 32] }),
      P(FRONT, { ek: [38, 29], hk: [31, 27], eb: [62, 29], hb: [69, 27] })] },
    'good-morning': { ms: 1000, frames: [
      P(STAND, HEAD_HANDS),
      { h: [74, 41], n: [66, 43], p: [45, 52], ek: [71, 35], hk: [74, 41], eb: [68, 36], hb: [72, 42], kk: [49, 70], fk: [50, G], kb: [46, 70], fb: [45, G] }] }
  };

  // ---------- рисование ----------
  const COL = { skin: '#f1c19c', skinB: '#d69f7a', shirt: '#0179da', shirtB: '#085aa6', shorts: '#23324f', shortsB: '#17223a', shoe: '#c6dc3e', shoeB: '#9aae2c', hair: '#3a2a20', eye: '#1b1b1f' };
  const ease = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  function blend(A, B, t) {
    const o = {};
    for (const k in A) o[k] = B[k] ? lerp(A[k], B[k], t) : A[k];
    for (const k in B) if (!A[k]) o[k] = B[k];
    return o;
  }
  const f1 = v => v.toFixed(1);
  const seg = (a, b, w, c) => `<line x1="${f1(a[0])}" y1="${f1(a[1])}" x2="${f1(b[0])}" y2="${f1(b[1])}" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>`;
  const dot = (a, r, c) => `<circle cx="${f1(a[0])}" cy="${f1(a[1])}" r="${r}" fill="${c}"/>`;
  const norm = v => { const l = Math.hypot(v[0], v[1]) || 1; return [v[0] / l, v[1] / l]; };

  function leg(p, k, f, far, meta, front) {
    const sk = far ? COL.skinB : COL.skin, sh = far ? COL.shortsB : COL.shorts, so = far ? COL.shoeB : COL.shoe;
    const mid = lerp(p, k, 0.58);
    // носок: перпендикулярно голени — вперёд (стоя), вниз (в упоре) или вверх (сидя с прямыми ногами)
    const v = norm([f[0] - k[0], f[1] - k[1]]);
    let t = [-v[1], v[0]];
    if (Math.abs(v[1]) > 0.72) { const want = meta.view === 'front' ? (f[0] < 50 ? -1 : 1) : (meta.look || 1); if (Math.sign(t[0]) !== want) t = [-t[0], -t[1]]; }
    else { const up = meta.toe === 'up'; if ((t[1] > 0) === up) t = [-t[0], -t[1]]; }
    if (meta.view === 'front') t = [t[0] * 0.55, t[1] * 0.55];
    const toe = [f[0] + t[0] * 6, f[1] + t[1] * 6];
    return seg(p, mid, 10.5, sh) + seg(mid, k, 8.2, sk) + seg(k, f, 7, sk) + seg(f, toe, 6, so) + (front ? '' : '');
  }
  function arm(n, e, h, far) {
    const sk = far ? COL.skinB : COL.skin, sl = far ? COL.shirtB : COL.shirt;
    return seg(e, h, 5.4, sk) + seg(lerp(n, e, 0.45), e, 6.2, sk) + seg(n, lerp(n, e, 0.5), 7.4, sl) + dot(h, 3.1, sk);
  }
  function draw(p, meta) {
    const front = meta.view === 'front';
    // направление «вперёд» (куда смотрит лицо) — перпендикуляр к корпусу
    const up = norm([p.n[0] - p.p[0], p.n[1] - p.p[1]]);
    const look = meta.look || 1;
    let fw = [-up[1] * look, up[0] * look];
    if (look < 0) fw = [up[1], -up[0]];
    const torso = p.s
      ? `<path d="M${f1(p.n[0])} ${f1(p.n[1])} Q${f1(p.s[0])} ${f1(p.s[1])} ${f1(p.p[0])} ${f1(p.p[1])}" fill="none" stroke="${COL.shirt}" stroke-width="14.5" stroke-linecap="round"/>`
      : seg(p.n, p.p, 14.5, COL.shirt);
    // голова: волосы сзади-сверху, лицо, глаза
    const hc = p.h;
    let head;
    if (front) {
      head = dot([hc[0], hc[1] - 1.4], 7.1, COL.hair) + dot([hc[0], hc[1] + 0.8], 6.2, COL.skin)
        + dot([hc[0] - 2.3, hc[1] + 0.6], 0.95, COL.eye) + dot([hc[0] + 2.3, hc[1] + 0.6], 0.95, COL.eye);
    } else {
      const back = [hc[0] - fw[0] * 1.5 + up[0] * 1.1, hc[1] - fw[1] * 1.5 + up[1] * 1.1];
      const face = [hc[0] + fw[0] * 0.8 - up[0] * 0.3, hc[1] + fw[1] * 0.8 - up[1] * 0.3];
      head = dot(back, 7, COL.hair) + dot(face, 6.2, COL.skin) + dot([face[0] + fw[0] * 3 + up[0] * 0.8, face[1] + fw[1] * 3 + up[1] * 0.8], 0.95, COL.eye);
    }
    const neck = seg(p.n, lerp(p.n, p.h, 0.55), 5.2, COL.skin);
    // тень на полу
    const xs = [p.fk[0], p.fb[0], p.hk[0], p.hb[0], p.p[0]], cx = (Math.min(...xs) + Math.max(...xs)) / 2, w = Math.max(14, (Math.max(...xs) - Math.min(...xs)) / 2 + 6);
    const prop = meta.prop === 'wall' ? '<rect x="27" y="18" width="6" height="72" rx="2" class="jf-prop"/>'
      : meta.prop === 'bench' ? '<rect x="12" y="65" width="28" height="5" rx="2.5" class="jf-prop"/><rect x="15" y="68" width="4" height="22" rx="1" class="jf-prop"/><rect x="33" y="68" width="4" height="22" rx="1" class="jf-prop"/>'
      : meta.prop === 'step' ? '<rect x="52" y="80" width="36" height="11" rx="3" class="jf-prop"/>' : '';
    return `${prop}<ellipse cx="${f1(cx)}" cy="${G + 3.2}" rx="${f1(w)}" ry="2.6" class="jf-shadow"/>
      ${arm(p.n, p.eb, p.hb, true)}${leg(p.p, p.kb, p.fb, true, meta)}
      ${neck}${torso}${dot(p.p, 6.4, COL.shorts)}
      ${leg(p.p, p.kk, p.fk, false, meta)}${head}${arm(p.n, p.ek, p.hk, false)}`;
  }
  const svg = (inner, cls) => `<svg class="jf-anim ${cls || ''}" viewBox="4 6 92 92" aria-hidden="true">${inner}</svg>`;

  // Статичная картинка — для списков
  function still(id, cls) {
    const a = POSES[id]; if (!a) return '';
    return svg(draw(a.frames[a.frames.length > 2 ? 1 : a.frames.length - 1], a), cls);
  }
  // Живая анимация внутри el. Останавливается сама, когда el убирают со страницы.
  function play(el, id) {
    const a = POSES[id]; if (!el || !a) return () => {};
    const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.innerHTML = svg('', 'live');
    const s = el.firstElementChild;
    const n = a.frames.length;
    const seq = a.frames.map((_, i) => i);
    let raf, start = performance.now(), stopped = false;
    function frame(now) {
      if (stopped || !el.isConnected) return;
      const total = Math.max(0, now - start) / a.ms;
      const i = Math.floor(total) % seq.length, t = ease(total % 1);
      const A = a.frames[seq[i]], B = a.frames[seq[(i + 1) % seq.length]];
      s.innerHTML = draw(blend(A, B, t), a);
      raf = requestAnimationFrame(frame);
    }
    if (reduce) s.innerHTML = draw(a.frames[n > 2 ? 1 : n - 1], a);
    else raf = requestAnimationFrame(frame);
    return () => { stopped = true; cancelAnimationFrame(raf); };
  }

  window.JF_ANIM = { still, play, has: id => !!POSES[id], _poses: POSES, _draw: (p, m) => svg(draw(p, m)) };
})();
