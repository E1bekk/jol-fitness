// Диагностика ИИ: https://jol-fitness.vercel.app/api/ai-status
// Проверяет, заданы ли ключи, какие модели Gemini доступны, и пробует каждую модель коротким запросом.
// Сами ключи никогда не выводятся.
const { askGemini, askGroq, GEMINI_MODELS, GROQ_MODELS } = require('./_ai');

module.exports = async (req, res) => {
    const out = {
        keys: { GEMINI_API_KEY: !!process.env.GEMINI_API_KEY, GROQ_API_KEY: !!process.env.GROQ_API_KEY },
        geminiAvailableFlash: null,
        tests: []
    };

    if (process.env.GEMINI_API_KEY) {
        try {
            const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?pageSize=200&key=${process.env.GEMINI_API_KEY}`);
            const d = await r.json();
            out.geminiAvailableFlash = r.ok
                ? (d.models || []).map(m => m.name.replace('models/', '')).filter(n => /flash|gemma/i.test(n))
                : `error ${r.status}: ${(d.error && d.error.message) || ''}`.slice(0, 300);
        } catch (e) { out.geminiAvailableFlash = 'error: ' + e.message; }
    }

    const sys = 'Отвечай одним словом.';
    const msg = [{ role: 'user', content: 'Сколько будет 2+2? Ответь цифрой.' }];
    for (const m of GEMINI_MODELS) {
        const t = Date.now();
        try { const a = await askGemini(m, sys, msg, 100); out.tests.push({ model: 'gemini:' + m, ok: true, ms: Date.now() - t, answer: a.slice(0, 40) }); }
        catch (e) { out.tests.push({ model: 'gemini:' + m, ok: false, error: e.message.slice(0, 300) }); }
    }
    for (const m of GROQ_MODELS) {
        const t = Date.now();
        try { const a = await askGroq(m, sys, msg, 100); out.tests.push({ model: 'groq:' + m, ok: true, ms: Date.now() - t, answer: a.slice(0, 40) }); }
        catch (e) { out.tests.push({ model: 'groq:' + m, ok: false, error: e.message.slice(0, 300) }); }
    }

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(out);
};
