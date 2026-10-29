// ИИ-тренер составляет программу тренировок, которую приложение сохраняет как обычную
// (с таймером, раундами и отметками). Упражнения — только из библиотеки приложения,
// поэтому для каждого есть анимация и описание техники.
const cors = require('./_cors');
const tooMany = require('./_limit');
const parseJson = require('./_json');
const { askAI } = require('./_ai');

const clip = (v, n) => String(v == null ? '' : v).slice(0, n);

module.exports = async (req, res) => {
    if (cors(req, res)) return;
    if (req.method !== 'POST') { res.setHeader('Allow', ['POST']); return res.status(405).json({ ok: false, error: 'Method Not Allowed' }); }
    if (tooMany(req, 6)) return res.status(429).json({ ok: false, error: 'Too many requests' });

    const b = req.body || {};
    const lib = (Array.isArray(b.exercises) ? b.exercises : []).slice(0, 60)
        .filter(e => e && /^[a-z0-9-]{2,40}$/.test(e.id))
        .map(e => ({ id: e.id, name: clip(e.name, 60), type: e.type === 'time' ? 'time' : 'reps', muscles: clip(e.muscles, 60) }));
    if (lib.length < 5) return res.status(400).json({ ok: false, error: 'No exercises' });
    const ids = new Set(lib.map(e => e.id));
    const type = Object.fromEntries(lib.map(e => [e.id, e.type]));

    const days = Math.min(6, Math.max(2, parseInt(b.days, 10) || 3));
    const minutes = Math.min(60, Math.max(10, parseInt(b.minutes, 10) || 25));
    const level = ['beginner', 'middle', 'advanced'].includes(b.level) ? b.level : 'beginner';
    const levelRu = { beginner: 'новичок', middle: 'средний', advanced: 'продвинутый' }[level];
    const focus = clip(b.focus, 80) || 'всё тело';
    const wish = clip(b.wish, 300);
    let profile = '';
    try { profile = clip(JSON.stringify(b.profile || {}), 600); } catch (e) {}

    const SYSTEM = [
        'Ты — опытный персональный тренер. Составь программу домашних тренировок без инвентаря.',
        'Используй ТОЛЬКО упражнения из списка ниже, по их id. Не придумывай новые id.',
        'Список (id — название — тип — мышцы): ' + lib.map(e => `${e.id} — ${e.name} — ${e.type === 'time' ? 'на время, секунды' : 'повторения'} — ${e.muscles}`).join('; '),
        `Сделай ${Math.min(days, 4)} разные тренировки (по кругу: каждая тренировка выполняется 2–3 раунда), в каждой 4–7 упражнений.`,
        `Одна тренировка должна укладываться примерно в ${minutes} минут вместе с разминкой и отдыхом.`,
        `Уровень: ${levelRu}. Акцент: ${focus}. Учитывай цель и данные человека. Чередуй нагрузку на разные мышцы.`,
        'amount — число: для повторений 6–30, для упражнений на время 20–75 секунд.',
        'Ответ — ТОЛЬКО JSON без пояснений:',
        '{"title":"Короткое название программы (до 30 символов)","about":"1–2 предложения: для кого и что даст","workouts":[{"title":"Название тренировки (до 24 символов)","items":[{"id":"squats","amount":15}]}]}'
    ].join('\n');
    const prompt = `Данные человека: ${profile}\nПожелания: ${wish || 'нет'}\nТренировок в неделю: ${days}.`;

    try {
        const ai = await askAI(SYSTEM, [{ role: 'user', content: prompt }], 1500, 50000);
        const data = parseJson(ai.text);
        const workouts = (Array.isArray(data.workouts) ? data.workouts : []).slice(0, 4).map(w => ({
            title: clip(w.title, 30) || 'Тренировка',
            items: (Array.isArray(w.items) ? w.items : []).filter(it => it && ids.has(it.id)).slice(0, 8).map(it => {
                let a = Math.round(Number(it.amount) || 0);
                if (type[it.id] === 'time') a = Math.min(90, Math.max(15, Math.round(a / 5) * 5 || 30));
                else a = Math.min(40, Math.max(4, a || 10));
                return [it.id, a];
            })
        })).filter(w => w.items.length >= 3);
        if (!workouts.length) throw new Error('empty plan');
        return res.status(200).json({
            ok: true,
            program: { title: clip(data.title, 40) || 'Моя программа', about: clip(data.about, 300), workouts, days, level }
        });
    } catch (error) {
        console.error('plan error:', error.message, error.details || '');
        return res.status(503).json({ ok: false, error: 'AI unavailable' });
    }
};
