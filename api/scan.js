// Сканер еды: фото тарелки -> список блюд с весом, калориями и БЖУ.
// Фото анализирует Gemini (умеет работать с картинками). Фото нигде не сохраняется.
const cors = require('./_cors');
const tooMany = require('./_limit');
const { askAI } = require('./_ai');
const parseJson = require('./_json');

// Для фото сначала быстрые модели: распознать еду им хватает, а ответ приходит в 2–3 раза быстрее.
const SCAN_MODELS = (process.env.SCAN_MODELS || 'gemini-3.5-flash-lite,gemini-3.8-flash,gemini-2.5-flash,gemini-flash-lite-latest')
    .split(',').map(s => s.trim()).filter(Boolean);

const SYSTEM = [
    'Ты — нутрициолог. По фото еды определи все блюда и продукты и оцени их вес и пищевую ценность.',
    'Учитывай кухню Кыргызстана и Центральной Азии: плов, лагман, манты, бешбармак, самса, боорсок, куурдак, чучвара, шорпо, ашлянфу, лепёшка (нан), курут.',
    'Оценивай вес порции по размеру тарелки, приборов и рук. Калории и БЖУ указывай для всей порции на фото, а не на 100 г.',
    'Ответ — ТОЛЬКО JSON без пояснений и без ```:',
    '{"items":[{"name":"Плов","grams":300,"kcal":520,"protein":18,"fat":24,"carbs":62}],"comment":"короткий совет на русском до 140 символов"}',
    'name — по-русски, коротко. Числа — без единиц измерения. Если еды на фото нет — верни {"items":[],"comment":"На фото не видно еды"}.'
].join('\n');

const n = (v, max) => { const x = Math.round(Number(v) * 10) / 10; return isFinite(x) && x >= 0 ? Math.min(x, max) : 0; };

module.exports = async (req, res) => {
    if (cors(req, res)) return;
    if (req.method !== 'POST') { res.setHeader('Allow', ['POST']); return res.status(405).json({ ok: false, error: 'Method Not Allowed' }); }
    if (tooMany(req, 10)) return res.status(429).json({ ok: false, error: 'Too many requests' });

    const b = req.body || {};
    const image = typeof b.image === 'string' ? b.image.replace(/^data:[^,]+,/, '') : '';
    const mimeType = /^image\/(jpeg|png|webp)$/.test(b.mimeType) ? b.mimeType : 'image/jpeg';
    if (!image || image.length < 1000) return res.status(400).json({ ok: false, error: 'No image' });
    if (image.length > 4_000_000) return res.status(413).json({ ok: false, error: 'Image too large' });

    try {
        const ai = await askAI(SYSTEM, [{ role: 'user', content: 'Что на фото? Ответь JSON.', images: [{ mimeType, data: image }] }], 700, 55000, { geminiModels: SCAN_MODELS, timeoutMs: 22000 });
        const data = parseJson(ai.text);
        const items = (Array.isArray(data.items) ? data.items : []).slice(0, 10).map(it => ({
            name: String(it.name || 'Блюдо').slice(0, 60),
            grams: n(it.grams, 3000) || 100,
            kcal: n(it.kcal, 5000), protein: n(it.protein, 500), fat: n(it.fat, 500), carbs: n(it.carbs, 800)
        })).filter(it => it.kcal > 0 || it.grams > 0);
        return res.status(200).json({ ok: true, items, comment: String(data.comment || '').slice(0, 200) });
    } catch (error) {
        console.error('scan error:', error.message, error.details || '');  // подробности — в Vercel → Logs
        return res.status(503).json({ ok: false, error: 'AI unavailable' });
    }
};
