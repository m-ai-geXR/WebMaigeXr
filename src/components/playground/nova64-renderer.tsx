'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertCircle, Eye, EyeOff, Loader2, Terminal } from 'lucide-react'
import {
  buildNova64RunnerUrl,
  createNova64Bridge,
  type Nova64Bridge,
} from '@/lib/nova64-runner'
import { classifyCartError, type SceneErrorInfo } from '@/lib/scene-errors'

interface Nova64RendererProps {
  code: string
  isRunning: boolean
}

/** Re-boot the runner only when the frame changes shape meaningfully. */
const RESIZE_EPSILON_PX = 24

/**
 * Renders a Nova64 cart.
 *
 * Nova64 is a console rather than a library: we embed its hosted studio runner
 * and post the editor buffer into it, instead of writing a document into the
 * iframe the way the other libraries do. See src/lib/nova64-runner.ts for the
 * protocol.
 *
 * The runner is `hero-embed`, which draws nothing but the game — no CRT bezel,
 * scanlines or hardware badge. It renders at a fixed size taken from the `w`/`h`
 * query params, so we measure our container and re-boot the frame when it
 * changes shape, replaying the current cart once the console comes back.
 */
export function Nova64Renderer({ code, isRunning }: Nova64RendererProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const bridgeRef = useRef<Nova64Bridge | null>(null)
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const codeRef = useRef(code)
  const hasRunRef = useRef(false)

  const [runnerSrc, setRunnerSrc] = useState<string | null>(null)
  const [isBooting, setIsBooting] = useState(true)
  const [isExecuting, setIsExecuting] = useState(false)
  const [error, setError] = useState<SceneErrorInfo | null>(null)
  const [logs, setLogs] = useState<string[]>([])
  const [showLogs, setShowLogs] = useState(false)
  const [isVisible, setIsVisible] = useState(true)

  codeRef.current = code

  const clearSettleTimer = useCallback(() => {
    if (settleTimer.current) {
      clearTimeout(settleTimer.current)
      settleTimer.current = null
    }
  }, [])

  // Build the bridge once; it survives re-renders and replays a queued cart as
  // soon as the console reports ready — including after a resize re-boot.
  useEffect(() => {
    const bridge = createNova64Bridge(() => iframeRef.current, {
      onReady: () => {
        setIsBooting(false)
        // After a re-boot the console starts empty, so put the cart back.
        if (hasRunRef.current && codeRef.current.trim()) {
          bridge.run(codeRef.current)
        }
      },
      onSuccess: () => {
        clearSettleTimer()
        setIsExecuting(false)
        setError(null)
      },
      onError: (message) => {
        clearSettleTimer()
        setIsExecuting(false)
        setError(classifyCartError(message))
        setShowLogs(true)
      },
      onLog: (message) => setLogs((prev) => [...prev.slice(-49), message]),
    })
    bridgeRef.current = bridge

    return () => {
      clearSettleTimer()
      bridge.dispose()
      bridgeRef.current = null
    }
  }, [clearSettleTimer])

  // Measure the container and (re)boot the runner at that size.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    let lastW = 0
    let lastH = 0

    const apply = () => {
      const w = Math.round(el.clientWidth)
      const h = Math.round(el.clientHeight)
      if (w === 0 || h === 0) return
      if (
        Math.abs(w - lastW) < RESIZE_EPSILON_PX &&
        Math.abs(h - lastH) < RESIZE_EPSILON_PX
      ) {
        return
      }
      lastW = w
      lastH = h
      setIsBooting(true)
      setRunnerSrc(buildNova64RunnerUrl({ width: w, height: h }))
    }

    apply()
    const observer = new ResizeObserver(apply)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!isRunning || !code.trim()) return

    hasRunRef.current = true
    setError(null)
    setLogs([])
    setIsExecuting(true)
    bridgeRef.current?.run(code)

    // The console confirms with EXECUTE_SUCCESS. If that never arrives we stop
    // showing a spinner rather than blocking the UI; a real failure still
    // surfaces through EXECUTE_ERROR.
    clearSettleTimer()
    settleTimer.current = setTimeout(() => setIsExecuting(false), 2500)
  }, [isRunning, code, clearSettleTimer])

  if (!code.trim()) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
        <div className="text-center px-6">
          <div className="w-16 h-16 bg-gray-300 dark:bg-gray-600 rounded-lg flex items-center justify-center mb-4 mx-auto">
            <Eye size={24} className="text-gray-500 dark:text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No Cart to Run
          </h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Write a Nova64 cart with init(), update(dt) and draw(), then press Run.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="h-full relative bg-black overflow-hidden">
      {/* Controls */}
      <div className="absolute top-3 right-3 z-30 flex items-center space-x-2">
        <button
          onClick={() => setShowLogs((v) => !v)}
          className="p-2 bg-black/40 hover:bg-black/60 text-white rounded-lg transition-colors backdrop-blur-sm"
          title={showLogs ? 'Hide console' : 'Show console'}
        >
          <Terminal size={16} />
        </button>
        <button
          onClick={() => setIsVisible((v) => !v)}
          className="p-2 bg-black/40 hover:bg-black/60 text-white rounded-lg transition-colors backdrop-blur-sm"
          title={isVisible ? 'Hide scene' : 'Show scene'}
        >
          {isVisible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>

      {(isBooting || isExecuting) && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-20 pointer-events-none">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 flex items-center space-x-3">
            <Loader2 size={20} className="animate-spin text-blue-600" />
            <span className="text-gray-900 dark:text-white">
              {isBooting ? 'Booting Nova64 console...' : 'Loading cart...'}
            </span>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute top-3 left-3 right-28 bg-red-600 text-white p-3 z-20 max-h-48 overflow-y-auto">
          <div className="flex items-start space-x-2">
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <div className="font-medium mb-1">{error.title}</div>
              <div className="opacity-90 mb-1">{error.message}</div>
              <div className="opacity-90">{error.action}</div>
              {error.detail && (
                // The engine's own message. Unlike a provider body this is the
                // user's code failing, so it is worth showing in full.
                <div className="opacity-70 font-mono text-xs mt-2 pt-2 border-t border-white/25">
                  {error.detail}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showLogs && logs.length > 0 && (
        <div className="absolute bottom-0 left-0 right-0 max-h-40 overflow-y-auto bg-black/85 text-green-300 font-mono text-xs p-3 z-20 border-t border-white/10">
          {logs.map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
      )}

      {isVisible ? (
        runnerSrc && (
          <iframe
            ref={iframeRef}
            src={runnerSrc}
            className="block w-full h-full border-0"
            title="Nova64 Cart"
            // The console needs WebGL, pointer lock for mouse-look carts, and
            // WebXR for its VR/AR helpers.
            allow="xr-spatial-tracking; fullscreen; gamepad; autoplay"
            sandbox="allow-scripts allow-same-origin allow-pointer-lock allow-popups"
          />
        )
      ) : (
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <EyeOff size={48} className="text-gray-400 mx-auto mb-4" />
            <p className="text-gray-400">Scene hidden</p>
          </div>
        </div>
      )}
    </div>
  )
}
