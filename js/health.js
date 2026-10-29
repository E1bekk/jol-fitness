// Шаги из телефона: Android Health Connect (плагин @capgo/capacitor-health).
// Health Connect собирает шаги со всего телефона (Samsung Health, Google Fit, часы и т. д.).
// Мы только ЧИТАЕМ шаги — больше ничего не запрашиваем. На сайте шаги можно вписать вручную.
(function () {
  const H = window.JF_IS_APP && window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.Health;
  const KEY = 'jolFitnessHealth';
  const st = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; } };
  const setSt = o => { try { localStorage.setItem(KEY, JSON.stringify(Object.assign(st(), o))); } catch (e) {} };

  async function available() {
    if (!H) return { ok: false, reason: 'web' };
    try { const a = await H.isAvailable(); return { ok: !!a.available, reason: a.reason || '' }; }
    catch (e) { return { ok: false, reason: e.message }; }
  }

  // Подключение: окно Health Connect «Разрешить JOL Fitness читать шаги?»
  async function connect() {
    const a = await available();
    if (!a.ok) return a;
    try {
      await H.requestAuthorization({ read: ['steps'], write: [] });
      const s = await H.checkAuthorization({ read: ['steps'], write: [] });
      const ok = (s.readAuthorized || []).includes('steps');
      setSt({ connected: ok });
      if (ok) await sync(14);
      return { ok, reason: ok ? '' : 'denied' };
    } catch (e) { return { ok: false, reason: e.message }; }
  }

  // Шаги по дням за последние N дней → в дневник (JF.setSteps)
  let busy = null;
  function sync(days) {
    if (!H || !st().connected) return Promise.resolve(false);
    if (busy) return busy;
    busy = (async () => {
      try {
        const end = new Date(), start = new Date();
        start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - ((days || 7) - 1));
        const r = await H.queryAggregated({ dataType: 'steps', startDate: start.toISOString(), endDate: end.toISOString(), bucket: 'day', aggregation: 'sum' });
        let changed = false;
        (r.samples || []).forEach(s => { changed = JF.setSteps(JF.dayKey(new Date(s.startDate)), s.value) || changed; });
        setSt({ last: Date.now() });
        return changed;
      } catch (e) {
        console.warn('steps sync', e);
        if (/permission|authoriz|security/i.test(e.message || '')) setSt({ connected: false });
        return false;
      } finally { busy = null; }
    })();
    return busy;
  }

  if (H) {
    setTimeout(() => sync(7).then(ch => { if (ch) document.dispatchEvent(new CustomEvent('jf:resume-data')); }), 2500);
    document.addEventListener('jf:resume', () => sync(3).then(ch => { if (ch) document.dispatchEvent(new CustomEvent('jf:resume-data')); }));
  }

  window.JF_health = {
    supported: !!H,
    get connected() { return !!st().connected; },
    get lastSync() { return st().last || 0; },
    available, connect, sync,
    disconnect() { setSt({ connected: false }); },
    openSettings() { if (H && H.openHealthConnectSettings) return H.openHealthConnectSettings(); }
  };
})();
