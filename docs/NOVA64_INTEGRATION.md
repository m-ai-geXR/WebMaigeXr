# Nova64 Integration

How Nova64 is wired into m{ai}geXR across Web/Electron, iOS and Android, and the
two non-obvious constraints that shape the whole design.

Nova64 is a retro 3D fantasy console (N64/PS1-era low-poly rendering on top of
Three.js). Upstream: <https://nova64.io> · `npm i nova64` · MIT.

---

## 1. Nova64 is a console, not a library

Every other library here is a script you load and call. Nova64 boots its own
runtime and then accepts **carts**. So there is nothing to inject into a page —
instead we embed Nova64's hosted runner and push cart source into it.

Its runtime already has a mode built for exactly this: **studio mode**
(`?studio=1`), which skips auto-loading a demo and waits for code from a host.

```
runner -> host     { type: 'EXECUTE_READY' }                 posted to '*'
host   -> runner   { type: 'EXECUTE_CODE', code }
runner -> host     { type: 'CART_LOG', message }
runner -> host     { type: 'EXECUTE_SUCCESS' } | { type: 'EXECUTE_ERROR', error }
```

On every `EXECUTE_CODE` the runner resets the whole scene — meshes, fog, skybox,
post-processing, camera, XR — so pressing Run repeatedly leaks no state.

**No changes are required in the nova64 repo.** m{ai}geXR is just a studio host.

---

## 2. Constraint one: carts must not use `export`

The runner evaluates cart source with `new Function()`
(`runtime/studio-executor.js`), then picks up `init` / `update` / `draw` /
`render` by name. A top-level `export` is therefore a **syntax error**, even
though Nova64's README shows `export function init()` for file-based carts loaded
by the CLI.

A cart is three plain declarations:

```js
function init() { }       // once; may be async
function update(dt) { }   // every frame, dt in seconds
function draw() { }       // optional 2D HUD overlay
```

This is stated emphatically in all three system prompts, because it is the
easiest way to break every generated cart at once.

The API is also **namespaced**: `nova64.scene.*`, `nova64.camera.*`,
`nova64.light.*`, `nova64.fx.*`, `nova64.draw.*`, `nova64.input.*`,
`nova64.util.*`, `nova64.xr.*`, and more. The old flat globals were retired
upstream, so a bare `createCube(...)` throws.

Reference: <https://nova64.io/docs/api-3d>

## 3. Constraint two: the host page needs a real origin

The runner replies with `event.source.postMessage(msg, event.origin)`. That is
correct usage, but it requires the **host** page to have a real `scheme://host`
origin.

A page loaded from `file://` has an opaque origin that serialises to the string
`"null"`, which is not a parseable URL. `postMessage` then throws a `SyntaxError`
**inside the runner's `EXECUTE_CODE` handler** — at the first
`postLog('Scene reset for new cart')`, which runs *before*
`createStudioCartFunction(userCode)`. The cart is never evaluated, the screen
stays blank, and the only clue is an error whose position points into the
minified bundle.

So the mobile clients load the playground with an **https base URL**:

| platform | mechanism |
| --- | --- |
| iOS | `WebViewCoordinator` → `loadHTMLString(html, baseURL: https://nova64.io/maigexr-playground/)` |
| Android | `SceneScreen` → `loadDataWithBaseURL("https://nova64.io/maigexr-playground/", …)` |
| Web/Electron | already a real origin; never affected |

That also makes the page same-origin with the runner, so its replies arrive.

**Consequence:** `playground-nova64.html` must be **fully self-contained**. An
https document cannot load `app://` or `file:///android_asset/` subresources, so
the page inlines its own native bridge rather than importing the shared
`playground-utils.js` the other playgrounds use.

> The durable fix belongs upstream: wrapping that `postLog` in `try/catch`, or
> posting to `'*'`, would make every studio host immune.

## 4. `hero-embed`, not `cart-runner`

Two runner pages are published. `cart-runner` wraps the screen in a CRT bezel
with scanlines, a glare layer and a "NOVA-64" hardware badge, and leaves the
runtime's fullscreen button visible — console chrome on top of the game.
`hero-embed` draws nothing but the canvas and explicitly hides that button.

We use `hero-embed` so playing a cart shows only the game:

```
https://nova64.io/hero-embed?studio=1&w=<px>&h=<px>&clearColor=0x090a0f
```

Trade-off: `hero-embed` pins `w`/`h`, so it renders at a fixed size rather than
responsively. Every host therefore measures its container, passes `w`/`h`, and
re-boots the frame when it changes shape, replaying the current cart once the
console reports ready again (a `ResizeObserver` on web; a debounced resize plus
the editor-swap hook on mobile).

Why hosted rather than vendored: all the other libraries already load their
engine from a CDN, so this adds no new network requirement. Vendoring would cost
~8.7 MB of JS per app and *still* need the network, because nova64's own
importmap pulls `three` from esm.sh.

## 5. The mobile playground must auto-run

`playground-nova64.html` calls `runCode()` itself at the end of a successful
`window.setFullEditorContent(code)`.

This is load-bearing. The native injector (iOS `ContentView.injectCodeIntoEditor`,
Android `SceneScreen`) has several strategies, and only its **fallback** calls
`runCode()`. When `setFullEditorContent` succeeds it returns `SUCCESS_METHOD_1`
immediately and runs nothing. Every existing playground
(`playground-threejs.html`, `-babylonjs`, `-aframe`) auto-runs from inside that
function — which is what makes them work.

Diagnostic signature if this is ever lost: the host log shows
`setFullEditorContent result: SUCCESS` and `SUCCESS_METHOD_1`, but no subsequent
execute line from the page, and the scene stays blank.

The run is deferred with `setTimeout` so `setFullEditorContent` still returns a
boolean synchronously, which is what the native side reads.

---

## 6. File map

### Web / Electron (`WebMaigeXr`)

| file | role |
| --- | --- |
| `src/lib/nova64-runner.ts` | runner URL builder, protocol constants, `createNova64Bridge()` |
| `src/components/playground/nova64-renderer.tsx` | renders the runner iframe, measures and re-boots on resize |
| `src/components/playground/scene-renderer.tsx` | delegates `nova64` to the dedicated renderer |
| `src/store/store-defaults.ts` | the `nova64` `Library3D` entry: system prompt + cart template |
| `src/lib/export-service.ts` | `generateNova64Export()` — CLI project plus a zero-install preview page |
| `src/lib/build-service.ts` | `nova64` in the framework union and dependency map |
| `src/components/examples/examples-modal.tsx` | a Nova64 starter example |
| `src/components/snippets/*.tsx` | filter lists and badge colour |
| `electron/menu.ts` | **Nova64** entry in the 3D Library menu |

Electron needs nothing else — it renders the same Next.js UI, and no CSP blocks
the runner iframe.

### iOS (`iOSMaigeXr`)

| file | role |
| --- | --- |
| `XRAiAssistant/Library3D/Nova64Library.swift` | `Library3D` conformance, system prompt, cart examples |
| `XRAiAssistant/Library3D/Library3D.swift` | registers `Nova64Library()` in `Library3DFactory` |
| `XRAiAssistant/Resources/playground-nova64.html` | Monaco + console + runner iframe |
| `XRAiAssistant/WebViewCoordinator.swift` | https base URL for the Nova64 playground (§3) |

No `project.pbxproj` edit is needed: the target uses
`PBXFileSystemSynchronizedRootGroup` (`objectVersion = 77`), so new files under
`XRAiAssistant/` are picked up from the filesystem.

`FrameworkKind` is deliberately untouched — Nova64 is direct-injection, like
Three.js, so it has no build-system entry.

### Android (`AndroidMaigeXr`)

| file | role |
| --- | --- |
| `domain/models/Nova64Library.kt` | `Library3D` implementation, `requiresBuild = false` |
| `data/repositories/Library3DRepository.kt` | registers it; `getFrameworkKind` → `null` |
| `app/src/main/assets/playground-nova64.html` | same page as iOS |
| `ui/components/LibrarySelectorModal.kt` | "Fantasy Console" subtitle |
| `ui/components/SceneScreen.kt` | https base URL for the Nova64 playground (§3) |

---

## 7. Library metadata (identical on all platforms)

```
id             nova64
name           Nova64
version        0.5.2
description    Retro 3D fantasy console - N64/PS1-era games in JavaScript
language       javascript
docs           https://nova64.io/docs/api-3d
features       webgl, webxr, vr, ar, physics, animation, lighting,
               materials, postProcessing, imperative
requiresBuild  false
```

## 8. Verifying changes

`pnpm test` covers the invariants in `tests/nova64-integration.test.ts`: cart
template shape (lifecycle functions present, no `export`, namespaced API), the
chrome-free runner in studio mode, every gating site wired, and — when the
sibling mobile repos are checked out alongside — the auto-run and
self-containment rules for the playground pages.

When changing prompts or templates, check API names against the real contract
rather than memory. `nova64`'s `runtime/namespace.js` exports `NAMESPACE_MAP`,
which is the authoritative list of what lives in each namespace, and
`runtime/index.d.ts` has the exact signatures. Overload order matters, for
example `createCube(size, color, position, options)` and
`createCube(w, h, d, color, position, options)` are both valid, and
`nova64.draw.print` takes a packed colour from `nova64.draw.rgba8(r, g, b, a)`
rather than a palette index or a 3D hex value.

## 9. Known rough edges

- ~~The `dist/` inside the npm tarball is internally inconsistent:
  `dist/cart-runner.html` references an `assets/main-*.js` filename that the
  tarball does not contain.~~ Fixed in 0.5.3: the referenced asset ships. See
  [NOVA64_UPSTREAM_ISSUES.md](NOVA64_UPSTREAM_ISSUES.md) for the issues that do
  still reproduce.
- `hero-embed` appends `demo=hero-demo` to the URL when absent. Harmless:
  studio mode returns before any cart path is resolved.
