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
  /** Chat words that pick it: game words choose the kind of game, style words the look. */
  keywords: { game: string[]; style: string[] }
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

export interface Nova64TemplatePick {
  id: string | null
  /** The keywords in the request that picked it; empty for a follow-up edit. */
  words: string[]
  followUp?: boolean
}

interface Nova64Kit {
  version: string
  templates(): Nova64TemplateInfo[]
  getTemplate(id: string): Nova64TemplateInfo | null
  templateIdOf(code: string | null | undefined): string | null
  chooseTemplate(message: string, currentCode?: string | null): string | null
  pickTemplate(message: string, currentCode?: string | null): Nova64TemplatePick
  templateNote(pick: Nova64TemplatePick): string
  chipLabel(template: Nova64TemplateInfo): string
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
  const pick = nova64Kit.pickTemplate(message, currentCode)
  if (!pick.id) return null
  return {
    templateId: pick.id,
    prompt: nova64Kit.templatePrompt(pick.id, currentCode),
    /** Opens the reply in chat: which template the user's words picked. */
    note: nova64Kit.templateNote(pick)
  }
}
