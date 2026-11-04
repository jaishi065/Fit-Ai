'use strict';
// FITAI server: serves the static app and a small MuscleWiki proxy so the API key never reaches the browser.
const http = require('http'), fs = require('fs'), path = require('path'), { Readable } = require('stream');
const ROOT = __dirname;
try { for (const l of fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split(/\r?\n/)) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i); if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2'); } } catch { /* no .env file */ }
const KEY = process.env.MUSCLEWIKI_API_KEY, PORT = +process.env.PORT || 3000;
const BASE = (process.env.MUSCLEWIKI_BASE_URL || 'https://api.musclewiki.com').replace(/\/$/, '');
const CACHE_FILE = path.join(ROOT, 'cache', 'musclewiki.json'), TTL = 30 * 864e5; // metadata only; video bytes are never stored
let cache = {}; try { cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')); } catch { /* first run */ }
const save = () => { try { fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true }); fs.writeFileSync(CACHE_FILE, JSON.stringify(cache)); } catch { /* read-only disk: memory cache only */ } };

class ApiError extends Error { constructor(status) { super('MuscleWiki ' + status); this.status = status; } }
async function mw(p) {
  const r = await fetch(BASE + p, { headers: { 'X-API-Key': KEY, Accept: 'application/json' }, signal: AbortSignal.timeout(10000) });
  if (!r.ok) throw new ApiError(r.status);
  return r.json();
}
const stem = w => w.replace(/s$/, '');
const words = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter(Boolean).map(stem);
function pick(list, name) { // exact name first, else the shortest name containing every word; never a loose guess
  const q = words(name), key = q.join(' ');
  const ok = list.filter(x => x && x.id != null && x.name);
  return ok.find(x => words(x.name).join(' ') === key) || ok.filter(x => q.every(w => words(x.name).includes(w))).sort((a, b) => a.name.length - b.name.length)[0] || null;
}
const urlOf = v => typeof v === 'string' ? v : v && Object.values(v).find(x => typeof x === 'string' && /\.(mp4|webm|mov)(\?|$)|\/stream\//i.test(x));
const proxied = u => { try { const x = new URL(u, BASE); return x.origin === new URL(BASE).origin && x.pathname.startsWith('/stream/videos/') ? '/api/musclewiki' + x.pathname : null; } catch { return null; } };
function toVideos(arr) { // field names are not documented, so read gender/angle from the video object text (and filename) and prefer male + front
  return arr.map(v => { const u = urlOf(v), src = u && proxied(u); if (!src) return null;
    const t = (JSON.stringify(v) + ' ' + src).toLowerCase(), female = /female/.test(t), male = !female && /male/.test(t), front = /front/.test(t), side = /side/.test(t);
    return { src, score: (male ? 4 : 0) + (front ? 3 : 0) + (side ? 1 : 0), label: [female ? 'female' : male ? 'male' : '', front ? 'front' : side ? 'side' : ''].filter(Boolean).join(' ') }; })
    .filter(Boolean).sort((a, b) => b.score - a.score).map(({ src, label }) => ({ src, label }));
}
async function lookup(name) {
  const k = words(name).join(' '), hit = cache[k]; if (hit && Date.now() - hit.t < TTL) return hit.d;
  const s = await mw(`/search?q=${encodeURIComponent(name)}&limit=10`);
  const ex = pick(Array.isArray(s) ? s : s.results || [], name); if (!ex) return { found: false, reason: 'not_found' };
  const v = await mw(`/exercises/${ex.id}/videos`);
  const videos = toVideos(Array.isArray(v) ? v : v.videos || v.results || []); if (!videos.length) return { found: false, reason: 'no_video' };
  const d = { found: true, exerciseId: ex.id, name: ex.name, primaryMuscles: ex.primary_muscles || [], steps: ex.steps || [], videos };
  cache[k] = { t: Date.now(), d }; save(); return d;
}
const json = (res, code, o) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(o)); };
async function stream(req, res, p) { // transparent pass-through (range requests supported); headers forwarded unchanged, nothing written to disk
  const h = { 'X-API-Key': KEY }; for (const k of ['range', 'if-range']) if (req.headers[k]) h[k] = req.headers[k];
  const ctl = new AbortController(); req.on('close', () => ctl.abort());
  const up = await fetch(BASE + p, { headers: h, signal: ctl.signal });
  const out = {}; for (const k of ['content-type', 'content-length', 'content-range', 'accept-ranges', 'cache-control', 'etag', 'last-modified']) { const v = up.headers.get(k); if (v) out[k] = v; }
  res.writeHead(up.status, out); up.body ? Readable.fromWeb(up.body).pipe(res) : res.end();
}
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json' };
http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x'), p = decodeURIComponent(u.pathname);
  try {
    if (p === '/api/musclewiki/exercise-video') {
      if (!KEY) return json(res, 503, { found: false, reason: 'not_configured' });
      const name = (u.searchParams.get('name') || '').trim(); if (!name || name.length > 80) return json(res, 400, { found: false, reason: 'bad_request' });
      return json(res, 200, await lookup(name));
    }
    if (p.startsWith('/api/musclewiki/stream/videos/')) {
      const rest = p.slice('/api/musclewiki'.length);
      if (!KEY || p.includes('..') || !/^\/stream\/videos\/[\w\-./ ]+$/.test(rest)) return json(res, 400, { error: 'bad_request' });
      return await stream(req, res, rest.split('/').map(encodeURIComponent).join('/'));
    }
    const rel = p === '/' ? 'index.html' : p.slice(1);
    if (!/^(index\.html|(css|js|assets)\/[\w\-./]+)$/.test(rel) || rel.includes('..')) { res.writeHead(404); return res.end('Not found'); }
    fs.readFile(path.join(ROOT, rel), (e, b) => e ? (res.writeHead(404), res.end('Not found')) : (res.writeHead(200, { 'Content-Type': MIME[path.extname(rel)] || 'application/octet-stream' }), res.end(b)));
  } catch (e) {
    if (res.headersSent) return res.end();
    const s = e.status; json(res, 200, { found: false, reason: s === 401 || s === 403 ? 'auth' : s === 429 ? 'quota' : 'upstream' });
  }
}).listen(PORT, () => console.log(`FITAI running at http://localhost:${PORT}` + (KEY ? '' : '  (MUSCLEWIKI_API_KEY not set: demo videos disabled)')));
