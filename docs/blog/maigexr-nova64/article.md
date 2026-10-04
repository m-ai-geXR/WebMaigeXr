# From Prompt to Cartridge: Bringing Nova64 into m{ai}geXR

How we connected AI assisted creation to a retro 3D fantasy console across desktop, iOS, and Android, and what it took to make the whole workflow fit together.

A game idea rarely arrives as a tidy function. It arrives as a paragraph, followed by another paragraph, followed by a very specific opinion about how the spaceship should drift.

One of our recent m{ai}geXR prompts captured that perfectly: NEON SALVAGER, a small salvage ship exploring a neon asteroid field, collecting alien artifacts, dodging drones, and building a score multiplier. The request included shields, particles, a HUD, sound effects, and a restart flow.

That prompt is a useful picture of what we want the creative experience to support. It is a design brief, not evidence that every requested mechanic has already been generated and tested.

Our recent Nova64 integration brings that kind of brief into a more concrete workflow. Choose Nova64 in m{ai}geXR, describe the experience, inspect the generated JavaScript, run it in the embedded console, and continue refining it.

The work reached well beyond adding another name to a library selector. We introduced a dedicated runtime bridge, taught the AI about Nova64 cart structure, built mobile playgrounds, connected desktop export and discovery features, and fixed some surprisingly consequential details in startup and text rendering.

## Why Nova64 fits the project

m{ai}geXR already provides an environment for creating 3D scenes with AI assistance. Nova64 adds a creative direction that is particularly appealing for small games: a fantasy console with a recognizable visual language and a JavaScript programming surface.

[Nova64](https://nova64.io/) describes itself as a browser based fantasy console for creating, playing, and sharing retro 3D games on desktop and mobile. That makes it a natural companion for an editor built around fast experimentation.

Our Nova64 prompts encourage simple geometry, saturated colors, fog, chunky HUDs, and deliberate use of effects. Those choices give a prototype a coherent style before it has a large asset library.

The division of responsibility is straightforward. The AI proposes cart code. m{ai}geXR supplies the conversation, editor, and execution controls. Nova64 runs the cart. The person building the game decides whether the result is fun, readable, and worth another iteration.

## Giving Nova64 its own execution path

The first architectural decision came from understanding how Nova64 runs code.

Our integration treats Nova64 as a console that boots and accepts a cartridge. The host embeds the hosted runner in an iframe and sends JavaScript source once the console is ready.

On desktop, a dedicated Nova64 renderer handles this path. On iOS and Android, a dedicated playground page connects the native application, the editor, and the embedded runner.

The exchange is small enough to explain in a few lines:

```text
Nova64 -> m{ai}geXR: EXECUTE_READY
m{ai}geXR -> Nova64: EXECUTE_CODE with cart source
Nova64 -> m{ai}geXR: CART_LOG
Nova64 -> m{ai}geXR: EXECUTE_SUCCESS or EXECUTE_ERROR
```

The bridge remembers code submitted before the console is ready. Once readiness arrives, it can send that pending cart. Messages also give the host a way to display progress and execution errors.

That separation helps explain failures. A console still booting, an editor receiving code, and a cart throwing an error are different events. The interface needs to represent those differences so a blank preview does not become the only available diagnostic.

## Teaching the AI the actual cart contract

A useful integration needs generated code to match the execution environment.

For our embedded studio runner, carts use plain lifecycle functions:

```javascript
function init() {
  // Create the scene and initialize state.
}

function update(dt) {
  // Advance the simulation using elapsed seconds.
}

function draw() {
  // Draw an optional 2D HUD.
}
```

There is a subtle restriction here: the studio executor evaluates source through `new Function()`. A declaration such as `export function init()` is invalid in that context.

That means an example written for a different loading path can look entirely reasonable and still fail before the game begins. We made the studio cart shape explicit in the system prompts and starter templates across the clients.

We also supplied the grouped API names the integration expects, including `nova64.scene`, `nova64.camera`, `nova64.light`, `nova64.draw`, and `nova64.input`. Exact signatures matter. A generated call can have the right name and still put a color where the runtime expects a position.

The prompts describe those signatures, distinguish mesh colors from packed HUD colors, require a camera and lighting, and encourage allocating meshes during initialization instead of recreating them every frame.

They also instruct the model to multiply motion by `dt`. A rotation that advances by a fixed amount per frame changes speed when the frame rate changes. A rotation based on elapsed seconds behaves much more predictably.

These instructions improve the context we give the model. They do not prove that every generated game is correct. Execution feedback and human playtesting remain part of the workflow.

## A small cart makes the contract tangible

Here is a deliberately small teaching example using the same lifecycle and API style as the integration:

```javascript
let cubeId;

function init() {
  nova64.scene.setClearColor(0x090a0f);
  nova64.camera.setCameraPosition(0, 3, 7);
  nova64.camera.setCameraTarget(0, 0, 0);
  nova64.light.setAmbientLight(0xffffff, 0.8);
  nova64.light.setLightDirection(-0.5, -1, -0.3);
  cubeId = nova64.scene.createCube(2, 0xff3366, [0, 0, 0]);
}

function update(dt) {
  nova64.scene.rotateMesh(cubeId, 0, dt * 1.2, 0);
}

function draw() {
  const white = nova64.draw.rgba8(255, 255, 255, 255);
  nova64.draw.print('HELLO NOVA64', 8, 8, white, 1);
}
```

The example creates one object, transforms it over time, and draws a label. It gives us a compact way to discuss the contract before introducing enemies, scoring, or an inventory.

The companion example includes an offline check with a mocked Nova64 API. That check verifies lifecycle execution, a single cube allocation, and equivalent accumulated rotation at two simulated frame rates. It does not render graphics or certify runtime compatibility on a device.

## Finding the cause of blank mobile previews

One of the most useful lessons came from a failure that looked like a game problem but happened before the cart could execute.

The mobile playground originally loaded with a file based origin. In the runner behavior investigated for this integration, replies used the sender's origin as the destination for `postMessage`.

An opaque origin can serialize as the string `"null"`. That string is not a valid destination URL for this reply path. The runner could throw while trying to send a log message, before evaluating the submitted cart.

The result was an especially misleading blank screen: the editor could contain valid code while the game never reached initialization.

We updated both mobile hosts to load the Nova64 playground with an HTTPS base URL. iOS uses `loadHTMLString` with that base URL, and Android uses `loadDataWithBaseURL`.

The playground also carries its native bridge inline, avoiding dependencies on local `app://` or Android asset URLs that would not fit the new document origin.

This is an integration detail, but its effect is directly visible to a creator. The code needs to reach the console before anyone can judge whether the spaceship behaves correctly.

## Making injected code actually run

A second mobile issue lived at the boundary between the native injector and the page.

The preferred injection path calls `setFullEditorContent`. When that method succeeds, the native code returns immediately. A fallback path calls `runCode`, but the successful primary path does not.

Updating the editor and executing the cart are separate operations. Treating success at the first as proof of the second left the preview empty.

Our Nova64 playground now schedules execution after successfully accepting the new editor content. The scheduling preserves the synchronous return value expected by the native caller while still starting the cart.

That closes an essential part of the experience: moving code into the playground should lead to the expected run behavior.

## Letting the game occupy the preview

Presentation matters when the editor is already doing a lot of work around the scene.

The in app integration uses Nova64's `hero-embed` runner. This removes the surrounding CRT bezel and hardware styling from the embedded preview, giving the game more room inside m{ai}geXR.

There is a sizing tradeoff. This runner takes explicit width and height parameters, so the host measures the available container and rebuilds the runner URL when its size changes sufficiently.

The desktop renderer uses a `ResizeObserver`. The mobile playgrounds respond to viewport changes and editor layout changes, with a delay to settle resize events. After the console boots again, the host replays the current cart.

This preserves the source being edited, but it restarts the runtime. It should not be mistaken for saving and restoring a game in progress. That distinction matters when testing a long level or rotating a tablet during play.

## Connecting the rest of the product

We registered Nova64 in the library systems for desktop, iOS, and Android, with its own prompt, JavaScript template, documentation link, and playground behavior.

On desktop, the integration also reaches the native Electron library menu, snippet filters, snippet saving controls, the examples interface, export generation, and the build service's framework definitions.

These are easy places to miss when adding a new runtime. A library can work in the main editor while being absent from the menu or impossible to select when saving a reusable snippet.

The mobile library definitions include examples such as a retro corridor runner, a small solar system, an interactive color grid, and a VR scene. They demonstrate different parts of the API and provide useful starting points for further prompts.

The presence of an XR example or a capability flag does not mean every embedded browser can enter an immersive session. Device and browser support still determine what can actually run.

## Taking a cart outside the editor

Desktop export now has a Nova64 specific generator.

The generated files include the raw cart source, a JavaScript wrapper that holds that source as a string, an HTML preview page, and package metadata declaring Nova64 with development scripts. An optional README explains the contents and the available workflows.

The HTML preview uses the hosted studio protocol. Serve the exported folder over HTTP so the page has an appropriate origin. It still needs the hosted runtime and network access.

There is also a visual distinction worth making explicit: the exported preview currently uses `cart-runner`, while the in app preview uses `hero-embed`. The two paths share the studio protocol, but their surrounding presentation differs.

The package metadata provides a starting point for working with the Nova64 CLI. We have not established a complete CLI packaging and deployment validation in this article, so the export should be understood as a source handoff rather than a claim that every distribution path has been tested.

## Improving the app around the integration

Some adjacent updates made the Nova64 workflow easier to use.

On desktop, we addressed a database startup failure caused by a missing sql.js WebAssembly asset. Lifecycle scripts now place that asset where the application expects it. Failed initialization shows a recoverable error, and a failed settings write is handled without throwing out of the UI event handler.

That matters when changing the selected library or model. A broken persistence layer should produce a useful explanation rather than a cascade of unrelated looking errors.

The Electron app also gained the vaporwave startup presentation used by the mobile clients, with the main process coordinating the handoff to the app window.

The surrounding AI work includes refreshed model configuration and controls, plus iOS improvements for streaming, provider routing, transient stream failures, and longer reasoning requests. These support the same creation loop, although they are separate from Nova64's execution protocol.

Our latest iOS cleanup addresses the prompt itself. Long user messages were aligning each rendered text block to the right. The shared message renderer now uses leading alignment for the content, making paragraphs, headings, and requirements easier to scan within the outgoing bubble.

That source change passed syntax checking. Visual confirmation of the updated layout in the simulator remains pending. The NEON SALVAGER screenshot shows the earlier layout and should not be used as an after image.

## What we have verified

For this article, we reran the desktop repository's test suite. All 33 tests passed, including 23 Nova64 integration checks.

The Nova64 checks cover registration, template structure, namespaced calls, runner URL settings, desktop integration points, and the mobile playground files present in the sibling repositories. The remaining tests cover the database asset and settings behavior.

Many of these checks inspect source structure. They are useful regression guards, but they do not replace exercising the hosted runtime, testing touch controls, or playing a generated game on actual hardware.

The offline companion example adds a narrow behavioral check for the teaching cart. No provider request or external publication is part of that check.

## The next creative loop

The most exciting result is the workflow taking shape around these pieces.

A creator can start with a game idea, choose Nova64, inspect generated code, run it in the console, read execution feedback, and refine the experience. Desktop export provides a way to take that source into another working environment.

For a brief like NEON SALVAGER, I would begin with movement and a small asteroid field. Once that feels right, I would add pickups, then enemies, then scoring and presentation. Each step gives the next prompt something concrete to improve.

That is the direction we are building toward: a shorter distance between describing a small world and spending time inside it, with enough visibility into the code to keep shaping what happens next.
