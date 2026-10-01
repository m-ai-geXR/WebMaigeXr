import { describe, it, expect } from 'vitest'
import { execFileSync } from 'child_process'
import fs from 'fs'
import path from 'path'

/**
 * Guards the failure that broke the app: db-service.ts asks sql.js to fetch its
 * WebAssembly binary from a public URL, but public/ is gitignored, so the file
 * only exists if something copies it there. When it was missing the fetch 404'd,
 * dbService.initialize() rejected, and every store write then threw
 * "Database not initialized".
 */

const root = path.join(__dirname, '..')

function publicPrefixFromSource(): string {
  const source = fs.readFileSync(path.join(root, 'src/lib/db-service.ts'), 'utf8')
  const match = source.match(/locateFile:[^`]*`(\/[^`$]*)\$\{file\}`/)
  expect(
    match,
    'db-service.ts should configure sql.js with a locateFile template like `/sql-wasm/${file}`'
  ).toBeTruthy()
  return match![1]
}

describe('sql.js WebAssembly asset', () => {
  it('db-service declares a public path for the wasm', () => {
    expect(publicPrefixFromSource()).toMatch(/^\/.+\/$/)
  })

  it('the wasm file exists where db-service will fetch it from', () => {
    const prefix = publicPrefixFromSource()
    const file = path.join(root, 'public', prefix.replace(/^\/+|\/+$/g, ''), 'sql-wasm.wasm')

    expect(
      fs.existsSync(file),
      `Missing ${path.relative(root, file)}. sql.js cannot start without it and the ` +
        `app will fail to initialize its database. Run: pnpm run sql-wasm`
    ).toBe(true)

    // A truncated or placeholder file would 200 but fail to instantiate.
    expect(fs.statSync(file).size).toBeGreaterThan(100_000)
  })

  it('the wasm is a real WebAssembly module (magic bytes)', () => {
    const prefix = publicPrefixFromSource()
    const file = path.join(root, 'public', prefix.replace(/^\/+|\/+$/g, ''), 'sql-wasm.wasm')
    const head = fs.readFileSync(file).subarray(0, 4)
    // \0asm
    expect(Array.from(head)).toEqual([0x00, 0x61, 0x73, 0x6d])
  })

  it('the asset script agrees the assets are in place', () => {
    expect(() =>
      execFileSync('node', ['scripts/sql-wasm-assets.js', '--check'], {
        cwd: root,
        stdio: 'pipe',
      })
    ).not.toThrow()
  })

  it('is wired into install, dev and build so it cannot go missing again', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
    const s = pkg.scripts as Record<string, string>

    expect(s['sql-wasm'], 'a script that materialises the wasm').toBeTruthy()
    expect(s.postinstall, 'postinstall should materialise the wasm').toContain('sql-wasm-assets')

    // Every entry point a developer or build uses must run it first.
    for (const hook of ['predev', 'predev:electron', 'prebuild', 'prebuild:static']) {
      expect(s[hook], `${hook} should run the wasm copy`).toContain('sql-wasm')
    }
  })
})
