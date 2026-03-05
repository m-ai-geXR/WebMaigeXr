/**
 * dev-electron.js
 * Starts Next.js dev server, waits for port 3000, then launches Electron.
 * No external dependencies needed.
 */

const { spawn } = require('child_process')
const http = require('http')
const path = require('path')

process.env.NODE_ENV = 'development'

const root = path.join(__dirname, '..')

// On Windows, use `node` to run next directly — avoids .cmd shell issues
const nodeExec = process.execPath
const nextScript = path.join(root, 'node_modules', 'next', 'dist', 'bin', 'next')
const electronScript = path.join(root, 'node_modules', 'electron', 'cli.js')

let nextProcess = null
let electronProcess = null
let cleaningUp = false

function cleanup() {
  if (cleaningUp) return
  cleaningUp = true
  if (electronProcess) { try { electronProcess.kill('SIGKILL') } catch (_) {} }
  if (nextProcess) { try { nextProcess.kill('SIGKILL') } catch (_) {} }
  process.exit(0)
}

process.on('SIGINT', cleanup)
process.on('SIGTERM', cleanup)

function waitForPort(port, timeout = 120000) {
  return new Promise((resolve, reject) => {
    const start = Date.now()
    function check() {
      const req = http.get({ hostname: 'localhost', port, path: '/', timeout: 2000 }, () => {
        resolve()
      })
      req.on('error', () => {
        if (Date.now() - start > timeout) {
          reject(new Error('Timeout waiting for Next.js on port ' + port))
        } else {
          setTimeout(check, 1500)
        }
      })
      req.on('timeout', () => {
        req.destroy()
        setTimeout(check, 1500)
      })
    }
    setTimeout(check, 2000) // give Next.js a moment to start
  })
}

console.log('[dev-electron] Starting Next.js dev server...')
nextProcess = spawn(nodeExec, [nextScript, 'dev'], {
  stdio: 'inherit',
  env: { ...process.env },
  cwd: root
})

nextProcess.on('error', (err) => {
  console.error('[dev-electron] Failed to start Next.js:', err.message)
  process.exit(1)
})

nextProcess.on('close', (code) => {
  if (!cleaningUp) {
    console.error('[dev-electron] Next.js exited with code', code)
    cleanup()
  }
})

console.log('[dev-electron] Waiting for http://localhost:3000 ...')
waitForPort(3000)
  .then(() => {
    console.log('[dev-electron] Next.js ready! Launching Electron...')
    electronProcess = spawn(nodeExec, [electronScript, '.'], {
      stdio: 'inherit',
      env: { ...process.env },
      cwd: root
    })

    electronProcess.on('error', (err) => {
      console.error('[dev-electron] Failed to start Electron:', err.message)
      cleanup()
    })

    electronProcess.on('close', () => {
      console.log('[dev-electron] Electron closed. Shutting down.')
      cleanup()
    })
  })
  .catch((err) => {
    console.error('[dev-electron]', err.message)
    cleanup()
  })
