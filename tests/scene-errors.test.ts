import { describe, it, expect } from 'vitest'
import {
  classifyCartError,
  classifyRunnerError,
  classifyBuildError,
  classifyStartupError,
  formatSceneError,
} from '../src/lib/scene-errors'

describe('classifyCartError', () => {
  it('recognises the export trap', () => {
    // The runner evaluates cart source directly, so a top-level export is a
    // syntax error even though Nova64's README shows that form for CLI carts.
    const info = classifyCartError("SyntaxError: Unexpected token 'export'")
    expect(info.category).toBe('cart-uses-export')
    expect(info.action).toContain('function init()')
  })

  it('recognises a retired bare global and names the namespaced form', () => {
    const info = classifyCartError('ReferenceError: createCube is not defined')
    expect(info.category).toBe('cart-bare-global')
    expect(info.title).toContain('createCube')
    expect(info.action).toContain('nova64.scene.createCube')
  })

  it('does not mistake a missing runtime for a bare global', () => {
    const info = classifyCartError('ReferenceError: nova64 is not defined')
    expect(info.category).toBe('cart-runtime-missing')
  })

  it('falls back to a syntax error for other parse failures', () => {
    expect(classifyCartError('SyntaxError: Unexpected end of input').category).toBe('cart-syntax')
  })

  it('treats anything else as a runtime failure', () => {
    expect(classifyCartError('TypeError: Cannot read properties of undefined').category)
      .toBe('cart-runtime')
  })

  it('keeps the engine message as detail, because it is the user own code', () => {
    const raw = 'TypeError: mesh.rotate is not a function'
    expect(classifyCartError(raw).detail).toBe(raw)
  })

  it('survives a non-string payload', () => {
    expect(() => classifyCartError(null)).not.toThrow()
    expect(() => classifyCartError({ nope: 1 })).not.toThrow()
    expect(classifyCartError(new Error('boom')).detail).toBe('boom')
  })
})

describe('classifyRunnerError', () => {
  it('distinguishes a console that never started from a cart that failed', () => {
    const info = classifyRunnerError('timeout waiting for EXECUTE_READY')
    expect(info.category).toBe('runner-unreachable')
    expect(info.message).toContain('never signalled')
  })
})

describe('classifyBuildError', () => {
  it('explains that only the bundled frameworks need a network', () => {
    const info = classifyBuildError('TypeError: Failed to fetch')
    expect(info.category).toBe('build-offline')
    // The way out is switching to a framework that needs no build step.
    expect(info.action).toContain('Nova64')
  })

  it('names a missing package and points at the Packages panel', () => {
    const info = classifyBuildError("Cannot find module '@react-three/postprocessing'")
    expect(info.category).toBe('missing-dependency')
    expect(info.title).toContain('@react-three/postprocessing')
    expect(info.action).toContain('Packages')
  })

  it('falls back to a compile failure', () => {
    expect(classifyBuildError('Unexpected token <').category).toBe('build-failed')
  })
})

describe('classifyStartupError', () => {
  it('recognises the missing wasm binary and gives the command', () => {
    const info = classifyStartupError('Failed to fetch /sql-wasm/sql-wasm.wasm')
    expect(info.category).toBe('database-assets-missing')
    expect(info.action).toContain('pnpm sql-wasm')
  })

  it('recognises blocked or full storage, which needs different advice', () => {
    const info = classifyStartupError('Database not initialized')
    expect(info.category).toBe('database-unavailable')
    expect(info.action).toContain('storage')
    expect(info.action).not.toContain('pnpm sql-wasm')
  })

  it('still produces something usable for an unknown startup failure', () => {
    const info = classifyStartupError('something nobody anticipated')
    expect(info.category).toBe('unknown')
    expect(info.action.length).toBeGreaterThan(0)
  })
})

describe('guarantees across every classifier', () => {
  const classifiers = [classifyCartError, classifyRunnerError, classifyBuildError, classifyStartupError]
  const inputs: unknown[] = ['', null, undefined, 42, {}, new Error('x'), 'a plain message']

  it('always returns a title, message and action', () => {
    for (const classify of classifiers) {
      for (const input of inputs) {
        const info = classify(input)
        expect(info.title.length).toBeGreaterThan(0)
        expect(info.message.length).toBeGreaterThan(0)
        expect(info.action.length).toBeGreaterThan(0)
      }
    }
  })

  it('never throws', () => {
    for (const classify of classifiers) {
      for (const input of inputs) {
        expect(() => classify(input)).not.toThrow()
      }
    }
  })

  it('omits detail rather than showing an empty box', () => {
    expect(classifyCartError('').detail).toBeUndefined()
    expect(classifyCartError('   ').detail).toBeUndefined()
  })

  it('keeps detail out of the formatted body, which is shown separately', () => {
    const info = classifyCartError('TypeError: something very specific')
    expect(formatSceneError(info)).not.toContain('something very specific')
  })
})

// ---------------------------------------------------------------------------
// Parity with the mobile playgrounds.
//
// The iOS and Android Nova64 pages carry their own copy of this logic, in plain
// ES5 inside the HTML, because they cannot import from here. Copies drift, so
// the copy is executed and checked against the same cases.
// ---------------------------------------------------------------------------

import fs from 'fs'
import path from 'path'

const mobilePlaygrounds = [
  '../iOSMaigeXr/XRAiAssistant/Resources/playground-nova64.html',
  '../AndroidMaigeXr/app/src/main/assets/playground-nova64.html',
].map((p) => path.resolve(__dirname, '..', p))

const present = mobilePlaygrounds.filter((p) => fs.existsSync(p))

/** Pull the page's classifier out of the HTML and make it callable. */
function loadMobileClassifier(file: string): (raw: unknown) => { title: string; body: string; detail: string } {
  const html = fs.readFileSync(file, 'utf8')
  const start = html.indexOf('function classifyCartError(')
  if (start === -1) throw new Error(`no classifyCartError in ${file}`)
  // Up to the helper that follows it.
  const end = html.indexOf('function showCartError(', start)
  const source = html.slice(start, end)
  // eslint-disable-next-line no-new-func
  return new Function(`${source}; return classifyCartError;`)() as any
}

describe.skipIf(present.length === 0)('mobile playground cart classifier parity', () => {
  it.each(present)('%s classifies the export trap', (file) => {
    const classify = loadMobileClassifier(file)
    const info = classify("SyntaxError: Unexpected token 'export'")
    expect(info.title).toBe('Carts cannot use export')
    expect(info.body).toContain('function init()')
  })

  it.each(present)('%s names the namespaced form for a bare global', (file) => {
    const classify = loadMobileClassifier(file)
    const info = classify('ReferenceError: createCube is not defined')
    expect(info.title).toContain('createCube')
    expect(info.body).toContain('nova64.scene.createCube')
  })

  it.each(present)('%s separates a missing runtime from a bare global', (file) => {
    const classify = loadMobileClassifier(file)
    expect(classify('ReferenceError: nova64 is not defined').title).toBe('Console did not load')
  })

  it.each(present)('%s agrees with the desktop classifier on category', (file) => {
    const classify = loadMobileClassifier(file)
    const cases = [
      ["SyntaxError: Unexpected token 'export'", 'cart-uses-export'],
      ['ReferenceError: createCube is not defined', 'cart-bare-global'],
      ['ReferenceError: nova64 is not defined', 'cart-runtime-missing'],
      ['SyntaxError: Unexpected end of input', 'cart-syntax'],
      ['TypeError: mesh.rotate is not a function', 'cart-runtime'],
    ] as const

    for (const [raw, expectedCategory] of cases) {
      const desktop = classifyCartError(raw)
      expect(desktop.category).toBe(expectedCategory)
      // Same bucket on both: the mobile copy has no category field, so the
      // title is the observable proxy for agreement.
      expect(classify(raw).title).toBe(desktop.title)
    }
  })

  it.each(present)('%s keeps the engine message as detail and survives odd input', (file) => {
    const classify = loadMobileClassifier(file)
    expect(classify('TypeError: boom').detail).toBe('TypeError: boom')
    expect(() => classify(null)).not.toThrow()
    expect(() => classify(undefined)).not.toThrow()
    expect(classify('').detail).toBe('')
  })
})
