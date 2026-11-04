import { toast } from './utils.js';
// Embedded YouTube player with automatic fallback to the next video when embedding is blocked (error 101/150) or the video is gone.
// Add verified IDs here: { 'Push Up': ['id1', 'id2'] }. Users can also paste links per exercise (stored in localStorage).
export const SEED = {};
const KEY = 'fitai_videos';
const mine = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
export const idFromUrl = u => ((u.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([\w-]{11})/) || [])[1]) || (/^[\w-]{11}$/.test(u.trim()) ? u.trim() : null);
const idsFor = n => [...(mine()[n] || []), ...(SEED[n] || [])];
let apiP;
const loadAPI = () => apiP ??= new Promise((ok, no) => { if (window.YT?.Player) return ok(window.YT);
  window.onYouTubeIframeAPIReady = () => ok(window.YT); const s = document.createElement('script'); s.src = 'https://www.youtube.com/iframe_api'; s.onerror = () => { apiP = null; no(); }; document.head.append(s); });
export function mountVideo(el, name) {
  const ids = idsFor(name);
  if (!ids.length) {
    el.innerHTML = `<div class="vph"><b>Demo video</b><p class="mute">No video is set for this exercise yet. Paste a YouTube link to play it here.</p><div class="row"><input aria-label="YouTube link" placeholder="https://youtube.com/watch?v=..."><button class="pri">Save video</button></div></div>`;
    el.querySelector('button').onclick = () => { const id = idFromUrl(el.querySelector('input').value.trim()); if (!id) return toast('That does not look like a YouTube link.');
      const m = mine(); m[name] = [...(m[name] || []), id]; try { localStorage.setItem(KEY, JSON.stringify(m)); } catch { return toast('Could not save the video.'); } mountVideo(el, name); };
    return;
  }
  el.innerHTML = '<div class="vwrap"><div></div></div>';
  loadAPI().then(YT => { let i = 0; const p = new YT.Player(el.querySelector('.vwrap div'), { videoId: ids[0], width: '100%', height: '100%', playerVars: { rel: 0, playsinline: 1 },
    events: { onError: () => { if (++i < ids.length) p.loadVideoById(ids[i]); else el.innerHTML = '<p class="mute">This video can\'t be played here.</p>'; } } }); })
    .catch(() => { el.innerHTML = '<p class="mute">Video could not load. Check your connection.</p>'; });
}
