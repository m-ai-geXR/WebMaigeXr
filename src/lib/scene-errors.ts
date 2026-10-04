/**
 * Classifying scene, build and startup failures.
 *
 * Companion to ai-errors.ts, for everything that is not a provider call. The
 * difference matters: a provider's response body is noise and is never shown,
 * but an engine's error message is the user's own code failing and is the most
 * useful thing on screen. So the raw text is kept as `detail` and shown
 * alongside the explanation rather than replaced by it.
 *
 * The categories that earn their place are the ones with a known, specific fix.
 * A cart that uses `export` and a cart that calls a retired bare global both
 * fail with messages that do not hint at the real cause, and both break every
 * generated cart at once. See docs/NOVA64_INTEGRATION.md.
 */

export type SceneErrorCategory =
  | 'cart-uses-export'
  | 'cart-bare-global'
  | 'cart-runtime-missing'
  | 'cart-syntax'
  | 'cart-runtime'
  | 'runner-unreachable'
  | 'build-offline'
  | 'build-failed'
  | 'missing-dependency'
  | 'database-assets-missing'
  | 'database-unavailable'
  | 'unknown'

export interface SceneErrorInfo {
  category: SceneErrorCategory
  title: string
  message: string
  action: string
  /** The engine's own message. Unlike a provider body, this is worth showing. */
  detail?: string
}

function info(
  category: SceneErrorCategory,
  title: string,
  message: string,
  action: string,
  detail?: string
): SceneErrorInfo {
  return { category, title, message, action, detail }
}

/**
 * Classify a Nova64 cart failure.
 *
 * `raw` is whatever the runner sent back in EXECUTE_ERROR.
 */
export function classifyCartError(raw: unknown): SceneErrorInfo {
  const text = typeof raw === 'string' ? raw : raw instanceof Error ? raw.message : String(raw ?? '')
  const t = text.toLowerCase()
  const detail = text.trim() || undefined

  // The single easiest way to break every generated cart. The runner evaluates
  // source with new Function(), so a top-level export is a syntax error, even
  // though Nova64's own README shows that form for file-based carts.
  if (t.includes("unexpected token 'export'") || t.includes('unexpected token export') ||
      (t.includes('export') && t.includes('unexpected'))) {
    return info(
      'cart-uses-export',
      'Carts cannot use export',
      'This cart declares its functions with `export`. The console evaluates cart source directly, so a top-level export is a syntax error.',
      'Declare them plainly instead: function init(), function update(dt), function draw(). Ask the assistant to rewrite it without export.',
      detail
    )
  }

  // The flat globals were retired upstream; generated code sometimes still
  // reaches for them.
  const bareGlobal = text.match(/(\w+) is not defined/)
  if (bareGlobal && bareGlobal[1] !== 'nova64') {
    return info(
      'cart-bare-global',
      `${bareGlobal[1]} is not available`,
      'Nova64 groups its API under namespaces. The old flat globals were retired, so a bare call like createCube() throws.',
      `Use the namespaced form, for example nova64.scene.${bareGlobal[1]}(...). The grouped API is documented at nova64.io/docs/api-3d.`,
      detail
    )
  }

  if (t.includes('nova64 is not defined')) {
    return info(
      'cart-runtime-missing',
      'Console did not load',
      'The cart ran before the Nova64 runtime was available.',
      'Press Run again. If it keeps happening, reload the page.',
      detail
    )
  }

  if (t.includes('syntaxerror') || t.includes('unexpected token') || t.includes('unexpected end of input')) {
    return info(
      'cart-syntax',
      'Cart has a syntax error',
      'The console could not parse this cart.',
      'Check the line the error points at, or ask the assistant to fix it.',
      detail
    )
  }

  return info(
    'cart-runtime',
    'Cart stopped running',
    'The cart threw while running.',
    'Check the error below, or describe what went wrong to the assistant and ask for a fix.',
    detail
  )
}

/**
 * Classify a failure to reach or start the embedded runner, as opposed to a
 * failure inside the cart.
 */
export function classifyRunnerError(raw: unknown): SceneErrorInfo {
  const text = typeof raw === 'string' ? raw : raw instanceof Error ? raw.message : String(raw ?? '')
  const detail = text.trim() || undefined

  return info(
    'runner-unreachable',
    'Console did not start',
    'The Nova64 console never signalled that it was ready, so the cart was never sent.',
    'Check your internet connection and press Run again — the console is loaded from nova64.io.',
    detail
  )
}

/**
 * Classify a build failure for the frameworks that bundle through Sandpack.
 */
export function classifyBuildError(raw: unknown): SceneErrorInfo {
  const text = typeof raw === 'string' ? raw : raw instanceof Error ? raw.message : String(raw ?? '')
  const t = text.toLowerCase()
  const detail = text.trim() || undefined

  if (
    t.includes('failed to fetch') || t.includes('networkerror') || t.includes('offline') ||
    t.includes('err_internet_disconnected') || t.includes('timed out')
  ) {
    return info(
      'build-offline',
      'Could not reach the bundler',
      'React Three Fiber and Reactylon build through CodeSandbox, so they need a network connection.',
      'Check your connection, or switch to Babylon.js, Three.js, A-Frame or Nova64, which run without a build step.',
      detail
    )
  }

  const missing = text.match(/Cannot find module ['"]([^'"]+)['"]/i) ||
                  text.match(/Module not found:.*['"]([^'"]+)['"]/i)
  if (missing) {
    return info(
      'missing-dependency',
      `${missing[1]} is not installed`,
      'The scene imports a package that is not in this sandbox.',
      `Add ${missing[1]} from the Packages panel, or ask the assistant to rewrite the scene without it.`,
      detail
    )
  }

  return info(
    'build-failed',
    'Build failed',
    'The scene did not compile.',
    'Check the error below, or ask the assistant to fix it.',
    detail
  )
}

/**
 * Classify a startup failure, where the app cannot run at all.
 */
export function classifyStartupError(raw: unknown): SceneErrorInfo {
  const text = typeof raw === 'string' ? raw : raw instanceof Error ? raw.message : String(raw ?? '')
  const t = text.toLowerCase()
  const detail = text.trim() || undefined

  // The wasm binary is generated into public/, which is gitignored, so a fresh
  // checkout that skipped the predev script fails exactly here.
  if (t.includes('sql-wasm') || t.includes('.wasm') || t.includes('wasm')) {
    return info(
      'database-assets-missing',
      'Database engine missing',
      'The SQLite WebAssembly file could not be loaded, so local storage cannot start.',
      'Run `pnpm sql-wasm` to stage it, then reload. It is generated rather than committed.',
      detail
    )
  }

  if (t.includes('database not initialized') || t.includes('indexeddb') || t.includes('quota')) {
    return info(
      'database-unavailable',
      'Local database unavailable',
      'The app could not open its local database, so conversations and snippets cannot be saved.',
      'Check that browser storage is not blocked or full, then reload. Private windows often block it.',
      detail
    )
  }

  return info(
    'unknown',
    'Could not start',
    'Something failed while starting the app.',
    'Reload the page. If it keeps happening, the detail below will say why.',
    detail
  )
}

/** Chat/panel form: what happened, then what to do. Detail stays separate. */
export function formatSceneError(i: SceneErrorInfo): string {
  return `${i.title}\n\n${i.message}\n\n${i.action}`
}
