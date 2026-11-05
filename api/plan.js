// ИИ-тренер составляет индивидуальную программу тренировок, которую приложение сохраняет как обычную
// (с таймером, раундами и отметками). Упражнения — только из библиотеки приложения (у каждого есть
// анимация и техника). Перед ИИ мы сами убираем то, что человеку не подходит (колени, спина, прыжки…).
const cors = require('./_cors');
const tooMany = require('./_limit');
const parseJson = require('./_json');
const { askAI } = require('./_ai');

const clip = (v, n) => String(v == null ? '' : v).slice(0, n);
const GROUP_RU = { legs: 'ноги', glutes: 'ягодицы', chest: 'грудь', arms: 'руки', shoulders: 'плечи', back: 'спина', core: 'пресс', cardio: 'кардио', mobility: 'растяжка' };
const FOCUS_GROUPS = {
    'Похудение': ['cardio', 'legs', 'glutes', 'core'], 'Сила и мышцы': ['chest', 'arms', 'legs', 'glutes', 'shoulders'],
    'Ноги и ягодицы': ['legs', 'glutes'], 'Пресс и кор': ['core'], 'Руки и спина': ['arms', 'back', 'shoulders', 'chest'],
    'Здоровая спина': ['back', 'core', 'mobility'], 'Гибкость': ['mobility']
};

module.exports = async (req, res) => {
    if (cors(req, res)) return;
    if (req.method !== 'POST') { res.setHeader('Allow', ['POST']); return res.status(405).json({ ok: false, error: 'Method Not Allowed' }); }
    if (tooMany(req, 6)) return res.status(429).json({ ok: false, error: 'Too many requests' });

    const b = req.body || {};
    const days = Math.min(6, Math.max(2, parseInt(b.days, 10) || 3));
    const minutes = Math.min(60, Math.max(10, parseInt(b.minutes, 10) || 25));
    const level = ['beginner', 'middle', 'advanced'].includes(b.level) ? b.level : 'beginner';
    const maxLvl = { beginner: 2, middle: 3, advanced: 3 }[level];
    const focus = clip(b.focus, 80) || 'Всё тело';
    const wish = clip(b.wish, 300);
    let limits = (Array.isArray(b.limits) ? b.limits : []).filter(x => ['knees', 'back', 'wrists', 'shoulders', 'nojump'].includes(x));
    // ограничения из текста пожеланий
    const w = wish.toLowerCase();
    if (/колен/.test(w)) limits.push('knees');
    if (/спин|поясниц|грыж/.test(w)) limits.push('back');
    if (/запяст|кист/.test(w)) limits.push('wrists');
    if (/плеч/.test(w)) limits.push('shoulders');
    if (/прыж|сосед|тих|без удар/.test(w)) limits.push('nojump');
    limits = [...new Set(limits)];

    let lib = (Array.isArray(b.exercises) ? b.exercises : []).slice(0, 80)
        .filter(e => e && /^[a-z0-9-]{2,40}$/.test(e.id))
        .map(e => ({ id: e.id, name: clip(e.name, 60), type: e.type === 'time' ? 'time' : 'reps', muscles: clip(e.muscles, 60),
            groups: Array.isArray(e.groups) ? e.groups.filter(g => GROUP_RU[g]) : [], lvl: +e.lvl || 1, impact: e.impact === 'high' ? 'high' : 'low',
            avoid: Array.isArray(e.avoid) ? e.avoid : [], sides: !!e.sides }));
    const noJumps = limits.includes('nojump') || limits.includes('knees');
    lib = lib.filter(e => e.lvl <= maxLvl)
        .filter(e => !(noJumps && e.impact === 'high'))
        .filter(e => !e.avoid.some(a => limits.includes(a)));
    if (lib.length < 6) return res.status(400).json({ ok: false, error: 'Too few exercises' });
    const ids = new Set(lib.map(e => e.id));
    const type = Object.fromEntries(lib.map(e => [e.id, e.type]));
    const focusGroups = FOCUS_GROUPS[focus] || [];
    const levelRu = { beginner: 'новичок', middle: 'средний', advanced: 'продвинутый' }[level];
    let profile = '';
    try { profile = clip(JSON.stringify(b.profile || {}), 600); } catch (e) {}

    const SYSTEM = [
        'Ты — опытный персональный тренер. Составь ИНДИВИДУАЛЬНУЮ программу домашних тренировок без инвентаря под этого человека.',
        'Используй ТОЛЬКО упражнения из списка ниже, по их id. Не придумывай новые id. Список уже очищен от упражнений, которые ему не подходят.',
        'Список (id | название | тип | мышцы | уровень 1–3 | нагрузка): ' + lib.map(e => `${e.id} | ${e.name} | ${e.type === 'time' ? 'на время, сек' : 'повторения'}${e.sides ? ' на каждую сторону' : ''} | ${e.groups.map(g => GROUP_RU[g]).join(', ')} | ${e.lvl} | ${e.impact === 'high' ? 'прыжки' : 'без прыжков'}`).join('; '),
        `Сделай ${Math.min(days, 4)} РАЗНЫЕ тренировки (каждая выполняется по кругу 2–3 раунда), в каждой 5–7 упражнений.`,
        'Правила хорошей программы:',
        '• первое упражнение — разминочное (кардио или растяжка низкой интенсивности), последнее — спокойное (растяжка, планка или кор);',
        '• чередуй мышцы: не ставь подряд два упражнения на одну и ту же группу;',
        `• акцент: ${focus}${focusGroups.length ? ' — больше упражнений на ' + focusGroups.map(g => GROUP_RU[g]).join(', ') : ''}, но тренируй и остальное тело;`,
        `• уровень: ${levelRu}. Новичкам — больше упражнений уровня 1, меньше повторений; продвинутым — уровень 2–3 и больше объём;`,
        `• одна тренировка — примерно ${minutes} минут вместе с отдыхом;`,
        '• учитывай цель, возраст, вес и пожелания человека;',
        '• amount — число: повторения 6–25 (на каждую сторону — 6–12), на время 20–60 секунд.',
        'Ответ — ТОЛЬКО JSON без пояснений:',
        '{"title":"Короткое название программы (до 30 символов)","about":"2 предложения: для кого программа и что даст, с учётом ограничений","workouts":[{"title":"Название тренировки (до 24 символов)","items":[{"id":"march","amount":40}]}]}'
    ].join('\n');
    const prompt = `Данные человека: ${profile}\nПожелания: ${wish || 'нет'}\nОграничения: ${limits.length ? limits.join(', ') : 'нет'}\nТренировок в неделю: ${days}.`;

    try {
        const ai = await askAI(SYSTEM, [{ role: 'user', content: prompt }], 1600, 52000, { json: true });
        const data = parseJson(ai.text);
        const workouts = (Array.isArray(data.workouts) ? data.workouts : []).slice(0, 4).map(wk => ({
            title: clip(wk.title, 30) || 'Тренировка',
            items: (Array.isArray(wk.items) ? wk.items : []).filter(it => it && ids.has(it.id)).slice(0, 8).map(it => {
                let a = Math.round(Number(it.amount) || 0);
                if (type[it.id] === 'time') a = Math.min(75, Math.max(15, Math.round(a / 5) * 5 || 30));
                else a = Math.min(30, Math.max(4, a || 10));
                return [it.id, a];
            })
        })).filter(wk => wk.items.length >= 3);
        if (!workouts.length) throw new Error('empty plan');
        return res.status(200).json({
            ok: true,
            program: { title: clip(data.title, 40) || 'Моя программа', about: clip(data.about, 300), workouts, days, level, limits }
        });
    } catch (error) {
        console.error('plan error:', error.message, error.details || '');
        return res.status(503).json({ ok: false, error: 'AI unavailable' });
    }
};
