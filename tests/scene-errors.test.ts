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
