# Prompt: bring the Nova64 Studio "template method" to m{ai}geXR

Paste everything below the line into a coding-agent session (Claude Code or
similar) started in `~/exp/maigeXR/WebMaigeXr`. Run it phase by phase; each phase
ends at a checkpoint for owner review.

---

## Your task

m{ai}geXR lets a user describe a 3D scene in plain English; a cloud LLM (Gemini,
OpenAI, Anthropic or Together, using the user's own key) writes a Nova64 cart,
and the app runs it in the hosted Nova64 studio runner. Today the model writes
the **whole cart from scratch** every time, guided only by the system prompt in
`src/store/store-defaults.ts`.

In a sibling project, **Nova64 Studio** (`~/local-llm/projects/nova64-studio`),
we made a much weaker local model (Qwen3-30B-A3B) produce first-try playable,
good-looking Nova64 games. Before, free-form carts took up to 9 attempts and still
looked broken. After, builds passed on the first try in 32–56 seconds. Your job
is to bring the parts of that method that transfer into m{ai}geXR's Nova64
integration, so users get working, attractive carts far more often.

### The method, in four rules

1. **Ground truth over memory.** Generate API names from Nova64's real
   `NAMESPACE_MAP` instead of hand-typed lists, and reject any `nova64.*` name not in it.
2. **Check what the player sees.** Static checks catch typos. Only running the
   cart catches a black screen. Feed failures back to the model as specific
   repair notes, then retry a bounded number of times.
3. **Turn recurring mistakes into code or short verified lessons,** not longer
   prompt paragraphs.
4. **Give the model less to do.** For game-like requests, start from a proven
   template engine and have the model edit only its marked `CONFIG` section.

## Read first (do not skip)

In this repo:
- `docs/NOVA64_INTEGRATION.md`: studio-mode protocol, the "no export" rule,
  the https-origin constraint, `hero-embed`, auto-run on mobile.
- `docs/NOVA64_UPSTREAM_ISSUES.md`: what was wrong upstream and is now fixed in 0.5.6.
- `src/lib/nova64-runner.ts`, `src/components/playground/nova64-renderer.tsx`,
  `src/lib/scene-errors.ts`, `src/store/store-defaults.ts` (the `nova64` entry),
  `tests/nova64-integration.test.ts`.

In Nova Studio (read-only reference; copy ideas, not files, unless noted):
- `~/local-llm/projects/nova64-studio/lessons.md`: verified lessons.
- `~/local-llm/projects/nova64-studio/check_cart.mjs`: the checker (lint,
  namespace check, forbidden patterns, headless boot, screenshot blank check).
- `~/local-llm/projects/nova64-studio/nova64_studio.py`: see
  `normalize_imports`, `template_parts`, `splice_config`, `config_problems` and
  the repair-prompt wording.
- `~/local-llm/projects/nova64-studio/templates/*/{code.js,TEMPLATE.md}`: six
  tested engines with `CONFIG` / `ENGINE` markers.
- `~/exp/nova64/examples/QWEN/*/code.js`: finished carts made from those templates.

Authoritative API: `~/exp/nova64/runtime/namespace.js` (`NAMESPACE_MAP`) and
`runtime/index.d.ts`. Use the version m{ai}geXR pins (`NOVA64_VERSION`, currently
0.5.6). If the local checkout differs, read the published package instead
(`npm pack nova64@<version>`).

## Hard constraints

- **Do not modify the Nova64 repo** (`~/exp/nova64`) or ask the model to write
  runtime/API code. Carts only. Record upstream bugs in
  `docs/NOVA64_UPSTREAM_ISSUES.md` instead.
- Preserve the studio contract: plain `function init/update/draw`, no `export`,
  no `import`. Destructuring at the top of a cart
  (`const { createCube } = nova64.scene;`) is fine in a script; the Studio carts
  already use it.
- The user's API key stays on the device. Add no new network calls beyond the
  user's chosen provider and the existing hosted runner.
- Keep Web/Electron, iOS (`../iOSMaigeXr`) and Android (`../AndroidMaigeXr`)
  consistent. The system prompt and templates are duplicated per platform, so
  either change all three or generate them from one source and test that they match.
- Every retry loop is bounded (default 2 repair attempts) and visible to the user.
  Never retry silently in the background.
- Work on a branch. Run `pnpm test` (and the platform test suites you touch)
  before each checkpoint. Don't commit unless asked.

## Phase 1: ground truth and lessons (small, high value)

1. Add a script that reads `NAMESPACE_MAP` for the pinned version and writes a
   generated module (for example `src/lib/nova64-api.generated.ts`). Add a test
   that fails if any `nova64.<group>.<name>` appearing in the system prompt, the
   `codeTemplate` or the examples is missing from it.
2. Audit the current system prompt and starter template against the real API and
   against `lessons.md`. Verify each item by running it, not from memory. Suspects worth checking:
   - Is `cls` listed for `draw()`? In a 3D cart, `cls()` in `draw()` paints over the scene.
   - `createPlane` stands upright; a floor needs `setRotation(id, -Math.PI/2, 0, 0)`.
     The current starter template's ground plane is not rotated.
   - `nova64.draw.drawPanel` resolves to the UI-object version and draws nothing
     for `(x, y, w, h, opts)`; Studio uses its own `panel()` helper instead.
   - `drawProgressBar(x, y, w, h, frac, fg, bg)` and
     `drawTextShadow(text, x, y, color, shadow, scale)`: confirm the signatures
     the prompt teaches.
3. Add a short **Verified lessons** block to the system prompt: 8–12 bullets,
   each one confirmed by a running cart.

**Checkpoint 1:** a diff of the prompt and template changes, the new test, and
before/after screenshots of the starter template.

## Phase 2: check, then repair

1. **Static pre-run validator** (`src/lib/nova64-validate.ts`), run on
   generated code before it is sent to the runner:
   - Unknown `nova64.*` names, with a suggestion from the generated API list.
   - Forbidden patterns: `import`, top-level `export`, assigning to `nova64`,
     prototype patching, `eval`/`new Function`, `fetch`/XHR/WebSocket, and
     `this.` inside `init`/`update`/`draw`.
   - `cls(` inside `draw()` when the cart creates 3D meshes (a warning).
   - Missing `init` or `update`.
2. **Runtime signals:** use the existing bridge (`EXECUTE_ERROR`, `CART_LOG`)
   and `classifyCartError`. Investigate whether a blank-screen check is possible
   (the runner is cross-origin, so you may not be able to read pixels). Options
   include a probe the host appends to the cart that reports mesh count or scene
   state through `CART_LOG`, or an upstream feature request. Report what's
   feasible; don't fake it.
3. **Repair loop:** when validation or runtime fails, send the model one compact
   repair message listing the concrete problems (copy the style of Studio's
   repair prompt), up to 2 times. Show "Fixing: <problem>" in the chat. Keep the
   last working version if the repair is worse.

**Checkpoint 2:** tests for the validator, a recorded run where a deliberately
broken cart is repaired, and a description of what the user sees.

## Phase 3: templates (the big win)

1. Port the six Studio templates to the m{ai}geXR cart shape: dungeon crawler
   (stone, neon), lane runner (corridor, grid) and arena dodger (cave, neon).
   Keep the `CONFIG` / `ENGINE` markers, story slides and auto-play (P). Confirm
   each one runs in `hero-embed` studio mode at the sizes m{ai}geXR uses, on all
   three platforms.
2. **Template mode in the UI:** a "Start from a game template" option (examples
   modal or library picker) showing a card for each template. When the user
   describes a game in template mode:
   - The model receives the template's `CONFIG` plus its `TEMPLATE.md` and must
     return only a `CONFIG` block.
   - The host splices it between the markers and runs `config_problems`-style
     checks: required consts present, valid layout, no pure-black colours. Then
     the normal validator and repair loop run.
   - Follow-up chat ("make it spookier", "faster enemies") edits `CONFIG` again.
     The user can drop to full-code editing at any time.
3. Free-form generation stays the default for non-game scenes; template mode is opt-in.

**Checkpoint 3:** each template built from one example prompt with each provider
you can test, screenshots, and first-try pass rates (template versus free-form)
for at least 5 prompts.

## Phase 4: mobile parity and docs

- Bring the system prompt, lessons, validator rules and templates to iOS
  (`Nova64Library.swift`, `playground-nova64.html`) and Android
  (`Nova64Library.kt`, `assets/playground-nova64.html`). Respect the
  self-contained-page and auto-run rules in `NOVA64_INTEGRATION.md`.
- Update `docs/NOVA64_INTEGRATION.md` with a "Template method" section and the
  file map.

## How to report

At each checkpoint: what changed (files), what you verified and how (tests,
screenshots, recorded runs), what you could not verify, and any upstream Nova64
issues found. Be explicit about failures; don't round them up.
