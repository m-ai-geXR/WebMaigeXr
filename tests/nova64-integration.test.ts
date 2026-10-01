import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import { defaultLibraries } from '@/store/store-defaults'
import { buildNova64RunnerUrl, getNova64RunnerOrigin } from '@/lib/nova64-runner'

/**
 * Invariants for the Nova64 integration. Each of these encodes a mistake that
 * actually shipped and had to be chased down at runtime.
 */

const root = path.join(__dirname, '..')
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8')

const nova64 = defaultLibraries.find((l) => l.id === 'nova64')

describe('Nova64 library definition', () => {
  it('is registered as a 3D library', () => {
    expect(nova64, 'nova64 should be in defaultLibraries').toBeTruthy()
    expect(nova64!.name).toBe('Nova64')
    expect(nova64!.version).toBe('0.5.2')
  })

  it('loads no CDN script of its own — the console boots itself', () => {
    // Nova64 is not a library you drop on the page; it runs in the studio runner.
    expect(nova64!.cdnUrls).toEqual([])
  })
})

describe('Nova64 cart template', () => {
  const template = nova64!.codeTemplate

  it('defines the cart lifecycle functions', () => {
    expect(template).toMatch(/function\s+init\s*\(/)
    expect(template).toMatch(/function\s+update\s*\(\s*dt\s*\)/)
    expect(template).toMatch(/function\s+draw\s*\(/)
  })

  it('uses no export keyword', () => {
    // The studio runner evaluates cart source with new Function(), so a top-level
    // `export` is a syntax error — even though Nova64's README shows that form for
    // file-based carts. This is the single easiest way to break every cart.
    expect(template).not.toMatch(/^\s*export\s/m)
  })

  it('calls the grouped nova64.* API rather than bare globals', () => {
    // The flat globals were retired upstream; createCube(...) alone throws.
    expect(template).toMatch(/nova64\.scene\./)
    expect(template).toMatch(/nova64\.camera\./)

    // No bare primitive calls that are not namespaced.
    const bareCalls = template.match(/(^|[^.\w])(createCube|createSphere|setCameraPosition)\s*\(/g)
    expect(bareCalls, 'primitives must be called through nova64.scene / nova64.camera').toBeNull()
  })

  it('scales motion by dt so carts are framerate independent', () => {
    expect(template).toMatch(/dt/)
  })
})

describe('Nova64 studio runner URL', () => {
  it('runs the console in studio mode so it waits for our cart', () => {
    const url = buildNova64RunnerUrl({ width: 800, height: 600 })
    expect(url).toContain('studio=1')
  })

  it('uses the chrome-free runner, not the one with the CRT shell', () => {
    // cart-runner wraps the screen in a bezel, scanlines, a glare layer and a
    // "NOVA-64" badge, and leaves the fullscreen button visible. hero-embed draws
    // only the game.
    const url = buildNova64RunnerUrl()
    expect(url).toContain('hero-embed')
    expect(url).not.toContain('cart-runner')
  })

  it('passes an explicit size, because hero-embed renders at a fixed size', () => {
    const url = buildNova64RunnerUrl({ width: 1024, height: 768 })
    expect(url).toContain('w=1024')
    expect(url).toContain('h=768')
  })

  it('targets a concrete origin for postMessage', () => {
    expect(getNova64RunnerOrigin()).toMatch(/^https?:\/\//)
  })
})

describe('Nova64 is wired into every place a library is gated', () => {
  it('has an export generator', () => {
    expect(read('src/lib/export-service.ts')).toContain("case 'nova64'")
  })

  it('is in the build-service framework union', () => {
    expect(read('src/lib/build-service.ts')).toContain("'nova64'")
  })

  it('appears in the snippet library filters', () => {
    expect(read('src/components/snippets/snippet-library.tsx')).toContain("'nova64'")
    expect(read('src/components/snippets/save-snippet-dialog.tsx')).toContain("'nova64'")
  })

  it('has a native Electron menu entry', () => {
    expect(read('electron/menu.ts')).toContain('selectLibrary:nova64')
  })

  it('is routed to its own renderer rather than the generated-document path', () => {
    const renderer = read('src/components/playground/scene-renderer.tsx')
    expect(renderer).toContain("library.id === 'nova64'")
    expect(renderer).toContain('Nova64Renderer')
  })
})

/**
 * The mobile playgrounds live in sibling repositories. When they are checked out
 * next to this one, hold them to the invariant that cost the most time to find:
 * the native code injector's primary path never calls runCode(), so the page has
 * to auto-run itself or the scene stays blank.
 */
const mobilePlaygrounds = [
  '../iOSMaigeXr/XRAiAssistant/Resources/playground-nova64.html',
  '../AndroidMaigeXr/app/src/main/assets/playground-nova64.html',
].map((p) => path.join(root, p))

const presentPlaygrounds = mobilePlaygrounds.filter((p) => fs.existsSync(p))

describe.skipIf(presentPlaygrounds.length === 0)('Nova64 mobile playgrounds', () => {
  for (const file of presentPlaygrounds) {
    const label = file.includes('iOS') ? 'iOS' : 'Android'
    const html = fs.readFileSync(file, 'utf8')

    it(`${label}: auto-runs the cart after injection`, () => {
      // The injector returns SUCCESS_METHOD_1 and runs nothing, so the page must.
      expect(html).toMatch(/setFullEditorContent/)
      expect(html).toMatch(/Auto-running the injected Nova64 cart/)
      expect(html).toMatch(/runCode\(\)/)
    })

    it(`${label}: uses the chrome-free runner in studio mode`, () => {
      expect(html).toContain('hero-embed')
      expect(html).toContain('studio=1')
      expect(html).not.toContain('cart-runner')
    })

    it(`${label}: is self-contained, so an https base URL can be used`, () => {
      // An https document cannot pull app:// or file:// subresources, and the page
      // needs a real origin or the runner's postMessage reply throws.
      expect(html).not.toMatch(/(src|href)=["']\s*(file|app):\/\//)
    })

    it(`${label}: exposes the hooks the native bridge calls`, () => {
      for (const hook of ['setFullEditorContent', 'getEditorContent', 'insertCodeAtCursor', 'editorReady']) {
        expect(html, `${hook} must be exposed`).toContain(hook)
      }
    })
  }
})
