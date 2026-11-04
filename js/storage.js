// Single data-access layer: swap bodies for fetch('/api/...') when a backend exists.
const K = k => 'fitai_' + k;
const get = (k, d) => { try { const v = localStorage.getItem(K(k)); return v ? JSON.parse(v) : d; } catch { return d; } };
const set = (k, v) => { try { localStorage.setItem(K(k), JSON.stringify(v)); return true; } catch { return false; } };
export const getUser = () => get('user', null);             // GET /api/user
export const saveUser = u => set('user', u);                // PUT /api/user
export const getPlan = () => get('workout_plan', null);     // GET /api/workouts
export const savePlan = p => set('workout_plan', p);        // POST /api/workouts
export const getHistory = () => get('workout_history', []); // GET /api/workout-history
export const saveHistory = h => set('workout_history', h);  // POST /api/workout-history
export const getProgress = () => get('progress', []);       // GET /api/progress
export const saveProgress = p => set('progress', p);        // POST /api/progress
export const getFavorites = () => get('favorites', []);
export const saveFavorites = f => set('favorites', f);
export const getSettings = () => get('settings', { theme: 'light' });
export const saveSettings = s => set('settings', s);
export const exportAll = () => Object.fromEntries(['user','settings','workout_plan','workout_history','progress','favorites'].map(k => [k, get(k, null)]));
export const clearAll = () => Object.keys(localStorage).filter(k => k.startsWith('fitai_')).forEach(k => localStorage.removeItem(k));
