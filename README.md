# m{ai}geXR Desktop

**AI-powered 3D and Extended Reality development, as a desktop app.**

[![Sponsor seacloud9](https://img.shields.io/badge/Sponsor-seacloud9-ea4aaa?logo=githubsponsors&logoColor=white)](https://github.com/sponsors/seacloud9)

Describe a scene in plain English; m{ai}geXR writes the code for your chosen 3D
framework, runs it next to the editor, and keeps editing it as you keep talking.

This repository is the **desktop and web client** (`maigexr-desktop`). It ships
two ways from one codebase:

- **Electron app** for macOS, Windows and Linux — the primary target
- **Next.js dev server** at `http://localhost:3000` for development

The iOS and Android clients live in the sibling `iOSMaigeXr/` and
`AndroidMaigeXr/` repositories and share the same model catalog, 3D library set
and system prompts.

---

## Features

### Multi-provider AI

Five providers, selected per-session, with the model catalog defined in
[src/store/store-defaults.ts](src/store/store-defaults.ts):

| Provider | Models |
|---|---|
| **Together AI** | Llama 3.3 70B (free), DeepSeek R1 70B (free), DeepSeek V3, DeepSeek R1, Llama 3.3 70B, Qwen 2.5 Coder 32B, Qwen 2.5 72B Turbo |
| **OpenAI** | GPT-6 Astra, GPT-5.6 Sol / Terra / Luna, GPT-5.2 |
| **Anthropic** | Claude Fable 5.1, Opus 5, Sonnet 5, Haiku 4.5, Opus 4.6, Sonnet 4.6 |
| **Google AI** | Gemini 3.1 Pro, Gemini 2.5 Pro / Flash / Flash Lite |
| **xAI** | Grok 4, Grok 4 Fast Reasoning, Grok 3, Grok 3 Mini, Grok Code Fast |

The default is Together AI's free Llama 3.3 70B, so the app is usable without
a paid key.

**Two control modes.** The frontier models (Claude 5 series, GPT-5.6 / GPT-6)
removed `temperature` and `top_p` and reject requests that carry them, so they
take a discrete **Reasoning Effort** level instead — `low`, `medium`, `high`,
`xhigh` or `max`, defaulting to `high`. Every other model keeps **Temperature**
(0.0–2.0) and **Top-p** (0.1–1.0). The settings panel shows whichever applies
to the selected model (`AIModelControl` in
[src/store/app-store.ts](src/store/app-store.ts)).

**Model migrations.** Retired model IDs stored in a previous session are
remapped on load (`modelMigrations` in `store-defaults.ts`), so an old
`claude-3-5-sonnet-*` or `gpt-4o` setting resolves to a current model instead of
failing the request.

### Six 3D libraries

| Library | Version | How it runs |
|---|---|---|
| **Babylon.js** | 8.22.3 | CDN injection, or the Sandpack bundler in npm mode |
| **Three.js** | r171 | CDN injection, or the Sandpack bundler in npm mode |
| **React Three Fiber** | 8.17.10 | Always bundled through Sandpack — the default library |
| **A-Frame** | 1.7.0 | CDN injection, WebXR VR/AR |
| **Reactylon** | 3.2.1 | Always bundled through Sandpack |
| **Nova64** | 0.5.2 | Embedded studio runner — see below |

The React-based frameworks are bundled with Sandpack because they need a real
build step. Babylon.js and Three.js render from CDN scripts by default, and
switch to the Sandpack bundler when you enable npm package mode in the
playground — which is what makes the **Package manager** panel useful. Nova64
bypasses both and renders through its own runner.

Each library carries its own system prompt and starter template, so switching
frameworks changes what the AI generates, not just what runs.

**Nova64** is a retro 3D fantasy console (N64/PS1-era low-poly rendering on top
of Three.js) rather than a library you call. It boots its own runtime and
accepts *carts*, so m{ai}geXR embeds Nova64's hosted runner in studio mode
(`?studio=1`) and posts cart source into it over `postMessage`. Carts are three
plain declarations — `init()`, `update(dt)`, `draw()` — with **no top-level
`export`**, because the runner evaluates source with `new Function()`. The full
design, including the two non-obvious constraints that shape it, is in
[docs/NOVA64_INTEGRATION.md](docs/NOVA64_INTEGRATION.md).

### Development environment

- **Monaco editor** with IntelliSense, split-view against the live scene
- **Sandpack** build pipeline for the React-based frameworks (R3F, Reactylon)
- **Package manager** panel for adding dependencies to a built scene
- **Export** to a standalone zip, and shareable scene links
- **Snippet library** — save, tag and reload generated scenes
- **Examples** browser with ready-made scenes per framework
- **Favorites** and **conversation history**, persisted locally
- **Error boundary** around the renderer so a bad scene doesn't take the app down

### Local database and RAG

Scenes, conversations, snippets and favorites persist in a local SQLite database
via **sql.js** (WebAssembly). The WASM binary is copied into `public/` by
`scripts/sql-wasm-assets.js`, which runs automatically on `predev`, `prebuild`
and `postinstall`.

If the database fails to initialize, the app now **surfaces the failure**
instead of rendering a half-working UI — see
[docs/DATABASE_INIT_FIX.md](docs/DATABASE_INIT_FIX.md).

An embedding service plus `rag-service.ts` provide on-device retrieval over your
own scene history, so context never leaves the machine.

### Desktop integration (Electron)

- **Vaporwave splash screen** on startup, visually identical to the iOS and
  Android splashes, which hands off when the app window has actually loaded —
  see [docs/ELECTRON_SPLASH.md](docs/ELECTRON_SPLASH.md)
- **OS keychain** storage for API keys (`keytar`), with the encrypted store as
  fallback
- **Auto-updates** via `electron-updater`
- **Native menu** and persisted window state
- Packaged with `electron-builder` as `com.maigexr.desktop`

### API key handling

Keys are encrypted with **AES-256-GCM** and a **PBKDF2** key derived from a
password you choose (100,000 iterations, random salt and IV per encryption).
The password is held in memory for the session only and the store auto-locks on
inactivity; see [src/lib/crypto-service.ts](src/lib/crypto-service.ts) and the
unlock flow in [src/components/settings/api-key-unlock.tsx](src/components/settings/api-key-unlock.tsx).

In the Electron build, keys go to the OS keychain instead.

> **If you serve the Next.js build on a public host**, understand what you are
> doing: requests to the AI providers are made from the client, so each visitor
> supplies and stores their own key in their own browser. That is fine for a
> single-user desktop app or localhost, and it is *not* a multi-tenant
> deployment model. There is no server-side key management or auth in this
> repository.

---

## Getting started

### Prerequisites

- **Node.js 20+**
- **pnpm 8+** (`packageManager` is pinned to `pnpm@8.15.0`)

### Install and run

```bash
pnpm install          # also stages the sql.js WASM assets
pnpm dev              # Next.js dev server -> http://localhost:3000
pnpm dev:electron     # or run it as a desktop window
```

### Configure a provider

1. Open **Settings** (gear icon)
2. Set an unlock password when prompted — this encrypts the key store
3. Paste a key for the provider you want:
   - **Google AI** — [aistudio.google.com/apikey](https://aistudio.google.com/apikey) (free tier, no card)
   - **Together.ai** — [api.together.ai](https://api.together.ai/settings/api-keys)
   - **OpenAI** — [platform.openai.com](https://platform.openai.com/api-keys)
   - **Anthropic** — [console.anthropic.com](https://console.anthropic.com)
   - **xAI** — [console.x.ai](https://console.x.ai)
4. Pick a model and a 3D library, then save

### First scene

Ask for something in the chat:

> Create a glowing green planet with rings and three orbiting moons

The AI generates code for the selected library, which runs in the preview pane.
Then keep going — *"make the planet blue"*, *"add stars"*, *"speed up the
moons"* — each message edits the scene you already have rather than rebuilding
it.

---

## Scripts

| Script | What it does |
|---|---|
| `pnpm dev` | Next.js dev server |
| `pnpm dev:electron` | Dev server plus an Electron window |
| `pnpm build` | Next.js production build |
| `pnpm build:static` | Static export for the Electron package |
| `pnpm build:electron` | Static export + compile + package for the current OS |
| `pnpm build:electron:mac` / `:win` / `:linux` / `:all` | Package for specific targets |
| `pnpm electron:compile` | Compile `electron/` TypeScript |
| `pnpm test` | Vitest suite (single run) |
| `pnpm test:watch` | Vitest in watch mode |
| `pnpm type-check` | `tsc --noEmit` on the app |
| `pnpm type-check:electron` | `tsc --noEmit` on the Electron main process |
| `pnpm lint` | ESLint via `next lint` |
| `pnpm sql-wasm` / `sql-wasm:check` | Stage / verify the sql.js WASM assets |

---

## Tests

```bash
pnpm test
```

33 tests across 3 files, covering the regressions that were expensive to find:

- [tests/app-store-settings.test.ts](tests/app-store-settings.test.ts) — settings
  persistence, including the "database not initialized" path
- [tests/nova64-integration.test.ts](tests/nova64-integration.test.ts) — cart
  shape, the studio-host handshake, and the `export` constraint
- [tests/sql-wasm-assets.test.ts](tests/sql-wasm-assets.test.ts) — the WASM
  staging script

---

## Tech stack

**App** — Next.js 14 (App Router), React 18, TypeScript 5.3, Tailwind CSS 3.3,
Zustand 4.4, Framer Motion, Monaco Editor 0.45, react-markdown

**Desktop** — Electron 28, electron-builder 24, electron-updater,
electron-log, keytar (optional)

**Data** — sql.js 1.13 (WebAssembly SQLite), Web Crypto API, better-sqlite3
(optional, Electron)

**Build / sandbox** — `@codesandbox/sandpack-react` and `sandpack-client`,
jszip

**Testing** — Vitest 1.6

---

## Project structure

```
WebMaigeXr/
├── electron/                      # Electron main process (TypeScript)
│   ├── main.ts, index.ts          # app lifecycle, window creation
│   ├── splash.html                # vaporwave startup scene
│   ├── auto-updater.ts            # electron-updater wiring
│   ├── database.ts                # native SQLite path
│   ├── keychain.ts                # OS keychain for API keys
│   ├── menu.ts, window-state.ts   # native menu, persisted geometry
│   └── preload.ts, splash-preload.ts
├── src/
│   ├── app/                       # Next.js App Router + API routes
│   ├── components/
│   │   ├── chat/                  # conversation UI
│   │   ├── playground/            # Monaco, renderers, Sandpack, Nova64
│   │   ├── conversation/          # history list
│   │   ├── snippets/              # snippet library
│   │   ├── examples/              # example browser
│   │   ├── settings/              # settings panel + key unlock
│   │   ├── ads/                   # banner / interstitial
│   │   └── layout/                # header, bottom navigation
│   ├── lib/
│   │   ├── ai-service.ts          # multi-provider client with streaming
│   │   ├── crypto-service.ts      # AES-GCM key storage
│   │   ├── db-service.ts          # sql.js database
│   │   ├── rag-service.ts         # retrieval over local history
│   │   ├── embedding-service.ts   # embeddings
│   │   ├── nova64-runner.ts       # studio-host bridge
│   │   ├── build-service.ts       # React framework builds
│   │   ├── codesandbox-service.ts # Sandpack integration
│   │   ├── export-service.ts      # zip export
│   │   ├── sharing-service.ts     # shareable links
│   │   ├── favorites-service.ts
│   │   ├── app-config.ts, platform.ts
│   │   └── utils.ts
│   └── store/
│       ├── app-store.ts           # Zustand store
│       └── store-defaults.ts      # providers, models, 3D libraries, prompts
├── scripts/
│   ├── sql-wasm-assets.js         # stage sql.js WASM into public/
│   └── dev-electron.js            # dev orchestration
├── tests/                         # Vitest
├── docs/
│   ├── NOVA64_INTEGRATION.md      # cross-platform Nova64 design notes
│   ├── DATABASE_INIT_FIX.md
│   └── ELECTRON_SPLASH.md
├── electron-builder.yml
└── next.config.js
```

---

## Known issues

- **`pnpm type-check` fails on a clean checkout** with a single error:
  `TS2688: Cannot find type definition file for 'minimatch'`. This is a missing
  transitive `@types/minimatch` package, not an error in app code — the app
  builds and the tests pass. Adding `@types/minimatch` as a dev dependency, or
  excluding it via `typeRoots`/`types` in `tsconfig.json`, clears it.
- **The Sandpack-bundled frameworks need network access.** React Three Fiber
  and Reactylon always build through Sandpack, so they inherit CodeSandbox's
  availability. Babylon.js, Three.js and A-Frame run from CDN scripts, and
  Nova64 runs in its own embedded runner, so those three work without the
  bundler. The Android client disables Reactylon outright for this reason.

---

## Documentation

- [CLAUDE.md](CLAUDE.md) — development guide and architecture notes
- [docs/NOVA64_INTEGRATION.md](docs/NOVA64_INTEGRATION.md) — how Nova64 is wired
  into all three platforms, and why
- [docs/ELECTRON_SPLASH.md](docs/ELECTRON_SPLASH.md) — splash screen and startup
  handoff
- [docs/DATABASE_INIT_FIX.md](docs/DATABASE_INIT_FIX.md) — sql.js startup and
  failure surfacing
- [docs/CHAT_MARKDOWN_RENDERING.md](docs/CHAT_MARKDOWN_RENDERING.md) — how a
  markdown line becomes a chat bubble on all three clients, and the layout trap
  that broke wrapping on iOS and Web

---

## License

MIT, as declared in `package.json`. Note that no `LICENSE` file is currently
committed in this repository — only `mcp-webgpu/` has one. Worth adding.
