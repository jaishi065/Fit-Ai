import * as S from './storage.js';
import { EXERCISES, GOALS, LEVELS, EQUIPMENT, DAYS } from './data.js';
import { $, view, esc, toast } from './utils.js';
import { session, stopSession } from './session.js';
import { mountDemo } from './exercise-info.js';

// Rule-based plan generator. Swap the body for an API call later.
export function generatePlan(p) {
  const lvl = LEVELS.indexOf(p.level), n = p.days.length;
  let splits = n <= 3 ? [['Full Body', ['Chest','Back','Legs','Shoulders','Core']]]
    : n === 4 ? [['Upper Body', ['Chest','Back','Shoulders','Arms']], ['Lower Body', ['Legs','Core']]]
    : [['Push', ['Chest','Shoulders','Arms']], ['Pull', ['Back','Arms','Core']], ['Legs', ['Legs','Core']]];
  if (p.goal === 'Improve Mobility') splits = [['Mobility Flow', ['Mobility','Core','Legs']]];
  const have = e => p.equipment.includes('Full Gym') || e.equipment === 'Bodyweight' || p.equipment.includes(e.equipment);
  const count = Math.max(3, Math.min(9, Math.round(p.minutes / 8)));
  const reps = { 'Build Strength': 6, 'Build Muscle': 10, 'Lose Fat': 15 }[p.goal];
  const sets = p.goal === 'Improve Mobility' ? 2 : 2 + (lvl > 0) + (p.minutes >= 60);
  const workouts = p.days.map((day, i) => {
    const [title, muscles] = splits[i % splits.length];
    const pool = EXERCISES.filter(e => have(e) && LEVELS.indexOf(e.difficulty) <= lvl && (muscles.includes(e.muscle) || (p.goal === 'Lose Fat' && e.muscle === 'Cardio')))
      .sort((a, b) => muscles.indexOf(a.muscle) - muscles.indexOf(b.muscle));
    const rank = m => ['Core', 'Cardio'].indexOf(m) < 0 ? 2 : ['Core', 'Cardio'].indexOf(m);
    if (pool.length < count) pool.push(...EXERCISES.filter(e => have(e) && LEVELS.indexOf(e.difficulty) <= lvl && e.muscle !== 'Mobility' && !pool.includes(e)).sort((a, b) => rank(a.muscle) - rank(b.muscle)));
    const picked = new Set(); for (let k = 0; k < pool.length * 2 && picked.size < Math.min(count, pool.length); k++) picked.add(pool[(k + i) % pool.length]);
    const ex = [...picked].map(e => ({ id: e.id, name: e.name, sets, reps: reps && !['Core','Cardio','Mobility'].includes(e.muscle) ? reps : e.reps, rest: p.goal === 'Build Strength' ? 120 : e.rest }));
    return { day, title, difficulty: p.level, minutes: Math.round(ex.reduce((t, e) => t + e.sets * (e.rest + 40) / 60, 0)) + 5, exercises: ex, done: false };
  });
  return { createdAt: Date.now(), week: 1, workouts };
}

const routes = { dashboard, workouts, exercises, session, progress, settings };
function nav(active) {
  $('#nav').innerHTML = '<b>FIT<i>AI</i></b>' + Object.keys(routes).filter(r => r !== 'session').map(r => `<a href="#${r}" class="${r === active ? 'on' : ''}">${r[0].toUpperCase() + r.slice(1)}</a>`).join('');
}
function route() {
  stopSession();
  const user = S.getUser(), name = location.hash.slice(1).split('/')[0] || 'dashboard';
  if (S.getSettings().theme === 'dark') document.documentElement.dataset.theme = 'dark'; else delete document.documentElement.dataset.theme;
  if (!user) return onboarding();
  document.body.classList.remove('bare'); nav(name === 'session' ? '' : name); (routes[name] || dashboard)(user);
}
function weekDone() { const now = new Date(), mon = new Date(now); mon.setDate(now.getDate() - ((now.getDay() + 6) % 7)); mon.setHours(0, 0, 0, 0);
  return S.getHistory().filter(x => x.date >= mon.getTime()).map(x => (new Date(x.date).getDay() + 6) % 7); }
function streak() { const d = new Set(S.getHistory().map(x => new Date(x.date).toDateString())); let n = 0, c = new Date(); if (!d.has(c.toDateString())) c.setDate(c.getDate() - 1); while (d.has(c.toDateString())) { n++; c.setDate(c.getDate() - 1); } return n; }

function dashboard(user) {
  const plan = S.getPlan(), h = S.getHistory(), done = weekDone(), w = S.getProgress(), cur = w.length ? w[w.length - 1].weight : user.weight;
  const idx = plan ? Math.max(0, plan.workouts.findIndex(x => !x.done)) : 0, next = plan && plan.workouts[idx];
  const hr = new Date().getHours(), greet = hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening';
  const span = Math.abs(user.target - user.startWeight), prog = span ? Math.min(100, Math.round(Math.abs(cur - user.startWeight) / span * 100)) : 100;
  const mins = h.reduce((t, x) => t + x.minutes, 0);
  view.innerHTML = `<h1>${greet}, ${esc(user.name)}</h1><p class="mute">Goal: ${esc(user.goal)}</p>
  <div class="card"><h2>Today's workout</h2>${next ? `<p><b>${esc(next.title)}</b> · ${next.minutes} min · ${next.exercises.length} exercises (${next.day})</p><a class="btn pri" href="#session/${idx}">Start workout</a>` : '<p>No plan yet.</p>'}</div>
  <div class="grid"><div class="card stat"><span class="mute">Workouts completed</span><b>${h.length}</b></div>
  <div class="card stat"><span class="mute">Calories burned</span><b>${h.reduce((t, x) => t + x.calories, 0).toLocaleString()}</b></div>
  <div class="card stat"><span class="mute">Total time</span><b>${Math.floor(mins / 60)}h ${mins % 60}m</b></div>
  <div class="card stat"><span class="mute">Streak</span><b>${streak()} days</b></div></div>
  <div class="grid two"><div class="card"><h2>This week</h2><div class="days">${DAYS.map((d, i) => `<span class="${done.includes(i) ? 'done' : ''}">${d}</span>`).join('')}</div></div>
  <div class="card"><h2>Weight</h2><p>${cur} kg now · goal ${user.target} kg</p><div class="bar"><i style="width:${prog}%"></i></div></div></div>`;
}

function workouts() {
  const plan = S.getPlan(); if (!plan) return view.innerHTML = '<h1>My workouts</h1><p>No program yet.</p>';
  view.innerHTML = `<h1>My workouts</h1><p class="mute">Week ${plan.week} of 4</p><div class="grid">${plan.workouts.map((w, i) => `<div class="card"><p class="mute">${w.day}</p><h2>${esc(w.title)} ${w.done ? '✓' : ''}</h2>
  <p>${w.minutes} min · ${w.exercises.length} exercises · ${w.difficulty}</p><ul class="mute" style="padding-left:18px">${w.exercises.map(e => `<li>${esc(e.name)}: ${e.sets} × ${e.reps}</li>`).join('')}</ul>
  <a class="btn pri" href="#session/${i}">Start workout</a></div>`).join('')}</div>`;
}

function exercises() {
  const fav = new Set(S.getFavorites()), f = { q: '', m: '', e: '', d: '' };
  const opts = a => '<option value="">All</option>' + [...new Set(a)].map(x => `<option>${x}</option>`).join('');
  view.innerHTML = `<h1>Exercise library</h1><div class="row"><input id="q" type="search" placeholder="Search exercises..." aria-label="Search exercises">
  <select id="m" aria-label="Muscle">${opts(EXERCISES.map(e => e.muscle))}</select><select id="e" aria-label="Equipment">${opts(EXERCISES.map(e => e.equipment))}</select><select id="d" aria-label="Difficulty">${opts(LEVELS)}</select></div><div id="list" class="grid"></div>`;
  const draw = () => { const r = EXERCISES.filter(x => x.name.toLowerCase().includes(f.q) && (!f.m || x.muscle === f.m) && (!f.e || x.equipment === f.e) && (!f.d || x.difficulty === f.d));
    $('#list').innerHTML = r.length ? r.map(x => `<div class="card"><h2>${x.name}</h2><p class="mute">${x.muscle} · ${x.equipment} · ${x.difficulty}</p><p>${x.sets} × ${x.reps} · ${x.rest}s rest</p>
    <div class="row"><button data-view="${x.id}">View</button><button data-fav="${x.id}" aria-pressed="${fav.has(x.id)}">${fav.has(x.id) ? '★ Favorited' : '☆ Favorite'}</button></div></div>`).join('') : '<p class="mute">No exercises match. Try clearing a filter.</p>'; };
  view.querySelectorAll('input,select').forEach(el => el.oninput = () => { f[el.id] = el.id === 'q' ? el.value.trim().toLowerCase() : el.value; draw(); });
  $('#list').onclick = ev => { const vw = +ev.target.dataset.view; if (vw) return openExercise(EXERCISES.find(x => x.id === vw)); const id = +ev.target.dataset.fav; if (!id) return; fav.has(id) ? fav.delete(id) : fav.add(id); S.saveFavorites([...fav]); draw(); toast('Favorites updated.'); };
  draw();
}

function openExercise(x) {
  const d = document.createElement('dialog');
  d.innerHTML = `<div class="row" style="justify-content:space-between"><h2>${x.name}</h2><button aria-label="Close">✕</button></div><p class="mute">${x.muscle} · ${x.equipment} · ${x.difficulty}</p><div id="dm"></div>`;
  d.querySelector('button').onclick = () => d.close(); d.onclose = () => d.remove(); document.body.append(d); d.showModal(); mountDemo(d.querySelector('#dm'), x, false);
}

function progress(user) {
  const w = S.getProgress();
  view.innerHTML = `<h1>Progress</h1><div class="card"><h2>Weight</h2>${w.length ? '<canvas id="c" role="img" aria-label="Weight over time"></canvas>' : '<p>No progress data yet. Add your first entry below.</p>'}</div>
  <form id="f" class="card row" style="margin-top:16px"><label>Weight (kg) <input name="w" type="number" step="0.1" required></label><button class="pri">Add entry</button></form>`;
  $('#f').onsubmit = ev => { ev.preventDefault(); const v = parseFloat(ev.target.w.value); if (!(v >= 20 && v <= 400)) return toast('Enter a weight between 20 and 400 kg.');
    w.push({ date: Date.now(), weight: v }); S.saveProgress(w); toast('Progress updated.'); progress(user); };
  const c = $('#c'); if (!c) return; const W = c.width = c.clientWidth * 2, H = c.height = 440, x = c.getContext('2d');
  const vs = w.map(e => e.weight), lo = Math.min(...vs) - 1, hi = Math.max(...vs) + 1;
  x.strokeStyle = getComputedStyle(document.body).getPropertyValue('--acc'); x.lineWidth = 4; x.beginPath();
  vs.forEach((v, i) => { const px = 20 + (vs.length > 1 ? i / (vs.length - 1) : .5) * (W - 40), py = H - 20 - (v - lo) / (hi - lo) * (H - 40); i ? x.lineTo(px, py) : x.moveTo(px, py); }); x.stroke();
}

function settings() {
  const s = S.getSettings();
  view.innerHTML = `<h1>Settings</h1><div class="card row"><label>Appearance <select id="th"><option value="light">Light</option><option value="dark">Dark</option></select></label></div>
  <div class="row" style="margin-top:16px"><button id="ex">Export data</button><button id="rs">Reset all data</button></div>`;
  $('#th').value = s.theme; $('#th').onchange = e => { s.theme = e.target.value; S.saveSettings(s); route(); toast('Settings saved.'); };
  $('#ex').onclick = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(S.exportAll(), null, 2)], { type: 'application/json' })); a.download = 'fitai-backup.json'; a.click(); };
  $('#rs').onclick = () => { if (confirm('Delete all FITAI data on this device?')) { S.clearAll(); location.hash = ''; route(); } };
}

function onboarding() {
  $('#nav').innerHTML = ''; document.body.classList.add('bare');
  const a = { name: '', goal: GOALS[0], level: LEVELS[0], equipment: ['Bodyweight'], days: [0, 2, 4], minutes: 45, weight: 70, target: 70 };
  const chips = (list, key, multi, idx) => `<div class="row">${list.map((x, i) => { const v = idx ? i : x, on = multi ? a[key].includes(v) : a[key] === v;
    return `<button class="opt ${on ? 'sel' : ''}" data-k="${key}" data-v="${v}" data-m="${multi ? 1 : ''}">${x}</button>`; }).join('')}</div>`;
  const steps = [['What are you working toward?', () => chips(GOALS, 'goal')], ['How experienced are you?', () => chips(LEVELS, 'level')],
    ['What equipment do you have?', () => chips(EQUIPMENT, 'equipment', true)], ['Which days can you train?', () => chips(DAYS, 'days', true, true)],
    ['How long per session?', () => `<input id="min" type="range" min="15" max="90" step="15" value="${a.minutes}" aria-label="Minutes"> <b id="mv">${a.minutes} min</b>`],
    ['About you', () => `<div class="row"><label>Name <input id="nm" value="${esc(a.name)}"></label><label>Weight kg <input id="wt" type="number" value="${a.weight}"></label><label>Target kg <input id="tg" type="number" value="${a.target}"></label></div>`]];
  let n = 0;
  const save = () => { if ($('#nm')) { a.name = $('#nm').value.trim(); a.weight = +$('#wt').value; a.target = +$('#tg').value; if (!a.name || !(a.weight > 20) || !(a.target > 20)) { toast('Enter your name and valid weights.'); return false; } }
    if (n === 2 && !a.equipment.length) { toast('Pick at least one option.'); return false; } if (n === 3 && !a.days.length) { toast('Pick at least one day.'); return false; } return true; };
  const draw = () => { view.innerHTML = `<div class="bar"><i style="width:${(n + 1) / steps.length * 100}%"></i></div><h1 style="margin-top:20px">${steps[n][0]}</h1><div id="b">${steps[n][1]()}</div>
    <div class="row" style="margin-top:20px"><button id="pv" ${n ? '' : 'disabled'}>Back</button><button id="nx" class="pri">${n === steps.length - 1 ? 'Generate my plan' : 'Next'}</button></div>`;
    $('#b').onclick = e => { const d = e.target.dataset; if (!d.k) return; const v = isNaN(d.v) ? d.v : +d.v; if (d.m) { const s = a[d.k]; s.includes(v) ? s.splice(s.indexOf(v), 1) : s.push(v); } else a[d.k] = v; draw(); };
    const m = $('#min'); if (m) m.oninput = () => { a.minutes = +m.value; $('#mv').textContent = a.minutes + ' min'; };
    $('#pv').onclick = () => { n--; draw(); };
    $('#nx').onclick = () => { if (!save()) return; if (n < steps.length - 1) { n++; draw(); } else build(); }; };
  const build = () => { view.innerHTML = '<h1>Creating your program...</h1><ul id="ck"></ul>';
    ['Goal', 'Experience', 'Equipment', 'Schedule'].forEach((t, i) => setTimeout(() => $('#ck').insertAdjacentHTML('beforeend', `<li>✓ ${t}</li>`), 450 * (i + 1)));
    setTimeout(() => { const days = [...a.days].sort(); S.saveUser({ name: a.name, goal: a.goal, level: a.level, equipment: a.equipment, days, minutes: a.minutes, weight: a.weight, startWeight: a.weight, target: a.target });
      S.savePlan(generatePlan({ ...a, days: days.map(i => DAYS[i]) })); S.saveProgress([{ date: Date.now(), weight: a.weight }]); location.hash = '#dashboard'; route(); }, 2300); };
  draw();
}
addEventListener('hashchange', route); route();
