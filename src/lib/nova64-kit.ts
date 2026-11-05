/**
 * Typed access to the shared Nova64 cart kit (nova64-kit/kit.src.js).
 *
 * The same kit runs inside the iOS and Android playground pages, so a cart is
 * prepared identically on every platform. Regenerate with `node nova64-kit/build.mjs`.
 */
import { Nova64KitRaw } from './nova64-kit.generated'

export interface Nova64TemplateInfo {
  id: string
  family: 'dungeon' | 'runner' | 'arena'
  genre: string
  style: string
  description: string
  guide: string
  /** Example CONFIG, starting with its `// NOVA64 TEMPLATE: <id>` line. */
  config: string
}

export interface Nova64PrepareResult {
  code: string
  templateId: string | null
  /** Repairs that were applied automatically. */
  fixes: string[]
  /** Problems the kit could not fix; the cart may still misbehave. */
  problems: string[]
}

interface Nova64Kit {
  version: string
  templates(): Nova64TemplateInfo[]
  getTemplate(id: string): Nova64TemplateInfo | null
  templateIdOf(code: string | null | undefined): string | null
  chooseTemplate(message: string, currentCode?: string | null): string | null
  configOf(code: string): string | null
  templatePrompt(id: string, currentCode?: string | null): string
  prepare(code: string): Nova64PrepareResult
  summarize(result: Nova64PrepareResult): string
  CONFIG_MARK: string
  ENGINE_MARK: string
}

export const nova64Kit = Nova64KitRaw as Nova64Kit

/**
 * The template-mode block for a chat request, or null when the request should be
 * generated free-form. Pass the editor's current code so follow-ups ("make the
 * enemies faster") edit the CONFIG already in the editor.
 */
export function nova64TemplateRequest(message: string, currentCode?: string | null) {
  const id = nova64Kit.chooseTemplate(message, currentCode)
  if (!id) return null
  return { templateId: id, prompt: nova64Kit.templatePrompt(id, currentCode) }
}
