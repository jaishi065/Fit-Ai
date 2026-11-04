import * as S from './storage.js';
import { $, esc, mmss, toast, view } from './utils.js';
import { mountDemo, unit } from './exercise-info.js';
import { getDemo } from './musclewiki.js';
const FULL = { Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday' };
let timer = null;
export const stopSession = () => clearInterval(timer);

export function session() {
  const plan = S.getPlan(), idx = +location.hash.split('/')[1], w = plan && plan.workouts[idx];
  if (!w || !w.exercises.length) { toast('That workout has no exercises.'); location.hash = '#workouts'; return; }
  const N = w.exercises.length, st = { i: 0, set: 1, rest: 0, between: false, paused: false, did: {}, t0: Date.now() };
  const draw = () => {
    const e = w.exercises[st.i], last = st.set >= e.sets;
    const head = `<p class="mute">${FULL[w.day] || w.day} · ${esc(w.title)}</p><h2 style="margin:0 0 8px">Exercise ${st.i + 1} of ${N}</h2><div class="bar"><i style="width:${st.i / N * 100}%"></i></div>`;
    const body = st.rest
      ? `<h1 style="margin-top:20px">Rest</h1><div class="big" id="clock">${mmss(st.rest)}</div><p class="mute">${st.between ? `Next up: <b>${esc(e.name)}</b> · ${e.sets} sets × ${e.reps} ${unit(e.name)}` : `Next: set ${st.set} of ${e.sets}`}</p>
         <div class="row"><button id="skip" class="pri">Skip rest</button><button id="pause">${st.paused ? 'Resume' : 'Pause'}</button></div>`
      : `<h1 style="margin-top:20px">${esc(e.name)}</h1><p class="setline">Set ${st.set} of ${e.sets} · <b>${e.reps} ${unit(e.name)}</b> · ${e.rest}s rest</p><div class="row" style="margin-bottom:16px"><button id="done" class="pri">${last ? 'Complete exercise' : 'Complete set'}</button></div><div id="demo"></div>`;
    view.innerHTML = head + body + `<div class="row" style="margin-top:20px"><button id="prev" ${st.i ? '' : 'disabled'}>Previous</button><button id="next">${st.i + 1 >= N ? 'Finish' : 'Next Exercise →'}</button><button id="fin">Finish workout</button></div>`;
    if (!st.rest) { mountDemo($('#demo'), e, true); const nx = w.exercises[st.i + 1]; if (nx) getDemo(nx.name); }
    const on = (id, fn) => { const b = $(id); if (b) b.onclick = fn; };
    on('#done', () => { st.did[st.i] = (st.did[st.i] || 0) + 1; if (!last) { st.set++; st.rest = e.rest; st.between = false; return draw(); }
      if (st.i + 1 >= N) return finish(); st.i++; st.set = 1; st.rest = e.rest; st.between = true; draw(); });
    on('#skip', () => { st.rest = 0; draw(); }); on('#pause', () => { st.paused = !st.paused; draw(); });
    on('#prev', () => { st.i--; st.set = 1; st.rest = 0; draw(); });
    on('#next', () => { if (st.i + 1 >= N) return finish(); st.i++; st.set = 1; st.rest = 0; draw(); }); on('#fin', finish);
  };
  const finish = () => {
    stopSession();
    const exDone = w.exercises.filter((x, i) => (st.did[i] || 0) >= x.sets).length, sets = Object.values(st.did).reduce((a, b) => a + b, 0);
    const mins = Math.max(1, Math.round((Date.now() - st.t0) / 60000)), cal = Math.round(sets * 9 + mins * 4);
    const h = S.getHistory(); h.push({ date: Date.now(), title: w.title, day: w.day, minutes: mins, calories: cal, sets, exercises: exDone }); S.saveHistory(h);
    if (exDone) { w.done = true; S.savePlan(plan); }
    view.innerHTML = `<h1>Workout complete</h1><p class="mute">${FULL[w.day] || w.day} · ${esc(w.title)}</p><div class="grid"><div class="card stat"><span class="mute">Total time</span><b>${mins} min</b></div>
    <div class="card stat"><span class="mute">Total exercises</span><b>${exDone} of ${N}</b></div><div class="card stat"><span class="mute">Sets completed</span><b>${sets}</b></div>
    <div class="card stat"><span class="mute">Calories (estimate)</span><b>${cal}</b></div></div><a class="btn pri" href="#dashboard">Done</a>`;
    toast('Workout saved.');
  };
  timer = setInterval(() => { if (st.rest && !st.paused) { st.rest--; if (st.rest <= 0) draw(); else { const c = $('#clock'); if (c) c.textContent = mmss(st.rest); } } }, 1000);
  draw();
}
