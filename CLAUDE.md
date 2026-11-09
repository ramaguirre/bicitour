# Pedal Street View — project notes for Claude

Stationary-bike VR app for Meta Quest 2. Cadence (RPM) from a Quest controller strapped to the thigh (default) or an Android phone in the pocket → speed → ride through 360° street imagery in WebXR.

## Layout
- `index.html` — the whole app, single file, no build step. Hosted on GitHub Pages (https required for WebXR and motion sensors).
- `README.md` — user-facing setup guide. Update it whenever behaviour or settings change.
- `tests/run.mjs` — headless checks. Run `node tests/run.mjs` after every change; it extracts code straight from `index.html`.

## Architecture (all in the `<script type="module">` of index.html)
- **Role select**: Quest Browser user agent → viewer; `?role=phone` or button → phone mode.
- **CadenceEstimator**: 6 s window, resample to 50 Hz, principal axis (power iteration), autocorrelation peak → RPM, smoothed. Used for both phone accelerometer and controller position (`minStd` differs: 0.25 m/s² vs 0.01 m).
- **Phone ↔ headset link**: PeerJS (public broker), peer id `pedalsv-<4 digits>`. Messages: `rpm`, `config` (mlyToken/key/start), `random`, `resume`.
- **Imagery sources** share one interface `{ name, init(cfg), start(spec), exits(node, travel), next(node, travel, exit, step), reverse(node), texture(node, quality), credit(node), findRandom(lat,lng) }`:
  - `exits` returns the ways you can go from a stop (`{heading, kind, …}`), U-turns excluded; `next` follows the chosen exit (null = straight); `reverse` flips a node for a U-turn.
  - `MapillarySource` (default): graph.mapillary.com, 360° only, follows capture sequences; exits = straight along the sequence + other 360° sequences within ~25 m (not behind); auto-branches or U-turns at a sequence end.
  - `GoogleSource` (optional): Map Tiles API Street View tiles, follows pano links, guarded by a local daily tile budget (`budget`).
- **Rendering**: three.js r160 from jsDelivr, two inverted spheres crossfaded between stops; `placeSphere` rotation = `270 - imageCenterHeading + displayedTravelHeading` (orientation verified in headless Chromium with N/E/S/W test panoramas).
- **In-VR UI** lives in the `ui` group (hidden while the mirror renders): small canvas HUD ~33° below forward; intersection arrows ~3 m ahead on the road, ~20° down (green = `ride.sel`); rear-view mirror (backwards camera → render target, flipped) above forward view; comfort blink sphere. UI meshes must be `transparent: true` + `depthTest: false` so they draw after the spheres.
- **Steering**: gaze dwell (`updateGaze`): mirror 2 s → `turnAround()`, non-selected arrow 1.5 s → `selectExit()`. Hand-controller thumbstick ←/→ `cycleExit`, ↑/↓ `nudgeKpr`, B/Y turn around. Phone messages `turn`, `kpr`. `ride.gen` invalidates in-flight prefetches when the choice changes.
- **Map picker**: Leaflet 1.7.1 (cdnjs) + OSM tiles, lazy-loaded; Mapillary coverage via Leaflet.VectorGrid 1.3.0 (unpkg) on `tiles.mapillary.com/maps/vtp/mly1_public/2`; tap sets `vStart` to `lat, lng`.
- **Tracks**: auto-recorded per stop to localStorage (`pedalsv-tracks` index + `pedalsv-track-<id>`), flushed every ~10 s and on pagehide; oldest evicted when storage is full; resume uses `track.last.ref` (Mapillary image id / Google pano id); GPX export.
- **Settings**: localStorage keys `pedalsv-*`; URL hash `#mly=…&gkey=…&start=…` pre-fills them (hash never leaves the device).

## Conventions
- Keep it one self-contained `index.html` unless there's a strong reason to split.
- Pin CDN versions (three@0.160.0, peerjs@1.5.4).
- Wrap every localStorage access in try/catch (via `store`).
- Never commit tokens or API keys.

## Known unverified on real hardware
- Panorama orientation on real Mapillary/Google images (math verified only with synthetic panoramas).
- Mirror render-to-texture inside a real WebXR session, and dwell thresholds/comfort on the Quest.
- Mapillary vector-tile `is_pano` property name for the coverage overlay.
- Random-ride hit rate against real Mapillary coverage.
- Controller cadence on a real Quest 2 (tested only on simulated motion).
