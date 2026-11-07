'use client'

import { useAppStore } from '@/store/app-store'
import { nova64Kit } from '@/lib/nova64-kit'

interface Nova64TemplateChipsProps {
  /** The template a reply was built on, highlighted among the chips. */
  activeId?: string | null
  /** Short heading shown above the chips. */
  title?: string
}

/**
 * One chip per Nova64 game template, labelled with the words that pick it.
 * Tapping a chip previews that template in the playground, so a user can see
 * each one before asking for their own version. Big touch targets for phones.
 */
export function Nova64TemplateChips({ activeId, title }: Nova64TemplateChipsProps) {
  const { setCurrentCode, setCurrentView, updateSettings, getCurrentLibrary } = useAppStore()

  const preview = (id: string) => {
    const t = nova64Kit.getTemplate(id)
    if (!t) return
    if (getCurrentLibrary()?.id !== 'nova64') updateSettings({ selectedLibrary: 'nova64' })
    setCurrentCode(nova64Kit.prepare(t.config).code)
    setCurrentView('playground')
  }

  return (
    <div className="mt-2">
      {title && <p className="text-xs text-brand-muted mb-1.5">{title}</p>}
      <div className="flex flex-wrap gap-2">
        {nova64Kit.templates().map((t) => {
          const active = t.id === activeId
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => preview(t.id)}
              title={`${t.genre} · ${t.style}. Words: ${[...t.keywords.game, ...t.keywords.style].join(', ')}`}
              aria-label={`Preview the ${t.genre}, ${t.style} template`}
              className={`min-h-[36px] px-3 rounded-full text-sm border transition-colors ${
                active
                  ? 'bg-brand-accent text-white border-brand-accent'
                  : 'bg-brand-surface text-brand-text border-brand-divider hover:border-brand-accent'
              }`}
            >
              {nova64Kit.chipLabel(t)}
            </button>
          )
        })}
      </div>
    </div>
  )
}
