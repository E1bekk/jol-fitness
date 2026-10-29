// ИИ-тренер: чат о тренировках, питании и восстановлении.
// Приложение присылает последние сообщения и краткие данные пользователя (цель, нормы, что съел сегодня).
// Ничего не сохраняется: переписка хранится только на телефоне пользователя.
const cors = require('./_cors');
const tooMany = require('./_limit');
const { askAI, plainText } = require('./_ai');

const SYSTEM = [
    'Ты — ИИ-тренер приложения JOL Fitness: дружелюбный, конкретный и честный персональный тренер и нутрициолог.',
    'Помогаешь с тренировками дома, планами похудения и набора массы, питанием, подсчётом калорий и БЖУ, сном, водой и мотивацией.',
    'Пиши по-русски, на «ты», простыми словами. Обычно 60–180 слов; план на неделю — до 350 слов.',
    'Давай практичные шаги: конкретные упражнения с повторениями, примеры блюд с граммами и калориями. Учитывай местную кухню Кыргызстана и Центральной Азии (плов, лагман, манты, бешбармак, самса и т. п.).',
    'Опирайся на данные пользователя из блока «Данные пользователя»: цель, нормы калорий и БЖУ, что он съел и сделал сегодня.',
    'Безопасность: не ставь диагнозы и не назначай лекарства. При боли, травмах, болезнях, беременности, головокружении — советуй обратиться к врачу.',
    'Не советуй питание ниже 1200 ккал для женщин и 1500 ккал для мужчин, голодания, рвоту, слабительные и опасные добавки. Нормальное снижение веса — 0,5–1 кг в неделю.',
    'Если человек пишет о проблемах с едой, ненависти к своему телу или очень резком похудении — мягко поддержи и посоветуй поговорить со специалистом.',
    'На вопросы не про здоровье, спорт и питание отвечай коротко и возвращай разговор к фитнесу.',
    'Форматирование: без markdown-заголовков, таблиц и звёздочек. Списки — строками, начинающимися с «• » или с цифры.'
].join('\n');

const clip = (v, n) => String(v == null ? '' : v).slice(0, n);

module.exports = async (req, res) => {
    if (cors(req, res)) return;
    if (req.method !== 'POST') { res.setHeader('Allow', ['POST']); return res.status(405).json({ ok: false, error: 'Method Not Allowed' }); }
    if (tooMany(req, 20)) return res.status(429).json({ ok: false, error: 'Too many requests' });

    const b = req.body || {};
    const messages = (Array.isArray(b.messages) ? b.messages : [])
        .filter(m => m && (m.role === 'user' || m.role === 'assistant') && m.content)
        .slice(-12)
        .map(m => ({ role: m.role, content: clip(m.content, 2000) }));
    if (!messages.length || messages[messages.length - 1].role !== 'user') {
        return res.status(400).json({ ok: false, error: 'No question' });
    }

    let context = '';
    try { context = clip(JSON.stringify(b.context || {}), 2500); } catch (e) {}
    const system = SYSTEM + (context ? '\n\nДанные пользователя (JSON): ' + context : '');

    try {
        const ai = await askAI(system, messages, 900);
        return res.status(200).json({ ok: true, text: plainText(ai.text).slice(0, 4000) });
    } catch (error) {
        console.error('coach error:', error.message, error.details || '');
        return res.status(503).json({ ok: false, error: 'AI unavailable' });
    }
};
