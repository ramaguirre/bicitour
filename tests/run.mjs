// Headless checks for index.html. Usage: node tests/run.mjs
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const html = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'index.html'), 'utf8');
const mod = html.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
const grab = re => { const m = mod.match(re); if (!m) throw new Error('Could not find ' + re); return m[1]; };

// 1. syntax
const dir = mkdtempSync(join(tmpdir(), 'pedalsv-'));
writeFileSync(join(dir, 'mod.mjs'), mod);
execFileSync(process.execPath, ['--check', join(dir, 'mod.mjs')]);

// 2. pull testable pieces out of the app
const code = [
  'const THREE={MathUtils:{degToRad:d=>d*Math.PI/180,radToDeg:r=>r*180/Math.PI}};',
  'const deg=THREE.MathUtils.degToRad;',
  'class BudgetError extends Error{}',
  grab(/(const store = \{[\s\S]*?\n\};)/),
  grab(/(class CadenceEstimator \{[\s\S]*?\n\})/),
  grab(/(const angDiff[\s\S]*?\n)\/\* =+\s*\n\s*SOURCE 2/).replace('const deg = THREE.MathUtils.degToRad;', ''),
  grab(/(const TRACK_INDEX[\s\S]*?\n\}\n)function downloadText/),
  'return { CadenceEstimator, parseStart, MLY, MapillarySource, tracks, trackToGpx };',
].join('\n');

const mem = new Map();
globalThis.localStorage = { getItem: k => mem.has(k) ? mem.get(k) : null, setItem: (k, v) => mem.set(k, v), removeItem: k => mem.delete(k) };
const app = new Function(code)();

let fails = 0;
const ok = (cond, msg) => { console.log((cond ? '✔ ' : '✘ ') + msg); if (!cond) fails++; };

// 3. cadence: phone accelerometer
for (const rpm of [40, 75, 110, 140]) {
  const e = new app.CadenceEstimator({ minStd: 0.25 }); let t = 0, r = 0;
  for (let i = 0; i < 600; i++) {
    t += 1000 / 60 * (1 + (Math.random() - 0.5) * 0.3);
    const p = 2 * Math.PI * rpm / 60 * t / 1000, s = 3 * Math.sin(p) + 1.5 * Math.sin(2 * p + 0.7);
    e.push(t, 0.3 * s + Math.random() - 0.5, 6.9 + 0.9 * s + Math.random() - 0.5, 6.9 - 0.2 * s);
    if (i % 15 === 0) r = e.estimate();
  }
  ok(Math.abs(r - rpm) < 2, `phone cadence ${rpm} → ${r.toFixed(1)}`);
}
// cadence: thigh controller
for (const rpm of [45, 90, 120]) {
  const e = new app.CadenceEstimator({ minStd: 0.01 }); let t = 0, r = 0;
  for (let i = 0; i < 720; i++) {
    t += 1000 / 72; const p = 2 * Math.PI * rpm / 60 * t / 1000;
    e.push(t, 0.2, 0.6 + 0.05 * Math.sin(p) + 0.002 * (Math.random() - 0.5), -0.3 + 0.02 * Math.cos(p));
    if (i % 18 === 0) r = e.estimate();
  }
  ok(Math.abs(r - rpm) < 2, `controller cadence ${rpm} → ${r.toFixed(1)}`);
}
{ const e = new app.CadenceEstimator({ minStd: 0.25 }); let t = 0;
  for (let i = 0; i < 600; i++) { t += 16.7; e.push(t, 0.01 * Math.random(), 9.8, 0.01 * Math.random()); }
  ok(e.estimate() === 0, 'still sensor → 0 RPM'); }

// 4. start-link parsing
ok(app.parseStart('https://www.mapillary.com/app/?lat=-23.65&lng=-70.4&z=17&pKey=123456789').imageId === '123456789', 'parse Mapillary link');
ok(app.parseStart('https://www.google.com/maps/@48.85,2.29,3a,75y,90h,90t/data').heading === 90, 'parse Google Street View link');
ok(app.parseStart('48.8698, 2.3076').lat === 48.8698, 'parse lat,lng');
ok(app.parseStart('-33, 0')?.lng === 0, 'parse whole-number lat,lng');

// 5. Mapillary route following on a fake street grid (A goes north, B crosses east)
const m = 1 / 111320, imgs = {};
for (let i = 0; i < 20; i++) imgs['A' + i] = { id: 'A' + i, geometry: { coordinates: [0, i * 5 * m] }, computed_compass_angle: 0, is_pano: true, sequence: 'A', thumb_2048_url: 'u' };
for (let i = 0; i < 20; i++) imgs['B' + i] = { id: 'B' + i, geometry: { coordinates: [(i * 5 + 2) * m, 45 * m] }, computed_compass_angle: 90, is_pano: true, sequence: 'B', thumb_2048_url: 'u' };
globalThis.fetch = async u => {
  u = new URL(u); const p = u.pathname.slice(1), q = u.searchParams; let body;
  if (p === 'image_ids') body = { data: Object.values(imgs).filter(i => i.sequence === q.get('sequence_id')).map(i => ({ id: i.id })) };
  else if (p === 'images') { const [a, b, c, d] = q.get('bbox').split(',').map(Number); body = { data: Object.values(imgs).filter(i => { const [x, y] = i.geometry.coordinates; return x >= a && x <= c && y >= b && y <= d; }).map(({ thumb_2048_url, ...r }) => r) }; }
  else if (p === '') { body = {}; for (const id of q.get('ids').split(',')) body[id] = imgs[id]; }
  else body = imgs[p];
  return { ok: true, json: async () => body };
};
app.MLY.token = 'test';
const MS = app.MapillarySource;
const st = await MS.start({ lat: 0, lng: 0 });
ok(st.node.id === 'A0' && Math.round(st.heading) === 0, 'start on nearest 360° image, heading along the sequence');
// ride north; at the crossing pick the branch heading east
let cur = st.node, T = st.heading, ids = [], sawIntersection = false;
for (let k = 0; k < 6; k++) {
  const ex = await MS.exits(cur, T);
  const branch = ex.find(e => e.kind === 'branch' && Math.abs(e.heading - 90) < 20);
  if (branch) sawIntersection = ex.some(e => e.kind === 'straight');
  const n = await MS.next(cur, T, branch || ex.find(e => e.kind === 'straight') || null, 15); if (!n) break;
  ids.push(n.node.id); cur = n.node; T = n.heading;
}
ok(sawIntersection, 'intersection detected (straight + right turn offered)');
ok(ids.some(id => id.startsWith('B')) && Math.round(T) === 90, `route follows street then takes the chosen turn (${ids.join(' → ')})`);
// no branch offered far from the crossing
const lone = await MS.exits((await MS.start({ lat: 5 * m, lng: 0 })).node, 0);
ok(lone.length === 1 && lone[0].kind === 'straight', 'plain road → only "straight" (no arrows shown)');
// U-turn: reversing the node walks back down the sequence
const mid = (await MS.start({ imageId: 'A10' })).node;
const back = await MS.next(MS.reverse(mid), 180, null, 15);
ok(back && Number(back.node.id.slice(1)) < 10 && Math.round(back.heading) === 180, `turn around walks back (${back && back.node.id})`);

// 6. tracks + GPX
const tr = { id: 't1', name: 'Test', src: 'mapillary', started: 1e12, updated: 1e12, km: 1.2, pts: [[1e12, 48.85, 2.35], [1e12 + 2000, 48.851, 2.35]], last: { ref: 'A3', lat: 48.851, lng: 2.35, heading: 0 } };
ok(app.tracks.save(tr) && app.tracks.get('t1').last.ref === 'A3' && app.tracks.list()[0].id === 't1', 'track save/load');
ok(/<trkpt lat="48.85" lon="2.35"><time>/.test(app.trackToGpx(tr)), 'GPX export');
app.tracks.remove('t1'); ok(app.tracks.list().length === 0, 'track delete');

console.log(fails ? `\n${fails} check(s) failed` : '\nAll checks passed');
process.exit(fails ? 1 : 0);
