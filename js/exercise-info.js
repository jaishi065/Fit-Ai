import { esc } from './utils.js';
import { EXERCISES } from './data.js';
import { getDemo } from './musclewiki.js';
import { mountVideo } from './videos.js';
// Optional: add verified YouTube IDs here, e.g. { 'Push Up': 'xxxxxxxxxxx' }. Listed IDs are embedded; the rest link to a YouTube form search.
export const VIDEO_IDS = {};
export const unit = n => /Plank|Jump Rope|Stretch/.test(n) ? 'sec' : 'reps';
const P = {
  press: { also: 'Triceps, front shoulders', steps: ['Set your hands or grip and brace your core so the body stays in one line.', 'Lower under control until your elbows reach about 90°.', 'Press back up without slamming into lockout.'], tip: 'Keep ribs down and shoulders away from your ears.', breath: 'Inhale on the way down, exhale as you press.', mistakes: ['Flaring elbows straight out to the sides', 'Letting hips sag or the lower back arch'] },
  pull: { also: 'Biceps, rear shoulders', steps: ['Start with a long spine and shoulders set down and back.', 'Pull the elbows toward your hips, squeezing your shoulder blades.', 'Return slowly until your arms are straight again.'], tip: 'Lead with your elbows, not your hands.', breath: 'Exhale as you pull, inhale as you return.', mistakes: ['Shrugging shoulders toward the ears', 'Swinging the body to move the weight'] },
  curl: { also: 'Forearms, shoulders', steps: ['Stand or sit tall with elbows close to your sides.', 'Move only the forearms or the working joint through the full range.', 'Lower for about two seconds.'], tip: 'Pick a weight you can control for every rep.', breath: 'Exhale on the effort, inhale on the return.', mistakes: ['Using momentum from the hips or back', 'Cutting the range of motion short'] },
  squat: { also: 'Glutes, hamstrings, core', steps: ['Set your feet about hip to shoulder width with your chest up.', 'Sit your hips down and back, keeping your heels on the floor.', 'Drive through the whole foot to stand tall.'], tip: 'Track your knees in line with your toes.', breath: 'Inhale as you lower, exhale as you stand.', mistakes: ['Knees caving inward', 'Heels lifting or chest dropping forward'] },
  hinge: { also: 'Hamstrings, glutes, lower back', steps: ['Soften your knees and push your hips back with a flat back.', 'Lower until you feel a stretch in the hamstrings.', 'Squeeze the glutes to bring the hips forward.'], tip: 'Keep the weight close to your legs.', breath: 'Inhale on the way down, exhale as you stand.', mistakes: ['Rounding the lower back', 'Turning the movement into a squat'] },
  core: { also: 'Hip flexors, obliques', steps: ['Brace your abs as if preparing for a light punch.', 'Move slowly with your lower back controlled.', 'Hold or repeat the position with steady form.'], tip: 'Quality beats speed: stop when your form slips.', breath: 'Breathe steadily; never hold your breath.', mistakes: ['Pulling on the neck', 'Letting the lower back arch'] },
  cardio: { also: 'Full body, heart and lungs', steps: ['Start with a stable, athletic stance.', 'Move at a pace you can keep for the whole set.', 'Land softly and stay light on your feet.'], tip: 'Keep your core tight and your movements compact.', breath: 'Find a steady rhythm: in through the nose, out through the mouth.', mistakes: ['Landing with stiff knees', 'Starting too fast and fading'] },
  stretch: { also: 'Hips, spine', steps: ['Move into the position slowly.', 'Breathe and relax a little deeper each exhale.', 'Come out gently.'], tip: 'You should feel a stretch, never sharp pain.', breath: 'Slow breaths through the nose, long exhales.', mistakes: ['Bouncing in the stretch', 'Forcing the range'] }
};
export function pattern(e) {
  if (e.muscle === 'Core') return 'core'; if (e.muscle === 'Cardio') return 'cardio'; if (e.muscle === 'Mobility') return 'stretch';
  if (e.muscle === 'Legs') return /Deadlift|Swing/.test(e.name) ? 'hinge' : 'squat';
  if (/Push Up|Dip|Press/.test(e.name)) return 'press'; if (/Row|Pull/.test(e.name)) return 'pull'; return 'curl';
}
const fig = (p, n) => `<svg class="fig p-${p}" viewBox="0 0 100 100" role="img" aria-label="Movement guide for ${esc(n)}"><line x1="10" y1="97" x2="90" y2="97"/><g class="body"><circle cx="50" cy="20" r="8" fill="var(--acc)"/><line x1="50" y1="28" x2="50" y2="62" class="b"/><line class="leg l" x1="50" y1="62" x2="40" y2="96"/><line class="leg r" x1="50" y1="62" x2="60" y2="96"/><line class="arm l" x1="50" y1="36" x2="32" y2="52"/><line class="arm r" x1="50" y1="36" x2="68" y2="52"/></g></svg>`;
const chips = a => a.map(m => `<span class="chip">${esc(m)}</span>`).join('');
// Renders media (animation + video) and instructions. Local content shows instantly; API data replaces it when it arrives.
export async function mountDemo(el, e, compact) {
  e = EXERCISES.find(x => x.id === e.id || x.name === e.name) || e;
  const p = pattern(e), d = P[p];
  const info = (x) => { const steps = x?.steps?.length ? x.steps : d.steps, tm = x?.target?.length ? x.target : [e.muscle], sec = x?.secondary?.length ? x.secondary : d.also.split(', ');
    return `<section class="blk"><h3>Muscles worked</h3><p>${chips(tm)}${chips(sec)}</p></section>
    <section class="blk"><h3>How to perform</h3>${compact ? `<details><summary>Show steps</summary><ol>${steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol></details>` : `<ol>${steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol>`}</section>
    <div class="trio"><section class="blk"><h3>Form tips</h3><p>${d.tip}</p></section><section class="blk"><h3>Breathing</h3><p>${d.breath}</p></section>
    <section class="blk"><h3>Common mistakes</h3><ul>${d.mistakes.map(s => `<li>${s}</li>`).join('')}</ul></section></div>`; };
  el.innerHTML = `<div class="demo2"><div class="media"><div class="gifbox"><div class="sk">Loading animation…</div></div><div class="vd"></div></div><div class="info">${info(null)}</div></div>`;
  mountVideo(el.querySelector('.vd'), e.name);
  const x = await getDemo(e.name); if (!el.isConnected) return;
  const box = el.querySelector('.gifbox'), why = { not_configured: 'Demo videos need the server API key (see README).', not_found: 'No MuscleWiki demo found for this exercise.', no_video: 'No MuscleWiki video is available for this exercise.', auth: 'MuscleWiki rejected the API key.', quota: 'MuscleWiki quota reached. Try again later.' };
  const fallback = () => { box.innerHTML = fig(p, e.name) + `<p class="mute cap">${why[x.reason] || 'Demo video unavailable right now.'} Showing a simple movement guide.</p>`; };
  if (!x.found) return fallback();
  let n = 0; const v = document.createElement('video'); Object.assign(v, { controls: true, loop: true, muted: true, autoplay: true, playsInline: true, preload: 'metadata' });
  v.setAttribute('aria-label', e.name + ' demonstration'); v.hidden = true; box.innerHTML = '<div class="sk">Loading video…</div>'; box.append(v);
  v.onloadeddata = () => { v.hidden = false; box.querySelector('.sk')?.remove(); };
  v.onerror = () => { if (++n < x.videos.length) v.src = x.videos[n].src; else { x.reason = 'error'; fallback(); } }; // try the next available angle
  v.src = x.videos[0].src;
  el.querySelector('.info').innerHTML = info({ steps: x.steps, target: x.primaryMuscles });
}
