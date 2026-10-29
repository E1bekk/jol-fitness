// Достаём JSON из ответа ИИ (модель иногда оборачивает его в ``` или добавляет текст вокруг).
module.exports = function parseJson(text) {
    const s = String(text || '').replace(/```(?:json)?/g, '');
    const a = s.indexOf('{'), b = s.lastIndexOf('}');
    if (a < 0 || b < a) throw new Error('no json');
    return JSON.parse(s.slice(a, b + 1));
};
