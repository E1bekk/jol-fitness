// Простая защита бесплатного лимита ИИ: не больше N запросов в минуту с одного адреса.
// Счётчик живёт в памяти функции Vercel — этого хватает, чтобы отсечь случайный спам.
const hits = new Map();

module.exports = function tooMany(req, perMinute) {
    const ip = String(req.headers['x-forwarded-for'] || req.socket && req.socket.remoteAddress || '?').split(',')[0].trim();
    const now = Date.now();
    const list = (hits.get(ip) || []).filter(t => now - t < 60000);
    list.push(now);
    hits.set(ip, list);
    if (hits.size > 5000) hits.clear();
    return list.length > perMinute;
};
