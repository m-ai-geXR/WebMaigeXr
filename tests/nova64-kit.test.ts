import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import { execFileSync } from 'child_process'
import { nova64Kit, nova64TemplateRequest } from '@/lib/nova64-kit'
import { NOVA64_KIT_TEST_VECTORS } from '@/lib/nova64-kit.generated'
import { defaultLibraries } from '@/store/store-defaults'
import { NOVA64_VERSION } from '@/lib/nova64-runner'

/**
 * The shared Nova64 cart kit: game templates, generated imports and automatic
 * repairs. The same kit is inlined into the iOS and Android playground pages.
 */

const root = path.join(__dirname, '..')
const maige = path.join(root, '..')
const namespace: Record<string, string[]> = JSON.parse(
  fs.readFileSync(path.join(root, `nova64-kit/namespace-${NOVA64_VERSION}.json`), 'utf8')
)

describe('Nova64 kit build', () => {
  it('generated copies are up to date with nova64-kit/', () => {
    // Throws (exit 1) when any platform copy is stale.
    execFileSync('node', [path.join(root, 'nova64-kit/build.mjs'), '--check'], { stdio: 'pipe' })
  })

  it('targets the pinned Nova64 version', () => {
    expect(nova64Kit.version).toBe(NOVA64_VERSION)
  })
})

describe('template picking', () => {
  it.each(NOVA64_KIT_TEST_VECTORS)('"$message" (current: $current) -> $expected', ({ message, current, expected }) => {
    const code = current ? `// NOVA64 TEMPLATE: ${current}\n` : ''
    expect(nova64Kit.chooseTemplate(message, code)).toBe(expected)
  })

  it('builds a GAME TEMPLATE MODE prompt that carries the CONFIG, not the engine', () => {
    const request = nova64TemplateRequest('make a dungeon crawler about monks')!
    expect(request.templateId).toBe('fp-dungeon-wizardry')
    expect(request.prompt).toContain('GAME TEMPLATE MODE')
    expect(request.prompt).toContain('// NOVA64 TEMPLATE: fp-dungeon-wizardry')
    expect(request.prompt).toContain('const LAYOUT')
    expect(request.prompt).not.toContain(nova64Kit.prepare(nova64Kit.getTemplate('fp-dungeon-wizardry')!.config).code.slice(-400))
    expect(request.prompt.length).toBeLessThan(8000)
  })

  it('follow-up requests edit the CONFIG already in the editor', () => {
    const cart = nova64Kit.prepare(
      nova64Kit.getTemplate('lane-runner-grid')!.config.replace("title: 'SHARDGRID RUN'", "title: 'EMBER DASH'")
    ).code
    const request = nova64TemplateRequest('make it faster', cart)!
    expect(request.templateId).toBe('lane-runner-grid')
    expect(request.prompt).toContain("title: 'EMBER DASH'")
  })

  it('leaves non-game requests free-form', () => {
    expect(nova64TemplateRequest('a spinning cube with a glowing orb')).toBeNull()
  })
})

describe('prepare: game templates', () => {
  for (const t of nova64Kit.templates()) {
    it(`${t.id}: its example CONFIG becomes a complete, valid cart`, () => {
      const result = nova64Kit.prepare(t.config)
      expect(result.templateId).toBe(t.id)
      expect(result.problems).toEqual([])
      expect(result.code).toContain(nova64Kit.ENGINE_MARK)
      expect(result.code).toMatch(/^function init\(/m)
      expect(result.code).toMatch(/^function update\(/m)
      expect(result.code).not.toMatch(/^\s*(export|import)\s/m)
      expect(() => new Function(result.code)).not.toThrow()
      // Every generated import is a real API name in the group it is taken from.
      for (const m of result.code.matchAll(/^const \{ ([^}]+) \} = nova64\.(\w+);$/gm)) {
        for (const name of m[1].split(', ')) expect(namespace[m[2]], `${m[2]}.${name}`).toContain(name)
      }
    })
  }

  it('repairs a broken CONFIG instead of failing to run', () => {
    const config = nova64Kit.getTemplate('arena-dodger-neon')!.config
      .replace(/^const DIFFICULTY[\s\S]*?^};\n/m, '')
      .replace(/0x[0-9a-f]{6}/, '0x000000')
    const result = nova64Kit.prepare(config)
    expect(result.problems).toEqual([])
    expect(result.fixes.join(' ')).toMatch(/DIFFICULTY/)
    expect(result.fixes.join(' ')).toMatch(/pure-black/)
    expect(result.code).toMatch(/^const DIFFICULTY\b/m)
    expect(result.code).not.toMatch(/0x000000\b/)
  })

  it('falls back to the example CONFIG on a syntax error, and says so', () => {
    const result = nova64Kit.prepare(nova64Kit.getTemplate('fp-dungeon-odyssey')!.config.replace('const TEXT = {', 'const TEXT = {{'))
    expect(result.problems.join(' ')).toMatch(/syntax error/i)
    expect(() => new Function(result.code)).not.toThrow()
  })

  it('always uses the tested engine, even when the AI rewrote it', () => {
    const full = nova64Kit.prepare(nova64Kit.getTemplate('lane-runner-corridor')!.config).code
    const tampered = full.replace(nova64Kit.ENGINE_MARK, `${nova64Kit.ENGINE_MARK}\nfunction init() { broken( }`)
    const result = nova64Kit.prepare(tampered)
    expect(result.code).toBe(full)
  })
})

describe('prepare: free-form carts', () => {
  it('fixes the classic studio-mode mistakes', () => {
    const result = nova64Kit.prepare(`import { createCube } from 'nova64';
let c, spin = 0;
export function init() { c = createCube(2, 0xff3366, [0, 1, 0]); setCameraPosition(0, 3, 8); }
export function update(dt) { spin += dt; setRotation(c, 0, spin, 0); }
export function draw() { cls(); print('HELLO', 10, 10, rgba8(255, 255, 255, 255)); }
`)
    expect(result.problems).toEqual([])
    expect(result.code).not.toMatch(/^\s*(import|export)\s/m)
    expect(result.code).toContain('const { createCube, setRotation } = nova64.scene;')
    expect(result.code).toContain('const { setCameraPosition } = nova64.camera;')
    expect(result.code).toMatch(/function draw\(\) \{ \/\* cls\(\) removed/)
    expect(() => new Function(result.code)).not.toThrow()
  })

  it('moves a real API name to its actual group', () => {
    const result = nova64Kit.prepare('function init() { nova64.scene.setFog(0x101020, 5, 30); }\nfunction update(dt) {}\n')
    expect(result.code).toContain('nova64.light.setFog(')
    expect(result.problems).toEqual([])
  })

  it('reports what it cannot fix', () => {
    const result = nova64Kit.prepare('function init() { nova64.scene.makeDragon(); }\nfunction update(dt) { this.x = 1; }\n')
    expect(result.problems.join(' ')).toMatch(/makeDragon/)
    expect(result.problems.join(' ')).toMatch(/this\./)
  })

  it('does not import a name the cart declares itself at top level', () => {
    const result = nova64Kit.prepare('let color = 1;\nfunction init() { const t = 2; createCube(1, 0xffffff, [0, 0, 0]); }\nfunction update(dt) { t(); }\n')
    expect(result.code).not.toMatch(/\bcolor\b.*= nova64\.util/)
    expect(result.code).toContain('const { t } = nova64.data;') // only an inner `t` is declared
  })

  it('leaves the shipped starter template and examples untouched', () => {
    const starter = defaultLibraries.find((l) => l.id === 'nova64')!.codeTemplate
    const result = nova64Kit.prepare(starter)
    expect(result.problems).toEqual([])
    expect(result.fixes).toEqual([])
  })
})

describe('the starter template lays its floor flat', () => {
  it('rotates every createPlane, because planes stand upright', () => {
    const starter = defaultLibraries.find((l) => l.id === 'nova64')!.codeTemplate
    expect(starter).toMatch(/setRotation\(groundId, -Math\.PI \/ 2, 0, 0\)/)
  })
})

describe('mobile playground pages use the kit', () => {
  const pages = [
    ['iOS', path.join(maige, 'iOSMaigeXr/XRAiAssistant/Resources/playground-nova64.html')],
    ['Android', path.join(maige, 'AndroidMaigeXr/app/src/main/assets/playground-nova64.html')]
  ] as const
  for (const [label, file] of pages) {
    const present = fs.existsSync(file)
    it.skipIf(!present)(`${label}: inlines the kit and prepares every injected cart`, () => {
      const html = fs.readFileSync(file, 'utf8')
      expect(html).toContain('NOVA64-KIT:BEGIN')
      expect(html).toMatch(/codeString = prepareNova64Cart\(codeString\);/)
    })
  }
})
