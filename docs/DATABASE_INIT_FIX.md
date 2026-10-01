# Database initialization: the sql.js WASM asset

Why the app used to throw `Database not initialized` on almost every action, and
the three layers that now prevent it.

## Symptom

Clicking anything that writes a setting — switching 3D library, changing model —
produced an uncaught React error, repeated for every click:

```
Uncaught Error: Database not initialized
    at DatabaseService.saveSettings (db-service.ts)
    at updateSettings (app-store.ts)
    at handleLibraryChange (chat-interface.tsx)
```

The app also logged a failure during startup.

## Root cause

`db-service.ts` initialises sql.js with

```ts
locateFile: (file: string) => `/sql-wasm/${file}`
```

so the renderer fetches `/sql-wasm/sql-wasm.wasm` from Next's `public/`
directory. That file was not there, and **`public/` is listed in `.gitignore`
and is entirely untracked** — the binary could never have been committed, and
nothing was copying it in. The fetch 404'd, `initSqlJs()` rejected, and
`dbService.initialize()` failed.

Two design problems then turned one missing file into a storm of errors a long
way from its cause:

1. **`AppInitializer` rendered the app anyway.** It caught the failure, showed a
   toast, then cleared `isInitializing` in a `finally`, mounting the full UI on
   top of a null database. The store calls `dbService` directly in roughly twenty
   places, so nearly every subsequent action threw.

2. **The settings write ran inside a Zustand `set()` updater.** `updateSettings`
   called `dbService.saveSettings(updated)` from within the updater function, so
   the throw escaped straight out of the React event handler that triggered it —
   an uncaught error rather than a handled failure.

## Fix

### 1. Materialise the asset

`scripts/sql-wasm-assets.js` copies the binary out of `node_modules/sql.js/dist`
into `public/`. It reads the expected path **out of `db-service.ts`** rather than
hardcoding it, so the two cannot drift apart, and it has a `--check` mode that
verifies without copying.

Wired into every entry point a developer or build uses:

| hook | why |
| --- | --- |
| `postinstall` | present on every fresh checkout |
| `predev`, `predev:electron` | present before the dev server starts |
| `prebuild`, `prebuild:static` | present in production and Electron builds |
| `prestart` | present when serving a production build |

Run it directly with `pnpm run sql-wasm`, or verify with
`pnpm run sql-wasm:check`.

The binary stays out of git: it is generated, `public/` is ignored, and it is
~660 KB.

### 2. Do not render a broken app

`AppInitializer` now keeps the error instead of falling through. A failed init
shows the actual message, names the likely fix (`pnpm run sql-wasm`), and offers
a Retry button that re-runs initialization. Seeing the real failure once is far
more useful than a working-looking UI that throws on every click.

### 3. Settings persistence cannot crash the UI

`updateSettings` now commits to state first and persists afterwards, outside the
updater, in a `try/catch`:

```ts
const updated = { ...get().settings, ...newSettings }
set({ settings: updated })
try {
  dbService.saveSettings(updated)
} catch (error) {
  console.warn('Could not persist settings; continuing with in-memory values.', error)
}
```

A settings write failing is worth a warning, not a crash. This also removes the
side effect from inside the state updater.

## Tests

`tests/sql-wasm-assets.test.ts`

- `db-service.ts` declares a public path for the wasm
- the file exists where it will be fetched from, is large enough, and starts with
  the WebAssembly magic bytes
- the asset script's `--check` mode agrees
- the copy is wired into install, dev and build

`tests/app-store-settings.test.ts`

- the happy path persists the merged settings object
- `updateSettings` does not throw when the database is unavailable
- the change still applies in memory when persistence fails
- repeated failing updates keep working (the reported symptom)
- the write does not happen inside the state updater

These were checked against the original code: restoring the old `updateSettings`
makes four of the five fail, so they guard the regression rather than merely
passing.

## If it happens again

```
pnpm run sql-wasm:check     # is the asset there?
pnpm run sql-wasm           # put it there
```

In the browser devtools, a 404 on `/sql-wasm/sql-wasm.wasm` is the tell.
