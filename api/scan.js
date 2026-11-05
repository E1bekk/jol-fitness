// Сканер еды: фото тарелки -> список блюд с весом, калориями и БЖУ.
// Фото анализирует Gemini (умеет работать с картинками), запасной вариант — Groq с картинками.
// Чтобы цифры были точнее:
//  • ИИ получает справочник калорийности (на 100 г) — в том числе блюда Кыргызстана;
//  • ИИ оценивает вес по размеру тарелки/приборов и учитывает масло и соусы;
//  • человек может добавить подсказку («это 2 манты», «порция 400 г») и пересчитать;
//  • калории сверяются с БЖУ (4 ккал на 1 г белка и углеводов, 9 — на 1 г жира).
// Фото нигде не сохраняется.
const cors = require('./_cors');
const tooMany = require('./_limit');
const parseJson = require('./_json');
const { askAI } = require('./_ai');

// Для фото сначала модели посильнее (точнее распознают), потом быстрые; все с ограничением по времени.
const SCAN_MODELS = (process.env.SCAN_MODELS || 'gemini-3.7-flash,gemini-2.5-flash,gemini-3.5-flash-lite,gemini-3.8-flash')
    .split(',').map(s => s.trim()).filter(Boolean);

const clip = (v, n) => String(v == null ? '' : v).slice(0, n);
const n = (v, max) => { const x = Math.round(Number(v) * 10) / 10; return isFinite(x) && x >= 0 ? Math.min(x, max) : 0; };

function system(ref) {
    return [
        'Ты — опытный нутрициолог. По фото еды определи блюда и оцени их вес и пищевую ценность максимально точно.',
        'Действуй по шагам:',
        '1) Найди на фото каждое отдельное блюдо или продукт (гарнир, мясо, салат, хлеб, соус, напиток — отдельными пунктами). Сложное блюдо (плов, лагман, манты, бешбармак, суп) — одним пунктом.',
        '2) Оцени вес каждого пункта в граммах по размеру: обычная тарелка — 24–26 см, глубокая миска — 300–400 мл, ложка, вилка, ладонь, стакан 250 мл. Для штучной еды считай штуки (1 манта ≈ 50–60 г, 1 самса ≈ 120 г, 1 яйцо ≈ 55 г, кусок хлеба ≈ 30 г).',
        '3) Посчитай калории и БЖУ для всей порции, а не на 100 г. Учитывай видимое масло, жир, соусы, сахар.',
        '4) Если блюдо есть в справочнике ниже — опирайся на его значения на 100 г и умножай на вес.',
        'Учитывай кухню Кыргызстана и Центральной Азии: плов, лагман, манты, бешбармак, самса, боорсок, куурдак, чучвара, шорпо, ашлянфу, лепёшка (нан), курут, кымыз.',
        'Справочник (на 100 г: ккал/белки/жиры/углеводы): ' + (ref || 'нет'),
        'Если человек дал подсказку — она важнее того, что видно на фото.',
        'Ответ — ТОЛЬКО JSON:',
        '{"items":[{"name":"Плов","grams":300,"kcal":520,"protein":18,"fat":24,"carbs":62,"confidence":"high"}],"comment":"короткий совет на русском до 140 символов"}',
        'name — по-русски, коротко. confidence — high, medium или low (насколько уверен в весе и составе). Числа без единиц.',
        'Если еды на фото нет — верни {"items":[],"comment":"На фото не видно еды"}.'
    ].join('\n');
}

module.exports = async (req, res) => {
    if (cors(req, res)) return;
    if (req.method !== 'POST') { res.setHeader('Allow', ['POST']); return res.status(405).json({ ok: false, error: 'Method Not Allowed' }); }
    if (tooMany(req, 12)) return res.status(429).json({ ok: false, error: 'Too many requests' });

    const b = req.body || {};
    const image = typeof b.image === 'string' ? b.image.replace(/^data:[^,]+,/, '') : '';
    const mimeType = /^image\/(jpeg|png|webp)$/.test(b.mimeType) ? b.mimeType : 'image/jpeg';
    if (!image || image.length < 1000) return res.status(400).json({ ok: false, error: 'No image' });
    if (image.length > 4_000_000) return res.status(413).json({ ok: false, error: 'Image too large' });
    const hint = clip(b.hint, 300).trim();
    const ref = clip(b.ref, 5000);

    const question = 'Что на фото? Оцени вес, калории и БЖУ. Ответь JSON.' + (hint ? `\nПодсказка от человека: ${hint}` : '');
    try {
        const ai = await askAI(system(ref), [{ role: 'user', content: question, images: [{ mimeType, data: image }] }], 900, 56000,
            { geminiModels: SCAN_MODELS, timeoutMs: 20000, json: true });
        const data = parseJson(ai.text);
        const items = (Array.isArray(data.items) ? data.items : []).slice(0, 10).map(it => {
            const o = {
                name: clip(it.name, 60) || 'Блюдо',
                grams: n(it.grams, 3000) || 100,
                kcal: n(it.kcal, 5000), protein: n(it.protein, 500), fat: n(it.fat, 500), carbs: n(it.carbs, 800),
                confidence: ['high', 'medium', 'low'].includes(it.confidence) ? it.confidence : 'medium'
            };
            // сверяем калории с БЖУ: если расходятся больше чем на 25% — считаем по БЖУ
            const byMacros = o.protein * 4 + o.carbs * 4 + o.fat * 9;
            if (byMacros > 0 && (o.kcal === 0 || Math.abs(o.kcal - byMacros) / byMacros > 0.25)) o.kcal = Math.round(byMacros);
            return o;
        }).filter(it => it.kcal > 0 || it.grams > 0);
        return res.status(200).json({ ok: true, items, comment: clip(data.comment, 200), provider: ai.provider });
    } catch (error) {
        console.error('scan error:', error.message, error.details || '');
        return res.status(503).json({ ok: false, error: 'AI unavailable' });
    }
};
