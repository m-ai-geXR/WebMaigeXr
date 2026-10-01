/**
 * Nova64 Studio Runner
 *
 * Nova64 (https://nova64.io) is a retro 3D fantasy console. Unlike the other
 * libraries in m{ai}geXR, it is not a script you drop on a page — it is a
 * console runtime that boots itself and then accepts carts.
 *
 * Its runtime ships a "studio mode" built for exactly this use case: a host
 * editor that pushes code into an already-running console. We embed the hosted
 * runner in an iframe and speak its postMessage protocol.
 *
 * Protocol (nova64 src/main.js):
 *   runner -> host   { type: 'EXECUTE_READY' }                  posted to '*'
 *   host   -> runner { type: 'EXECUTE_CODE', code }
 *   runner -> host   { type: 'CART_LOG', message }
 *   runner -> host   { type: 'EXECUTE_SUCCESS' }
 *   runner -> host   { type: 'EXECUTE_ERROR', error }
 *
 * The runner resets the whole scene (meshes, fog, skybox, post-processing,
 * camera, XR) on every EXECUTE_CODE, so re-running is safe.
 */

export const NOVA64_VERSION = '0.5.2'
export const NOVA64_DOCS_URL = 'https://nova64.io/docs/api-3d'

/**
 * Base URL of the hosted studio runner.
 *
 * `hero-embed` rather than `cart-runner`: cart-runner wraps the screen in a CRT
 * bezel with scanlines, a glare layer and a "NOVA-64" hardware badge, and leaves
 * the runtime's fullscreen button visible. hero-embed is the bare runner — the
 * canvas fills the frame and nothing else is drawn — so playing a cart shows only
 * the game. Override via env for a local nova64 dev server.
 */
export const NOVA64_RUNNER_BASE =
  process.env.NEXT_PUBLIC_NOVA64_RUNNER_URL || 'https://nova64.io/hero-embed'

/**
 * Origin of the runner, used as the postMessage target.
 *
 * Derived from the base URL so a local dev server keeps working.
 */
export function getNova64RunnerOrigin(): string {
  try {
    return new URL(NOVA64_RUNNER_BASE).origin
  } catch {
    return 'https://nova64.io'
  }
}

export const NOVA64_MESSAGES = {
  ready: 'EXECUTE_READY',
  execute: 'EXECUTE_CODE',
  success: 'EXECUTE_SUCCESS',
  error: 'EXECUTE_ERROR',
  log: 'CART_LOG',
} as const

export interface Nova64RunnerOptions {
  /** Viewport width handed to the console, in CSS px. */
  width?: number
  /** Viewport height handed to the console, in CSS px. */
  height?: number
  /** Background clear colour as a hex literal string, e.g. '0x090a0f'. */
  clearColor?: string
}

/**
 * Build the runner URL. `studio=1` stops the console auto-loading a demo cart and
 * makes it wait for our code instead.
 */
export function buildNova64RunnerUrl(options: Nova64RunnerOptions = {}): string {
  const { width, height, clearColor = '0x090a0f' } = options
  const params = new URLSearchParams({ studio: '1', clearColor })
  if (width && width > 0) params.set('w', String(Math.round(width)))
  if (height && height > 0) params.set('h', String(Math.round(height)))
  return `${NOVA64_RUNNER_BASE}?${params.toString()}`
}

export interface Nova64BridgeHandlers {
  /** The console has booted and is waiting for a cart. */
  onReady?: () => void
  /** Cart ran without throwing. */
  onSuccess?: () => void
  /** Cart threw during init/first frame. */
  onError?: (message: string) => void
  /** Progress lines from the console (scene reset, init completed, ...). */
  onLog?: (message: string) => void
}

export interface Nova64Bridge {
  /** Push cart source into the console. No-op until the console reports ready. */
  run: (code: string) => boolean
  /** True once EXECUTE_READY has arrived. */
  isReady: () => boolean
  /** Remove the message listener. */
  dispose: () => void
}

/**
 * Wire up a bridge to a runner iframe.
 *
 * Worth knowing: the runner replies with `event.source.postMessage(msg, event.origin)`.
 * That needs our page to have a real scheme://host origin. In the browser and in
 * Electron it always does, so the full protocol works. On a page with an opaque
 * origin (a file:// document, as the mobile clients used to load) `event.origin`
 * serialises to the string "null", postMessage throws *inside* the runner's
 * EXECUTE_CODE handler, and the cart is never evaluated — a blank screen. That is
 * why the mobile playgrounds are loaded with an https base URL.
 */
export function createNova64Bridge(
  getFrame: () => HTMLIFrameElement | null,
  handlers: Nova64BridgeHandlers = {}
): Nova64Bridge {
  let ready = false
  let pending: string | null = null

  const post = (code: string): boolean => {
    const frame = getFrame()
    if (!frame?.contentWindow) return false
    frame.contentWindow.postMessage(
      { type: NOVA64_MESSAGES.execute, code },
      getNova64RunnerOrigin()
    )
    return true
  }

  const onMessage = (event: MessageEvent) => {
    const frame = getFrame()
    // Only trust messages from our own runner frame.
    if (!frame || event.source !== frame.contentWindow) return

    const type = (event.data as { type?: string } | null)?.type
    switch (type) {
      case NOVA64_MESSAGES.ready:
        ready = true
        handlers.onReady?.()
        // Flush any Run pressed before the console finished booting.
        if (pending !== null) {
          const code = pending
          pending = null
          post(code)
        }
        break
      case NOVA64_MESSAGES.success:
        handlers.onSuccess?.()
        break
      case NOVA64_MESSAGES.error:
        handlers.onError?.(String((event.data as { error?: unknown }).error ?? 'Unknown cart error'))
        break
      case NOVA64_MESSAGES.log:
        handlers.onLog?.(String((event.data as { message?: unknown }).message ?? ''))
        break
    }
  }

  window.addEventListener('message', onMessage)

  return {
    run: (code: string) => {
      if (!ready) {
        // Remember it; we'll send it the moment the console says it's ready.
        pending = code
        return false
      }
      return post(code)
    },
    isReady: () => ready,
    dispose: () => {
      window.removeEventListener('message', onMessage)
      pending = null
    },
  }
}
