# Electron splash screen and startup handoff

The desktop app opens with the same vaporwave splash as the iOS and Android
clients, then hands off to the app window.

## The scene

`electron/splash.html` is a port of the mobile splash
(`iOSMaigeXr/.../Resources/splash.html`, `AndroidMaigeXr/.../assets/splash.html`),
kept visually identical so all three platforms open the same way:

- sunset gradient sky from a custom shader — neon purple `#9600FF` at the top,
  pink `#FF00C1` through the middle, cyan `#00FFF9` at the horizon
- a pulsing sun disc, two scrolling neon `GridHelper` planes for the retro
  landscape, and ~1200 additive-blended drifting particles
- `UnrealBloomPass` for the glow plus a little `RGBShiftShader` chromatic
  aberration, through an `EffectComposer`
- the `m{ai}geXR` wordmark over the top, cyan with a pink `{ai}`, on a slow
  neon pulse

Three.js comes from the same jsdelivr `super-three@0.173.0` importmap the mobile
splashes use.

Two things are desktop-only, because Electron waits on a real page load rather
than a fixed timer: a status line with bouncing dots, and the app version in the
footer.

## Who decides when it closes

The **main process** owns dismissal, not the page. `electron/main.ts`:

1. `createSplashWindow()` — frameless, centered, always-on-top, 640×420.
2. `createWindow()` — the app window, created hidden (`show: false`).
3. The app window's `ready-to-show` calls `finishSplash()`.
4. That waits out any remaining `SPLASH_MIN_DURATION_MS` (2200ms), then closes
   the splash and shows the app window.

Doing it this way means nothing in the page is load-bearing. If the Three.js
fetch fails the scene is simply absent — the wordmark and status are plain
HTML/CSS — and startup still proceeds.

Two safeguards:

- **`SPLASH_MAX_DURATION_MS`** (20s). If the app window never reports ready — a
  dead dev server, a failed bundle — the splash is force-closed and the window
  revealed anyway, rather than stranding the user.
- **Deferred finish.** Against a warm dev server the app window can be ready in
  ~200ms, before the splash has painted. Measuring the minimum display time from
  window *creation* would then close the splash the instant it appeared, or let
  it appear *after* the app window. So a finish that arrives before
  `ready-to-show` is parked in `pendingFinish` and replayed from the splash's
  own `ready-to-show`, which means the 2200ms is always measured against real
  visibility. The log shows this plainly:

  ```
  [splash] app ready before the splash painted; deferring
  [splash] shown
  [splash] finishing (app ready); visible 0ms, waiting a further 2200ms
  ```

Clicking the splash skips ahead, matching tap-to-skip on mobile. That is only a
*request*: `splash:dismiss` over IPC, which calls `finishSplash({ force: true })`.

## The preload

`electron/splash-preload.ts` is a separate, narrow bridge so the splash does not
get the app's preload surface. It exposes `maigexrSplash` with `dismiss()`,
`onStatus()` and `getAppVersion()`.

## Packaging

`electron-builder.yml` already ships `electron/splash.html` and
`electron/dist/**/*`, so the compiled `splash-preload.js` is included. The window
loads the page with `loadFile(path.join(__dirname, '../splash.html'))` —
`__dirname` is `electron/dist` both in development and inside the package, so
the relative path holds in both.

## Running it in development

```bash
pnpm run dev:electron
```

Two traps worth knowing, neither specific to the splash:

- **`ELECTRON_RUN_AS_NODE`.** If that variable is set in your shell — VS Code's
  integrated terminal and extension host export it — the Electron binary behaves
  as plain Node, `require('electron')` returns a path string, and the app dies
  immediately on `app.whenReady()`. Launch with
  `env -u ELECTRON_RUN_AS_NODE pnpm run dev:electron`.
- **Port 3000 is hardcoded.** `main.ts` loads `http://localhost:3000` in
  development, but `next dev` falls back to 3001 if something else holds 3000,
  and the window then points at the wrong server. Make sure 3000 is free, or
  teach `main.ts` to read a port from the environment.
