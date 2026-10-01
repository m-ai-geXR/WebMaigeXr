#!/usr/bin/env node
/**
 * sql-wasm-assets.js
 *
 * Copies sql.js's WebAssembly binary into public/ so the renderer can fetch it.
 *
 * Why this script has to exist: db-service.ts initialises sql.js with
 *
 *     locateFile: (file) => `/sql-wasm/${file}`
 *
 * which makes the browser fetch /sql-wasm/sql-wasm.wasm from the Next.js public
 * directory. But public/ is listed in .gitignore and is entirely untracked, so
 * the binary cannot simply be committed — it must be materialised on every
 * checkout. When it is missing the fetch 404s, initSqlJs() rejects,
 * dbService.initialize() fails, and every store write then throws
 * "Database not initialized" (settings, conversations, snippets — roughly twenty
 * call sites). That is a confusing failure a long way from its cause, so this
 * runs from postinstall and again before dev/build.
 *
 * Usage:
 *   node scripts/sql-wasm-assets.js          copy the assets (idempotent)
 *   node scripts/sql-wasm-assets.js --check  verify only; non-zero exit if missing
 */

const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')
const checkOnly = process.argv.includes('--check')

/** Files sql.js needs at runtime, resolved from the installed package. */
const REQUIRED = ['sql-wasm.wasm']

/**
 * Read the public URL prefix out of db-service.ts rather than hardcoding it, so
 * this script keeps working if the locateFile path is ever changed.
 */
function readPublicPrefixFromSource() {
  const dbService = path.join(root, 'src', 'lib', 'db-service.ts')
  const source = fs.readFileSync(dbService, 'utf8')

  // locateFile: (file: string) => `/sql-wasm/${file}`
  const match = source.match(/locateFile:[^`]*`(\/[^`$]*)\$\{file\}`/)
  if (!match) {
    throw new Error(
      'Could not find the sql.js locateFile path in src/lib/db-service.ts.\n' +
      'If the initialisation code changed, update scripts/sql-wasm-assets.js to match.'
    )
  }
  return match[1] // e.g. "/sql-wasm/"
}

function resolveSqlJsDist() {
  // Resolve through the package so pnpm's layout does not matter.
  const entry = require.resolve('sql.js', { paths: [root] })
  return path.dirname(entry)
}

function main() {
  const prefix = readPublicPrefixFromSource()
  const destDir = path.join(root, 'public', prefix.replace(/^\/+|\/+$/g, ''))

  if (checkOnly) {
    const missing = REQUIRED.filter((f) => !fs.existsSync(path.join(destDir, f)))
    if (missing.length > 0) {
      console.error(
        `\n[sql-wasm-assets] MISSING: ${missing.join(', ')}\n` +
        `  expected in: ${path.relative(root, destDir)}/\n` +
        `  served at:   ${prefix}\n\n` +
        `  Without it sql.js cannot start, dbService.initialize() fails, and the app\n` +
        `  throws "Database not initialized" on every settings or conversation write.\n\n` +
        `  Fix: pnpm run sql-wasm\n`
      )
      process.exit(1)
    }
    console.log(`[sql-wasm-assets] OK — ${REQUIRED.join(', ')} present in public${prefix}`)
    return
  }

  let srcDir
  try {
    srcDir = resolveSqlJsDist()
  } catch (err) {
    console.error('[sql-wasm-assets] sql.js is not installed; run pnpm install first.')
    process.exit(1)
  }

  fs.mkdirSync(destDir, { recursive: true })

  let copied = 0
  for (const file of REQUIRED) {
    const from = path.join(srcDir, file)
    const to = path.join(destDir, file)

    if (!fs.existsSync(from)) {
      console.error(`[sql-wasm-assets] ${file} not found in ${srcDir}`)
      process.exit(1)
    }

    // Skip identical copies so this stays cheap on every dev start.
    if (fs.existsSync(to) && fs.statSync(to).size === fs.statSync(from).size) {
      continue
    }

    fs.copyFileSync(from, to)
    copied++
    console.log(`[sql-wasm-assets] copied ${file} -> public${prefix}${file}`)
  }

  if (copied === 0) {
    console.log(`[sql-wasm-assets] up to date (public${prefix})`)
  }
}

try {
  main()
} catch (err) {
  console.error('[sql-wasm-assets]', err.message)
  process.exit(1)
}
