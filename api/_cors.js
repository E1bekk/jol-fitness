// Разрешаем запросы к API из Android-приложения (адрес https://localhost) и с сайта.
// Возвращает true, если это был предварительный запрос OPTIONS и отвечать дальше не нужно.
const ALLOWED = ['https://localhost', 'http://localhost', 'capacitor://localhost'];

module.exports = function cors(req, res) {
    const origin = req.headers.origin || '';
    if (ALLOWED.includes(origin) || /^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(origin) || /^http:\/\/localhost:\d+$/.test(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Vary', 'Origin');
    }
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Max-Age', '86400');
    if (req.method === 'OPTIONS') { res.status(204).end(); return true; }
    return false;
};
