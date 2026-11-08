# Pedal Street View

Ride a stationary bike with your Android phone in your thigh pocket. The phone estimates your cadence (RPM) and streams it to a Meta Quest 2, which moves you through real 360° street imagery in VR. Look around freely; at intersections, look the way you want to turn.

Imagery comes from **Mapillary** (free, open, CC BY-SA) by default, or optionally **Google Street View** (needs a billing account).

One file (`index.html`) holds both modes. Open the same URL on the phone and the Quest.

## 1. Host it (free, ~5 min)

Both devices need **https** (motion sensors and WebXR require it).

1. Create a GitHub repo, e.g. `pedal-streetview`, and upload `index.html`.
2. Repo → Settings → Pages → Source: *Deploy from a branch*, branch `main`, folder `/ (root)`.
3. After a minute your app is at `https://<your-user>.github.io/pedal-streetview/`.

The page is public, but your tokens are never in the file. You type them on each device and they stay in that browser.

## 2. Mapillary token (free, no card, ~2 min)

1. Sign up at mapillary.com.
2. Go to **Dashboard → Developers → Register application**. Any name works; tick the *read* permission.
3. Copy the **Client Token** (starts with `MLY|`).

## 3. Pick a ride

Mapillary only works where people have uploaded **360°** imagery, so it's best to choose a start point:

1. Open mapillary.com/app, turn on the **360°** filter, and zoom into an area you'd like to ride.
2. Click a green line (a sequence) to open an image.
3. Copy the browser URL (it contains `pKey=…`). That's your start.

You can also type `lat, lng`. The app grabs the nearest 360° image within a few hundred metres.

**Or press 🎲 Random ride.** The app picks one of ~30 cities worldwide, jumps to a random spot within ~9 km of it, and starts you on a 360° sequence with road ahead. The phone has a 🎲 button too, so you can re-roll without taking the headset off.

The app follows the sequence the way it was captured. When it ends, or when you look left or right at a junction, it jumps to another nearby 360° sequence heading that way. If there's nothing, it turns you around.

## 4. Ride

By default the cadence comes from a **Quest controller strapped to your thigh**. The headset already tracks it precisely, so there's no phone or pairing needed.

1. Strap one controller to your thigh, just above the knee. A velcro strap, a sock or tight shorts with a pocket all work. Snug is better than loose.
2. **Quest:** open the URL in the Quest Browser → *Continue last ride*, *Random ride*, or *Load start point* → *Enter VR*.
3. Pedal. RPM only counts while you're in VR, because that's when the headset tracks the controller.

Keep the other controller in your hand or on the handlebar. It's ignored unless it moves rhythmically.

**Using the phone instead:** set *Cadence source* to *Phone in pocket*. Then open the URL on the phone → *I'm the phone* → enter the 4-digit code from the headset → Connect → *Pocket mode*, and pocket it. You can also pair the phone just as a remote for *Continue last ride* and *Random ride*, or to send your token to the headset.

## Saved rides

Every ride is recorded automatically on the headset: position and time at each image stop, plus distance. It saves every ~10 seconds and when you close the page.

- **▶ Continue last ride**: picks up exactly where your most recent ride ended, same direction, and keeps adding to that ride (distance carries on). Also on the phone, so you can use it from inside VR.
- **Previous rides**: choose any saved ride and **Resume from its end**, **Download GPX** (opens in Strava, Komoot, Google Earth…), or **Delete**.
- Rides are stored in the Quest Browser on that device only. If storage fills up, the oldest rides are removed first. Download a GPX of any ride you want to keep forever.

## Settings

| Setting | Default | Notes |
|---|---|---|
| Imagery source | Mapillary | Google is optional, see below |
| Image quality | Medium | Mapillary: Low 1024 px, Medium 2048 px, High full resolution (capped at 4096 px for the Quest) |
| Metres between stops | 15 | Lower = smoother, more downloads |
| km/h per RPM | 0.3 | 80 RPM → 24 km/h. Tune to taste |
| Cadence source | Controller on thigh | Or the phone in your pocket, or a manual slider for testing |

## Optional: Google Street View

Better coverage, but it needs a Google Cloud billing account. It's free up to 100,000 tiles/month, then billed.

1. console.cloud.google.com → new project → enable billing → enable **Map Tiles API**.
2. Create an API key. Restrict it to *Websites* → `https://<your-user>.github.io/*` and to the Map Tiles API only.
3. **Hard cap:** Google Maps Platform → Quotas → Map Tiles API → set the Street View tiles per-day limit to **3300**.
4. Add a **$1** budget alert.
5. In the app, choose *Google Street View* as the source. The app's own daily tile budget (default 3300) is a second guard.

At Medium quality, 3,300 tiles is roughly 20–25 minutes of riding per day.

## Troubleshooting

- **Phone shows 0 RPM and "No motion sensor data":** the page isn't on https, or the screen turned off. Use Pocket mode.
- **RPM jumps around:** make sure the phone is snug in the pocket. Signal quality above ~60% is good.
- **"Headset not found":** re-check the 4-digit code; reload the Quest page for a fresh one.
- **"Not a 360° panorama":** that Mapillary image is a flat photo. Pick a sequence with the 360° filter on.
- **"End of the road":** no connected 360° imagery nearby. Load a new start point.
- **Google errors:** usually the key restriction (wrong site URL) or Map Tiles API not enabled.

Imagery: © Mapillary contributors (CC BY-SA) / © Google. Personal-use project.
