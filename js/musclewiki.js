// Asks the FITAI server (which holds the API key) for a MuscleWiki demo. Successful lookups are cached in localStorage.
const KEY = 'fitai_mw_cache', TTL = 30 * 864e5, pending = {};
const store = (() => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } })();
export function getDemo(name) {
  const c = store[name]; if (c && Date.now() - c.t < TTL) return Promise.resolve(c.d);
  return pending[name] ??= fetch(`/api/musclewiki/exercise-video?name=${encodeURIComponent(name)}`)
    .then(r => r.json())
    .then(d => { if (d.found) { store[name] = { t: Date.now(), d }; try { localStorage.setItem(KEY, JSON.stringify(store)); } catch { /* storage full */ } } return d; })
    .catch(() => ({ found: false, reason: 'network' }))
    .finally(() => { delete pending[name]; });
}
