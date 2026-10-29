// Общий ИИ-модуль JOL Fitness (тот же, что в JOL-Bilim).
// Общий ИИ-модуль: сначала Gemini, если он недоступен или упёрся в лимит — Groq.
// Файл начинается с "_", поэтому Vercel не делает из него отдельный эндпоинт.
// Ключи берутся из переменных окружения Vercel: GEMINI_API_KEY и GROQ_API_KEY.

const GEMINI_MODELS = (process.env.GEMINI_MODELS || 'gemini-3.8-flash,gemini-3.5-flash-lite,gemini-flash-latest')
    .split(',').map(s => s.trim()).filter(Boolean);
const GROQ_MODELS = (process.env.GROQ_MODELS || 'openai/gpt-oss-120b,openai/gpt-oss-20b')
    .split(',').map(s => s.trim()).filter(Boolean);

async function withTimeout(promise, ms) {
    let t;
    const timeout = new Promise((_, rej) => { t = setTimeout(() => rej(new Error('timeout')), ms); });
    try { return await Promise.race([promise, timeout]); } finally { clearTimeout(t); }
}

async function askGemini(model, system, messages, maxTokens, timeoutMs) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error('GEMINI_API_KEY not set');
    const base = {
        systemInstruction: { parts: [{ text: system }] },
        contents: messages.map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [
                ...(m.images || []).map(img => ({ inlineData: { mimeType: img.mimeType, data: img.data } })),
                { text: m.content || ' ' }
            ]
        }))
    };
    // Новые модели «думают» перед ответом, и эти токены входят в лимит ответа — даём запас
    const variants = [
        { temperature: 0.4, maxOutputTokens: maxTokens + 2000, thinkingConfig: { thinkingLevel: 'low' } },
        { temperature: 0.4, maxOutputTokens: maxTokens + 2000 }
    ];
    let lastErr;
    for (const generationConfig of variants) {
        const r = await withTimeout(fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
            { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...base, generationConfig }) }
        ), timeoutMs || 20000);
        const data = await r.json().catch(() => ({}));
        if (!r.ok) {
            lastErr = new Error(`Gemini ${model} ${r.status}: ${(data.error && data.error.message) || ''}`.slice(0, 300));
            // 400 из-за настроек «размышлений» — пробуем без них; остальные ошибки (лимит, 404) — сразу дальше
            if (r.status === 400 && /think/i.test(lastErr.message)) continue;
            throw lastErr;
        }
        const parts = (((data.candidates || [])[0] || {}).content || {}).parts || [];
        const out = parts.filter(p => !p.thought).map(p => p.text || '').join('').trim();
        if (!out) throw new Error(`Gemini ${model}: empty answer`);
        return out;
    }
    throw lastErr;
}

async function askGroq(model, system, messages, maxTokens) {
    const key = process.env.GROQ_API_KEY;
    if (!key) throw new Error('GROQ_API_KEY not set');
    const body = {
        model,
        messages: [{ role: 'system', content: system }, ...messages.map(m => ({ role: m.role, content: m.content }))],
        temperature: 0.4,
        max_tokens: maxTokens + 800 // запас на «размышления» у gpt-oss
    };
    if (model.startsWith('openai/gpt-oss')) body.reasoning_effort = 'low';
    const r = await withTimeout(fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
        body: JSON.stringify(body)
    }), 20000);
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(`Groq ${model} ${r.status}: ${(data.error && data.error.message) || ''}`.slice(0, 300));
    let out = (((data.choices || [])[0] || {}).message || {}).content || '';
    out = out.replace(/<think>[\s\S]*?<\/think>/g, '').trim(); // у Qwen бывают «мысли» в тексте
    if (!out) throw new Error(`Groq ${model}: empty answer`);
    return out;
}


// Groq с картинками (запасной вариант для сканера еды, если Gemini перегружен)
const GROQ_VISION_MODELS = (process.env.GROQ_VISION_MODELS || 'meta-llama/llama-4-scout-17b-16e-instruct,meta-llama/llama-4-maverick-17b-128e-instruct')
    .split(',').map(s => s.trim()).filter(Boolean);

async function askGroqVision(model, system, messages, maxTokens, timeoutMs) {
    const key = process.env.GROQ_API_KEY;
    if (!key) throw new Error('GROQ_API_KEY not set');
    const body = {
        model,
        messages: [{ role: 'system', content: system }, ...messages.map(m => ({
            role: m.role,
            content: [
                { type: 'text', text: m.content || ' ' },
                ...(m.images || []).map(img => ({ type: 'image_url', image_url: { url: `data:${img.mimeType};base64,${img.data}` } }))
            ]
        }))],
        temperature: 0.3,
        max_tokens: maxTokens
    };
    const r = await withTimeout(fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
        body: JSON.stringify(body)
    }), timeoutMs || 25000);
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(`Groq ${model} ${r.status}: ${(data.error && data.error.message) || ''}`.slice(0, 300));
    const out = ((((data.choices || [])[0] || {}).message || {}).content || '').trim();
    if (!out) throw new Error(`Groq ${model}: empty answer`);
    return out;
}

// Спрашиваем по очереди: Gemini (модели по списку) -> Groq (модели по списку).
// Фото понимает только Gemini, поэтому с картинками Groq не используется.
// deadlineMs — общий предел времени, чтобы запрос не висел дольше, чем живёт функция Vercel.
// opts.geminiModels — свой порядок моделей Gemini (например, для фото — сначала быстрая),
// opts.timeoutMs — сколько ждать одну модель.
async function askAI(system, messages, maxTokens = 700, deadlineMs = 45000, opts = {}) {
    const started = Date.now();
    const timeLeft = () => deadlineMs - (Date.now() - started);
    const hasImages = messages.some(m => m.images && m.images.length);
    const per = opts.timeoutMs || 20000;
    const gem = (opts.geminiModels || GEMINI_MODELS).map(m => ({ name: 'gemini:' + m, run: t => askGemini(m, system, messages, maxTokens, t) }));
    let order;
    if (hasImages) {
        // фото: две модели Gemini, потом Groq с картинками, потом остальные Gemini
        const gv = GROQ_VISION_MODELS.map(m => ({ name: 'groq:' + m, run: t => askGroqVision(m, system, messages, maxTokens, t) }));
        order = [...gem.slice(0, 2), ...gv, ...gem.slice(2)];
    } else {
        const gq = GROQ_MODELS.map(m => ({ name: 'groq:' + m, run: () => askGroq(m, system, messages, maxTokens) }));
        order = [...gem, ...gq];
    }
    const errors = [];
    for (const step of order) {
        if (timeLeft() < 3000) break;
        try {
            const text = await step.run(Math.min(per, timeLeft() - 1000));
            if (errors.length) console.warn('AI fallback to', step.name, 'after errors:', errors); // видно в логах Vercel
            return { text, provider: step.name };
        } catch (e) { errors.push(e.message); }
    }
    const err = new Error('All AI providers failed');
    err.details = errors;
    throw err;
}

// Убираем markdown-разметку: на сайте и в боте показываем обычный текст
function plainText(s) {
    return s
        .replace(/```[\s\S]*?```/g, m => m.replace(/```\w*/g, ''))
        .replace(/\*\*(.+?)\*\*/g, '$1')
        .replace(/__(.+?)__/g, '$1')
        .replace(/^#{1,6}\s*/gm, '')
        .replace(/^\s*[-*]\s+/gm, '• ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

module.exports = { askAI, plainText, askGemini, askGroq, askGroqVision, GEMINI_MODELS, GROQ_MODELS, GROQ_VISION_MODELS };
