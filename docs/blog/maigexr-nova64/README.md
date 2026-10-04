# Medium article package: m{ai}geXR and Nova64

[Read the Medium draft](article.md).

Prepared October 2, 2026. This is a local draft, not an externally published article. It covers the active WebMaigeXr, iOSMaigeXr, and AndroidMaigeXr repositories, rather than the older copies under maigeXR/.

## Publication details

Title: From Prompt to Cartridge: Bringing Nova64 into m{ai}geXR

Subtitle: How we connected AI assisted creation to a retro 3D fantasy console across desktop, iOS, and Android, and what it took to make the whole workflow fit together.

Suggested Medium tags: Game Development, Artificial Intelligence, JavaScript, Creative Coding, Mobile Development.

The article uses simple Markdown without tables, emphasis markup, HTML, or bullet lists. Paste into Medium and check headings and code blocks in its editor. Local companion links belong in this README so the article body remains usable without filesystem links.

## Companion example

[hello-nova64.js](examples/hello-nova64.js) is the teaching cart shown in the article. [verify.mjs](examples/verify.mjs) runs an offline mock of its API calls. From this directory:

```sh
node examples/verify.mjs
```

The example and verification script do not contact AI providers, publish anything, or launch shell processes. The mock verifies lifecycle execution, one cube allocation, HUD arguments, and equal accumulated rotation after one simulated second at 30 and 120 FPS. It does not prove rendering, actual Nova64 execution, touch support, or device compatibility.

## Evidence and implementation references

[Integration design notes](../../NOVA64_INTEGRATION.md) describe the architecture and original failure diagnoses. The current implementation was also inspected directly:

1. [Runner bridge](../../../src/lib/nova64-runner.ts) and [desktop renderer](../../../src/components/playground/nova64-renderer.tsx): studio protocol, pending code, frame source checks, logs, errors, container measurement, and cart replay.
2. [Desktop library definitions](../../../src/store/store-defaults.ts): Nova64 registration, prompt, template, and namespaced API instructions.
3. [Export generator](../../../src/lib/export-service.ts): actual generated filenames, hosted cart-runner preview, HTTP serving instructions, and CLI package metadata. The article deliberately distinguishes exported cart-runner presentation from in-app hero-embed. No end-to-end CLI packaging claim is made.
4. [Build service](../../../src/lib/build-service.ts), [Electron menu](../../../electron/menu.ts), [examples interface](../../../src/components/examples/examples-modal.tsx), [snippet library](../../../src/components/snippets/snippet-library.tsx), and [snippet saving](../../../src/components/snippets/save-snippet-dialog.tsx): desktop integration points.
5. [iOS Nova64 definition](../../../../iOSMaigeXr/XRAiAssistant/Library3D/Nova64Library.swift) and [Android Nova64 definition](../../../../AndroidMaigeXr/app/src/main/java/com/xraiassistant/domain/models/Nova64Library.kt): cart prompts, starter code, and mobile examples.
6. [iOS playground](../../../../iOSMaigeXr/XRAiAssistant/Resources/playground-nova64.html) and [Android playground](../../../../AndroidMaigeXr/app/src/main/assets/playground-nova64.html): native bridge, resize handling, and execution after injection.
7. [iOS host](../../../../iOSMaigeXr/XRAiAssistant/WebViewCoordinator.swift) and [Android host](../../../../AndroidMaigeXr/app/src/main/java/com/xraiassistant/ui/components/SceneScreen.kt): HTTPS base URL loading.
8. [iOS message renderer](../../../../iOSMaigeXr/XRAiAssistant/Views/MarkdownMessageView.swift): current uncommitted leading alignment fix. Syntax checked in the preceding task; no after screenshot or simulator verification is claimed.
9. [Database startup notes](../../DATABASE_INIT_FIX.md) and [Electron splash notes](../../ELECTRON_SPLASH.md): adjacent usability changes. [iOS README](../../../../iOSMaigeXr/README.md) and repository history document adjacent AI updates; the article avoids unverified provider availability and model capability claims.
10. [Nova64 regression tests](../../../tests/nova64-integration.test.ts), [database asset tests](../../../tests/sql-wasm-assets.test.ts), and [settings tests](../../../tests/app-store-settings.test.ts): automated verification scope.

The local Nova64 runtime's studio-executor.js and index.d.ts under the sibling nova64 checkout were inspected to corroborate function evaluation and the teaching example's API signatures.

The [official Nova64 homepage](https://nova64.io/) was read for the brief public description of the console. The official API page linked by the app could not be fetched through the web research tool; detailed implementation claims use local source rather than assuming that page was verified.

Source history reviewed included desktop commits 95443c8, 0cb9da9, 55ce545, 2f65074, e0aa6ac, and eb9503d; iOS commits 52878e3 and c999b19; and Android commits f5d8d34 and 3ffdab7, along with the current working files.

## Images and publication assets

No image assets are embedded in this draft. The supplied iPad screenshot was reviewed as evidence of the NEON SALVAGER prompt and its earlier alignment issue. It does not establish successful gameplay or the corrected layout, so it is not presented as a current product screenshot.

A future publication image should come from a verified running cart or a verified corrected chat view. Neither has been fabricated for this package.

## Verification record

The existing desktop suite was run with pnpm test: 3 test files passed, 33 tests passed, including all 23 Nova64 integration checks. The mobile source checks ran because both sibling repositories were present. Expected warnings appeared in the tests that simulate failed database persistence; no tests failed.

The companion check was run with node examples/verify.mjs. Its result is limited to the mocked behavior described above. Article formatting, relative links, and consistency between the article's cart and the companion source were checked locally.

Native builds, live hosted rendering, XR sessions, generated NEON SALVAGER gameplay, and CLI export execution were not validated during article preparation. No application code was changed as part of this writing task.
