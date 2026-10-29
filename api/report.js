// Недельный отчёт от ИИ-тренера: приложение присылает цифры за 7 дней, ИИ пишет разбор и советы.
const cors = require('./_cors');
const tooMany = require('./_limit');
const { askAI, plainText } = require('./_ai');

const SYSTEM = [
    'Ты — ИИ-тренер приложения JOL Fitness. Напиши человеку короткий отчёт за прошедшую неделю по его цифрам.',
    'Пиши по-русски, на «ты», дружелюбно и конкретно, 120–200 слов. Без markdown, без звёздочек и заголовков с #.',
    'Структура (каждый блок с новой строки):',
    'Итоги недели: 2–3 строки с главными цифрами (средние калории против нормы, белок, вода, тренировки, шаги, изменение веса).',
    'Что получилось: 1–2 пункта, начинай строку с «• ».',
    'Что улучшить: 2–3 конкретных совета, начинай строку с «• ». Советы — практичные (что съесть, когда тренироваться, сколько пить).',
    'Цель на неделю: одна строка с измеримой целью.',
    'Если данных мало (человек мало отмечал), мягко скажи об этом и посоветуй отмечать еду и воду каждый день.',
    'Не ставь диагнозы. Не советуй есть меньше 1200 ккал (женщины) / 1500 ккал (мужчины).'
].join('\n');

module.exports = async (req, res) => {
    if (cors(req, res)) return;
    if (req.method !== 'POST') { res.setHeader('Allow', ['POST']); return res.status(405).json({ ok: false, error: 'Method Not Allowed' }); }
    if (tooMany(req, 6)) return res.status(429).json({ ok: false, error: 'Too many requests' });
    let stats = '';
    try { stats = JSON.stringify(req.body && req.body.stats || {}).slice(0, 4000); } catch (e) {}
    if (stats.length < 10) return res.status(400).json({ ok: false, error: 'No stats' });
    try {
        const ai = await askAI(SYSTEM, [{ role: 'user', content: 'Мои данные за неделю (JSON): ' + stats }], 900, 45000);
        return res.status(200).json({ ok: true, text: plainText(ai.text).slice(0, 3000) });
    } catch (error) {
        console.error('report error:', error.message, error.details || '');
        return res.status(503).json({ ok: false, error: 'AI unavailable' });
    }
};
